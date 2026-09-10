const express = require('express');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { computeHash } = require('../utils/hashChain');
const { generateBatchQR } = require('../utils/qrGenerator');
const { getExpectedFloralSources } = require('../data/bloomCalendar');
const { runCrossVerification } = require('../utils/crossVerification');

const router = express.Router();

// GET /api/admin/batches — all batches
router.get('/batches', authenticateToken, requireRole('admin'), (req, res) => {
  const db = req.db;
  const batches = db.prepare('SELECT * FROM batches ORDER BY created_at DESC').all();
  const enriched = batches.map(b => {
    const user = db.prepare('SELECT name, village, cluster FROM users WHERE id = ?').get(b.beekeeper_id);
    return { ...b, beekeeper_name: user?.name || 'Unknown', village: user?.village || '', cluster: user?.cluster || '' };
  });
  res.json(enriched);
});

// POST /api/admin/spectral-scan — submit or auto-generate NIR readings
router.post('/spectral-scan', authenticateToken, requireRole('admin'), (req, res) => {
  const { batchId, moisture, sugar_ratio, hmf_level, auto_generate } = req.body;

  let readings;
  if (auto_generate) {
    const isGood = Math.random() > 0.3;
    readings = {
      moisture: isGood ? +(14 + Math.random() * 5).toFixed(1) : +(20 + Math.random() * 5).toFixed(1),
      sugar_ratio: isGood ? +(78 + Math.random() * 10).toFixed(1) : +(65 + Math.random() * 10).toFixed(1),
      hmf_level: isGood ? +(8 + Math.random() * 15).toFixed(1) : +(40 + Math.random() * 15).toFixed(1)
    };
  } else {
    if (moisture == null || sugar_ratio == null || hmf_level == null) {
      return res.status(400).json({ error: 'moisture, sugar_ratio, and hmf_level are required (or use auto_generate: true)' });
    }
    readings = { moisture, sugar_ratio, hmf_level };
  }

  const db = req.db;
  db.prepare('UPDATE batches SET spectral_data = ? WHERE id = ?')
    .run(JSON.stringify(readings), parseInt(batchId));

  res.json({ batchId, spectralData: readings });
});

