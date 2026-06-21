# Trade — Project Overview

> อัพเดทล่าสุด: 2026-06-21 (session 6)

## โครงสร้างโปรเจ็ค

```
Trade/
├── backend/
│   ├── config/
│   │   ├── settings.py       # Django settings (DB, middleware)
│   │   ├── urls.py           # URL patterns + View functions ทั้งหมด (~1560 บรรทัด)
│   │   └── wsgi.py
│   ├── core/
│   │   ├── models.py         # Database models ทั้งหมด
│   │   ├── middleware.py     # TokenAuthMiddleware
│   │   └── migrations/       # 0001–0007 (additive ทั้งหมด)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env                  # DB creds, SECRET_KEY, GOOGLE_CLIENT_ID
│
├── frontend/
│   └── src/
│       ├── App.jsx           # ทั้งแอปในไฟล์เดียว (~3750 บรรทัด)
│       ├── App.css           # Styles ทั้งหมด
│       └── main.jsx
│
├── start.js                  # รัน backend + frontend พร้อมกัน
├── CLAUDE.md                 # คู่มือ AI / Developer
└── Flow/
    ├── project-overview.md   # ไฟล์นี้
    ├── database-design.md    # ERD + schema
    ├── google-oauth-setup.md
    ├── deploy-guide.md
    ├── เเผนการตลาด.md        # ★ ใหม่ session 6
    └── issue/
        ├── feature-suggestions.md
        └── google-login-poc.md
```

---

## Database Models (core/models.py)

| Model | ความหมาย | หมายเหตุ |
|---|---|---|
| `User` | ผู้ใช้งาน (UUID PK, email unique) | มี `role` field (user/admin) |
| `UserSession` | Token session (Bearer, อายุ 30 วัน) | |
| `UserAuthProvider` | Social login provider | email/google/apple/line |
| `Wallet` | scan_credits ของแต่ละ user | 1:1 กับ User |
| `Portfolio` | กลุ่มพอร์ตของ user | `is_default=True` สร้างตอน register, มี `cash_balance` |
| `PortfolioHolding` | qty + avg_cost + current_price + target_price + stop_loss + currency + note | unique per (portfolio, user_stock) |
| `HoldingTransaction` | บันทึกการซื้อ/ขายแต่ละครั้ง | tx_type: buy/sell, qty, price, tx_date |
| `UserStock` | หุ้นที่ user มี | มี `is_watchlist`, unique per (user, symbol) |
| `StockNameEdit` | ประวัติการเปลี่ยนชื่อหุ้น | |
| `IssueReport` | ปัญหาที่ user แจ้ง | status: open → in_progress → resolved |
| `SiteFeature` | feature flag (admin toggle) | PK = key string, enabled + message |
| `Scan` / `ScanItem` | OCR scan pipeline | |
| `PricingPlan` / `Payment` / `ScanChargeLog` / `Wallet` | Billing | |
| `StockRecord` | **deprecated** — ไม่ใช้แล้ว | |

---

## API Endpoints (config/urls.py)

URL ordering สำคัญ: specific path ต้องมาก่อน parameterized (`<uuid:...>`)

### Public
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/health` | ตรวจ backend |
| POST | `/api/auth/register` | สมัครสมาชิก + สร้าง default Portfolio |
| POST | `/api/auth/login` | login → Bearer token + user.role |
| POST | `/api/auth/logout` | ลบ session |
| POST | `/api/auth/google` | Google One Tap → Bearer token |

### Protected (`Authorization: Bearer <token>`)

#### Auth & User
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/auth/me` | ดึง user object จาก token |

#### Stocks & Holdings
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/stocks` | ดึง UserStock + holdings + cash_balance |
| POST | `/api/stocks/upload` | อัพโหลดรูป → OCR → เพิ่มหุ้น |
| POST | `/api/stocks/manual` | เพิ่มหุ้นด้วยมือ |
| GET | `/api/stocks/search?q=` | ★ ใหม่ — ค้นหาหุ้น (Yahoo Finance) US/Thai/CN/VN/HK |
| DELETE | `/api/stocks/group/delete` | ลบหุ้นทั้ง group |
| PATCH | `/api/stocks/group` | rename group |
| PATCH | `/api/stocks/<uuid>/watchlist` | toggle is_watchlist |
| PATCH | `/api/holdings/<uuid>` | อัพเดท qty/avg_cost/current_price/target_price/stop_loss/currency/note |
| PATCH | `/api/portfolio/cash` | อัพเดท cash_balance |
| POST | `/api/portfolio/clear` | ล้างพอร์ตทั้งหมด |

#### Portfolios
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/portfolios` | รายการ portfolios ทั้งหมด |
| POST | `/api/portfolios/create` | สร้าง portfolio ใหม่ |

