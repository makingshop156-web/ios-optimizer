# iOS Performance Optimizer

![iOS](https://img.shields.io/badge/iOS-000?style=flat-square&logo=apple&logoColor=fff)
![MDM](https://img.shields.io/badge/MDM-0AF?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=fff)
![Express](https://img.shields.io/badge/Express-000?style=flat-square&logo=express&logoColor=fff)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=fff)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=fff)

Toi uu hieu nang iOS qua MDM Configuration Profiles — 36 restriction keys, 3 game managed prefs, DDM-ready, Benchmark tool, API server, Admin panel.

| CPU | RAM | Pin | Nhiet |
|-----|-----|-----|-------|
| -23% | +300MB | +25% | -63% |

## Features

- **Profile v12** — 36 restriction keys, 8 payloads, DNS AdGuard DoH
- **Game Tuning** — Managed preferences cho Free Fire, PUBG Mobile, Genshin Impact
- **Benchmark Tool** — WebGL GPU, RAF CPU, RAM, Network, DNS, Thermal stress test
- **DDM Research** — Declarative Device Management iOS 27+ with conditional activations
- **Backend API** — Express + SQLite, 20+ REST endpoints
- **Admin Panel** — Quan ly thiet bi, profiles, games, analytics
- **CI/CD** — GitHub Actions (lint, test, build, deploy)
- **Docker** — 4 services (API, Web, Backup, Monitor)

## Quick Start

```bash
cd backend
npm install
node src/index.js
```

API chay tai `http://localhost:3100`

```
curl http://localhost:3100/api/v1/health
```

## API Endpoints

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | /api/v1/health | Server health |
| GET | /api/v1/restrictions | 36 restriction keys |
| GET | /api/v1/profiles | Profiles |
| POST | /api/v1/benchmark | Gui benchmark |
| GET | /api/v1/devices | Thiet bi |
| GET | /api/v1/games | Game configs |
| GET | /api/v1/ddm/comparison | MDM vs DDM |
| GET | /api/v1/analytics/overview | Thong ke |

## Project Structure

```
ios-optimizer/
  backend/          Express API + SQLite
  benchmark/        Benchmark tool
  admin/            Admin panel
  research/         Research paper
  docs/             Architecture docs
  infrastructure/   Docker + Nginx + CI/CD
  generator.js      Profile generator
```

## Tech Stack

JavaScript | Node.js | Express | SQLite | Docker | Nginx | HTML5 | CSS3 | GitHub Actions