const { Router } = require('express');
const { getDB } = require('../db');
const router = Router();

router.get('/', (req, res) => {
  const db = getDB();
  const info = db.prepare('SELECT COUNT(*) as devices, (SELECT COUNT(*) FROM benchmark_results) as benchmarks, (SELECT COUNT(*) FROM profiles) as profiles').get();
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stats: info
  });
});

module.exports = router;
