const express = require('express');

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes
// Otherwise Express matches /:batchId with "5/report" as the batchId

// GET /api/verify/:batchId/report — full verification report (public)
router.get('/:batchId/report', (req, res) => {
  const db = req.db;
  const batchId = parseInt(req.params.batchId);
  const report = db.prepare('SELECT * FROM verification_reports WHERE batch_id = ? ORDER BY id DESC LIMIT 1').get(batchId);
  if (!report) return res.status(404).json({ error: 'No verification report found for this batch' });
  res.json({
    batchId: report.batch_id,
    floralSourceMatch: !!report.floral_source_match,
    timingMatch: !!report.timing_match,
    ndviSupport: !!report.ndvi_support,
    nirWithinRange: !!report.nir_within_range,
    pollenAvailable: !!report.pollen_available,
    riskScore: report.risk_score,
    riskBand: report.risk_band,
    explanationText: report.explanation_text,
    checksDetail: JSON.parse(report.checks_detail || '{}'),
    createdAt: report.created_at
  });
});

// GET /api/verify/:batchId/chain — just the hash chain
router.get('/:batchId/chain', (req, res) => {
  const db = req.db;
  const entries = db.prepare(
    'SELECT step, prev_hash, current_hash, timestamp FROM ledger_entries WHERE batch_id = ? ORDER BY id'
  ).all(parseInt(req.params.batchId));
  res.json(entries);
});

// GET /api/verify/:batchId — public consumer verification (no auth needed)
router.get('/:batchId', (req, res) => {
  const db = req.db;
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(parseInt(req.params.batchId));
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  // SIMULATED-JOIN: query batch then look up user (JSON DB has no JOIN support)
  const user = db.prepare('SELECT name, village, cluster FROM users WHERE id = ?').get(batch.beekeeper_id);

  // Get ledger trail
  const ledgerEntries = db.prepare(
    'SELECT * FROM ledger_entries WHERE batch_id = ? ORDER BY id'
  ).all(batch.id);

  // Get verification report if available
  const report = db.prepare('SELECT * FROM verification_reports WHERE batch_id = ? ORDER BY id DESC LIMIT 1').get(batch.id);

  res.json({
    batch: {
      id: batch.id,
      beekeeperName: user ? user.name : 'Unknown',
      village: user ? user.village : '',
      cluster: user ? user.cluster : '',
      harvestDate: batch.harvest_date,
      floralSource: batch.floral_source,
      quantityKg: batch.quantity_kg,
      status: batch.status,
      flagReason: batch.flag_reason,
      location: { lat: batch.location_lat, lng: batch.location_lng }
    },
    ledger: ledgerEntries.map(e => ({
      step: e.step,
      data: JSON.parse(e.data),
      prevHash: e.prev_hash,
      currentHash: e.current_hash,
      timestamp: e.timestamp
    })),
    report: report ? {
      floralSourceMatch: !!report.floral_source_match,
      timingMatch: !!report.timing_match,
      ndviSupport: !!report.ndvi_support,
      nirWithinRange: !!report.nir_within_range,
      pollenAvailable: !!report.pollen_available,
      riskScore: report.risk_score,
      riskBand: report.risk_band,
      explanationText: report.explanation_text,
      checksDetail: JSON.parse(report.checks_detail || '{}')
    } : null
  });
});

module.exports = router;
