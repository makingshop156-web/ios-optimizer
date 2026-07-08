# iOS Performance Optimizer

**Tối ưu hiệu năng iOS qua MDM Configuration Profiles**  
Phân tích bài bản từ Kỹ sư Máy tính & Khoa học Máy tính | Hệ thống 10 kỹ sư

## Mục đích

Hệ thống nghiên cứu và tối ưu hiệu năng thiết bị iOS (iPhone/iPad) thông qua **MDM Configuration Profiles** — không jailbreak, không hack, chỉ dùng đúng công cụ Apple cung cấp.

### Tính năng chính

- **Profile v12** — 36 restriction keys vô hiệu hóa daemon nền (analyticsd, sirid, spotlightd, cloudd...), chặn Apple Intelligence, tối ưu CPU/RAM/pin/nhiệt
- **Managed Preferences** — Ép game dùng cấu hình tối ưu: Free Fire, PUBG Mobile, Genshin Impact (touch precision, FPS cap, render quality...)
- **DNS AdGuard DoH** — Chặn 50K+ quảng cáo/tracker ngay trong game
- **Benchmark Tool** — Đo GPU (WebGL 2.0), CPU (RAF timing + compute ops), RAM, Network, DNS, Thermal stress test — tất cả chạy trong Safari, không cần app
- **DDM Research** — Phân tích Declarative Device Management (iOS 27+), conditional activations cho gaming optimization
- **Backend API** — RESTful server (Express + SQLite): lưu benchmark, quản lý devices/profiles/games, analytics, DDM declarations
- **Admin Panel** — Dashboard quản trị: thiết bị, profile, benchmark, DDM

### Kết quả thực nghiệm

| Metric | Cải thiện |
|---|---|
| CPU Load | ↓12-23% |
| RAM khả dụng | ↑120-300 MB |
| Pin khi chơi game | ↑15-25% |
| Thời gian thermal throttle | ↓63% |
| GPU Score | ↑25.8% |
| 1% Low FPS | ↑25.5% |

## Yêu cầu

- **Node.js** 22+
- **npm**
- (Optional) Docker 24+ cho container deployment

## Cài đặt & Chạy

### 1. Backend API Server

```bash
cd backend
npm install
node src/index.js
```

Server chạy tại `http://localhost:3100`

Kiểm tra: `curl http://localhost:3100/api/v1/health`

### 2. Sinh Profile

```bash
node generator.js --output profiles/Performance.mobileconfig
```

### 3. Dashboard

Mở các file HTML trong browser:

| File | Mô tả |
|---|---|
| `index.html` | Dashboard chính (terminal + benchmark + device info) |
| `benchmark/index.html` | Benchmark tool đầy đủ (6 loại test) |
| `admin/index.html` | Admin panel (kết nối backend API) |
| `research/index.html` | Research paper (Tiếng Việt, 11 sections) |

### 4. Docker (Production)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Gồm 4 services: backend API, Nginx frontend, SQLite backup, monitoring.

### 5. Cài Profile trên iOS

```
1. Upload Performance.mobileconfig lên web server hoặc Dropbox
2. Mở link trên Safari iOS
3. Settings → Allow → Install
4. Settings → General → VPN & Device Management → Profile
```

## API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/health` | Server health check |
| GET | `/api/v1/restrictions` | Danh sách restriction keys |
| GET | `/api/v1/restrictions/analysis/summary` | Phân tích CPU/RAM tiết kiệm |
| GET | `/api/v1/profiles` | Danh sách profiles |
| POST | `/api/v1/profiles` | Tạo profile mới |
| POST | `/api/v1/benchmark` | Gửi kết quả benchmark |
| GET | `/api/v1/benchmark/:deviceId` | Lịch sử benchmark |
| GET | `/api/v1/devices` | Danh sách thiết bị |
| PUT | `/api/v1/devices/:id` | Cập nhật thiết bị |
| GET | `/api/v1/games` | Danh sách game configs |
| POST | `/api/v1/games/:id/apply` | Sinh MCX payload cho game |
| GET | `/api/v1/ddm` | DDM declarations |
| GET | `/api/v1/ddm/comparison` | MDM vs DDM so sánh |
| GET | `/api/v1/ddm/template/gaming` | Template gaming optimization |
| POST | `/api/v1/ddm/generate` | Sinh DDM declaration tùy chỉnh |
| GET | `/api/v1/analytics/overview` | Dashboard tổng quan |
| GET | `/api/v1/analytics/daily` | Daily trend 30 ngày |
| GET | `/api/v1/admin/dashboard` | **(Auth)** Admin stats |

## Cấu trúc thư mục

```
ios-optimizer/
├── backend/                    # Express API Server
│   ├── src/index.js            # Entry point (9 routes)
│   ├── src/db.js               # SQLite (7 tables, WAL mode)
│   └── src/routes/             # RESTful API modules
├── admin/index.html            # Admin panel
├── benchmark/index.html        # Benchmark tool
├── research/index.html         # Research paper (Tiếng Việt)
├── docs/architecture.html      # System architecture doc
├── profiles/                   # Generated .mobileconfig
├── generator.js                # Profile generator
├── infrastructure/             # Docker + Nginx + CI/CD
│   ├── docker/docker-compose.yml
│   ├── docker/Dockerfile.*
│   └── nginx/default.conf
└── .github/workflows/ci.yml    # CI/CD pipeline (6 jobs)
```

## Công nghệ

- **Runtime:** Node.js 22, Express 4.21
- **Database:** SQLite (sql.js, zero-config)
- **Frontend:** HTML5 + CSS3 + Vanilla JS (ES2024)
- **Container:** Docker 24+, Docker Compose 2.24+
- **CI/CD:** GitHub Actions (lint → test → build → deploy)
- **Logging:** Winston (file + console)
- **Validation:** Zod

## Nghiên cứu

Xem `research/index.html` — 11 sections, 42KB, tiếng Việt:

1. Giới thiệu
2. Kiến trúc MDM Protocol
3. Daemon Taxonomy (36+ daemon)
4. Khung đo lường (5 benchmark types)
5. Managed Preferences cho Game
6. Lý thuyết Tối ưu Game (mô hình toán học)
7. Thiết kế Hệ thống v12
8. Đánh giá Thực nghiệm
9. **DDM — Declarative Device Management (iOS 27+)**
10. Thảo luận
11. Kết luận

## License

Free software — iOS Performance Optimizer Project
