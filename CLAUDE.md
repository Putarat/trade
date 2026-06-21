# CLAUDE.md — Trade Portfolio Tracker

คู่มือสำหรับ AI assistant และ developer ใหม่ เพื่อเข้าใจโปรเจกต์นี้ได้เร็ว

---

## โปรเจกต์คืออะไร

Stock portfolio tracker สำหรับนักลงทุนไทย รองรับหุ้นไทย (SET) และหุ้นสหรัฐ (NYSE/NASDAQ)
- เพิ่มหุ้นด้วยมือ หรือ scan ภาพ screenshot พอร์ต
- ติดตาม qty / avg_cost / current_price / P&L
- บันทึก transaction buy/sell
- Watchlist, Target Price, Stop-Loss
- Admin panel สำหรับจัดการ users และ issues

---

## โครงสร้างไฟล์ที่สำคัญ

```
Trade/
├── CLAUDE.md                         ← ไฟล์นี้
├── start.js                          ← รัน backend + frontend พร้อมกัน
├── Flow/
│   ├── project-overview.md           ← เอกสารหลัก: APIs, state, flow ทั้งหมด
│   ├── database-design.md            ← ERD + schema รายละเอียด
│   ├── google-oauth-setup.md         ← วิธีตั้งค่า Google Login
│   └── issue/
│       └── feature-suggestions.md   ← backlog + สถานะ features
│
├── backend/
│   ├── config/
│   │   ├── urls.py     ← URL routing + View functions ทั้งหมดอยู่ในไฟล์เดียว (~1300 บรรทัด)
│   │   └── settings.py ← Django settings, อ่าน .env ด้วย python-decouple
│   ├── core/
│   │   ├── models.py   ← Database models ทั้งหมด
│   │   └── migrations/ ← 0001–0007, ทุก migration เป็น additive
│   ├── .env            ← DB creds + SECRET_KEY + GOOGLE_CLIENT_ID (ไม่ commit)
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.jsx     ← ทั้งแอปอยู่ในไฟล์เดียว (~2700 บรรทัด)
        └── App.css     ← styles ทั้งหมด
```

---

## วิธีรัน

```powershell
# 1. activate venv (ครั้งแรก หรือหลัง restart terminal)
cd C:\ProjectAll\TradeFULL\Trade\backend
.venv\Scripts\activate

# 2. รันทั้ง backend + frontend
cd C:\ProjectAll\TradeFULL\Trade
node start.js
```

| Service | URL |
|---|---|
| Backend (Django) | http://127.0.0.1:8000 |
| Frontend (Vite) | http://localhost:5173 |

**⚠️ ต้อง restart Django** ทุกครั้งที่เพิ่ม URL ใหม่ใน `backend/config/urls.py`

---

## Architecture

- **Backend**: Django 3.2 (ไม่ใช้ DRF) — view functions ทุกตัวอยู่ใน `config/urls.py`
- **Frontend**: React 18 + Vite SPA — component ทั้งหมดอยู่ใน `App.jsx` ไฟล์เดียว
- **DB**: PostgreSQL port 5431
- **Auth**: Bearer token (urlsafe 48 chars) เก็บใน `UserSession`, อายุ 30 วัน
- **Middleware**: `TokenAuthMiddleware` แปลง `Authorization: Bearer <token>` → `request.user`
- **Proxy**: Vite `/api/*` → Django `http://127.0.0.1:8000` (config ใน `vite.config.js`)

---

## Database Models (สรุป)

| Model | ไฟล์ | หน้าที่ |
|---|---|---|
| `User` | models.py | ผู้ใช้, มี role (user/admin) |
| `UserSession` | models.py | Bearer token session |
| `UserAuthProvider` | models.py | social login (google/email) |
| `Portfolio` | models.py | กลุ่มพอร์ต, มี cash_balance |
| `PortfolioHolding` | models.py | qty/avg_cost/current_price/target_price/stop_loss ต่อหุ้น |
| `HoldingTransaction` | models.py | ประวัติ buy/sell แต่ละครั้ง |
| `UserStock` | models.py | หุ้นที่ user มี, มี is_watchlist |
| `IssueReport` | models.py | ปัญหาที่ user แจ้ง (open→in_progress→resolved) |
| `SiteFeature` | models.py | feature flags (key PK, enabled, message) |
| `Wallet` | models.py | scan credits |
| `Scan` / `ScanItem` | models.py | OCR scan pipeline |
| `StockRecord` | models.py | **deprecated** — ไม่ใช้ |

ดูรายละเอียด fields ทั้งหมดใน [Flow/database-design.md](Flow/database-design.md)

---

## API Endpoints (สรุป)

ทุก endpoint อยู่ใน `backend/config/urls.py` — ไม่มีไฟล์ views แยก

### Auth
| Method | Path | หน้าที่ |
|---|---|---|
| POST | `/api/auth/register` | สมัครสมาชิก |
| POST | `/api/auth/login` | login → token + role |
| POST | `/api/auth/logout` | ลบ session |
| GET | `/api/auth/me` | ดึง user จาก token |
| POST | `/api/auth/google` | Google One Tap login |

### Stocks & Holdings
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/stocks` | ดึงหุ้นทั้งหมด + holdings + cash_balance |
| POST | `/api/stocks/manual` | เพิ่มหุ้น |
| DELETE | `/api/stocks/group/delete` | ลบหุ้น |
| PATCH | `/api/stocks/group` | rename หุ้น |
| PATCH | `/api/stocks/<id>/watchlist` | toggle watchlist |
| PATCH | `/api/holdings/<id>` | อัพเดท qty/cost/price/target/stoploss |
| PATCH | `/api/portfolio/cash` | อัพเดท cash_balance |

### Transactions
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/transactions/<stock_id>` | รายการ transactions |
| POST | `/api/transactions/<stock_id>/add` | เพิ่ม buy/sell |
| DELETE | `/api/transactions/delete/<tx_id>` | ลบ transaction |

