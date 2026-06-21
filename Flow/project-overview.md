# Trade — Project Overview

> อัพเดทล่าสุด: 2026-06-21 (session 5)

## โครงสร้างโปรเจ็ค

```
Trade/
├── backend/                  # Django REST API
│   ├── config/
│   │   ├── settings.py       # ตั้งค่า Django (DB, middleware, etc.)
│   │   ├── urls.py           # URL patterns + View functions ทั้งหมดอยู่ในไฟล์นี้
│   │   └── wsgi.py
│   ├── core/
│   │   ├── models.py         # Database models ทั้งหมด
│   │   ├── middleware.py     # TokenAuthMiddleware (Bearer token → request.user)
│   │   ├── admin.py
│   │   └── migrations/
│   │       ├── 0001_initial.py
│   │       ├── 0002_auto_20260614_2114.py        # Portfolio, PortfolioHolding, sector/exchange
│   │       ├── 0003_portfolioholding_note.py      # note field
│   │       ├── 0004_user_role_issue_report.py     # User.role, IssueReport
│   │       ├── 0005_portfolio_cash_balance_holding_current_price.py  # cash_balance, current_price
│   │       ├── 0006_site_feature.py               # ★ SiteFeature model
│   │       └── 0007_watchlist_targetprice_stoploss_transaction.py    # ★ Watchlist, TargetPrice, StopLoss, HoldingTransaction
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                  # DB password, SECRET_KEY (อย่า commit)
│   └── .env.example          # template ปลอดภัย (commit ได้)
│
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx           # Component หลัก (ทั้งแอปอยู่ในไฟล์เดียว ~2700 บรรทัด)
│   │   ├── App.css           # Styles + Layout (grid, responsive)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js        # Proxy /api → localhost:8000
│   └── package.json
│
├── start.js                  # รัน backend + frontend พร้อมกันด้วยคำสั่งเดียว
├── CLAUDE.md                 # ★ ใหม่ — คู่มือสำหรับ AI / Developer ใหม่
└── Flow/                     # เอกสาร / แผน
    ├── project-overview.md   # ไฟล์นี้
    ├── database-design.md    # ERD + schema รายละเอียด
    ├── google-oauth-setup.md # วิธีตั้งค่า Google Login
    └── issue/
        ├── feature-suggestions.md  # feature backlog + สถานะ
        └── google-login-poc.md
```

---

## Database Models (core/models.py)

| Model | ความหมาย | หมายเหตุ |
|---|---|---|
| `User` | ผู้ใช้งาน (UUID PK, email unique) | มี `role` field (user/admin) |
| `UserSession` | Token session (Bearer token, อายุ 30 วัน) | |
| `UserAuthProvider` | Social login provider | email/google/apple/line |
| `Wallet` | scan_credits ของแต่ละ user | 1:1 กับ User |
| `Portfolio` | กลุ่มพอร์ตของ user | `is_default=True` สร้างตอน register, มี `cash_balance` |
| `PortfolioHolding` | qty+cost+note+current_price+target_price+stop_loss | ★ session 5 เพิ่ม `target_price`, `stop_loss` |
| `HoldingTransaction` | ★ ใหม่ — บันทึกการซื้อ/ขายแต่ละครั้ง | tx_type: buy/sell, qty, price, date |
| `UserStock` | หุ้นที่ user มี (unique ต่อ user+symbol) | ★ session 5 เพิ่ม `is_watchlist` |
| `StockNameEdit` | ประวัติการเปลี่ยนชื่อหุ้น | |
| `IssueReport` | ปัญหาที่ user แจ้งเข้ามา | status: open → in_progress → resolved |
| `SiteFeature` | ★ ใหม่ — feature flag สำหรับ admin toggle | PK = key string, enabled + message |
| `Scan` | การ scan ภาพ 1 ครั้ง | link กับ Portfolio ด้วย FK |
| `ScanItem` | หุ้นแต่ละตัวที่ OCR อ่านได้ | confidence, source |
| `PricingPlan` | แพ็กเกจราคา | |
| `Payment` | ประวัติการชำระเงิน | |
| `ScanChargeLog` | log การตัดเครดิต | |
| `StockRecord` | **deprecated** — ไม่ใช้แล้ว | ยังอยู่ใน DB แต่ไม่มี FK user |

