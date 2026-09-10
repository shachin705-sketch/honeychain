const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/kvic/overview — aggregate dashboard data (read-only)
router.get('/overview', authenticateToken, requireRole('kvic'), (req, res) => {
  const db = req.db;

  // Total batches by status
  const allBatches = db.prepare('SELECT * FROM batches').all();
  const counts = { pending: 0, verified: 0, flagged: 0 };
  allBatches.forEach(b => counts[b.status]++);
  const totalBatches = allBatches.length;
  const verifiedCount = counts.verified;
  const flaggedCount = counts.flagged;

  // Adulteration trend — flagged batches by month
  const flagged = allBatches.filter(b => b.status === 'flagged');
  const monthCounts = {};
  flagged.forEach(b => {
    const month = b.harvest_date?.substring(0, 7) || 'unknown';
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  const adulterationTrend = Object.entries(monthCounts).map(([month, flagged_count]) => ({ month, flagged_count })).sort((a, b) => a.month.localeCompare(b.month));

  // Beekeeper leaderboard
  const beekeepers = db.prepare("SELECT id, name, village, cluster FROM users WHERE role = 'beekeeper'").all();
  const leaderboard = beekeepers.map(bk => {
    const verifiedBatches = allBatches.filter(b => b.beekeeper_id === bk.id && b.status === 'verified');
    return {
      name: bk.name,
      village: bk.village,
      cluster: bk.cluster,
      verified_batches: verifiedBatches.length,
      verified_kg: verifiedBatches.reduce((sum, b) => sum + b.quantity_kg, 0)
    };
  }).sort((a, b) => b.verified_kg - a.verified_kg);

  // Cluster summary
  const hiveData = db.prepare('SELECT * FROM hive_sensor_data').all();
  const clusterMap = {};
  beekeepers.forEach(bk => {
    const cluster = bk.cluster || 'Unknown';
    if (!clusterMap[cluster]) clusterMap[cluster] = { beekeeper_count: 0, total_batches: 0, acoustic_scores: [] };
    clusterMap[cluster].beekeeper_count++;
    clusterMap[cluster].total_batches += allBatches.filter(b => b.beekeeper_id === bk.id).length;
    const recentHive = hiveData.filter(h => h.beekeeper_id === bk.id && h.day_index >= 25);
    recentHive.forEach(h => clusterMap[cluster].acoustic_scores.push(h.acoustic_score));
  });
  const clusterSummary = Object.entries(clusterMap).map(([cluster, data]) => ({
    cluster,
    beekeeper_count: data.beekeeper_count,
    total_batches: data.total_batches,
    avg_acoustic: data.acoustic_scores.length > 0 ? data.acoustic_scores.reduce((a, b) => a + b, 0) / data.acoustic_scores.length : 0
  }));

  // Flagged batches with user info
  const flaggedBatches = allBatches.filter(b => b.status === 'flagged').map(b => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(b.beekeeper_id);
    return { id: b.id, floral_source: b.floral_source, flag_reason: b.flag_reason, harvest_date: b.harvest_date, location_region: b.location_region, beekeeper_name: user?.name || 'Unknown' };
  });

  // Disease alerts
  const allDisease = db.prepare('SELECT * FROM disease_logs ORDER BY created_at DESC LIMIT 10').all();
  const diseaseAlerts = allDisease.filter(d => !d.result.includes('Healthy')).map(d => {
    const user = db.prepare('SELECT name, cluster FROM users WHERE id = ?').get(d.beekeeper_id);
    return { ...d, beekeeper_name: user?.name || 'Unknown', cluster: user?.cluster || 'Unknown' };
  });

  res.json({
    totalBatches,
    verifiedCount,
    flaggedCount,
    verificationRate: totalBatches > 0 ? +((verifiedCount / totalBatches) * 100).toFixed(1) : 0,
    batchStats: Object.entries(counts).map(([status, count]) => ({ status, count, total_kg: allBatches.filter(b => b.status === status).reduce((s, b) => s + b.quantity_kg, 0) })),
    adulterationTrend,
    leaderboard,
    clusterSummary,
    flaggedBatches,
    diseaseAlerts
  });
});

module.exports = router;
