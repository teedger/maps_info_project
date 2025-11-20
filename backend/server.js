const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'community-maps-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

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

// Auth middleware (optional - doesn't block if no token)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    req.userId = verifyToken(token);
  }
  next();
}

// Required auth middleware
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

// Register
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

// Login
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

// Get current user
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

// ==================== ALERT ROUTES ====================

// Get all alerts
app.get('/api/alerts', (req, res) => {
  try {
    const { category, status = 'active' } = req.query;
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

    query += ' ORDER BY a.created_at DESC';
    const alerts = db.prepare(query).all(...params);
    res.json(alerts);
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

// Create new alert
app.post('/api/alerts', optionalAuth, (req, res) => {
  try {
    const { latitude, longitude, category, description, severity = 'medium' } = req.body;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({ error: 'latitude, longitude, and category are required' });
    }

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO alerts (id, user_id, latitude, longitude, category, description, severity, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, req.userId || null, latitude, longitude, category, description, severity, expiresAt);

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

// Delete alert (only owner or any user for now)
app.delete('/api/alerts/:id', (req, res) => {
  try {
    const stmt = db.prepare('UPDATE alerts SET status = ? WHERE id = ?');
    const result = stmt.run('deleted', req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMENT ROUTES ====================

// Get comments for an alert
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

// Add comment to alert
app.post('/api/alerts/:id/comments', optionalAuth, (req, res) => {
  try {
    const { content, username: guestUsername } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if alert exists
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