ดูรายละเอียด fields และ relationships ทั้งหมดใน [database-design.md](database-design.md)

---

## API Endpoints (config/urls.py)

URL ordering สำคัญมาก: path ที่ specific ต้องมาก่อน parameterized (`<uuid:stock_id>`)

### Public (ไม่ต้อง token)
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/health` | ตรวจ backend ว่า up |
| POST | `/api/auth/register` | สมัครสมาชิก + สร้าง default Portfolio |
| POST | `/api/auth/login` | เข้าสู่ระบบ → คืน Bearer token + user.role |
| POST | `/api/auth/logout` | ลบ session token |
| POST | `/api/auth/google` | Google One Tap login → คืน Bearer token |

### Protected (ต้องส่ง `Authorization: Bearer <token>`)
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/auth/me` | ดึงข้อมูล user จาก token (ใช้ตอน app load) รวม role |
| POST | `/api/stocks/upload` | อัพโหลดรูป → OCR → เพิ่มหุ้น |
| POST | `/api/stocks/manual` | เพิ่มหุ้นด้วยมือ (validate symbol regex) |
| DELETE | `/api/stocks/group/delete` | ลบหุ้นทั้ง group |
| PATCH | `/api/stocks/group` | rename หุ้นทั้ง group |
| PATCH | `/api/stocks/<uuid:stock_id>/rename` | rename หุ้นชิ้นเดียว |
| DELETE | `/api/stocks/<uuid:stock_id>/delete` | ลบหุ้นชิ้นเดียว |
| PATCH | `/api/stocks/<uuid:stock_id>/watchlist` | ★ toggle is_watchlist |
| GET | `/api/stocks` | ดึง UserStock + holdings (qty, avg_cost, current_price, target_price, stop_loss, currency, note, is_watchlist, cash_balance) |
| PATCH | `/api/holdings/<uuid:stock_id>` | อัพเดท qty / avg_cost / current_price / target_price / stop_loss / currency / note |
| PATCH | `/api/portfolio/cash` | อัพเดท cash_balance |
| GET | `/api/portfolios` | ★ รายการ portfolios ทั้งหมดของ user |
| POST | `/api/portfolios/create` | ★ สร้าง portfolio ใหม่ |
| GET | `/api/transactions/<uuid:stock_id>` | ★ รายการ transactions ของหุ้นนั้น |
| POST | `/api/transactions/<uuid:stock_id>/add` | ★ เพิ่ม transaction (buy/sell) |
| DELETE | `/api/transactions/delete/<uuid:tx_id>` | ★ ลบ transaction |
| GET | `/api/price/<str:symbol>?currency=THB\|USD` | ดึงราคาหุ้น real-time ผ่าน yfinance |
| GET | `/api/price/<str:symbol>/history?period=&currency=` | ★ ดึง OHLCV history — คืน open/high/low/close/volume |
| GET | `/api/fx-rate` | ดึง USD/THB อัตราแลกเปลี่ยน real-time |
| GET | `/api/config/features` | ดึง feature flags ทั้งหมด |
| PATCH | `/api/config/features/<str:key>` | ★ admin only — เปิด/ปิด feature flag |
| POST | `/api/issues/submit` | ส่งปัญหาเข้าระบบ |
| GET | `/api/issues` | user: ดูปัญหาของตัวเอง / admin: ดูทั้งหมด |
| PATCH | `/api/issues/<uuid:issue_id>` | admin: เปลี่ยน status / admin_note |
| GET | `/api/admin/users` | admin only: รายการ users ทั้งหมด |
| PATCH | `/api/admin/users/<uuid:user_id>` | admin only: เปลี่ยน role / status ของ user |
| GET | `/api/wallet` | ดู scan credits คงเหลือ |
| GET | `/api/scans` | ประวัติ scan 30 รายการล่าสุด |

### GET /api/stocks — Response Shape (ปัจจุบัน)

