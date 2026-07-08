const { Router } = require('express');
const { getDB } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const router = Router();

const DDM_TYPES = [
  { type: 'com.apple.configuration.applicationaccess', description: 'Restriction keys — tương đương MDM restrictions', ios: '27.0' },
  { type: 'com.apple.configuration.managed.preferences', description: 'Managed preferences — tương đương MCX', ios: '27.0' },
  { type: 'com.apple.configuration.passcode', description: 'Passcode policy — thay thế allowPasscodeModification', ios: '27.0' },
  { type: 'com.apple.configuration.app.management', description: 'App management — thay thế InstallApplication', ios: '27.0' },
  { type: 'com.apple.configuration.network.dns', description: 'DNS settings — declarative DNS', ios: '27.0' },
  { type: 'com.apple.configuration.software.update', description: 'Software update policy', ios: '27.5' },
  { type: 'com.apple.configuration.certificate', description: 'Certificate management', ios: '27.0' }
];

const ACTIVATION_TYPES = [
  { type: 'com.apple.activation.simple', predicateTypes: [
    { type: 'com.apple.condition.app', description: 'Kích hoạt khi app foreground', params: { bundleIds: 'string[]' } },
    { type: 'com.apple.condition.time', description: 'Khoảng thời gian', params: { from: 'HH:mm', to: 'HH:mm' } },
    { type: 'com.apple.condition.battery', description: 'Mức pin', params: { level: 'number', operator: 'lessThan|greaterThan' } },
    { type: 'com.apple.condition.thermal', description: 'Trạng thái nhiệt', params: { state: 'nominal|fair|serious|critical' } },
    { type: 'com.apple.condition.network', description: 'Loại mạng', params: { type: 'wifi|cellular|ethernet' } }
  ]}
];

router.get('/', (req, res) => {
  const db = getDB();
  const declarations = db.prepare('SELECT * FROM ddm_declarations ORDER BY created_at DESC').all();
  const parsed = declarations.map(d => ({
    ...d,
    declaration: JSON.parse(d.declaration_json || '{}'),
    predicates: JSON.parse(d.predicates_json || '{}'),
    activations: JSON.parse(d.activations_json || '[]')
  }));
  res.json({
    total: parsed.length,
    declarations: parsed,
    supportedTypes: DDM_TYPES,
    activationTypes: ACTIVATION_TYPES
  });
});

router.get('/types', (req, res) => {
  res.json({ configurationTypes: DDM_TYPES, activationTypes: ACTIVATION_TYPES });
});

router.post('/generate', (req, res) => {
  const { name, restrictions, conditions } = req.body;
  if (!name) throw new AppError(400, 'validation', 'Declaration name required');

  const id = require('uuid').v4();
  const declaration = {
    Type: 'com.apple.configuration.applicationaccess',
    Identifier: `com.iosperf.ddm.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    Payload: restrictions || {},
    Activations: conditions ? [{
      Type: 'com.apple.activation.simple',
      Predicate: conditions
    }] : []
  };

  res.status(201).json({
    id,
    name,
    declaration,
    ddmJson: declaration,
    note: 'Apply via MDM server or sideload as Configuration Profile (iOS 27+)'
  });
});

router.get('/comparison', (req, res) => {
  const comparison = {
    title: 'MDM vs DDM — So sánh chi tiết',
    mdm: {
      protocol: 'HTTP + APNs push commands',
      paradigm: 'Imperative — server gửi lệnh, device thực thi',
      restrictions: 'com.apple.applicationaccess (plist)',
      conditions: 'Không hỗ trợ',
      updates: 'Cài lại profile thủ công',
      scope: 'Profile-level',
      ios: 'iOS 5+'
    },
    ddm: {
      protocol: 'HTTP + JSON declarative payloads',
      paradigm: 'Declarative — khai báo desired state, device tự hội tụ',
      restrictions: 'com.apple.configuration.applicationaccess (JSON)',
      conditions: 'Predicates: app, time, battery, thermal, network',
      updates: 'Device tự động sync desired state',
      scope: 'User-level, Device-level, Conditional',
      ios: 'iOS 27+'
    },
    migrationPath: [
      { phase: 1, ios: '26', action: 'Sử dụng MDM restriction keys (profile v12)' },
      { phase: 2, ios: '27', action: 'Chuyển DDM cho restriction keys có sẵn, dùng conditional activations' },
      { phase: 3, ios: '28+', action: 'DDM đầy đủ + predicates + status reporting + AI-driven optimization' }
    ],
    keyInsight: 'DDM cho phép conditional restrictions — chỉ active khi game đang chạy. MDM không làm được điều này.'
  };
  res.json(comparison);
});

router.get('/template/gaming', (req, res) => {
  const template = {
    Type: 'com.apple.configuration.applicationaccess',
    Identifier: 'gaming-optimizer',
    Payload: {
      allowDiagnosticSubmission: false,
      allowAssistant: false,
      allowCloudDocumentSync: false,
      allowSpotlightSuggestions: false,
      allowGameCenter: false,
      allowAirDrop: false,
      allowAppleIntelligence: false,
      allowWritingTools: false,
      allowAutoUnlock: false
    },
    Activations: [{
      Type: 'com.apple.activation.simple',
      Predicate: {
        Type: 'com.apple.condition.app',
        BundleIdentifiers: [
          'com.dts.freefiremax',
          'com.dts.freefireth',
          'com.tencent.ig',
          'com.miHoYo.GenshinImpact',
          'com.garena.game.ios.lq'
        ]
      }
    }]
  };
  res.json({
    title: 'DDM Gaming Optimizer Template',
    description: 'Conditional restrictions — chỉ active khi chơi game',
    ios: '27.0+',
    template,
    note: 'Thay BundleIdentifiers bằng game của bạn. Có thể kết hợp multiple conditions (AND/OR).'
  });
});

module.exports = router;
