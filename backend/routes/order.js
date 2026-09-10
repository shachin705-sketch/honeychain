const express = require('express');
const { generateOrderQR } = require('../utils/qrGenerator');
const { computeHash } = require('../utils/hashChain');
const crypto = require('crypto');

const router = express.Router();

const GRADE_PRICES = { S: 750, A: 600, B: 450 };

function getGradeAndPrice(batch) {
  if (batch.status === 'verified') {
    const spectralData = JSON.parse(batch.spectral_data || '{}');
    if (spectralData.moisture < 16 && spectralData.hmf_level < 15) return { grade: 'S', price: GRADE_PRICES.S };
    else if (spectralData.moisture < 18) return { grade: 'A', price: GRADE_PRICES.A };
    return { grade: 'B', price: GRADE_PRICES.B };
  }
  return { grade: 'N/A', price: 0 };
}

// POST /api/order/:batchId — place a demo order + append stage 9 to ledger
router.post('/:batchId', (req, res) => {
  const db = req.db;
  const { buyer_name, buyer_address, buyer_phone, quantity, buyer_id } = req.body;
  if (!buyer_name || !buyer_address || !buyer_phone || !quantity) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(parseInt(req.params.batchId));
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const user = db.prepare('SELECT name, village FROM users WHERE id = ?').get(batch.beekeeper_id);

  const { grade, price } = getGradeAndPrice(batch);
  if (batch.status !== 'verified') {
    return res.status(400).json({ error: 'Cannot order unverified batches' });
  }

  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const totalPrice = price * quantity;
  const now = new Date().toISOString();

  const orderStatusDetail = JSON.stringify({
    placed: now,
    packed: null,
    dispatched: null,
    delivered: null
  });

  const result = db.prepare(
    'INSERT INTO orders (batch_id, buyer_id, buyer_name, buyer_address, buyer_phone, quantity, price, order_id, order_status, order_status_detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(batch.id, buyer_id || null, buyer_name, buyer_address, buyer_phone, quantity, totalPrice, orderId, 'confirmed', orderStatusDetail, now);

  // Append stage 9 (consumer_purchase) to batch ledger
  const lastEntry = db.prepare('SELECT current_hash FROM ledger_entries WHERE batch_id = ? ORDER BY id DESC LIMIT 1').get(batch.id);
  const prevHash = lastEntry ? lastEntry.current_hash : '0'.repeat(64);

  const stageData = { batchId: batch.id, step: 'consumer_purchase', orderId, buyerName: buyer_name, timestamp: now };
  const currentHash = computeHash(prevHash, stageData);

  db.prepare('INSERT INTO ledger_entries (batch_id, step, prev_hash, data, current_hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
    .run(batch.id, 'consumer_purchase', prevHash, JSON.stringify(stageData), currentHash, now);

  // Add reward points if buyer_id provided
  if (buyer_id) {
    const points = Math.round(totalPrice / 10);
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, buyer_id);
  }

  res.json({
    orderId,
    batchId: batch.id,
    floralSource: batch.floral_source,
    beekeeperName: user?.name || 'Unknown',
    village: user?.village || '',
    grade,
    pricePerKg: price,
    quantity,
    totalPrice,
    status: 'confirmed',
    rewardPoints: buyer_id ? Math.round(totalPrice / 10) : 0
  });
});

// GET /api/order/qr/:orderId — generate reorder QR
router.get('/qr/:orderId', async (req, res) => {
  const db = req.db;
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const qr = await generateOrderQR(order.order_id, order.batch_id);
  res.json({ orderId: order.order_id, ...qr });
});

module.exports = router;
