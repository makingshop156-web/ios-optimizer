#!/bin/bash
# iOS Performance Optimizer — Setup Script
# Kỹ sư Máy tính & Khoa học Máy tính

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()  { echo -e "  ${GREEN}✓${NC} $1"; }
err() { echo -e "  ${RED}✗${NC} $1"; }

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  iOS Performance Optimizer — Setup   ║${NC}"
echo -e "${CYAN}║  10 kỹ sư • Production-grade         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
log "Kiểm tra dependencies..."
command -v node >/dev/null 2>&1 && ok "Node.js $(node -v)" || { err "Node.js required"; exit 1; }
command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || { err "npm required"; exit 1; }
command -v docker >/dev/null 2>&1 && ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')" || log "Docker not found — will run natively"

# Install backend dependencies
log "Cài đặt backend dependencies..."
cd "$(dirname "$0")/../backend"
npm install --production
ok "Backend dependencies installed"

# Create directories
log "Tạo directories..."
mkdir -p data logs
ok "Directories ready"

# Generate profile
log "Sinh profile v12..."
cd ..
node generator.js --output profiles/Performance.mobileconfig
ok "Profile generated"

# Check XML validity
log "Kiểm tra XML..."
node -e "
const fs = require('fs');
const xml = fs.readFileSync('profiles/Performance.mobileconfig','utf8');
const valid = xml.includes('<?xml') && xml.includes('</plist>');
const payloads = (xml.match(/PayloadDisplayName/g)||[]).length;
console.log('  ' + (valid ? '✓' : '✗') + ' XML valid: ' + valid);
console.log('  Payloads: ' + payloads);
console.log('  Size: ' + (xml.length/1024).toFixed(1) + ' KB');
"

# Start backend
log ""
log "=== Starting Server ==="
echo "  API:      http://localhost:3100/api/v1/health"
echo "  Admin:    http://localhost:3100/api/v1/admin/dashboard"
echo "  Dashboard: file://$(pwd)/index.html"
echo ""
echo "  Run: cd backend && npm start"
echo ""

# Docker option
if command -v docker >/dev/null 2>&1; then
  log "Docker detected. Run full stack:"
  echo "  docker compose -f infrastructure/docker/docker-compose.yml up -d"
fi

ok "Setup complete!"
