const { Router } = require('express');
const { getDB } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const router = Router();

router.post('/', (req, res) => {
  const { deviceId, type, scores, details, deviceInfo } = req.body;
  if (!deviceId || !type) throw new AppError(400, 'validation', 'deviceId and type required');

  const uuid = require('uuid').v4();
  const db = getDB();

  const s = scores || {};
  const total = [s.gpu, s.cpu, s.ram, s.net, s.dns, s.thermal].filter(v => v != null).reduce((a, b) => a + b, 0);
  const validCount = [s.gpu, s.cpu, s.ram, s.net, s.dns, s.thermal].filter(v => v != null).length;
  const totalScore = validCount > 0 ? Math.round(total / validCount) : null;

  db.prepare(`INSERT INTO benchmark_results (id,device_id,type,gpu_score,cpu_score,ram_score,net_score,dns_score,thermal_score,total_score,details_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(uuid, deviceId, type, s.gpu || null, s.cpu || null, s.ram || null, s.net || null, s.dns || null, s.thermal || null, totalScore, JSON.stringify(details || {}));

  // Update device
  const existing = db.prepare('SELECT id FROM devices WHERE id = ?').get(deviceId);
  if (existing) {
    db.prepare('UPDATE devices SET last_seen = datetime(\'now\'), benchmark_count = benchmark_count + 1 WHERE id = ?').run(deviceId);
  } else if (deviceInfo) {
    db.prepare('INSERT INTO devices (id,name,model,ios_version,chip,ram_gb) VALUES (?,?,?,?,?,?)').run(
      deviceId, deviceInfo.name || 'Unknown', deviceInfo.model || null, deviceInfo.iosVersion || null, deviceInfo.chip || null, deviceInfo.ramGb || null);
  }

  // Update avg score
  const avg = db.prepare('SELECT AVG(total_score) as avg FROM benchmark_results WHERE device_id = ? AND total_score IS NOT NULL').get(deviceId);
  if (avg.avg) {
    db.prepare('UPDATE devices SET avg_score = ? WHERE id = ?').run(Math.round(avg.avg), deviceId);
  }

  res.status(201).json({ id: uuid, totalScore, scores: s });
});

router.get('/:deviceId', (req, res) => {
  const db = getDB();
  const { limit = 20, offset = 0 } = req.query;
  const results = db.prepare('SELECT * FROM benchmark_results WHERE device_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.params.deviceId, parseInt(limit), parseInt(offset));
  const total = db.prepare('SELECT COUNT(*) as c FROM benchmark_results WHERE device_id = ?').get(req.params.deviceId).c;
  res.json({ total, offset: parseInt(offset), limit: parseInt(limit), results });
});

router.get('/:deviceId/latest', (req, res) => {
  const db = getDB();
  const result = db.prepare('SELECT * FROM benchmark_results WHERE device_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.deviceId);
  if (!result) throw new AppError(404, 'not_found', 'No benchmark results for this device');
  res.json(result);
});

router.get('/:deviceId/trend', (req, res) => {
  const db = getDB();
  const results = db.prepare('SELECT created_at, total_score FROM benchmark_results WHERE device_id = ? AND type = \'full\' ORDER BY created_at ASC').all(req.params.deviceId);
  res.json({ deviceId: req.params.deviceId, dataPoints: results.length, trend: results });
});

module.exports = router;