#### Transactions
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/transactions/<uuid>?portfolio_id=` | รายการ transactions ของหุ้น |
| POST | `/api/transactions/<uuid>/add` | เพิ่ม transaction (buy/sell) |
| DELETE | `/api/transactions/delete/<uuid>` | ลบ transaction |

#### Prices & Market Data
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/price/<symbol>?currency=THB\|USD` | ราคา real-time (yfinance, cache 60 วินาที) |
| GET | `/api/price/<symbol>/history?period=&currency=` | OHLCV history |
| GET | `/api/fx-rate` | USD/THB rate (Frankfurter API primary, cache 10 นาที) |
| GET | `/api/commodities` | ★ ใหม่ — ราคา Gold/Silver/Oil/Copper/NatGas (cache 5 นาที) |

#### Config & Admin
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/config/features` | feature flags ทั้งหมด |
| PATCH | `/api/config/features/<key>` | toggle feature (admin only) |
| POST | `/api/issues/submit` | ส่งปัญหา |
| GET | `/api/issues` | user: ของตัวเอง / admin: ทั้งหมด |
| PATCH | `/api/issues/<uuid>` | admin: เปลี่ยน status/admin_note |
| GET | `/api/admin/users` | admin: รายการ users |
| PATCH | `/api/admin/users/<uuid>` | admin: เปลี่ยน role/status |
| GET | `/api/wallet` | scan credits คงเหลือ |

---

## External APIs ที่ใช้ (ฟรีทั้งหมด)

| บริการ | ใช้ที่ไหน | Cache | หมายเหตุ |
|---|---|---|---|
| **Frankfurter API** (ECB) | `/api/fx-rate` (primary) | 10 นาที | `api.frankfurter.app` — ฟรี ไม่ต้อง API key |
| **Yahoo Finance** (yfinance) | price, history, fx-rate (fallback), commodities | 60 วินาที / 5 นาที | library wrapper |
| **Yahoo Finance unofficial search** | `/api/stocks/search` | ไม่มี | `query1.finance.yahoo.com/v1/finance/search` |
| **Google OAuth** | `/api/auth/google` + frontend One Tap | — | ฟรี, ต้องตั้งค่า Client ID |
| **FMP image CDN** | Stock logo (1st source) | browser cache | `financialmodelingprep.com/image-stock/` ไม่ต้อง API key |
| **Parqet CDN** | Stock logo (2nd source) | browser cache | `assets.parqet.com/logos/symbol/` |
| **EODHD CDN** | Stock logo (3rd source) | browser cache | ★ ใหม่ — `eodhd.com/img/logos/US/` |

### Module-level Cache ใน urls.py

```python
_commodity_cache = {"data": None, "ts": 0}   # 5 นาที
_fx_cache        = {"rate": None, "ts": 0}    # 10 นาที
_price_cache     = {}  # {symbol: {"price", "currency", "ts"}}  # 60 วินาที
```

---

## GET /api/stocks — Response Shape

```json
{
  "items": [
    {
      "id": "<uuid>",
      "stock_name": "AAPL",
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

## GET /api/commodities — Response Shape

```json
{
  "status": "success",
  "items": [
    { "symbol": "GC=F", "name": "Gold", "name_th": "ทอง", "icon": "🥇",
      "unit": "USD/oz", "price": 2345.50, "change_pct": 0.82 }
  ]
}
```

## GET /api/stocks/search?q=apple — Response Shape

```json
{
  "items": [
    { "symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "flag": "🇺🇸" }
  ]
}
```

Exchange ที่รองรับ: NYSE, NASDAQ, AMEX, NYSE Arca (🇺🇸) / SET (🇹🇭) / HKEX (🇭🇰) / SSE, SZSE (🇨🇳) / HOSE (🇻🇳)

---

## Authentication Flow

```
1. POST /api/auth/login  →  { token, user: { id, email, role, display_name, avatar_url } }
2. เก็บ token ใน localStorage("trade-auth-token")
3. ทุก request: Authorization: Bearer <token>
4. @api_login_required → หา UserSession → set request.user
5. App load: GET /api/auth/me → restore session
6. role === "admin" → แสดงปุ่ม Admin Panel
```

Token อายุ **30 วัน** — Google Login ใช้ flow เดียวกัน verify ด้วย `google.oauth2.id_token`

---

## Frontend (App.jsx ~3750 บรรทัด)

### Screens

| Screen | เงื่อนไข | เนื้อหา |
|---|---|---|
| Login/Register | `!authUser` | `LoginPage` component |
| Payment | `activeScreen !== "app"` | เลือกแพ็ก + checkout |
| Admin | `activeScreen === "admin"` | จัดการ issues/users/features |
| App หลัก | `activeScreen === "app"` | Main app |

### Layout (Desktop ≥960px — CSS Grid)

```
┌──────────────────────────────────────────────────────────┐
│  TOP PANEL — Avatar / Stats / Actions                     │
├──────────────────────────────────────────────────────────┤
│  EVALUATION PANEL — Investor Model / Scan Portfolio       │
├──────────────────────────────────────────────────────────┤
│  P&L PANEL — Cash / Cost / Value / PnL / Wealth          │
├───────────────────────────┬──────────────────────────────┤
│  CHART PANEL (3fr)        │  STOCK MANAGER (2fr)         │
│  ├─ Market Status         │  [Portfolio | Watchlist tab] │
│  ├─ ★ Commodity Prices    │  [Stock list + inline edit]  │
│  ├─ ★ Mega Trends         │  [fetch price per row ★]     │
│  └─ Pie Chart             │                              │
│     [By Stock | Sector]   │                              │
│     [Draggable legend ★]  │                              │
└───────────────────────────┴──────────────────────────────┘
```

### State สำคัญ (session 6 เพิ่ม)

| State | ความหมาย |
|---|---|
| `authToken` / `authUser` | session + user object |
| `records` | UserStock array จาก DB |
| `stockMeta` | `{ [name]: { quantity, price, current_price, target_price, stop_loss, currency, note, is_watchlist } }` |
| `pieData` | useMemo: records + stockMeta → pie segments |
| `pieOrder` | ★ array of stock names กำหนดลำดับ pie legend (drag-to-reorder) |
| `sortedPieData` | useMemo: pieData เรียงตาม pieOrder |
| `pieDragOver` | ★ index ที่กำลัง drag over (visual feedback) |
| `sectorData` | useMemo: holdings grouped by sector |
| `pnlData` | useMemo: { totalCost, totalCurrentValue, totalPnL, totalPnLPct, totalWealth } |
| `commodities` | ★ ราคา commodity 5 รายการ จาก `/api/commodities` |
| `megaTrendData` | ★ useMemo: MEGA_TRENDS_LIST + user holdings → trend exposure |
| `stockSearchResults` | ★ ผลการค้นหาหุ้น จาก `/api/stocks/search` |
| `stockSearchLoading` | ★ loading state ระหว่างค้นหา |
| `globalLoading` | ★ true เมื่อมี API call อยู่ → แสดง overlay |
| `cashBalance` | เงินสดที่ไม่ได้ลงทุน |
| `usdToThbRate` | USD/THB rate |
| `historyModal` / `historyChartType` / `historyPeriod` | Price History modal |
| `txModal` / `txList` / `txForm` | Transaction modal |
| `portfolios` / `activePortfolioId` | multi-portfolio |
| `chartMode` | "stock" / "sector" |
| `stockTab` | "portfolio" / "watchlist" |
| `features` | feature flags |

### Helper Components

| Component | หน้าที่ |
|---|---|
| `useWindowWidth()` | hook responsive |
| `getStockLogoSources(symbol)` | ★ คืน array URL: [FMP, Parqet, EODHD] |
| `StockLogo` | แสดง logo + fallback initials (srcIndex 0→1→2→initials) |
| `CustomPieTooltip` | Recharts tooltip |
| `PieSliceLabel` | Label icon+ชื่อ รอบ Pie (ใช้ getStockLogoSources) |
| `IssueCard` | card ใน Admin Panel |
| `CandlestickChart` | SVG candlestick (OHLC) + ResizeObserver |
| `ConstellationBg` | Canvas animation (login) |
| `LoginPage` | หน้า login/register |

### ฟังก์ชันหลัก

| ฟังก์ชัน | หน้าที่ | Loading |
|---|---|---|
| `bootstrap()` | เรียก 5 APIs พร้อมกัน ตอน login | ★ globalLoading |
| `loadRecords(portfolioId?)` | GET /api/stocks → sync stockMeta | ★ globalLoading |
| `addManualStock()` | POST /api/stocks/manual | ★ globalLoading |
| `deleteGroup(name)` | DELETE /api/stocks/group/delete | ★ globalLoading |
| `saveGroupEdit(oldName)` | PATCH rename + PATCH holdings | ★ globalLoading |
| `handleClearPortfolio()` | POST /api/portfolio/clear | ★ globalLoading |
| `createPortfolio()` | POST /api/portfolios/create | ★ globalLoading |
| `loadTransactions(stockId)` | GET /api/transactions/<id> | ★ globalLoading |
| `addTransactionFn(stockId)` | POST /api/transactions/<id>/add | ★ globalLoading |
| `deleteTransactionFn(txId)` | DELETE /api/transactions/delete/<id> | ★ globalLoading |
| `loadPriceHistory(sym, cur, period)` | GET /api/price/<sym>/history | ★ globalLoading |
| `fetchStockPrice(name)` | GET /api/price/<sym> (per-row fetch) | per-row indicator |
| `searchStocks(q)` | GET /api/stocks/search?q= (debounce 350ms) | stockSearchLoading |
| `loadCommodities()` | GET /api/commodities | commoditiesLoading |
| `loadFxRate()` | GET /api/fx-rate | — |
| `loadPortfolios()` | GET /api/portfolios | — |
| `getStockMeta(name)` | merge records + stockMeta | — |
| `updateStockMeta(name, patch)` | อัพเดท state + mirror ลง records | — |

### Global Loading Overlay

```
_apiCount (useRef) — counter รองรับ concurrent API calls
apiStart() → _apiCount++ → setGlobalLoading(true)
apiEnd()   → _apiCount-- → setGlobalLoading(false) เมื่อ count = 0

JSX: globalLoadingOverlay = globalLoading && <div className="global-loading-overlay">...
แสดงใน: admin screen / payment screen / main app screen
```

---

## Constants (ใน App.jsx)

| Constant | ความหมาย |
|---|---|
| `PIE_COLORS` | array สีสำหรับ pie segments |
| `PAYMENT_PLANS` | แพ็กเกจชำระเงิน |
| `INVESTOR_MODELS` | โมเดลนักลงทุน (แบบ VI, Growth, etc.) |
| `LP_STOCKS` | mock data สำหรับ login page preview |
| `MEGA_TRENDS_LIST` | ★ 12 Mega Trends พร้อม icon/color/desc |
| `MEGA_TREND_SYMBOL_MAP` | ★ symbol → trend name (เช่น NVDA→AI) |
| `SECTOR_TO_TREND` | ★ sector string → trend name (fallback) |
| `TREND_META` | ★ trend name → { icon, color } |

---

## Features ใหม่ (session 6)

### 1. Commodity Prices Panel
- แสดง Gold / Silver / Crude Oil / Copper / Nat. Gas ราคาปัจจุบัน + % change
- backend: `GET /api/commodities` — yfinance futures symbols (GC=F, SI=F, CL=F, HG=F, NG=F)
- เรียงตาม % change มากไปน้อย, cache 5 นาที
- UI: อยู่ใต้ Market Status box ในส่วน chart panel ซ้าย

### 2. Mega Trends Panel
- แสดง 12 Mega Trends ระดับโลก (AI, EV, Cyber, Biotech, Semiconductor, Cloud, Space, Fintech, Healthcare, Infrastructure, E-Commerce, Metaverse)
- แต่ละ trend มี icon / color / desc (ภาษาไทย) / user exposure badges
- `megaTrendData` useMemo: ใช้ `MEGA_TRENDS_LIST` เป็น base → map หุ้นใน holdings ว่า match trend ไหน
- UI: max-height 360px + scrollbar, อยู่ใต้ Commodity Panel

### 3. Pie Chart Drag-to-Reorder
- กดค้างแล้วลาก stock ใน legend เพื่อสลับลำดับ
- HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
- `dragPieFrom = useRef(null)` เก็บ source index, `pieDragOver` state สำหรับ visual
- `pieOrder` state sync กับ pieData ผ่าน useEffect
- ทำงานเฉพาะเมื่อ `chartMode === "stock"` && `chartType === "pie"`

### 4. Per-Stock Price Fetch (Stocks In Pie)
- ปุ่ม "⟳" ต่อแต่ละหุ้นใน list
- กดแล้วเรียก `fetchStockPrice(name)` → แสดง % change จาก avg_cost
- สีเขียว = กำไร, แดง = ขาดทุน

### 5. Add Stock Modal — Search Autocomplete
- input debounce 350ms → เรียก `searchStocks(q)` → `GET /api/stocks/search?q=`
- Yahoo Finance search API กรองเฉพาะ exchange ที่รองรับ (9 exchanges)
- dropdown แสดง flag + symbol + ชื่อบริษัท + exchange badge
- กดเลือก → symbol เติมใน input อัตโนมัติ
- clear เมื่อ: ปิด modal / กด Cancel / เพิ่มหุ้นสำเร็จ / Escape

### 6. Global Loading Overlay
- สปินเนอร์สีเขียว + backdrop blur ครอบทุก screen
- counter-based (ไม่ใช่ boolean) — รองรับ concurrent calls
- ครอบ: bootstrap, loadRecords, add/delete/edit stock, transactions, clear portfolio, price history, create portfolio

### 7. FX Rate — Multi-source + Cache
- Primary: **Frankfurter API** (ECB-based, ฟรี 100%, ไม่ต้อง API key)
- Fallback: yfinance `USDTHB=X`
- Cache 10 นาที (`_fx_cache`)

### 8. Stock Price Cache
- Cache 60 วินาที per symbol (`_price_cache` dict)
- ลด Yahoo Finance calls เมื่อกด fetch บ่อย

### 9. Stock Logo — 3-Source Fallback
- Source 1: FMP CDN (`financialmodelingprep.com/image-stock/`)
- Source 2: Parqet CDN (`assets.parqet.com/logos/symbol/`)
- Source 3: ★ EODHD CDN (`eodhd.com/img/logos/US/`)
- Fallback: initials (2 ตัวอักษร)
- ทั้ง `StockLogo` และ `PieSliceLabel` ใช้ `getStockLogoSources()` เดียวกัน

---

## P&L Calculation

```
usdToThbRate = GET /api/fx-rate ตอน bootstrap (Frankfurter primary)

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

## Price History Chart

| ปุ่ม | state | Component |
|---|---|---|
| แท่งเทียน | `"candle"` | `CandlestickChart` (custom SVG + ResizeObserver) |
| เส้น | `"line"` | Recharts `LineChart` |
| พื้นที่ | `"area"` | Recharts `AreaChart` |

API `/api/price/<symbol>/history` คืน: `date, open, high, low, close, volume`

---

## Bugs ที่แก้แล้ว (session 6)

| Bug | วิธีแก้ |
|---|---|
| Stock logo ส่ง `.BK` suffix ไปยัง FMP → ไม่ขึ้นรูป | `getStockLogoSources()` strip `.BK` ก่อนส่ง URL |
| `PieSliceLabel` srcIndex ไม่ reset เมื่อ name เปลี่ยน | เพิ่ม `useEffect(() => setSrcIndex(0), [name])` |
| `loadTransactions` ใช้ default portfolio เสมอ | เพิ่ม `?portfolio_id=${activePortfolioId}` |
| Backend `list_transactions` ไม่อ่าน `portfolio_id` query param | แก้ให้อ่าน GET param แทน hardcode default |
| Backend `update_holding`: `Decimal()` crash บน invalid input | เพิ่ม `_to_decimal()` helper + try/except |
| Backend `add_transaction`: ไม่ validate Decimal + date format | เพิ่ม try/except Decimal + regex `^\d{4}-\d{2}-\d{2}$` |
| `fetchStockPrice` เรียก `.json()` ก่อนตรวจ `res.ok` | reorder: ตรวจ ok ก่อน, error path ใช้ `.json().catch(()=>{})` |
| FX rate ไม่มี cache → เรียก Yahoo ทุก request | เพิ่ม `_fx_cache` + Frankfurter API |

---

## วิธีรัน

```powershell
# Activate venv
cd C:\ProjectAll\TradeFULL\Trade\backend
.venv\Scripts\activate

# รันทั้ง backend + frontend
cd C:\ProjectAll\TradeFULL\Trade
node start.js
```

| Service | URL |
|---|---|
| Backend | http://127.0.0.1:8000 |
| Frontend | http://localhost:5173 |

**ต้อง restart Django** ทุกครั้งที่เพิ่ม URL ใหม่ใน `urls.py`

---

## Dependencies สำคัญ

### Backend
| Package | ใช้ทำอะไร |
|---|---|
| Django 3.2 | Web framework |
| easyocr | OCR อ่านชื่อหุ้นจากรูป |
| Pillow | ประมวลผลรูป |
| psycopg2-binary | PostgreSQL |
| python-decouple | อ่าน .env |
| yfinance | ราคาหุ้น + history + FX + commodities |
| google-auth | verify Google ID Token |

### Frontend
| Package | ใช้ทำอะไร |
|---|---|
| React 18 | UI |
| Vite 5 | Build + dev server |
| Recharts | Pie, Line, Area charts |

---

## Env Files

**`backend/.env`**
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

**`frontend/.env`**
```
VITE_GOOGLE_CLIENT_ID=...
```
