const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function simpleHash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role = 'beekeeper', village = '', cluster = '', phone = '' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (!['beekeeper', 'admin', 'kvic', 'consumer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = req.db;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, village, cluster, phone) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, email, simpleHash(password), role, village, cluster, phone);

  const token = jwt.sign(
    { id: result.lastInsertRowid, name, email, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user: { id: result.lastInsertRowid, name, email, role, village, cluster } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = req.db;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.password_hash !== simpleHash(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, village: user.village, cluster: user.cluster }
  });
});

module.exports = router;