```json
{
  "items": [
    {
      "id": "<uuid>",
      "stock_name": "AAPL",
      "image_url": "/media/...",
      "quantity": "100.0",
      "avg_cost": "185.5",
      "current_price": "213.25",
      "target_price": "230.00",
      "stop_loss": "175.00",
      "currency": "USD",
      "sector": "Technology",
      "exchange": "NASDAQ",
      "note": "ซื้อเพราะ P/E ต่ำ",
      "is_watchlist": false
    }
  ],
  "summary": [{ "name": "AAPL", "value": 18550.0 }],
  "cash_balance": "50000.00"
}
```

### GET /api/price/\<symbol\>/history — Response Shape ★ อัพเดท

```json
{
  "symbol": "PTT.BK",
  "period": "1mo",
  "data": [
    {
      "date": "2026-05-21",
      "open": 34.25,
      "high": 34.75,
      "low": 33.80,
      "close": 34.50,
      "volume": 28450000
    }
  ]
}
```

> เดิมส่งแค่ `close` — session 5 เพิ่ม `open`, `high`, `low`, `volume` เพื่อรองรับ Candlestick chart

---

## Authentication Flow

```
1. POST /api/auth/login  →  { token, user: { id, email, role, ... } }
2. เก็บ token ใน localStorage ("trade-auth-token")
3. ทุก request ส่ง header:  Authorization: Bearer <token>
4. @api_login_required decorator อ่าน token → หา UserSession → set request.user
5. App load: เรียก GET /api/auth/me เพื่อ restore user session (รวม role)
6. role === "admin" → แสดงปุ่ม Admin Panel ใน profile
```

Google Login:
```
1. window.google.accounts.id.initialize() + prompt()
2. ได้ Google ID Token → POST /api/auth/google { credential }
3. Backend verify token ด้วย google-auth library
4. สร้าง/หา User + UserAuthProvider → ส่ง Bearer token กลับ
```

Token อายุ **30 วัน** นับจากวัน login

---

## User Role System

| Role | สิทธิ์ |
|---|---|
| `user` | ใช้งานทั่วไป, แจ้งปัญหาได้, ดูเฉพาะปัญหาของตัวเอง |
| `admin` | ทุกอย่างของ user + เข้า Admin Panel, จัดการ issues ทั้งหมด, จัดการ users, toggle feature flags |

---

## Holdings Data Flow

```
loadRecords() → GET /api/stocks
  → items มี quantity, avg_cost, current_price, target_price, stop_loss, currency, note, is_watchlist
  → portfolio มี cash_balance
  → sync ลง stockMeta state อัตโนมัติ

user แก้ fields → local state (inputs) → pie/P&L re-render ทันที
user กด Save → PATCH /api/holdings/<id> → บันทึก DB
user กด Plan → เปิด PlanModal → PATCH /api/holdings/<id> (note)
เปลี่ยนอุปกรณ์ → ข้อมูลยังอยู่ครบ
```

### Current Price — Manual vs Auto

| โหมด | พฤติกรรม |
|---|---|
| **Manual** | user พิมพ์ราคาเอง |
| **Auto** | กดปุ่มดึงจาก Yahoo Finance ผ่าน `/api/price/<symbol>` |

---

## P&L Calculation

```
usdToThbRate = ดึงจาก GET /api/fx-rate ตอน app load (fallback = 36)

ต่อหุ้น:
  rate  = currency === "USD" ? usdToThbRate : 1
  cost  = qty × avg_cost × rate
  value = curPrice > 0 ? qty × curPrice × rate : cost
  pnl   = value - cost

รวม:
  totalCost         = Σ cost
  totalCurrentValue = Σ value
  totalPnL          = totalCurrentValue - totalCost
  totalPnLPct       = (totalPnL / totalCost) × 100
  totalWealth       = cashBalance + totalCurrentValue
```

---

## Frontend หลัก (App.jsx)

ทั้งแอปอยู่ในไฟล์เดียว (~2700 บรรทัด) มี helper components บนสุด แล้วตามด้วย `export default function App()`

### Screens (`activeScreen` state)

