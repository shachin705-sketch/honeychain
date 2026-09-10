const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// GET /api/consumer/purchases — batches this consumer has ordered
router.get('/purchases', authenticateToken, requireRole('consumer'), (req, res) => {
  const db = req.db;
  const userId = req.user.id;

  const orders = db.prepare('SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC').all(userId);

  const purchases = orders.map(order => {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(order.batch_id);
    const beekeeper = batch ? db.prepare('SELECT name, village, cluster FROM users WHERE id = ?').get(batch.beekeeper_id) : null;
    const report = db.prepare('SELECT risk_score, risk_band, explanation_text FROM verification_reports WHERE batch_id = ?').get(order.batch_id);
    return {
      orderId: order.order_id,
      batchId: order.batch_id,
      status: order.order_status,
      quantity: order.quantity,
      totalPrice: order.price,
      createdAt: order.created_at,
      floralSource: batch?.floral_source || 'Unknown',
      harvestDate: batch?.harvest_date || '',
      beekeeperName: beekeeper?.name || 'Unknown',
      village: beekeeper?.village || '',
      riskBand: report?.risk_band || 'UNKNOWN',
      riskScore: report?.risk_score ?? -1,
    };
  });

  res.json(purchases);
});

// GET /api/consumer/orders — full order list with status detail
router.get('/orders', authenticateToken, requireRole('consumer'), (req, res) => {
  const db = req.db;
  const userId = req.user.id;

  const orders = db.prepare('SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC').all(userId);

  const enriched = orders.map(order => {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(order.batch_id);
    const beekeeper = batch ? db.prepare('SELECT name, village FROM users WHERE id = ?').get(batch.beekeeper_id) : null;
    const statusDetail = JSON.parse(order.order_status_detail || '{}');
    return {
      orderId: order.order_id,
      batchId: order.batch_id,
      floralSource: batch?.floral_source || 'Unknown',
      beekeeperName: beekeeper?.name || 'Unknown',
      quantity: order.quantity,
      totalPrice: order.price,
      status: order.order_status,
      statusDetail,
      createdAt: order.created_at,
    };
  });

  res.json(enriched);
});

// POST /api/consumer/favorite/:beekeeperId — toggle follow/unfollow
router.post('/favorite/:beekeeperId', authenticateToken, requireRole('consumer'), (req, res) => {
  const db = req.db;
  const userId = req.user.id;
  const bkId = parseInt(req.params.beekeeperId);

  const user = db.prepare('SELECT favorites FROM users WHERE id = ?').get(userId);
  let favs = JSON.parse(user.favorites || '[]');

  if (favs.includes(bkId)) {
    favs = favs.filter(id => id !== bkId);
  } else {
    favs.push(bkId);
  }

  db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(JSON.stringify(favs), userId);

  res.json({ favorites: favs, following: favs.includes(bkId) });
});

// GET /api/consumer/favorites — list followed beekeepers + their latest harvests
router.get('/favorites', authenticateToken, requireRole('consumer'), (req, res) => {
  const db = req.db;
  const userId = req.user.id;

  const user = db.prepare('SELECT favorites FROM users WHERE id = ?').get(userId);
  const favIds = JSON.parse(user.favorites || '[]');

  const favorites = favIds.map(bkId => {
    const beekeeper = db.prepare('SELECT id, name, village, cluster FROM users WHERE id = ?').get(bkId);
    if (!beekeeper) return null;

    const latestBatch = db.prepare('SELECT * FROM batches WHERE beekeeper_id = ? ORDER BY harvest_date DESC LIMIT 1').get(bkId);
    const report = latestBatch ? db.prepare('SELECT risk_score, risk_band FROM verification_reports WHERE batch_id = ?').get(latestBatch.id) : null;

    return {
      ...beekeeper,
      latestBatch: latestBatch ? {
        batchId: latestBatch.id,
        floralSource: latestBatch.floral_source,
        harvestDate: latestBatch.harvest_date,
        quantityKg: latestBatch.quantity_kg,
        status: latestBatch.status,
        riskBand: report?.risk_band || 'UNKNOWN',
      } : null,
    };
  }).filter(Boolean);

  res.json(favorites);
});

// GET /api/consumer/stats — trust score history, points, badges
router.get('/stats', authenticateToken, requireRole('consumer'), (req, res) => {
  const db = req.db;
  const userId = req.user.id;

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders WHERE buyer_id = ?').get(userId);
  const totalScans = db.prepare('SELECT COUNT(*) as c FROM consumer_scans WHERE consumer_id = ?').get(userId);

  // Trust score history: average risk score of all verified purchases over time
  const orders = db.prepare('SELECT batch_id, created_at FROM orders WHERE buyer_id = ? ORDER BY created_at').all(userId);
  const trustHistory = orders.map(order => {
    const report = db.prepare('SELECT risk_score, risk_band FROM verification_reports WHERE batch_id = ?').get(order.batch_id);
    return {
      date: order.created_at,
      riskScore: report?.risk_score ?? 50,
      riskBand: report?.risk_band || 'UNKNOWN',
    };
  });

  const points = user?.points || 0;
  let badge = 'Bronze';
  if (points > 150) badge = 'Gold';
  else if (points > 50) badge = 'Silver';

  res.json({
    points,
    badge,
    totalOrders: totalOrders?.c || 0,
    totalScans: totalScans?.c || 0,
    trustHistory,
  });
});

// POST /api/consumer/scan — record a QR scan
router.post('/scan', authenticateToken, requireRole('consumer'), (req, res) => {
  const db = req.db;
  const userId = req.user.id;
  const { batchId } = req.body;

  if (!batchId) return res.status(400).json({ error: 'batchId is required' });

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(parseInt(batchId));
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const now = new Date().toISOString();
  db.prepare('INSERT INTO consumer_scans (consumer_id, batch_id, scanned_at) VALUES (?, ?, ?)')
    .run(userId, batch.id, now);

  // 5 points per scan
  db.prepare('UPDATE users SET points = points + 5 WHERE id = ?').run(userId);

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);

  res.json({ batchId: batch.id, scannedAt: now, points: user.points });
});

module.exports = router;
