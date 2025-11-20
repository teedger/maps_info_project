const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new Database(path.join(__dirname, '../database/alerts.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    status TEXT DEFAULT 'active',
    upvotes INTEGER DEFAULT 0
  )
`);

// Routes

// Get all alerts
app.get('/api/alerts', (req, res) => {
  try {
    const { category, status = 'active' } = req.query;
    let query = 'SELECT * FROM alerts WHERE status = ?';
    const params = [status];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';
    const alerts = db.prepare(query).all(...params);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single alert
app.get('/api/alerts/:id', (req, res) => {
  try {
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new alert
app.post('/api/alerts', (req, res) => {
  try {
    const { latitude, longitude, category, description, severity = 'medium' } = req.body;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({ error: 'latitude, longitude, and category are required' });
    }

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const stmt = db.prepare(`
      INSERT INTO alerts (id, latitude, longitude, category, description, severity, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, latitude, longitude, category, description, severity, expiresAt);

    const newAlert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
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

// Delete alert
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

// Get categories
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
