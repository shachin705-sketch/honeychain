const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { dispatchAlert } = require('../utils/alertService');

const router = express.Router();

// GET /api/hive/sensor-data/:beekeeperId — rolling 30-day sensor history
router.get('/sensor-data/:beekeeperId', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const data = db.prepare(`
    SELECT * FROM hive_sensor_data
    WHERE beekeeper_id = ? ORDER BY day_index
  `).all(req.params.beekeeperId);
  res.json(data);
});

// POST /api/hive/advance-day — append current day's readings
router.post('/advance-day', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const { weight_kg, temperature, humidity, acoustic_score } = req.body;
  const db = req.db;

  // Get current max day index
  const last = db.prepare(
    'SELECT MAX(day_index) as max_day FROM hive_sensor_data WHERE beekeeper_id = ?'
  ).get(req.user.id);
  const nextDay = (last.max_day !== null ? last.max_day : -1) + 1;

  db.prepare(
    'INSERT INTO hive_sensor_data (beekeeper_id, day_index, weight_kg, temperature, humidity, acoustic_score) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, nextDay, weight_kg, temperature, humidity, acoustic_score);

  // Keep only last 30 days
  db.prepare(
    'DELETE FROM hive_sensor_data WHERE beekeeper_id = ? AND day_index < ?'
  ).run(req.user.id, Math.max(0, nextDay - 29));

  res.json({ success: true, dayIndex: nextDay });
});

// POST /api/hive/digital-twin — rule-based colony health prediction
router.post('/digital-twin', authenticateToken, requireRole('beekeeper'), async (req, res) => {
  const { weight_kg, temperature, humidity, acoustic_score, history } = req.body;
  const db = req.db;

  // SIMULATED — In production, this would use a real digital twin model
  // with coupled differential equations for colony population dynamics,
  // thermoregulation, and foraging behavior.
  let prediction = '';
  let reasoning = '';
  let riskLevel = 'low';

  const recentWeights = (history || []).slice(-10).map(h => h.weight_kg);
  const recentAcoustics = (history || []).slice(-5).map(h => h.acoustic_score);
  const avgAcoustic = recentAcoustics.length > 0
    ? recentAcoustics.reduce((a, b) => a + b, 0) / recentAcoustics.length
    : acoustic_score;

  // Simple linear regression for weight trend
  let weightSlope = 0;
  if (recentWeights.length >= 3) {
    const n = recentWeights.length;
    const xMean = (n - 1) / 2;
    const yMean = recentWeights.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    recentWeights.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) * (x - xMean);
    });
    weightSlope = den !== 0 ? num / den : 0;
  }

  if (weightSlope < -0.3 && avgAcoustic > 70) {
    prediction = 'Risk: Possible Swarming in 1-2 weeks';
    reasoning = `Weight declining at ${weightSlope.toFixed(2)} kg/day with high acoustic activity (${avgAcoustic.toFixed(0)}). This pattern suggests colony agitation and preparation for swarming.`;
    riskLevel = 'high';
  } else if (humidity > 75 && weightSlope < -0.1) {
    prediction = 'Risk: Possible Disease/Stress — recommend inspection';
    reasoning = `High humidity (${humidity}%) combined with weight decline. Conditions favorable for nosema or other stress factors.`;
    riskLevel = 'high';
  } else if (weightSlope < -0.2) {
    prediction = 'Caution: Weight declining — monitor feeding';
    reasoning = `Gradual weight loss detected (${weightSlope.toFixed(2)} kg/day). Check if adequate floral forage is available or supplemental feeding needed.`;
    riskLevel = 'medium';
  } else if (avgAcoustic < 20) {
    prediction = 'Warning: Low acoustic activity — possible queenlessness';
    reasoning = `Acoustic score averaging ${avgAcoustic.toFixed(0)} is unusually low. Healthy colonies maintain consistent buzzing from brood rearing and foraging.`;
    riskLevel = 'medium';
  } else {
    prediction = 'Colony Health: Stable';
    reasoning = `Weight trend: ${weightSlope >= 0 ? 'stable/gaining' : 'slight decline'} (${weightSlope.toFixed(2)} kg/day). Acoustic activity normal (${avgAcoustic.toFixed(0)}). Temperature and humidity within optimal range.`;
    riskLevel = 'low';
  }

  console.log(`[IOT-DETECT] prediction="${prediction}" | riskLevel=${riskLevel} | alertTriggered=${prediction.startsWith('Risk:') || prediction.startsWith('Warning:')}`);

  let alert = null;
  if (prediction.startsWith('Risk:') || prediction.startsWith('Warning:')) {
    alert = await dispatchAlert(db, {
      beekeeperId: req.user.id,
      hiveId: req.body.hiveId || `HIVE-${req.user.id}`,
      alertType: 'iot_risk',
      detectionResult: prediction
    });
  }

  res.json({ prediction, reasoning, riskLevel, weightSlope: +weightSlope.toFixed(3), avgAcoustic: +avgAcoustic.toFixed(1), alert });
});

module.exports = router;