| Screen | เงื่อนไข | เนื้อหา |
|---|---|---|
| Login/Register | `!authUser` | LoginPage component (full screen) |
| Payment | `activeScreen === "payment"` | เลือกแพ็ก + mock checkout |
| App หลัก | `activeScreen === "app"` | pie chart, stock list, P&L panel |
| Admin Panel | `activeScreen === "admin"` | จัดการ issues + users + feature flags |

### State สำคัญ

| State | ความหมาย |
|---|---|
| `authToken` | Bearer token |
| `authUser` | user object จาก API (รวม role) |
| `records` | รายการ UserStock (มี qty/avg_cost/current_price/target_price/stop_loss/note/is_watchlist จาก DB) |
| `summary` | `[{ name, value }]` สำหรับ pie chart |
| `stockMeta` | `{ [name]: { quantity, price, current_price, target_price, stop_loss, price_mode, currency, note, is_watchlist } }` |
| `pieData` | useMemo จาก summary + stockMeta + records |
| `sectorData` | useMemo: holdings grouped by sector (สำหรับ sector pie) |
| `pnlData` | useMemo: { totalCost, totalCurrentValue, totalPnL, totalPnLPct, totalWealth } |
| `cashBalance` | เงินสดที่ไม่ได้ลงทุน (sync จาก DB) |
| `usdToThbRate` | อัตราแลกเปลี่ยน USD/THB (ดึงจาก API ตอน load) |
| `chartMode` | "stock" หรือ "sector" — toggle pie chart view |
| `stockTab` | "portfolio" หรือ "watchlist" — toggle stock list view |
| `historyModal` | `{ symbol, currency }` หรือ null — เปิด Price History modal |
| `historyChartType` | ★ ใหม่ — "candle" / "line" / "area" — ประเภท chart ใน modal |
| `historyPeriod` | "1wk"/"1mo"/"3mo"/"6mo"/"1y" |
| `txModal` | `{ stockId, stockName }` หรือ null — เปิด Transaction modal |
| `txList` | รายการ HoldingTransaction ของหุ้นที่เปิด modal |
| `txForm` | draft form สำหรับเพิ่ม transaction |
| `portfolios` | รายการ Portfolio ทั้งหมดของ user |
| `features` | feature flags จาก API |
| `planModalStockName` | ชื่อหุ้นที่กำลังเปิด PlanModal (null = ปิด) |
| `fetchingPriceFor` | ชื่อหุ้นที่กำลัง fetch ราคา (null = idle) |
| `issues` | รายการ IssueReport |
| `adminTab` | "issues" / "users" ใน Admin Panel |
| `users` | รายการ users (admin only) |

### Helper Components (ก่อน App function)

| Component | หน้าที่ |
|---|---|
| `useWindowWidth()` | hook วัด window width สำหรับ responsive |
| `StockLogo` | แสดง logo หุ้น + fallback initials |
| `CustomPieTooltip` | Tooltip custom สำหรับ Recharts Pie |
| `PieSliceLabel` | Label icon+ชื่อ รอบ Pie chart |
| `IssueCard` | card แสดง IssueReport ในหน้า Admin |
| `CandlestickChart` | ★ ใหม่ — SVG candlestick chart (OHLC) |
| `ConstellationBg` | Canvas animation พื้นหลัง login page |
| `LoginPage` | หน้า login/register ทั้งหมด |

### ฟังก์ชันหลัก

