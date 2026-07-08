const { Router } = require('express');
const { getDB } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const router = Router();

router.get('/', (req, res) => {
  const db = getDB();
  const profiles = db.prepare('SELECT id,name,version,description,payload_count,restriction_keys,games,download_count,created_at,updated_at FROM profiles ORDER BY created_at DESC').all();
  res.json({ total: profiles.length, profiles });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!profile) throw new AppError(404, 'not_found', 'Profile not found');
  profile.config = JSON.parse(profile.config_json || '{}');
  delete profile.config_json;
  res.json(profile);
});

router.post('/', (req, res) => {
  const { name, description, payloadCount, restrictionKeys, games, config } = req.body;
  if (!name) throw new AppError(400, 'validation', 'Profile name required');
  const uuid = require('uuid').v4();
  const db = getDB();
  db.prepare(`INSERT INTO profiles (id,name,version,description,payload_count,restriction_keys,games,config_json)
    VALUES (?,?,?,?,?,?,?,?)`).run(uuid, name, req.body.version || 'v1', description || '', payloadCount || 0, restrictionKeys || 0, games || 0, JSON.stringify(config || {}));
  res.status(201).json({ id: uuid, name, version: req.body.version || 'v1' });
});

router.post('/:id/download', (req, res) => {
  const db = getDB();
  const result = db.prepare('UPDATE profiles SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) throw new AppError(404, 'not_found', 'Profile not found');
  res.json({ downloaded: true });
});

router.get('/:id/logs', (req, res) => {
  const db = getDB();
  const logs = db.prepare('SELECT * FROM restriction_logs WHERE profile_id = ? ORDER BY created_at DESC LIMIT 100').all(req.params.id);
  res.json({ total: logs.length, logs });
});

module.exports = router;
