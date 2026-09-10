const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { dispatchAlert } = require('../utils/alertService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// SIMULATED — deterministic mock based on file signature.
// Production uses a trained CNN classifier (fine-tuned ResNet) for images
// and a trained audio classifier (YAMNet/VGGish) for audio, both run on
// actual image/audio content via a model serving endpoint.

const AUDIO_LABELS = [
  'Healthy Hive Sound Pattern',
  'Queenless Colony Signature Detected — recommend requeening check',
  'Swarming Precursor Sound Detected — inspect within 48 hours',
  'Excessive Stress/Agitation Sound — possible pest intrusion (Varroa/wax moth)'
];
const AUDIO_WEIGHTS = [70, 15, 10, 5];

const IMAGE_LABELS = [
  'Healthy — no disease indicators detected',
  'Possible Foulbrood Signs — consult apiary officer immediately',
  'Wax Moth Activity Detected — treat hive and inspect frames'
];
const IMAGE_WEIGHTS = [70, 20, 10];

function deterministicClassify(buffer, labels, weights) {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const outcome = hashInt % 100;
  const confBase = 70 + (parseInt(hash.substring(8, 12), 16) % 26);

  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (outcome < cumulative) {
      return { label: labels[i], confidence: confBase };
    }
  }
  return { label: labels[0], confidence: confBase };
}

// POST /api/hive/disease/audio — audio disease detection
router.post('/audio', authenticateToken, requireRole('beekeeper'), upload.single('audio'), async (req, res) => {
  try {
    process.stdout.write(`[ALERT-DEBUG] Audio handler ENTERED at ${new Date().toISOString()}\n`);
    console.log('[ALERT-DEBUG] Audio handler ENTERED');

    const db = req.db;
    const buffer = req.file ? require('fs').readFileSync(req.file.path) : Buffer.alloc(0);
    const { label, confidence } = deterministicClassify(buffer, AUDIO_LABELS, AUDIO_WEIGHTS);

    db.prepare(
      'INSERT INTO disease_logs (beekeeper_id, detection_type, result, confidence, raw_filename) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, 'audio', label, confidence, req.file?.originalname || 'recording.webm');

    process.stdout.write(`[ALERT-DEBUG] Audio label="${label}" healthy=${label.includes('Healthy')} willDispatch=${!label.includes('Healthy')}\n`);
    console.log(`[DISEASE-DETECT] type=audio | label="${label}" | confidence=${confidence} | alertTriggered=${!label.includes('Healthy')}`);

    let alert = null;
    if (!label.includes('Healthy')) {
      process.stdout.write(`[ALERT-DEBUG] Audio dispatchAlert CALLED — beekeeper=${req.user.id} type=disease_audio\n`);
      alert = await dispatchAlert(db, {
        beekeeperId: req.user.id,
        hiveId: req.body.hiveId || `HIVE-${req.user.id}`,
        alertType: 'disease_audio',
        detectionResult: label,
        confidence
      });
      process.stdout.write(`[ALERT-DEBUG] Audio dispatchAlert RETURNED — alertId=${alert?.alertId}\n`);
    }

    res.json({ result: label, confidence, type: 'audio', alert });
  } catch (err) {
    process.stdout.write(`[ALERT-DEBUG] Audio HANDLER CRASHED: ${err.stack}\n`);
    console.error('[DISEASE-ERROR]', err);
    res.status(500).json({ error: 'Audio detection failed', detail: err.message });
  }
});

// POST /api/hive/disease/image — image disease detection
router.post('/image', authenticateToken, requireRole('beekeeper'), upload.single('image'), async (req, res) => {
  try {
    process.stdout.write(`[ALERT-DEBUG] Image handler ENTERED at ${new Date().toISOString()}\n`);
    console.log('[ALERT-DEBUG] Image handler ENTERED');

    const db = req.db;
    const buffer = req.file ? require('fs').readFileSync(req.file.path) : Buffer.alloc(0);
    const { label, confidence } = deterministicClassify(buffer, IMAGE_LABELS, IMAGE_WEIGHTS);

    db.prepare(
      'INSERT INTO disease_logs (beekeeper_id, detection_type, result, confidence, raw_filename) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, 'image', label, confidence, req.file?.originalname || 'upload.jpg');

    process.stdout.write(`[ALERT-DEBUG] Image label="${label}" healthy=${label.includes('Healthy')} willDispatch=${!label.includes('Healthy')}\n`);
    console.log(`[DISEASE-DETECT] type=image | label="${label}" | confidence=${confidence} | alertTriggered=${!label.includes('Healthy')}`);

    let alert = null;
    if (!label.includes('Healthy')) {
      process.stdout.write(`[ALERT-DEBUG] Image dispatchAlert CALLED — beekeeper=${req.user.id} type=disease_image\n`);
      alert = await dispatchAlert(db, {
        beekeeperId: req.user.id,
        hiveId: req.body.hiveId || `HIVE-${req.user.id}`,
        alertType: 'disease_image',
        detectionResult: label,
        confidence
      });
      process.stdout.write(`[ALERT-DEBUG] Image dispatchAlert RETURNED — alertId=${alert?.alertId}\n`);
    }

    res.json({ result: label, confidence, type: 'image', alert });
  } catch (err) {
    process.stdout.write(`[ALERT-DEBUG] Image HANDLER CRASHED: ${err.stack}\n`);
    console.error('[DISEASE-ERROR]', err);
    res.status(500).json({ error: 'Image detection failed', detail: err.message });
  }
});

// GET /api/hive/disease-history — recent disease detections
router.get('/disease-history', authenticateToken, requireRole('beekeeper'), (req, res) => {
  const db = req.db;
  const logs = db.prepare(
    'SELECT * FROM disease_logs WHERE beekeeper_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.user.id);
  res.json(logs);
});

module.exports = router;
