const { Router } = require('express');
const { getDB } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const router = Router();

const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Admin token required' });
  }
  const token = auth.slice(7);
  if (token !== (process.env.ADMIN_TOKEN || 'iosperf-admin-2026')) {
    return res.status(403).json({ error: 'forbidden', message: 'Invalid admin token' });
  }
  next();
};

router.use(basicAuth);

router.get('/dashboard', (req, res) => {
  const db = getDB();
  const stats = db.prepare(`SELECT
    (SELECT COUNT(*) FROM devices) as devices,
    (SELECT COUNT(*) FROM benchmark_results) as benchmarks,
    (SELECT COUNT(*) FROM profiles) as profiles,
    (SELECT COUNT(*) FROM game_configs) as games,
    (SELECT COUNT(*) FROM ddm_declarations) as ddm_declarations,
    (SELECT COUNT(*) FROM restriction_logs) as logs,
    (SELECT COALESCE(SUM(download_count),0) FROM profiles) as total_downloads
  `).get();
  res.json(stats);
});

router.get('/devices', (req, res) => {
  const db = getDB();
  const { limit = 50, offset = 0, sort = 'last_seen' } = req.query;
  const allowedSort = ['last_seen', 'first_seen', 'benchmark_count', 'avg_score', 'name'];
  const sortCol = allowedSort.includes(sort) ? sort : 'last_seen';
  const devices = db.prepare(`SELECT * FROM devices ORDER BY ${sortCol} DESC LIMIT ? OFFSET ?`).all(parseInt(limit), parseInt(offset));
  const total = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
  res.json({ total, limit: parseInt(limit), offset: parseInt(offset), devices });
});

router.post('/devices/:id/assign-profile', (req, res) => {
  const { profileId } = req.body;
  if (!profileId) throw new AppError(400, 'validation', 'profileId required');
  const db = getDB();
  const device = db.prepare('UPDATE devices SET profile_id = ?, last_seen = datetime(\'now\') WHERE id = ?').run(profileId, req.params.id);
  if (device.changes === 0) throw new AppError(404, 'not_found', 'Device not found');
  res.json({ assigned: true });
});

router.post('/profiles', (req, res) => {
  const { name, version, description, payloadCount, restrictionKeys, games, config } = req.body;
  if (!name) throw new AppError(400, 'validation', 'Name required');
  const uuid = require('uuid').v4();
  const db = getDB();
  db.prepare(`INSERT INTO profiles (id,name,version,description,payload_count,restriction_keys,games,config_json)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuid, name, version || 'v1', description || '', payloadCount || 0, restrictionKeys || 0, games || 0, JSON.stringify(config || {}));
  res.status(201).json({ id: uuid, name, version: version || 'v1' });
});

router.delete('/profiles/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) throw new AppError(404, 'not_found', 'Profile not found');
  res.json({ deleted: true });
});

router.post('/games', (req, res) => {
  const { name, bundleId, preferences } = req.body;
  if (!name || !bundleId) throw new AppError(400, 'validation', 'Name and bundleId required');
  const uuid = require('uuid').v4();
  const db = getDB();
  db.prepare('INSERT INTO game_configs (id,name,bundle_id,preferences_json) VALUES (?,?,?,?)').run(uuid, name, bundleId, JSON.stringify(preferences || {}));
  res.status(201).json({ id: uuid, name, bundleId });
});

router.delete('/games/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM game_configs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) throw new AppError(404, 'not_found', 'Game config not found');
  res.json({ deleted: true });
});

router.get('/logs', (req, res) => {
  const db = getDB();
  const { limit = 100 } = req.query;
  const logs = db.prepare('SELECT * FROM restriction_logs ORDER BY created_at DESC LIMIT ?').all(parseInt(limit));
  res.json({ total: logs.length, logs });
});

module.exports = router;
