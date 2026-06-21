# Feature Suggestions — Trade Portfolio Tracker

> อัพเดทล่าสุด: 2026-06-21 (session 6)

---

## ✅ สำเร็จแล้ว (Implemented)

| Feature | Session | หมายเหตุ |
|---|---|---|
| Real-time USD/THB Exchange Rate | 4 | `GET /api/fx-rate` + `usdToThbRate` state |
| Export CSV | 4 | `exportCsv()` — frontend only |
| Sector Allocation Chart | 4 | `sectorData` useMemo + chartMode toggle |
| Transaction Log | 5 | `HoldingTransaction` model + 3 endpoints + modal |
| Multi-Portfolio UI | 5 | `GET /api/portfolios` + `POST /api/portfolios/create` |
| Watchlist | 5 | `UserStock.is_watchlist` + tab toggle |
| Target Price & Stop-Loss | 5 | fields ใน `PortfolioHolding` + badge indicator |
| Historical Price Chart | 5 | `GET /api/price/<symbol>/history` + 3 chart types |
| Candlestick Chart | 5 | custom SVG + ResizeObserver |
| SiteFeature Flag (Admin) | 5 | Admin toggle feature flags |
| Google Login | 5 | `POST /api/auth/google` + One Tap |
| **Commodity Prices Panel** | **6** | Gold/Silver/Oil/Copper/NatGas — yfinance, cache 5 นาที |
| **Mega Trends Panel** | **6** | 12 Mega Trends โลก + user exposure mapping |
| **Pie Chart Drag-to-Reorder** | **6** | HTML5 drag-and-drop บน pie legend |
| **Per-Stock Price Fetch** | **6** | ปุ่มดึงราคารายตัว + % change จาก avg_cost |
| **Add Stock Search Autocomplete** | **6** | Yahoo Finance search — US/Thai/CN/VN/HK |
| **Global Loading Overlay** | **6** | spinner ครอบทุก screen เมื่อมี API call |
| **FX Rate Multi-source + Cache** | **6** | Frankfurter API primary, yfinance fallback, cache 10 นาที |
| **Stock Price Cache** | **6** | 60 วินาที per symbol ใน backend |
| **Stock Logo 3-Source Fallback** | **6** | FMP → Parqet → EODHD → initials |

---

## 🔴 Priority สูง (ยังไม่ทำ)

### 1. Password Reset (ลืมรหัสผ่าน)

**ปัญหา:** ไม่มี flow ลืมรหัสผ่าน — user ต้องติดต่อ admin  
**วิธีทำ:**
- model `PasswordResetToken` (token, user, expires_at)
- `POST /api/auth/forgot-password` → ส่ง email พร้อม reset link
- `POST /api/auth/reset-password` → รับ token + password ใหม่
- Frontend: หน้า forgot-password + reset-password

**Effort:** กลาง | **Impact:** สูงมาก (UX critical)

---

### 2. Auto avg_cost จาก Transactions

**ปัญหา:** Transaction Log มีอยู่แล้ว แต่ไม่ auto-calculate avg_cost  
**วิธีทำ:**
- backend: คำนวณ VWAP avg_cost จาก `HoldingTransaction` ทุกครั้งที่ save transaction
- frontend: disable ช่อง Avg Cost เมื่อมี transactions อยู่แล้ว (ป้องกัน override)

**Effort:** ต่ำ | **Impact:** กลาง

---

## 🟡 Priority กลาง

### 3. Mega Trends — ETF Proxy Score

**สถานะปัจจุบัน:** Mega Trends แสดง trends พร้อม user exposure แล้ว (session 6)  
**ขั้นต่อไป:** วัด trend strength จากข้อมูลจริง

**วิธีทำ:**
- backend endpoint `GET /api/megatrends` — ดึง ETF proxy performance ด้วย yfinance
- ETF ต่อ trend เช่น: AI → BOTZ, EV → ICLN, Cyber → HACK, Biotech → ARKG
- คำนวณ 1M/3M/YTD return → normalize เป็น momentum score 0–100
- Frontend: แสดง score bar ใน Mega Trends panel, เรียงตาม momentum

**ข้อมูลฟรี:** yfinance (ที่ติดตั้งอยู่แล้ว), cache 30 นาที  
**Effort:** ต่ำ | **Impact:** สูง (differentiator)

---

### 4. Portfolio Performance Benchmark

**วิธีทำ:**
- เปรียบเทียบ P&L ของพอร์ต vs SET100 (`^SET.BK`) / S&P500 (`^GSPC`)
- ใช้ `/api/price/history` ที่มีอยู่แล้ว — ไม่ต้องเพิ่ม endpoint
- useMemo คำนวณ % return ตั้งแต่วันซื้อแรก + LineChart เปรียบเทียบ

**Effort:** ต่ำ | **Impact:** กลาง

---

### 5. Dividend Tracker

**วิธีทำ:**
- model `Dividend` (holding FK, amount_per_share, ex_date, pay_date, total_received)
- CRUD endpoints + UI section ใน stock detail
- แสดง yield % ต่อหุ้น และ total dividend income รวม

**Effort:** สูง | **Impact:** กลาง

---

### 6. Investment Journal (Note ประวัติ)

**ปัญหา:** Plan feature เก็บได้แค่ note เดียวต่อหุ้น  
**วิธีทำ:**
- model `HoldingNote` (holding FK, content, created_at) — append-only
- แสดง timeline journal ต่อหุ้น

**Effort:** กลาง | **Impact:** กลาง

---

## 🟢 Priority ต่ำ

### 7. Email Notifications (Target / Stop-Loss alert)

- Celery / cron ตรวจ `current_price` vs `target_price` / `stop_loss` ทุก N นาที
- ส่ง email เมื่อถึงเงื่อนไข

### 8. Price Alert Push Notification

- Web Push API + Service Worker
- แจ้งเตือน browser เมื่อราคาถึง target

### 9. Multi-Currency (EUR, JPY, etc.)

- เพิ่ม currency options ใน PortfolioHolding
- ดึง FX rate เพิ่มเติมจาก Frankfurter API

### 10. Dark/Light Theme per User (บันทึกใน DB)

- ปัจจุบัน: เก็บใน localStorage เท่านั้น
- เพิ่ม `theme` field ใน `User` model → sync ข้ามอุปกรณ์

---

## สรุปลำดับที่แนะนำ (ถัดไป)

| ลำดับ | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Password Reset | กลาง | สูงมาก |
| 2 | Auto avg_cost จาก Transactions | ต่ำ | กลาง |
| 3 | Mega Trends ETF Score | ต่ำ | สูง |
| 4 | Portfolio Benchmark | ต่ำ | กลาง |
| 5 | Dividend Tracker | สูง | กลาง |
| 6 | Investment Journal | กลาง | กลาง |
