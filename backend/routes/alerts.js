const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { dispatchAlert } = require('../utils/alertService');

const router = express.Router();

// GET /api/alerts — list alerts for authenticated beekeeper
router.get('/', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const alerts = db.prepare(
    'SELECT * FROM alerts WHERE beekeeper_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  res.json(alerts);
});

// GET /api/alerts/unacknowledged-count — count of unacknowledged alerts for badge
router.get('/unacknowledged-count', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const result = db.prepare(
    "SELECT COUNT(*) as count FROM alerts WHERE beekeeper_id = ? AND status = 'sent'"
  ).get(req.user.id);
  res.json({ count: result?.count || 0 });
});

// POST /api/alerts/:id/acknowledge — mark alert as acknowledged
router.post('/:id/acknowledge', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  db.prepare(
    "UPDATE alerts SET status = 'acknowledged' WHERE id = ? AND beekeeper_id = ?"
  ).run(req.params.id, req.user.id);
  res.json({ success: true });
});

// GET /api/alerts/all — all unacknowledged alerts system-wide (KVIC only)
router.get('/all', authenticateToken, requireRole('kvic'), (req, res) => {
  const db = req.db;
  const alerts = db.prepare(`
    SELECT a.*, u.name as beekeeper_name, u.village, u.cluster
    FROM alerts a
    JOIN users u ON a.beekeeper_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all();

  const unacknowledged = alerts.filter(a => a.status === 'sent');
  const criticalCount = unacknowledged.filter(a => a.severity === 'critical').length;
  const warningCount = unacknowledged.filter(a => a.severity === 'warning').length;

  res.json({ alerts, criticalCount, warningCount, total: alerts.length });
});

// POST /api/alerts — create a new alert (called from detection endpoints)
router.post('/', authenticateToken, requireRole('beekeeper'), async (req, res) => {
  const db = req.db;
  const { alertType, result, confidence, hiveId } = req.body;
  const alert = await dispatchAlert(db, {
    beekeeperId: req.user.id,
    hiveId,
    alertType,
    detectionResult: result,
    confidence
  });
  res.json(alert);
});

module.exports = router;
