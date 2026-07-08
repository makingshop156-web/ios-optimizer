const { Router } = require('express');
const { getDB } = require('../db');
const router = Router();

router.get('/overview', (req, res) => {
  const db = getDB();
  const stats = db.prepare(`SELECT
    (SELECT COUNT(*) FROM devices) as total_devices,
    (SELECT COUNT(*) FROM benchmark_results) as total_benchmarks,
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM game_configs) as total_games,
    (SELECT COALESCE(AVG(total_score),0) FROM benchmark_results WHERE total_score IS NOT NULL) as avg_score,
    (SELECT COALESCE(MAX(total_score),0) FROM benchmark_results) as max_score,
    (SELECT COUNT(*) FROM devices WHERE benchmark_count > 0) as active_devices,
    (SELECT COUNT(*) FROM benchmark_results WHERE created_at > datetime('now', '-7 days')) as benchmarks_7d
  `).get();
  res.json(stats);
});

router.get('/scores/distribution', (req, res) => {
  const db = getDB();
  const dist = db.prepare(`SELECT
    SUM(CASE WHEN total_score >= 80 THEN 1 ELSE 0 END) as excellent,
    SUM(CASE WHEN total_score >= 60 AND total_score < 80 THEN 1 ELSE 0 END) as good,
    SUM(CASE WHEN total_score >= 40 AND total_score < 60 THEN 1 ELSE 0 END) as fair,
    SUM(CASE WHEN total_score < 40 THEN 1 ELSE 0 END) as poor
  FROM benchmark_results WHERE total_score IS NOT NULL`).get();
  res.json(dist);
});

router.get('/daily', (req, res) => {
  const db = getDB();
  const daily = db.prepare(`SELECT date(created_at) as day, COUNT(*) as count, COALESCE(AVG(total_score),0) as avg_score
    FROM benchmark_results WHERE created_at > datetime('now', '-30 days')
    GROUP BY date(created_at) ORDER BY day ASC`).all();
  res.json({ days: daily.length, data: daily });
});

router.get('/by-device', (req, res) => {
  const db = getDB();
  const byDevice = db.prepare(`SELECT d.name, d.model, COUNT(b.id) as benchmarks, COALESCE(AVG(b.total_score),0) as avg_score, MAX(b.total_score) as best_score
    FROM devices d LEFT JOIN benchmark_results b ON b.device_id = d.id
    GROUP BY d.id ORDER BY benchmarks DESC LIMIT 20`).all();
  res.json({ devices: byDevice.length, data: byDevice });
});

router.get('/by-profile', (req, res) => {
  const db = getDB();
  const byProfile = db.prepare(`SELECT p.name, p.version, p.download_count, COUNT(b.id) as benchmarks
    FROM profiles p LEFT JOIN restriction_logs l ON l.profile_id = p.id
    LEFT JOIN benchmark_results b ON l.device_id = b.device_id
    GROUP BY p.id ORDER BY p.download_count DESC`).all();
  res.json({ profiles: byProfile.length, data: byProfile });
});

router.get('/events', (req, res) => {
  const db = getDB();
  const events = db.prepare(`SELECT event_type, COUNT(*) as count FROM analytics_events
    WHERE created_at > datetime('now', '-7 days')
    GROUP BY event_type ORDER BY count DESC`).all();
  res.json({ events });
});

module.exports = router;