| ฟังก์ชัน | หน้าที่ |
|---|---|
| `loadRecords()` | GET /api/stocks → sync stockMeta (รวม current_price, target_price, stop_loss, is_watchlist) + setCashBalance |
| `getStockMeta(name)` | อ่าน meta: records → stockMeta override, defaults |
| `updateStockMeta(name, patch)` | อัพเดท stockMeta + mirror ลง records |
| `saveGroupEdit(oldName)` | rename + PATCH /api/holdings (รวม target_price, stop_loss) + loadRecords() |
| `fetchStockPrice(name)` | GET /api/price/<sym>?currency= → updateStockMeta({current_price, price_mode:"auto"}) |
| `loadPriceHistory(symbol, currency, period)` | GET /api/price/<sym>/history → setHistoryData (OHLCV) |
| `saveCashBalance()` | PATCH /api/portfolio/cash → setCashBalance |
| `loadTransactions(stockId)` | GET /api/transactions/<id> → setTxList |
| `addTransactionFn(stockId)` | POST /api/transactions/<id>/add |
| `deleteTransactionFn(txId, stockId)` | DELETE /api/transactions/delete/<id> |
| `toggleWatchlistFn(stockId)` | PATCH /api/stocks/<id>/watchlist |
| `submitReport()` | POST /api/issues/submit |
| `loadIssues()` | GET /api/issues |
| `updateIssueStatus(id, status, note)` | PATCH /api/issues/<id> |
| `loadUsers()` | GET /api/admin/users |
| `updateUser(id, patch)` | PATCH /api/admin/users/<id> |
| `openPlanModal(stockName)` | โหลด note ปัจจุบัน → เปิด modal |
| `savePlan()` | PATCH /api/holdings/<id> (note) |
| `simulatePortfolioScan()` | คำนวณคะแนนพอร์ตจาก pieData |
| `exportCsv()` | สร้าง CSV จาก holdings → download ทันที |
| `loadPortfolios()` | GET /api/portfolios → setPortfolios |
| `createPortfolio()` | POST /api/portfolios/create |

---

## Price History — Chart Types ★ ใหม่ (session 5)

Modal Price History รองรับ 3 ประเภท (ปุ่มเลือกอยู่ใน modal header):

| ประเภท | state value | Component |
|---|---|---|
| แท่งเทียน (Candlestick) | `"candle"` | `CandlestickChart` (custom SVG, ResizeObserver) |
| เส้น (Line) | `"line"` | Recharts `LineChart` |
| พื้นที่ (Area) | `"area"` | Recharts `AreaChart` |

`CandlestickChart` ใช้ SVG ล้วน + ResizeObserver สำหรับ responsive width
- แท่งเขียว = ราคาขึ้น (close ≥ open)
- แท่งแดง = ราคาลง
- เส้น wick บน/ล่าง แสดง high/low

---

## UI Layout (App.css)

### Desktop (≥ 960px) — CSS Grid

```
┌──────────────────────────────────────────────────────────────────┐
│  TOP PANEL / PROFILE (full width)                                  │
│  [Avatar + Name + Email]  [Stocks|Value|Credits]                   │
│  [Dark/Light] [CSV Export] [แจ้งปัญหา] [Admin Panel*] [Logout]     │
├──────────────────────────────────────────────────────────────────┤
│  EVALUATION PANEL (full width)                                    │
│  [Investor model selector]   [สแกนพอตหุ้น button]                │
├──────────────────────────────────────────────────────────────────┤
│  PORTFOLIO P&L PANEL (full width)                                  │
│  [เงินสด ✎]  [ต้นทุน]  [มูลค่าปัจจุบัน]  [กำไร/ขาดทุน]  [รวม]   │
├─────────────────────────────┬────────────────────────────────────┤
│  CHART PANEL (3fr ~ 60%)    │  STOCK MANAGER (2fr ~ 40%)         │
│  [By Stock | By Sector]     │  [Portfolio | Watchlist tab]       │
│  [Pie chart 400px height]   │  [Scrollable list max 560px]       │
│  [Legend: logo + ชื่อ]       │  [Edit/Delete/Qty/Price/Target/Stop/Plan/History/Transactions] │
└─────────────────────────────┴────────────────────────────────────┘
```

> `*` ปุ่ม Admin Panel แสดงเฉพาะ user ที่ role === "admin"

### CSS Variables (Dark/Light theme)

```css
:root { --bg: #0f0f1a; --card-bg: #16172a; ... }  /* dark */
html:not(.dark) { --bg: #f3f4f8; --card-bg: #ffffff; ... }  /* light */
```

### Stock Manager — Tabs

- **Portfolio tab** (`stockTab === "portfolio"`) — หุ้นที่ `is_watchlist === false`
- **Watchlist tab** (`stockTab === "watchlist"`) — หุ้นที่ `is_watchlist === true`