### Prices
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/price/<symbol>?currency=THB\|USD` | ราคาปัจจุบัน (yfinance) |
| GET | `/api/price/<symbol>/history?period=&currency=` | OHLCV history (yfinance) |
| GET | `/api/fx-rate` | USD/THB rate |

### Portfolios
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/portfolios` | รายการ portfolios |
| POST | `/api/portfolios/create` | สร้าง portfolio ใหม่ |

### Admin & Config
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/config/features` | feature flags |
| PATCH | `/api/config/features/<key>` | toggle feature (admin) |
| GET/PATCH | `/api/issues`, `/api/issues/submit`, `/api/issues/<id>` | issue reports |
| GET/PATCH | `/api/admin/users`, `/api/admin/users/<id>` | admin: จัดการ users |

---

## Frontend — App.jsx Structure

```
App.jsx (~2700 บรรทัด)
│
├── Imports
│   └── recharts: Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
│                 LineChart, Line, XAxis, YAxis, CartesianGrid,
│                 AreaChart, Area
│
├── Constants
│   ├── PIE_COLORS, USD_TO_THB_RATE_DEFAULT
│   ├── PAYMENT_PLANS, INVESTOR_MODELS
│   └── LP_STOCKS (mock data สำหรับ login page)
│
├── Helper Components
│   ├── useWindowWidth()         hook
│   ├── StockLogo                logo + fallback initials
│   ├── CustomPieTooltip         Recharts tooltip
│   ├── PieSliceLabel            Recharts label รอบ pie
│   ├── IssueCard                card ใน Admin Panel
│   ├── CandlestickChart         SVG candlestick (OHLC)
│   ├── ConstellationBg          canvas animation login
│   └── LoginPage                หน้า login/register ทั้งหมด
│
└── export default function App()
    ├── State declarations (~60 states)
    ├── useEffect hooks (theme, auth, data loading)
    ├── API functions (loadRecords, fetchStockPrice, ...)
    ├── Calculation functions (getStockMeta, updateStockMeta, ...)
    └── JSX render
        ├── <LoginPage> (ถ้า !authUser)
        ├── Payment screen (ถ้า activeScreen === "payment")
        ├── Admin screen (ถ้า activeScreen === "admin")
        └── Main app screen
            ├── Top panel (profile, stats, actions)
            ├── Evaluation panel (investor model, scan)
            ├── P&L panel (cash, cost, value, pnl, wealth)
            ├── Chart panel (pie: by stock / by sector)
            ├── Stock manager (portfolio / watchlist tabs)
            └── Modals (history, transaction, plan, add stock, report issue)
```

---

## Key Conventions

### Backend
- View functions ทั้งหมดอยู่ใน `config/urls.py` — **ไม่มีไฟล์ views.py**
- `@api_login_required` decorator ตรวจ Bearer token ก่อนทุก protected endpoint
- URL ordering สำคัญ: `path("api/stocks/group/delete", ...)` ต้องอยู่ก่อน `path("api/stocks/<uuid:id>/delete", ...)`
- หุ้นไทย: yfinance ต้องเพิ่ม `.BK` suffix (เช่น `PTT` → `PTT.BK`)
- Response เสมอเป็น `JsonResponse` — ไม่ใช้ DRF serializers

### Frontend
- ทั้งแอปใน `App.jsx` ไฟล์เดียว — ไม่มี routing library (ใช้ `activeScreen` state แทน)
- `getStockMeta(name)` — อ่าน meta โดย merge: `records` ← `stockMeta` override
- `updateStockMeta(name, patch)` — อัพเดท state + mirror ลง `records` ทันที (เพื่อให้ pie re-render)
- `loadRecords()` — เป็น source of truth, reset stockMeta ด้วยข้อมูลจาก DB ทุกครั้ง
- stock logo มาจาก `https://financialmodelingprep.com/image-stock/<SYMBOL>.png`

### Styling
- CSS variables: `--bg`, `--card-bg`, `--text`, `--border`, etc. — ทั้ง dark/light theme
- dark mode: class `dark` บน `<html>` element
- Layout: CSS Grid 2-column (`3fr 2fr`) ที่ ≥960px

---

## Price History Chart

Modal Price History รองรับ 3 ประเภท (เลือกด้วยปุ่มใน modal header):

| ปุ่ม | state | render |
|---|---|---|
| แท่งเทียน | `"candle"` | `<CandlestickChart>` (custom SVG) |
| เส้น | `"line"` | Recharts `<LineChart>` |
| พื้นที่ | `"area"` | Recharts `<AreaChart>` |

API `/api/price/<symbol>/history` คืน: `date, open, high, low, close, volume`

---

## สิ่งที่ยังไม่ได้ทำ (Backlog)

ดู [Flow/issue/feature-suggestions.md](Flow/issue/feature-suggestions.md) สำหรับรายละเอียด

- Password Reset
- Dividend Tracker
- Portfolio Performance Benchmark
- Auto avg_cost จาก Transactions
- Investment Journal

---

## Env Files

**`backend/.env`** (ไม่ commit):
```
SECRET_KEY=...
DEBUG=True
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=...
DB_HOST=127.0.0.1
DB_PORT=5431
GOOGLE_CLIENT_ID=...
```

**`frontend/.env`** (ไม่ commit):
```
VITE_GOOGLE_CLIENT_ID=...
```
