const { Router } = require('express');
const router = Router();

const RESTRICTIONS_DB = {
  system: [
    { key: 'allowDiagnosticSubmission', daemon: 'analyticsd', impact: 'CPU 1-2% nền, spike 8-15%', ios: '7.0', gaming: true },
    { key: 'allowAssistant', daemon: 'sirid', impact: 'CPU 5-12% khi Hey Siri', ios: '5.1', gaming: true },
    { key: 'allowSpotlightSuggestions', daemon: 'spotlightd', impact: 'CPU 10-25% khi index', ios: '8.0', gaming: true },
    { key: 'allowAutomaticAppDownloads', daemon: 'appstored', impact: 'CPU 2-4% + data 50-200MB/th', ios: '9.0', gaming: true },
    { key: 'allowGameCenter', daemon: 'gamed', impact: 'CPU 0.3-1% + network', ios: '4.2.1', gaming: true },
    { key: 'allowGameCenterFriendsDiscovery', daemon: 'gamed friends', impact: 'CPU + network sync', ios: '4.2.1', gaming: true },
    { key: 'allowAppClips', daemon: 'appclipd', impact: 'CPU + network, RAM 15-25MB', ios: '14.0', gaming: true },
    { key: 'allowOTAPKIUpdates', daemon: 'certuiworker', impact: 'Network + CPU cert check', ios: '7.0', gaming: true },
    { key: 'allowAppStoreAppAdTracking', daemon: 'ad trackingd', impact: 'IDFA + network', ios: '7.0', gaming: true },
    { key: 'allowApplePersonalizedAdvertising', daemon: 'Apple advertising', impact: 'CPU + network QC', ios: '14.0', gaming: true },
    { key: 'allowAppleIntelligence', daemon: 'intelligenced', impact: 'GPU/Neural Engine ML nền', ios: '26.0', gaming: true },
    { key: 'allowWritingTools', daemon: 'writingtoolsd', impact: 'CPU ML inference', ios: '18.1', gaming: true }
  ],
  icloud: [
    { key: 'allowCloudDocumentSync', daemon: 'cloudd', impact: 'RAM 30-80MB + CPU sync', ios: '5.0', gaming: true },
    { key: 'allowCloudKeychainSync', daemon: 'cloudkeychain', impact: 'Keychain sync', ios: '7.0', gaming: true },
    { key: 'allowCloudDesktopSync', daemon: 'clouddesktopd', impact: 'RAM 20-50MB + CPU', ios: '17.0', gaming: true },
    { key: 'allowCloudNotesSync', daemon: 'cloudnotesd', impact: 'Network notes sync', ios: '9.0', gaming: true },
    { key: 'allowCloudBookmarksSync', daemon: 'cloudbookmarksd', impact: 'Network bookmark sync', ios: '5.0', gaming: true },
    { key: 'allowCloudCalendarSync', daemon: 'cloudcalendard', impact: 'Network calendar change', ios: '5.0', gaming: true },
    { key: 'allowCloudRemindersSync', daemon: 'cloudremindersd', impact: 'Network reminders change', ios: '5.0', gaming: true },
    { key: 'allowCloudBackup', daemon: 'backupd', impact: 'RAM 20-50MB + CPU backup', ios: '5.0', gaming: true },
    { key: 'allowAutoSync', daemon: 'syncdefaultsd', impact: 'iTunes WiFi sync', ios: '5.0', gaming: true },
    { key: 'allowGlobalBackgroundFetchWhenRoaming', daemon: 'fetchd', impact: 'Data roaming fetch', ios: '5.0', gaming: true }
  ],
  network: [
    { key: 'allowActivityContinuation', daemon: 'Handoffd', impact: 'BLE + network, RAM 10-20MB', ios: '8.0', gaming: true },
    { key: 'allowAutoUnlock', daemon: 'autounlockd', impact: 'BLE Watch, RAM 10-25MB', ios: '14.5', gaming: true },
    { key: 'allowAirDrop', daemon: 'sharingd', impact: 'BLE + WiFi, RAM 15-30MB', ios: '7.0', gaming: true },
    { key: 'allowFindMyFriends', daemon: 'findmyfriendsd', impact: 'GPS + network share', ios: '15.0', gaming: true },
    { key: 'allowMailDrop', daemon: 'maildropd', impact: 'Data 50-200MB/th', ios: '9.0', gaming: true },
    { key: 'allowVoiceDialing', daemon: 'voiced', impact: 'Bluetooth voice dial', ios: '7.0', gaming: true },
    { key: 'allowPassbookWhileLocked', daemon: 'passd', impact: 'Wallet NFC locked', ios: '6.0', gaming: true },
    { key: 'allowExternalIntelligenceIntegrations', daemon: 'chatgptd', impact: 'Network AI inference', ios: '18.2', gaming: true }
  ],
  display: [
    { key: 'allowAutoDim', daemon: 'displayd OLED', impact: 'OLED auto dim micro-stutter', ios: '17.4', gaming: false },
    { key: 'allowAutoCorrection', daemon: 'keyboardd', impact: 'CPU autocorrection', ios: '8.1.3', gaming: false },
    { key: 'allowPredictiveKeyboard', daemon: 'keyboardd', impact: 'CPU predictive text', ios: '8.1.3', gaming: false },
    { key: 'allowSpellCheck', daemon: 'keyboardd', impact: 'CPU spell check', ios: '8.1.3', gaming: false }
  ]
};

router.get('/', (req, res) => {
  const { group, gaming } = req.query;
  let data = RESTRICTIONS_DB;
  if (group) data = { [group]: data[group] || [] };
  if (gaming === 'true') {
    for (const g of Object.keys(data)) {
      data[g] = data[g].filter(r => r.gaming);
    }
  }
  const total = Object.values(data).reduce((a, b) => a + b.length, 0);
  res.json({ total, groups: Object.keys(data), data });
});

router.get('/:key', (req, res) => {
  for (const group of Object.values(RESTRICTIONS_DB)) {
    const found = group.find(r => r.key === req.params.key);
    if (found) return res.json(found);
  }
  res.status(404).json({ error: 'not_found', message: 'Restriction key not found' });
});

router.get('/analysis/summary', (req, res) => {
  let cpuSave = 0, memSave = 0, netSave = 0;
  for (const group of Object.values(RESTRICTIONS_DB)) {
    for (const r of group) {
      const cpuM = r.impact.match(/CPU\s+(\d+)/);
      if (cpuM) cpuSave += parseInt(cpuM[1]);
      const memM = r.impact.match(/RAM\s+(\d+)/);
      if (memM) memSave += parseInt(memM[1]);
      if (r.impact.includes('Network') || r.impact.includes('data')) netSave += 1;
    }
  }
  res.json({
    totalKeys: Object.values(RESTRICTIONS_DB).reduce((a, b) => a + b.length, 0),
    totalGroups: Object.keys(RESTRICTIONS_DB).length,
    estimatedCPUReduction: `${cpuSave}%`,
    estimatedRAMFreed: `${memSave}MB`,
    networkRelated: netSave,
    gamingRelated: Object.values(RESTRICTIONS_DB).reduce((a, b) => a + b.filter(r => r.gaming).length, 0)
  });
});

module.exports = router;
