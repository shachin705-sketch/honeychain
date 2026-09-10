require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, seedData } = require('./db/schema');

const app = express();
const PORT = Number(process.env.PORT) || 3002;

// Initialize database
const db = initDatabase();
seedData(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach db to request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/beekeeper', require('./routes/beekeeper'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/kvic', require('./routes/kvic'));
app.use('/api/hive', require('./routes/hive'));
app.use('/api/hive/disease', require('./routes/disease'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/order', require('./routes/order'));
app.use('/api/consumer', require('./routes/consumer'));
app.use('/api/alerts', require('./routes/alerts'));
console.log('[ROUTES] All routes mounted: auth, beekeeper, admin, kvic, hive, hive/disease, verify, order, consumer, alerts');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MadhuPramaan Backend', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`\n MadhuPramaan Backend running on http://localhost:${PORT}`);
  console.log('   Seed data loaded: 3 beekeepers, 1 admin, 1 KVIC official, 5 batches');
  console.log(`   SMS Provider: ${process.env.FAST2SMS_API_KEY ? 'Fast2SMS API key loaded (real SMS)' : 'No API key — SMS simulated'}`);
  console.log('');
});
