const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'community-maps-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for photo uploads

// Static files for uploaded images
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Database setup
const db = new Database(path.join(__dirname, '../database/alerts.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    status TEXT DEFAULT 'active',
    upvotes INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    user_id TEXT,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
  CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts(category);
  CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_comments_alert ON comments(alert_id);
`);

// Helper functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

function generateToken(userId) {
  const payload = { userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  try {
    const [data, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    if (payload.exp < Date.now()) return null;

    return payload.userId;
  } catch {
    return null;
  }
}

// Calculate distance between two points (Haversine formula)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Auth middleware
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    req.userId = verifyToken(token);
  }
  next();
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const userId = verifyToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = userId;
  next();
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const id = uuidv4();
    const passwordHash = hashPassword(password);

    db.prepare('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(id, username, email, passwordHash);

    const token = generateToken(id);
    res.status(201).json({ token, user: { id, username, email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER PROFILE ====================

app.get('/api/users/:id/alerts', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT a.*, u.username as author
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ? AND a.status = 'active'
      ORDER BY a.created_at DESC
    `).all(req.params.id);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_alerts,
        SUM(upvotes) as total_upvotes,
        COUNT(DISTINCT category) as categories_used
      FROM alerts
      WHERE user_id = ? AND status = 'active'
    `).get(req.params.id);

    const commentCount = db.prepare(`
      SELECT COUNT(*) as total_comments
      FROM comments WHERE user_id = ?
    `).get(req.params.id);

    res.json({ ...stats, ...commentCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ALERT ROUTES ====================

// Get all alerts with search and filters
app.get('/api/alerts', (req, res) => {
  try {
    const { category, status = 'active', search, lat, lng, radius } = req.query;
    let query = `
      SELECT a.*, u.username as author
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status = ?
    `;
    const params = [status];

    if (category) {
      query += ' AND a.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (a.description LIKE ? OR a.category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY a.created_at DESC';
    let alerts = db.prepare(query).all(...params);

    // Filter by radius if location provided
    if (lat && lng && radius) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      alerts = alerts.filter(alert => {
        const distance = getDistanceKm(userLat, userLng, alert.latitude, alert.longitude);
        alert.distance = Math.round(distance * 100) / 100;
        return distance <= radiusKm;
      }).sort((a, b) => a.distance - b.distance);
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nearby alerts
app.get('/api/alerts/nearby', (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    const alerts = db.prepare(`
      SELECT a.*, u.username as author
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `).all();

    const nearbyAlerts = alerts
      .map(alert => ({
        ...alert,
        distance: getDistanceKm(userLat, userLng, alert.latitude, alert.longitude)
      }))
      .filter(alert => alert.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .map(alert => ({
        ...alert,
        distance: Math.round(alert.distance * 100) / 100
      }));

    res.json(nearbyAlerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single alert with comments
app.get('/api/alerts/:id', (req, res) => {
  try {
    const alert = db.prepare(`
      SELECT a.*, u.username as author
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const comments = db.prepare(`
      SELECT * FROM comments WHERE alert_id = ? ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ ...alert, comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new alert with photo
app.post('/api/alerts', optionalAuth, (req, res) => {
  try {
    const { latitude, longitude, category, description, severity = 'medium', photo } = req.body;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({ error: 'latitude, longitude, and category are required' });
    }

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Handle photo upload
    let photoUrl = null;
    if (photo && photo.startsWith('data:image')) {
      const matches = photo.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1];
        const data = matches[2];
        const filename = `${id}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
        photoUrl = `/uploads/${filename}`;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO alerts (id, user_id, latitude, longitude, category, description, severity, photo_url, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, req.userId || null, latitude, longitude, category, description, severity, photoUrl, expiresAt);

    const newAlert = db.prepare(`
      SELECT a.*, u.username as author
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(id);

    res.status(201).json(newAlert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote alert
app.post('/api/alerts/:id/upvote', (req, res) => {
  try {
    const stmt = db.prepare('UPDATE alerts SET upvotes = upvotes + 1 WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete alert (only owner can delete)
app.delete('/api/alerts/:id', requireAuth, (req, res) => {
  try {
    // Check ownership
    const alert = db.prepare('SELECT user_id FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.user_id !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own alerts' });
    }

    const stmt = db.prepare('UPDATE alerts SET status = ? WHERE id = ?');
    stmt.run('deleted', req.params.id);

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATISTICS ====================

app.get('/api/stats', (req, res) => {
  try {
    const totalAlerts = db.prepare(`
      SELECT COUNT(*) as count FROM alerts WHERE status = 'active'
    `).get();

    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM alerts
      WHERE status = 'active'
      GROUP BY category
      ORDER BY count DESC
    `).all();

    const bySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM alerts
      WHERE status = 'active'
      GROUP BY severity
    `).all();

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get();

    const recentActivity = db.prepare(`
      SELECT COUNT(*) as count
      FROM alerts
      WHERE status = 'active'
      AND created_at > datetime('now', '-24 hours')
    `).get();

    const topContributors = db.prepare(`
      SELECT u.username, COUNT(a.id) as alert_count, SUM(a.upvotes) as total_upvotes
      FROM users u
      JOIN alerts a ON u.id = a.user_id
      WHERE a.status = 'active'
      GROUP BY u.id
      ORDER BY alert_count DESC
      LIMIT 5
    `).all();

    res.json({
      totalAlerts: totalAlerts.count,
      totalUsers: totalUsers.count,
      totalComments: totalComments.count,
      alertsLast24h: recentActivity.count,
      byCategory,
      bySeverity,
      topContributors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMENT ROUTES ====================

app.get('/api/alerts/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT * FROM comments WHERE alert_id = ? ORDER BY created_at ASC
    `).all(req.params.id);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/:id/comments', optionalAuth, (req, res) => {
  try {
    const { content, username: guestUsername } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const alert = db.prepare('SELECT id FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    let username = guestUsername || 'Anonymous';
    if (req.userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId);
      if (user) username = user.username;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO comments (id, alert_id, user_id, username, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.userId || null, username, content.trim());

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CATEGORIES ====================

app.get('/api/categories', (req, res) => {
  const categories = [
    { id: 'icicle', name: 'Icicle Alert', icon: '🧊', color: '#3498db' },
    { id: 'street_dog', name: 'Street Dog', icon: '🐕', color: '#e67e22' },
    { id: 'pothole', name: 'Pothole', icon: '🕳️', color: '#7f8c8d' },
    { id: 'flooding', name: 'Flooding', icon: '🌊', color: '#2980b9' },
    { id: 'construction', name: 'Construction', icon: '🚧', color: '#f39c12' },
    { id: 'accident', name: 'Accident', icon: '⚠️', color: '#e74c3c' },
    { id: 'other', name: 'Other', icon: '📍', color: '#9b59b6' }
  ];
  res.json(categories);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
