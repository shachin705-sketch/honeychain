const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/beekeeper/batches — list beekeeper's harvests
router.get('/batches', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const batches = db.prepare('SELECT * FROM batches WHERE beekeeper_id = ? ORDER BY created_at DESC').all(req.user.id);
  const user = db.prepare('SELECT name, village FROM users WHERE id = ?').get(req.user.id);
  const enriched = batches.map(b => ({ ...b, beekeeper_name: user?.name || '', village: user?.village || '' }));
  res.json(enriched);
});

// POST /api/beekeeper/batches — log a new harvest
router.post('/batches', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const { location_lat, location_lng, location_region, harvest_date, floral_source, quantity_kg } = req.body;
  if (!harvest_date || !floral_source || !quantity_kg) {
    return res.status(400).json({ error: 'harvest_date, floral_source, and quantity_kg are required' });
  }

  const validSources = ['mustard', 'wildflower', 'eucalyptus', 'litchi', 'jamun', 'multiflora'];
  if (!validSources.includes(floral_source)) {
    return res.status(400).json({ error: 'Invalid floral source' });
  }

  const db = req.db;
  const result = db.prepare(
    'INSERT INTO batches (beekeeper_id, location_lat, location_lng, location_region, harvest_date, floral_source, quantity_kg, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, location_lat || 0, location_lng || 0, location_region || '', harvest_date, floral_source, quantity_kg, 'pending', new Date().toISOString());

  // Append harvest entry to ledger
  const { computeHash } = require('../utils/hashChain');
  const batchId = result.lastInsertRowid;
  const prevHash = '0'.repeat(64);
  const ledgerData = { batchId, step: 'harvest', beekeeperId: req.user.id, floral_source, quantity_kg, harvest_date };
  const currentHash = computeHash(prevHash, ledgerData);
  db.prepare('INSERT INTO ledger_entries (batch_id, step, prev_hash, data, current_hash) VALUES (?, ?, ?, ?, ?)')
    .run(batchId, 'harvest', prevHash, JSON.stringify(ledgerData), currentHash);

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
  res.json(batch);
});

// GET /api/beekeeper/forecast/:beekeeperId — AI productivity forecast (SIMULATED)
router.get('/forecast/:beekeeperId', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const batches = db.prepare(
    "SELECT quantity_kg, harvest_date FROM batches WHERE beekeeper_id = ? AND status = 'verified' ORDER BY harvest_date"
  ).all(parseInt(req.params.beekeeperId));

  const totalYield = batches.reduce((sum, b) => sum + b.quantity_kg, 0);
  const avgYield = batches.length > 0 ? totalYield / batches.length : 10;

  const forecast = [];
  const now = new Date();
  for (let i = 1; i <= 4; i++) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() + i * 7);
    const month = weekDate.getMonth();
    const seasonalFactor = 1 + 0.3 * Math.sin((month - 2) * Math.PI / 6);
    const predicted = +(avgYield * seasonalFactor * (0.85 + Math.random() * 0.3)).toFixed(1);
    forecast.push({ week: `Week ${i}`, date: weekDate.toISOString().split('T')[0], predictedYield: predicted });
  }

  res.json({
    historicalAvgYield: +avgYield.toFixed(1),
    totalBatches: batches.length,
    forecast,
    note: 'SIMULATED — ML model placeholder. Production uses LSTM with weather+bloom inputs.'
  });
});

// GET /api/beekeeper/hive-health — summary of hive health scores
router.get('/hive-health', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const latest = db.prepare(
    'SELECT weight_kg, temperature, humidity, acoustic_score FROM hive_sensor_data WHERE beekeeper_id = ? ORDER BY day_index DESC LIMIT 1'
  ).get(req.user.id);

  const allRecent = db.prepare(
    'SELECT acoustic_score FROM hive_sensor_data WHERE beekeeper_id = ? AND day_index >= 25'
  ).all(req.user.id);
  const avgAcoustic = allRecent.length > 0 ? allRecent.reduce((s, r) => s + r.acoustic_score, 0) / allRecent.length : 60;

  const healthScore = latest
    ? Math.min(100, Math.max(0, Math.round(
        avgAcoustic * 0.4 +
        (latest.temperature >= 25 && latest.temperature <= 38 ? 30 : 10) +
        (latest.humidity >= 40 && latest.humidity <= 70 ? 30 : 10)
      )))
    : 0;

  res.json({ latest, healthScore, status: healthScore >= 70 ? 'Healthy' : healthScore >= 40 ? 'Needs Attention' : 'Critical' });
});

module.exports = router;