### Stock Manager — Edit Form Fields

| Field | หมายเหตุ |
|---|---|
| Qty | จำนวนหุ้น |
| Avg Cost | ราคาต้นทุนเฉลี่ย |
| Currency | THB / USD |
| ราคาปัจจุบัน | Manual หรือ Auto (fetch จาก Yahoo Finance) |
| Target Price | เป้าหมาย — แสดง badge "ถึงเป้า" ถ้า current ≥ target |
| Stop Loss | แสดง badge "Stop Loss" ถ้า current ≤ stop_loss |

### Breakpoints

| Breakpoint | Layout |
|---|---|
| ≥ 960px | 2-column (3fr / 2fr) |
| 600–959px | single column, top-side แนวนอน |
| < 600px | single column, mobile-optimized |

---

## วิธีรัน

### ข้อกำหนด
- Python 3.10+
- Node.js 21.x (`"node": ">=21 <22"`)
- PostgreSQL รันที่ port **5431**
- EasyOCR models อยู่ที่ `C:/easyocr_models`

### ★ วิธีรันด้วยคำสั่งเดียว (แนะนำ)

```powershell
cd C:\ProjectAll\TradeFULL\Trade\backend
.venv\Scripts\activate

cd C:\ProjectAll\TradeFULL\Trade
node start.js
```

- backend → `http://127.0.0.1:8000`
- frontend → `http://localhost:5173`
- หยุด: **Ctrl+C** (ปิดทั้งสองพร้อมกัน)

> **⚠️ สำคัญ**: ต้อง **restart Django** ทุกครั้งที่เพิ่ม URL ใหม่ใน urls.py

### วิธีรัน Migration

```powershell
cd C:\ProjectAll\TradeFULL\Trade\backend
python manage.py migrate
```

---

## Database Config

ใช้ **python-decouple** อ่านค่าจาก `backend/.env`:

```
SECRET_KEY=dev-only-secret-key
DEBUG=True
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<password>
DB_HOST=127.0.0.1
DB_PORT=5431
GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

---

## Dependencies สำคัญ

### Backend
| Package | ใช้ทำอะไร |
|---|---|
| Django 3.2.25 | Web framework |
| easyocr 1.7.2 | OCR อ่านชื่อหุ้นจากรูป |
| Pillow 10.4.0 | ประมวลผลรูป (crop, grayscale) |
| psycopg2-binary 2.9.11 | PostgreSQL connector |
| bcrypt | hash password |
| python-decouple 3.8 | อ่านค่าจาก .env |
| yfinance 1.4.1 | ดึงราคาหุ้น + ประวัติราคา OHLCV จาก Yahoo Finance |
| google-auth 2.29.0 | verify Google ID Token |

### Frontend
| Package | ใช้ทำอะไร |
|---|---|
| React 18.3.1 | UI framework |
| Vite 5.4.14 | Build tool + dev server |
| Recharts 2.12.7 | Pie chart, LineChart, AreaChart |

---

## Bugs ที่แก้แล้ว

| Bug | วิธีแก้ |
|---|---|
| `/api/auth/me` ไม่มี → user logout ทุกครั้ง reload | เพิ่ม `get_me` view + `fetchMe()` ใน useEffect |
| `summary` shape ผิด (`{id,symbol}` แทนที่จะเป็น `{name,value}`) | แก้ `list_user_stocks` + `_build_summary` |
| Upload response ไม่มี summary → pie ไม่ update | เพิ่ม `_build_summary()` ใน upload response |
| Missing `Authorization` header บน CRUD endpoints | เพิ่ม header ให้ทุก fetch ใน App.jsx |
| Login ด้วย admin role แล้วไม่เห็น Admin Panel button | `login_user` view ไม่ return `role` ใน response — เพิ่ม `"role": user.role` |
| `/api/price/` คืน HTML แทน JSON หลังเพิ่ม URL | Django dev server ต้อง restart เพื่อโหลด URL ใหม่ |
| `/api/price/history` ส่งแค่ close | session 5: เพิ่ม open/high/low/volume เพื่อรองรับ Candlestick |
