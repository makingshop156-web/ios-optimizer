const { Router } = require('express');
const { getDB } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const router = Router();

router.get('/', (req, res) => {
  const db = getDB();
  const games = db.prepare('SELECT id,name,bundle_id,preferences_json,benchmark_ref_gpu,benchmark_ref_cpu,created_at FROM game_configs ORDER BY name').all();
  const parsed = games.map(g => ({ ...g, preferences: JSON.parse(g.preferences_json || '{}') }));
  res.json({ total: parsed.length, games: parsed });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const game = db.prepare('SELECT * FROM game_configs WHERE id = ?').get(req.params.id);
  if (!game) throw new AppError(404, 'not_found', 'Game config not found');
  game.preferences = JSON.parse(game.preferences_json || '{}');
  delete game.preferences_json;
  res.json(game);
});

router.put('/:id', (req, res) => {
  const { preferences } = req.body;
  if (!preferences) throw new AppError(400, 'validation', 'preferences required');
  const db = getDB();
  const result = db.prepare('UPDATE game_configs SET preferences_json = ? WHERE id = ?').run(JSON.stringify(preferences), req.params.id);
  if (result.changes === 0) throw new AppError(404, 'not_found', 'Game config not found');
  res.json({ updated: true });
});

router.post('/:id/apply', (req, res) => {
  const db = getDB();
  const game = db.prepare('SELECT * FROM game_configs WHERE id = ?').get(req.params.id);
  if (!game) throw new AppError(404, 'not_found', 'Game config not found');
  const prefs = JSON.parse(game.preferences_json || '{}');
  // Generate MCX payload XML
  const uuid = require('uuid').v4();
  const mcxPayload = {
    PayloadDisplayName: `Game Tuning — ${game.name}`,
    PayloadDescription: `Managed preferences for ${game.name} (${game.bundle_id})`,
    PayloadIdentifier: `com.iosperf.game.${game.bundle_id.replace(/[^a-z]/g, '')}`,
    PayloadType: 'com.apple.ManagedClient.preferences',
    PayloadUUID: uuid,
    PayloadVersion: 1,
    PayloadContent: {
      [game.bundle_id]: {
        Forced: [{ mcx_preference_settings: prefs }]
      }
    }
  };
  res.json({ mcxPayload });
});

module.exports = router;
