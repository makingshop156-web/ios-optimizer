const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'iosperf.db');

let db = null;

function getDB() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

async function initDB() {
  const d = getDB();
  d.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Unknown',
      model TEXT,
      ios_version TEXT,
      chip TEXT,
      ram_gb REAL,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id TEXT,
      benchmark_count INTEGER DEFAULT 0,
      avg_score REAL
    );

    CREATE TABLE IF NOT EXISTS benchmark_results (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id),
      type TEXT NOT NULL CHECK(type IN ('gpu','cpu','ram','net','dns','thermal','full')),
      gpu_score REAL,
      cpu_score REAL,
      ram_score REAL,
      net_score REAL,
      dns_score REAL,
      thermal_score REAL,
      total_score REAL,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      payload_count INTEGER DEFAULT 0,
      restriction_keys INTEGER DEFAULT 0,
      games INTEGER DEFAULT 0,
      config_json TEXT,
      download_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bundle_id TEXT NOT NULL,
      platform TEXT DEFAULT 'ios',
      preferences_json TEXT,
      restriction_profile_id TEXT REFERENCES profiles(id),
      benchmark_ref_gpu REAL,
      benchmark_ref_cpu REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ddm_declarations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      declaration_json TEXT NOT NULL,
      predicates_json TEXT,
      activations_json TEXT,
      ios_version TEXT DEFAULT '27.0',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restriction_logs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      device_id TEXT REFERENCES devices(id),
      action TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      device_id TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_benchmark_device ON benchmark_results(device_id);
    CREATE INDEX IF NOT EXISTS idx_benchmark_created ON benchmark_results(created_at);
    CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
    CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
  `);

  // Seed default data
  const count = d.prepare('SELECT COUNT(*) as c FROM profiles').get();
  if (count.c === 0) {
    await seedData(d);
  }

  return d;
}

async function seedData(d) {
  const uuid = require('uuid').v4;

  d.prepare(`INSERT INTO profiles (id,name,version,description,payload_count,restriction_keys,games,config_json)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    uuid(), 'iOS Performance Optimizer', 'v12',
    'Tối ưu toàn diện — 36 restriction keys, 3 game managed prefs, DNS AdGuard, DDM-ready',
    8, 36, 3,
    JSON.stringify({
      dns: true, restrictions: 4, gamePrefs: 3, webClip: true, rootCA: true,
      restrictionGroups: ['system_ml', 'icloud_sync', 'network_sharing', 'display_keyboard'],
      games: ['com.dts.freefiremax', 'com.dts.freefireth', 'com.tencent.ig', 'com.miHoYo.GenshinImpact']
    })
  );

  const games = [
    { id: uuid(), name: 'Free Fire Max', bundle: 'com.dts.freefiremax',
      prefs: { GestureLatency: true, TouchPrecision: 0.323, TouchResponseBoost: 6, FrameStability: true, InputResponse: 0.85, DragSmooth: 12, TapRecovery: [0.05, 0.15], OverswipeClamp: 0.12, RecoilCalm: 8, HeadSettle: 4, RenderQuality: 2, FPSLimit: 90 } },
    { id: uuid(), name: 'Free Fire TH', bundle: 'com.dts.freefireth',
      prefs: { GestureLatency: true, TouchPrecision: 0.318, TouchResponseBoost: 7, FrameStability: true, InputResponse: 0.88, DragSmooth: 10, TapRecovery: [0.04, 0.14], OverswipeClamp: 0.10, RecoilCalm: 9, HeadSettle: 3, RenderQuality: 2, FPSLimit: 90 } },
    { id: uuid(), name: 'PUBG Mobile', bundle: 'com.tencent.ig',
      prefs: { ADSSensitivity: 0.75, GyroscopeEnabled: true, FrameRateLimit: 90, RenderScale: 0.9, AntiAliasing: true, ShadowQuality: 2 } },
    { id: uuid(), name: 'Genshin Impact', bundle: 'com.miHoYo.GenshinImpact',
      prefs: { RenderResolution: 0.8, ShadowQuality: 1, EffectsQuality: 2, FrameRateCap: 60 } }
  ];

  const insertGame = d.prepare('INSERT INTO game_configs (id,name,bundle_id,preferences_json) VALUES (?,?,?,?)');
  for (const g of games) {
    insertGame.run(g.id, g.name, g.bundle, JSON.stringify(g.prefs));
  }

  // DDM declarations
  const ddms = [
    { id: uuid(), name: 'Gaming Optimizer — Conditional App', type: 'com.apple.configuration.applicationaccess',
      decl: { allowDiagnosticSubmission: false, allowAssistant: false, allowCloudDocumentSync: false, allowSpotlightSuggestions: false, allowGameCenter: false, allowAirDrop: false, allowAppleIntelligence: false },
      pred: { type: 'com.apple.condition.app', bundleIds: ['com.dts.freefiremax', 'com.dts.freefireth', 'com.tencent.ig', 'com.miHoYo.GenshinImpact'] },
      act: [{ type: 'com.apple.activation.simple', predicateType: 'com.apple.condition.app' }] },
    { id: uuid(), name: 'Battery Saver — Low Power', type: 'com.apple.configuration.applicationaccess',
      decl: { allowBackgroundAppRefresh: false, allowMailDrop: false, allowCloudDocumentSync: false },
      pred: { type: 'com.apple.condition.battery', level: 20, operator: 'lessThan' },
      act: [{ type: 'com.apple.activation.simple', predicateType: 'com.apple.condition.battery' }] },
    { id: uuid(), name: 'Night Mode — Quiet Hours', type: 'com.apple.configuration.applicationaccess',
      decl: { allowNotifications: false, allowAutoDim: true },
      pred: { type: 'com.apple.condition.time', from: '22:00', to: '06:00' },
      act: [{ type: 'com.apple.activation.simple', predicateType: 'com.apple.condition.time' }] }
  ];

  const insertDDM = d.prepare('INSERT INTO ddm_declarations (id,name,type,declaration_json,predicates_json,activations_json) VALUES (?,?,?,?,?,?)');
  for (const ddm of ddms) {
    insertDDM.run(ddm.id, ddm.name, ddm.type, JSON.stringify(ddm.decl), JSON.stringify(ddm.pred), JSON.stringify(ddm.act));
  }
}

module.exports = { getDB, initDB };
