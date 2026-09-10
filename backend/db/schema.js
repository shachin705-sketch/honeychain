const crypto = require('crypto');
const { computeHash } = require('../utils/hashChain');
const { initDB } = require('./jsonDb');
const { runCrossVerification } = require('../utils/crossVerification');

function simpleHash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function randomId(len = 8) {
  return crypto.randomBytes(len).toString('hex').toUpperCase();
}

function initDatabase() {
  const db = initDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      village TEXT DEFAULT '',
      cluster TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      favorites TEXT DEFAULT '[]',
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY,
      beekeeper_id INTEGER NOT NULL,
      location_lat REAL,
      location_lng REAL,
      location_region TEXT DEFAULT '',
      harvest_date TEXT NOT NULL,
      floral_source TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      flag_reason TEXT DEFAULT '',
      spectral_data TEXT DEFAULT '{}',
      qr_generated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY,
      batch_id INTEGER NOT NULL,
      step TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      data TEXT NOT NULL,
      current_hash TEXT NOT NULL,
      timestamp TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS hive_sensor_data (
      id INTEGER PRIMARY KEY,
      beekeeper_id INTEGER NOT NULL,
      day_index INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      temperature REAL NOT NULL,
      humidity REAL NOT NULL,
      acoustic_score REAL NOT NULL,
      recorded_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS disease_logs (
      id INTEGER PRIMARY KEY,
      beekeeper_id INTEGER NOT NULL,
      detection_type TEXT NOT NULL,
      result TEXT NOT NULL,
      confidence REAL NOT NULL,
      raw_filename TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      batch_id INTEGER NOT NULL,
      buyer_id INTEGER DEFAULT NULL,
      buyer_name TEXT NOT NULL,
      buyer_address TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      order_id TEXT UNIQUE NOT NULL,
      order_status TEXT DEFAULT 'confirmed',
      order_status_detail TEXT DEFAULT '{}',
      created_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_reports (
      id INTEGER PRIMARY KEY,
      batch_id INTEGER NOT NULL,
      floral_source_match INTEGER DEFAULT 0,
      timing_match INTEGER DEFAULT 0,
      ndvi_support INTEGER DEFAULT 0,
      nir_within_range INTEGER DEFAULT 0,
      pollen_available INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 0,
      risk_band TEXT DEFAULT '',
      explanation_text TEXT DEFAULT '',
      checks_detail TEXT DEFAULT '{}',
      created_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS consumer_scans (
      id INTEGER PRIMARY KEY,
      consumer_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      scanned_at TEXT DEFAULT ''
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY,
      beekeeper_id INTEGER NOT NULL,
      hive_id TEXT DEFAULT '',
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      detection_result TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      sms_details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT ''
    )
  `);

  return db;
}

function seedData(db) {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount && userCount.c > 0) return;

  const passHash = simpleHash('password123');
  const now = new Date().toISOString();

  // ── USERS ──
  const users = [
    { name: 'Rajesh Kumar', email: 'rajesh@demo.com', password_hash: passHash, role: 'beekeeper', village: 'Ludhiana', cluster: 'Punjab', phone: '9876543210', favorites: '[]', points: 0, created_at: now },
    { name: 'Lakshmi Nair', email: 'lakshmi@demo.com', password_hash: passHash, role: 'beekeeper', village: 'Wayanad', cluster: 'Kerala', phone: '9876543211', favorites: '[]', points: 0, created_at: now },
    { name: 'Arjun Singh', email: 'arjun@demo.com', password_hash: passHash, role: 'beekeeper', village: 'Lucknow', cluster: 'Uttar Pradesh', phone: '9876543212', favorites: '[]', points: 0, created_at: now },
    { name: 'Priya Sharma', email: 'priya@demo.com', password_hash: passHash, role: 'admin', village: 'Karnal', cluster: 'Haryana', phone: '9876543213', favorites: '[]', points: 0, created_at: now },
    { name: 'Dr. Meena Verma', email: 'meena@demo.com', password_hash: passHash, role: 'kvic', village: 'New Delhi', cluster: 'Delhi', phone: '9876543214', favorites: '[]', points: 0, created_at: now },
    { name: 'Anita Desai', email: 'anita@demo.com', password_hash: passHash, role: 'consumer', village: '', cluster: '', phone: '9876543220', favorites: JSON.stringify([1]), points: 20, created_at: now },
  ];

  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, village, cluster, phone, favorites, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  users.forEach(u => insertUser.run(u.name, u.email, u.password_hash, u.role, u.village, u.cluster, u.phone, u.favorites, u.points, u.created_at));

  // ── BATCHES ──
  const insertBatch = db.prepare(
    'INSERT INTO batches (beekeeper_id, location_lat, location_lng, location_region, harvest_date, floral_source, quantity_kg, status, flag_reason, spectral_data, qr_generated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  insertBatch.run(1, 30.9010, 75.8573, 'Punjab', '2026-03-15', 'mustard', 12.5, 'verified', '', JSON.stringify({ moisture: 17.2, sugar_ratio: 82.5, hmf_level: 12.3 }), 1, now);
  insertBatch.run(1, 30.9010, 75.8573, 'Punjab', '2026-07-10', 'eucalyptus', 8.3, 'verified', '', JSON.stringify({ moisture: 15.8, sugar_ratio: 85.1, hmf_level: 9.7 }), 1, now);
  insertBatch.run(2, 11.6854, 76.1320, 'Kerala', '2026-12-05', 'wildflower', 15.0, 'verified', '', JSON.stringify({ moisture: 18.1, sugar_ratio: 79.8, hmf_level: 15.2 }), 1, now);
  insertBatch.run(3, 26.8467, 80.9462, 'Uttar Pradesh', '2026-08-20', 'mustard', 10.0, 'flagged', 'MISMATCH - Possible Mislabeling: mustard not in bloom for Uttar Pradesh in August', JSON.stringify({ moisture: 19.5, sugar_ratio: 78.0, hmf_level: 18.0 }), 0, now);
  insertBatch.run(3, 26.8467, 80.9462, 'Uttar Pradesh', '2026-06-12', 'litchi', 7.5, 'flagged', 'ADULTERATION SUSPECTED: moisture 22.0% exceeds 20% threshold, HMF 45.0mg/kg exceeds 40mg/kg threshold', JSON.stringify({ moisture: 22.0, sugar_ratio: 71.5, hmf_level: 45.0 }), 0, now);
  insertBatch.run(1, 30.9010, 75.8573, 'Punjab', '2026-10-18', 'wildflower', 9.2, 'verified', '', JSON.stringify({ moisture: 19.0, sugar_ratio: 80.2, hmf_level: 16.5 }), 1, now);

  // ── 9-STAGE LEDGER ENTRIES FOR VERIFIED BATCHES ──
  const insertLedger = db.prepare('INSERT INTO ledger_entries (batch_id, step, prev_hash, data, current_hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)');

  function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }

  // Batch 1: Punjab mustard — full 9-stage chain
  const b1Stages = [
    { step: 'harvest', data: { batchId: 1, step: 'harvest', beekeeperName: 'Rajesh Kumar', village: 'Ludhiana', hiveId: 'HIVE-PB-042', gps: { lat: 30.9010, lng: 75.8573 }, harvestDate: '2026-03-15', floralSource: 'mustard', quantityKg: 12.5, photoPath: '/uploads/harvest-batch1.jpg' } },
    { step: 'collection', data: { batchId: 1, step: 'collection', centerName: 'Karnal Collection Center', centerId: 'CC-HR-001', dateReceived: '2026-03-16', quantityReceived: 12.5, conditionNotes: 'Sealed drums, temperature controlled, no damage' } },
    { step: 'testing', data: { batchId: 1, step: 'testing', moisture: 17.2, sugarRatio: 82.5, hmfLevel: 12.3, testedByStaffId: 'LAB-STAFF-007', testDate: '2026-03-17', labName: 'KVIC Certified Lab - Karnal' } },
    { step: 'ai_verification', data: { batchId: 1, step: 'ai_verification', riskScore: 0, riskBand: 'VERIFIED_AUTHENTIC', floralMatch: true, timingMatch: true, ndviSupport: true, nirRange: true, explanation: 'All cross-verification checks passed for mustard honey from Punjab' } },
    { step: 'processing', data: { batchId: 1, step: 'processing', method: 'raw', processDate: '2026-03-18', facilityId: 'PROC-PB-001', facilityName: 'Punjab Honey Processing Unit', batchSplitInfo: 'Single batch, no split' } },
    { step: 'packaging', data: { batchId: 1, step: 'packaging', packageDate: '2026-03-19', jarSize: '500g', facility: 'KVIC Certified Packaging - Ludhiana', nfcSealId: 'NFC-' + randomId(12) } },
    { step: 'distribution', data: { batchId: 1, step: 'distribution', distributorName: 'Northern India Honey Logistics', dispatchDate: '2026-03-20', destinationMarket: 'Chennai, Tamil Nadu' } },
    { step: 'retail', data: { batchId: 1, step: 'retail', outletName: 'KVIC Emporium - Chennai', dateStocked: '2026-03-22', shelfPrice: 750 } },
    { step: 'consumer_purchase', data: { batchId: 1, step: 'consumer_purchase', orderId: 'ORD-INITIAL-001', buyerName: 'Anita Desai', timestamp: daysAgo(2) } }
  ];

  // Batch 2: Punjab eucalyptus — full 9-stage chain
  const b2Stages = [
    { step: 'harvest', data: { batchId: 2, step: 'harvest', beekeeperName: 'Rajesh Kumar', village: 'Ludhiana', hiveId: 'HIVE-PB-018', gps: { lat: 30.9010, lng: 75.8573 }, harvestDate: '2026-07-10', floralSource: 'eucalyptus', quantityKg: 8.3, photoPath: '/uploads/harvest-batch2.jpg' } },
    { step: 'collection', data: { batchId: 2, step: 'collection', centerName: 'Karnal Collection Center', centerId: 'CC-HR-001', dateReceived: '2026-07-11', quantityReceived: 8.3, conditionNotes: 'Good condition, minor crystallization' } },
    { step: 'testing', data: { batchId: 2, step: 'testing', moisture: 15.8, sugarRatio: 85.1, hmfLevel: 9.7, testedByStaffId: 'LAB-STAFF-007', testDate: '2026-07-12', labName: 'KVIC Certified Lab - Karnal' } },
    { step: 'ai_verification', data: { batchId: 2, step: 'ai_verification', riskScore: 0, riskBand: 'VERIFIED_AUTHENTIC', floralMatch: true, timingMatch: true, ndviSupport: true, nirRange: true, explanation: 'All cross-verification checks passed for eucalyptus honey from Punjab' } },
    { step: 'processing', data: { batchId: 2, step: 'processing', method: 'filtered', processDate: '2026-07-13', facilityId: 'PROC-PB-001', facilityName: 'Punjab Honey Processing Unit', batchSplitInfo: 'Split into 2 x 4kg lots' } },
    { step: 'packaging', data: { batchId: 2, step: 'packaging', packageDate: '2026-07-14', jarSize: '250g x 32', facility: 'KVIC Certified Packaging - Ludhiana', nfcSealId: 'NFC-' + randomId(12) } },
    { step: 'distribution', data: { batchId: 2, step: 'distribution', distributorName: 'Northern India Honey Logistics', dispatchDate: '2026-07-15', destinationMarket: 'Mumbai, Maharashtra' } },
    { step: 'retail', data: { batchId: 2, step: 'retail', outletName: 'Khadi Gramodyog Store - Mumbai', dateStocked: '2026-07-17', shelfPrice: 600 } },
    { step: 'consumer_purchase', data: { batchId: 2, step: 'consumer_purchase', orderId: null, buyerName: null, timestamp: null } }
  ];

  // Batch 3: Kerala wildflower — full 9-stage chain
  const b3Stages = [
    { step: 'harvest', data: { batchId: 3, step: 'harvest', beekeeperName: 'Lakshmi Nair', village: 'Wayanad', hiveId: 'HIVE-KL-007', gps: { lat: 11.6854, lng: 76.1320 }, harvestDate: '2026-12-05', floralSource: 'wildflower', quantityKg: 15.0, photoPath: '/uploads/harvest-batch3.jpg' } },
    { step: 'collection', data: { batchId: 3, step: 'collection', centerName: 'Wayanad Honey Center', centerId: 'CC-KL-003', dateReceived: '2026-12-06', quantityReceived: 15.0, conditionNotes: 'Excellent condition, premium wildflower aroma' } },
    { step: 'testing', data: { batchId: 3, step: 'testing', moisture: 18.1, sugarRatio: 79.8, hmfLevel: 15.2, testedByStaffId: 'LAB-STAFF-012', testDate: '2026-12-07', labName: 'Kerala State Apiculture Lab - Kozhikode' } },
    { step: 'ai_verification', data: { batchId: 3, step: 'ai_verification', riskScore: 20, riskBand: 'VERIFIED_AUTHENTIC', floralMatch: true, timingMatch: true, ndviSupport: true, nirRange: true, explanation: 'Checks passed with minor NDVI variation for wildflower in December' } },
    { step: 'processing', data: { batchId: 3, step: 'processing', method: 'raw', processDate: '2026-12-08', facilityId: 'PROC-KL-002', facilityName: 'Kerala Organic Honey Processors', batchSplitInfo: 'Single batch, 15kg drums' } },
    { step: 'packaging', data: { batchId: 3, step: 'packaging', packageDate: '2026-12-09', jarSize: '500g', facility: 'KVIC Certified Packaging - Kozhikode', nfcSealId: 'NFC-' + randomId(12) } },
    { step: 'distribution', data: { batchId: 3, step: 'distribution', distributorName: 'South India Honey Exports', dispatchDate: '2026-12-10', destinationMarket: 'Bangalore, Karnataka' } },
    { step: 'retail', data: { batchId: 3, step: 'retail', outletName: 'Organic Store - Bangalore', dateStocked: '2026-12-12', shelfPrice: 850 } },
    { step: 'consumer_purchase', data: { batchId: 3, step: 'consumer_purchase', orderId: null, buyerName: null, timestamp: null } }
  ];

  // Batch 6: Punjab wildflower — full 9-stage chain
  const b6Stages = [
    { step: 'harvest', data: { batchId: 6, step: 'harvest', beekeeperName: 'Rajesh Kumar', village: 'Ludhiana', hiveId: 'HIVE-PB-055', gps: { lat: 30.9010, lng: 75.8573 }, harvestDate: '2026-10-18', floralSource: 'wildflower', quantityKg: 9.2, photoPath: '/uploads/harvest-batch6.jpg' } },
    { step: 'collection', data: { batchId: 6, step: 'collection', centerName: 'Karnal Collection Center', centerId: 'CC-HR-001', dateReceived: '2026-10-19', quantityReceived: 9.2, conditionNotes: 'Good condition, slight variation in color' } },
    { step: 'testing', data: { batchId: 6, step: 'testing', moisture: 19.0, sugarRatio: 80.2, hmfLevel: 16.5, testedByStaffId: 'LAB-STAFF-007', testDate: '2026-10-20', labName: 'KVIC Certified Lab - Karnal' } },
    { step: 'ai_verification', data: { batchId: 6, step: 'ai_verification', riskScore: 30, riskBand: 'REVIEW_RECOMMENDED', floralMatch: false, timingMatch: true, ndviSupport: true, nirRange: true, explanation: 'Wildflower not in primary bloom calendar for Punjab in October, but NDVI supports presence' } },
    { step: 'processing', data: { batchId: 6, step: 'processing', method: 'filtered', processDate: '2026-10-21', facilityId: 'PROC-PB-001', facilityName: 'Punjab Honey Processing Unit', batchSplitInfo: 'Single batch' } },
    { step: 'packaging', data: { batchId: 6, step: 'packaging', packageDate: '2026-10-22', jarSize: '500g', facility: 'KVIC Certified Packaging - Ludhiana', nfcSealId: 'NFC-' + randomId(12) } },
    { step: 'distribution', data: { batchId: 6, step: 'distribution', distributorName: 'Northern India Honey Logistics', dispatchDate: '2026-10-23', destinationMarket: 'Delhi NCR' } },
    { step: 'retail', data: { batchId: 6, step: 'retail', outletName: 'KVIC Megastore - Delhi', dateStocked: '2026-10-25', shelfPrice: 650 } },
    { step: 'consumer_purchase', data: { batchId: 6, step: 'consumer_purchase', orderId: null, buyerName: null, timestamp: null } }
  ];

  // Flagged batches (4, 5) — harvest + collection + testing + AI verification (flagged at AI stage)
  const b4Stages = [
    { step: 'harvest', data: { batchId: 4, step: 'harvest', beekeeperName: 'Arjun Singh', village: 'Lucknow', hiveId: 'HIVE-UP-011', gps: { lat: 26.8467, lng: 80.9462 }, harvestDate: '2026-08-20', floralSource: 'mustard', quantityKg: 10.0, photoPath: '/uploads/harvest-batch4.jpg' } },
    { step: 'collection', data: { batchId: 4, step: 'collection', centerName: 'Lucknow Collection Hub', centerId: 'CC-UP-002', dateReceived: '2026-08-21', quantityReceived: 10.0, conditionNotes: 'Sealed drums, standard condition' } },
    { step: 'testing', data: { batchId: 4, step: 'testing', moisture: 19.5, sugarRatio: 78.0, hmfLevel: 18.0, testedByStaffId: 'LAB-STAFF-015', testDate: '2026-08-22', labName: 'UP State Apiculture Lab - Lucknow' } },
    { step: 'ai_verification', data: { batchId: 4, step: 'ai_verification', riskScore: 85, riskBand: 'HIGH_RISK', floralMatch: false, timingMatch: false, ndviSupport: true, nirRange: true, explanation: 'MISMATCH - mustard not in bloom for Uttar Pradesh in August. Possible mislabeling detected.' } }
  ];
  const b5Stages = [
    { step: 'harvest', data: { batchId: 5, step: 'harvest', beekeeperName: 'Arjun Singh', village: 'Lucknow', hiveId: 'HIVE-UP-023', gps: { lat: 26.8467, lng: 80.9462 }, harvestDate: '2026-06-12', floralSource: 'litchi', quantityKg: 7.5, photoPath: '/uploads/harvest-batch5.jpg' } },
    { step: 'collection', data: { batchId: 5, step: 'collection', centerName: 'Lucknow Collection Hub', centerId: 'CC-UP-002', dateReceived: '2026-06-13', quantityReceived: 7.5, conditionNotes: 'Minor crystallization observed, drums intact' } },
    { step: 'testing', data: { batchId: 5, step: 'testing', moisture: 22.0, sugarRatio: 71.5, hmfLevel: 45.0, testedByStaffId: 'LAB-STAFF-015', testDate: '2026-06-14', labName: 'UP State Apiculture Lab - Lucknow' } },
    { step: 'ai_verification', data: { batchId: 5, step: 'ai_verification', riskScore: 72, riskBand: 'HIGH_RISK', floralMatch: true, timingMatch: true, ndviSupport: true, nirRange: false, explanation: 'ADULTERATION SUSPECTED: moisture 22.0% exceeds 20% threshold, HMF 45.0mg/kg exceeds 40mg/kg threshold' } }
  ];

  const allStages = { 1: b1Stages, 2: b2Stages, 3: b3Stages, 4: b4Stages, 5: b5Stages, 6: b6Stages };

  Object.entries(allStages).forEach(([batchId, stages]) => {
    let prevHash = '0'.repeat(64);
    stages.forEach((stage, idx) => {
      const ts = daysAgo(stages.length - idx);
      const currentHash = computeHash(prevHash, stage.data);
      insertLedger.run(parseInt(batchId), stage.step, prevHash, JSON.stringify(stage.data), currentHash, ts);
      prevHash = currentHash;
    });
  });

  // ── VERIFICATION REPORTS ──
  const insertReport = db.prepare(
    'INSERT INTO verification_reports (batch_id, floral_source_match, timing_match, ndvi_support, nir_within_range, pollen_available, risk_score, risk_band, explanation_text, checks_detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const batchSeeds = [
    { region: 'Punjab', month: 3, floralSource: 'mustard', harvestDate: '2026-03-15', spectralData: { moisture: 17.2, sugar_ratio: 82.5, hmf_level: 12.3 } },
    { region: 'Punjab', month: 7, floralSource: 'eucalyptus', harvestDate: '2026-07-10', spectralData: { moisture: 15.8, sugar_ratio: 85.1, hmf_level: 9.7 } },
    { region: 'Kerala', month: 12, floralSource: 'wildflower', harvestDate: '2026-12-05', spectralData: { moisture: 18.1, sugar_ratio: 79.8, hmf_level: 15.2 } },
    { region: 'Uttar Pradesh', month: 8, floralSource: 'mustard', harvestDate: '2026-08-20', spectralData: { moisture: 19.5, sugar_ratio: 78.0, hmf_level: 18.0 } },
    { region: 'Uttar Pradesh', month: 6, floralSource: 'litchi', harvestDate: '2026-06-12', spectralData: { moisture: 22.0, sugar_ratio: 71.5, hmf_level: 45.0 } },
    { region: 'Punjab', month: 10, floralSource: 'wildflower', harvestDate: '2026-10-18', spectralData: { moisture: 19.0, sugar_ratio: 80.2, hmf_level: 16.5 } }
  ];

  batchSeeds.forEach((seed, idx) => {
    const batchId = idx + 1;
    const claim = { region: seed.region, month: seed.month, floralSource: seed.floralSource, harvestDate: seed.harvestDate };
    const report = runCrossVerification(claim, seed.spectralData);
    insertReport.run(batchId, report.floralSourceMatch ? 1 : 0, report.timingMatch ? 1 : 0, report.ndviSupport ? 1 : 0, report.nirWithinRange ? 1 : 0, report.pollenAvailable ? 1 : 0, report.riskScore, report.riskBand, report.explanationText, JSON.stringify(report.checksDetail), now);
  });

  // ── CONSUMER SCANS ──
  const insertScan = db.prepare('INSERT INTO consumer_scans (consumer_id, batch_id, scanned_at) VALUES (?, ?, ?)');
  insertScan.run(6, 1, daysAgo(5));
  insertScan.run(6, 3, daysAgo(3));

  // ── CONSUMER ORDER ──
  const insertOrder = db.prepare('INSERT INTO orders (batch_id, buyer_id, buyer_name, buyer_address, buyer_phone, quantity, price, order_id, order_status, order_status_detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertOrder.run(1, 6, 'Anita Desai', '42 MG Road, Chennai, Tamil Nadu', '9876543220', 2, 1500, 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + randomId(4), 'dispatched',
    JSON.stringify({ placed: daysAgo(4), packed: daysAgo(3), dispatched: daysAgo(1), delivered: null }), daysAgo(4));

  // ── HIVE SENSOR DATA ──
  const insertHive = db.prepare('INSERT INTO hive_sensor_data (beekeeper_id, day_index, weight_kg, temperature, humidity, acoustic_score, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [1, 2, 3].forEach(bkId => {
    let baseWeight = bkId === 1 ? 22 : bkId === 2 ? 18 : 20;
    let baseTemp = bkId === 1 ? 32 : bkId === 2 ? 30 : 34;
    let baseHumidity = bkId === 1 ? 55 : bkId === 2 ? 70 : 60;
    let baseAcoustic = bkId === 1 ? 65 : bkId === 2 ? 70 : 55;
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - day));
      const noise = () => (Math.random() - 0.5) * 2;
      insertHive.run(bkId, day,
        +(baseWeight + Math.sin(day / 7) * 2 + noise()).toFixed(1),
        +(baseTemp + Math.sin(day / 5) * 3 + noise() * 2).toFixed(1),
        +(baseHumidity + Math.cos(day / 6) * 8 + noise() * 3).toFixed(1),
        +(baseAcoustic + Math.sin(day / 4) * 10 + noise() * 5).toFixed(0),
        date.toISOString()
      );
    }
  });

  // ── SEED ALERTS ──
  const insertAlert = db.prepare(
    'INSERT INTO alerts (beekeeper_id, hive_id, alert_type, severity, message, detection_result, status, sms_details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const alertSms1 = JSON.stringify({ webDelivered: true, smsDelivered: true, smsError: null, simulated: true, smsId: 'SMS-SEED-' + randomId(8), deliveredTo: '+91-9876543210', status: 'delivered (simulated)' });
  const alertSms2 = JSON.stringify({ webDelivered: true, smsDelivered: true, smsError: null, simulated: true, smsId: 'SMS-SEED-' + randomId(8), deliveredTo: '+91-9876543211', status: 'delivered (simulated)' });
  const alertSms3 = JSON.stringify({ webDelivered: true, smsDelivered: true, smsError: null, simulated: true, smsId: 'SMS-SEED-' + randomId(8), deliveredTo: '+91-9876543212', status: 'delivered (simulated)' });
  const alertSms4 = JSON.stringify({ webDelivered: true, smsDelivered: true, smsError: null, simulated: true, smsId: 'SMS-SEED-' + randomId(8), deliveredTo: '+91-9876543210', status: 'delivered (simulated)' });

  insertAlert.run(1, 'HIVE-PB-042', 'disease_image', 'critical',
    'Possible Foulbrood detected in Hive #3 — 87% confidence. Please inspect within 24 hours.',
    'Possible Foulbrood Signs — consult apiary officer immediately (87%)',
    'sent', alertSms1, daysAgo(0.5));
  insertAlert.run(2, 'HIVE-KL-007', 'iot_risk', 'warning',
    'IoT Risk: Possible Disease/Stress — humidity 78%, weight declining. Recommend inspection.',
    'Risk: Possible Disease/Stress — recommend inspection',
    'acknowledged', alertSms2, daysAgo(1));
  insertAlert.run(3, 'HIVE-UP-011', 'disease_audio', 'critical',
    'Swarming Precursor Sound Detected in Hive #1 — 91% confidence. Inspect within 48 hours.',
    'Swarming Precursor Sound Detected — inspect within 48 hours (91%)',
    'sent', alertSms3, daysAgo(0.2));
  insertAlert.run(1, 'HIVE-PB-055', 'disease_audio', 'warning',
    'Excessive Stress/Agitation Sound detected — possible pest intrusion (Varroa/wax moth). Confidence 78%.',
    'Excessive Stress/Agitation Sound — possible pest intrusion (Varroa/wax moth) (78%)',
    'sent', alertSms4, daysAgo(2));

  console.log('Database seeded with 9-stage supply chain data, consumer dashboard data, cross-verification reports, and sample alerts.');
}

module.exports = { initDatabase, seedData };
