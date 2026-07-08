const { Router } = require('express');
const { getDB } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const router = Router();

router.get('/', (req, res) => {
  const db = getDB();
  const devices = db.prepare('SELECT id,name,model,ios_version,chip,ram_gb,first_seen,last_seen,profile_id,benchmark_count,avg_score FROM devices ORDER BY last_seen DESC').all();
  res.json({ total: devices.length, devices });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) throw new AppError(404, 'not_found', 'Device not found');
  res.json(device);
});

router.put('/:id', (req, res) => {
  const { name, model, iosVersion, chip, ramGb, profileId } = req.body;
  const db = getDB();
  const fields = [];
  const values = [];
  if (name) { fields.push('name = ?'); values.push(name); }
  if (model) { fields.push('model = ?'); values.push(model); }
  if (iosVersion) { fields.push('ios_version = ?'); values.push(iosVersion); }
  if (chip) { fields.push('chip = ?'); values.push(chip); }
  if (ramGb) { fields.push('ram_gb = ?'); values.push(ramGb); }
  if (profileId) { fields.push('profile_id = ?'); values.push(profileId); }
  fields.push("last_seen = datetime('now')");
  values.push(req.params.id);
  const result = db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new AppError(404, 'not_found', 'Device not found');
  res.json({ updated: true });
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM benchmark_results WHERE device_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) throw new AppError(404, 'not_found', 'Device not found');
  res.json({ deleted: true });
});

router.get('/:id/profile', (req, res) => {
  const db = getDB();
  const device = db.prepare('SELECT profile_id FROM devices WHERE id = ?').get(req.params.id);
  if (!device) throw new AppError(404, 'not_found', 'Device not found');
  if (!device.profile_id) return res.json({ profile: null });
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(device.profile_id);
  res.json({ profile: profile || null });
});

module.exports = router;