// POST /api/admin/verify/:batchId — run verification, create stages 2-6
router.post('/verify/:batchId', authenticateToken, requireRole('admin'), (req, res) => {
  const db = req.db;
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(parseInt(req.params.batchId));
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  // Accept manual spectral values from request body, falling back to DB values
  let spectralData = JSON.parse(batch.spectral_data || '{}');
  if (req.body.moisture != null || req.body.sugar_ratio != null || req.body.hmf_level != null) {
    spectralData = {
      moisture: req.body.moisture != null ? req.body.moisture : spectralData.moisture,
      sugar_ratio: req.body.sugar_ratio != null ? req.body.sugar_ratio : spectralData.sugar_ratio,
      hmf_level: req.body.hmf_level != null ? req.body.hmf_level : spectralData.hmf_level
    };
    db.prepare('UPDATE batches SET spectral_data = ? WHERE id = ?')
      .run(JSON.stringify(spectralData), batch.id);
  }

  if (spectralData.moisture == null) {
    return res.status(400).json({ error: 'Run spectral scan first' });
  }

  const harvestDate = new Date(batch.harvest_date);
  const month = harvestDate.getMonth() + 1;

  // Run full cross-verification using the dedicated utility
  const claim = {
    region: batch.location_region,
    month,
    floralSource: batch.floral_source,
    harvestDate: batch.harvest_date
  };
  const crossResult = runCrossVerification(claim, spectralData);

  const status = crossResult.riskBand === 'VERIFIED_AUTHENTIC' ? 'verified' : 'flagged';
  const flagReason = crossResult.explanationText;
  const now = new Date().toISOString();

  // Insert verification report
  db.prepare(
    'INSERT INTO verification_reports (batch_id, floral_source_match, timing_match, ndvi_support, nir_within_range, pollen_available, risk_score, risk_band, explanation_text, checks_detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    batch.id,
    crossResult.floralSourceMatch ? 1 : 0,
    crossResult.timingMatch ? 1 : 0,
    crossResult.ndviSupport ? 1 : 0,
    crossResult.nirWithinRange ? 1 : 0,
    crossResult.pollenAvailable ? 1 : 0,
    crossResult.riskScore,
    crossResult.riskBand,
    crossResult.explanationText,
    JSON.stringify(crossResult.checksDetail),
    now
  );

  // Query back the report for the response
  const reportRow = db.prepare('SELECT * FROM verification_reports WHERE batch_id = ? ORDER BY id DESC LIMIT 1').get(batch.id);
  const report = reportRow ? {
    floralSourceMatch: !!reportRow.floral_source_match,
    timingMatch: !!reportRow.timing_match,
    ndviSupport: !!reportRow.ndvi_support,
    nirWithinRange: !!reportRow.nir_within_range,
    pollenAvailable: !!reportRow.pollen_available,
    riskScore: reportRow.risk_score,
    riskBand: reportRow.risk_band,
    explanationText: reportRow.explanation_text,
    checksDetail: JSON.parse(reportRow.checks_detail || '{}')
  } : null;

  db.prepare('UPDATE batches SET status = ?, flag_reason = ?, qr_generated = ? WHERE id = ?')
    .run(status, flagReason, status === 'verified' ? 1 : 0, batch.id);

  if (status === 'verified') {
    const centerName = req.body.centerName || 'Priya Collection Center';
    const labName = req.body.labName || 'KVIC Certified Lab - Karnal';
    const staffId = req.body.staffId || 'LAB-STAFF-007';

    const steps = [
      { step: 'collection', data: { batchId: batch.id, step: 'collection', centerName, centerId: 'CC-HR-001', dateReceived: now, quantityReceived: batch.quantity_kg, conditionNotes: 'Sealed drums, temperature controlled' } },
      { step: 'testing', data: { batchId: batch.id, step: 'testing', ...spectralData, testedByStaffId: staffId, testDate: now, labName } },
      { step: 'ai_verification', data: { batchId: batch.id, step: 'ai_verification', riskScore: crossResult.riskScore, riskBand: crossResult.riskBand, floralMatch: crossResult.floralSourceMatch, timingMatch: crossResult.timingMatch, ndviSupport: crossResult.ndviSupport, nirRange: crossResult.nirWithinRange, explanation: flagReason } },
      { step: 'processing', data: { batchId: batch.id, step: 'processing', method: 'raw', processDate: now, facilityId: 'PROC-PB-001', facilityName: 'KVIC Honey Processing Unit', batchSplitInfo: 'Single batch' } },
      { step: 'packaging', data: { batchId: batch.id, step: 'packaging', packageDate: now, jarSize: '500g', facility: 'KVIC Certified Packaging', nfcSealId: 'NFC-' + crypto.randomBytes(6).toString('hex').toUpperCase() } }
    ];

    const lastEntry = db.prepare('SELECT current_hash FROM ledger_entries WHERE batch_id = ? ORDER BY id DESC LIMIT 1').get(batch.id);
    let prevHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);

    steps.forEach(s => {
      const currentHash = computeHash(prevHash, s.data);
      db.prepare('INSERT INTO ledger_entries (batch_id, step, prev_hash, data, current_hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
        .run(batch.id, s.step, prevHash, JSON.stringify(s.data), currentHash, now);
      prevHash = currentHash;
    });
  }

  res.json({ batchId: batch.id, status, flagReason, spectralData, report });
});

// POST /api/admin/batch/:batchId/stage — append a ledger stage to a batch
router.post('/batch/:batchId/stage', authenticateToken, requireRole('admin'), (req, res) => {
  const db = req.db;
  const batchId = parseInt(req.params.batchId);
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const { step, data } = req.body;
  const allowedSteps = ['distribution', 'retail', 'processing', 'packaging'];
  if (!step || !allowedSteps.includes(step)) {
    return res.status(400).json({ error: `Step must be one of: ${allowedSteps.join(', ')}` });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Data object is required' });
  }

  data.batchId = batchId;
  data.step = step;

  const lastEntry = db.prepare('SELECT current_hash FROM ledger_entries WHERE batch_id = ? ORDER BY id DESC LIMIT 1').get(batchId);
  const prevHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);
  const now = new Date().toISOString();
  const currentHash = computeHash(prevHash, data);

  db.prepare('INSERT INTO ledger_entries (batch_id, step, prev_hash, data, current_hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(batchId, step, prevHash, JSON.stringify(data), currentHash, now);

  res.json({ batchId, step, timestamp: now, hash: currentHash });
});

// GET /api/admin/qr/:batchId — generate QR code
router.get('/qr/:batchId', authenticateToken, requireRole('admin'), async (req, res) => {
  const db = req.db;
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(parseInt(req.params.batchId));
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status !== 'verified') return res.status(400).json({ error: 'Can only generate QR for verified batches' });

  const qr = await generateBatchQR(batch.id);
  res.json({ batchId: batch.id, ...qr });
});

module.exports = router;
