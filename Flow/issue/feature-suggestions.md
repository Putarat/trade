# Feature Suggestions — Trade Portfolio Tracker

> อัพเดทล่าสุด: 2026-06-21 (session 5)

---

## ✅ สำเร็จแล้ว (Implemented)

| Feature | Session | หมายเหตุ |
|---|---|---|
| Real-time USD/THB Exchange Rate | 4 | `GET /api/fx-rate` + `usdToThbRate` state |
| Export CSV | 4 | `exportCsv()` — frontend only |
| Sector Allocation Chart | 4 | `sectorData` useMemo + `chartMode` toggle (By Stock / By Sector) |
| Transaction Log | 5 | `HoldingTransaction` model + 3 endpoints + modal UI |
| Multi-Portfolio UI | 5 | `GET /api/portfolios` + `POST /api/portfolios/create` + create modal |
| Watchlist | 5 | `UserStock.is_watchlist` + `PATCH /api/stocks/<id>/watchlist` + tab toggle |
| Target Price & Stop-Loss | 5 | fields ใน PortfolioHolding + badge visual indicator |
| Historical Price Chart | 4 | `GET /api/price/<symbol>/history` + LineChart modal |
| Candlestick Chart | 5 | modal รองรับ 3 chart type: แท่งเทียน / เส้น / พื้นที่ |
| SiteFeature Flag (Admin) | 5 | `SiteFeature` model + `GET/PATCH /api/config/features` + Admin UI |
| Google Login | 5 | `POST /api/auth/google` + `handleGoogleLogin()` |

---

## 🔴 Priority สูง (ยังไม่ทำ)

### 1. Password Reset (ลืมรหัสผ่าน)

**ปัญหาปัจจุบัน:** ไม่มี flow สำหรับลืมรหัสผ่าน  
**วิธีทำ:**
- หน้า "ลืมรหัสผ่าน" → กรอก email → ส่ง reset link ผ่าน Django email backend
- model `PasswordResetToken` (token, user, expires_at)
- link เปิดหน้า reset password → กรอก password ใหม่

**Backend:** model ใหม่ + 2 endpoints + Django email config  
**Frontend:** หน้า forgot-password + หน้า reset-password

---

## 🟡 Priority กลาง

### 2. Dividend Tracker (ติดตามเงินปันผล)

**วิธีทำ:**
- model `Dividend` (stock, amount_per_share, ex_date, pay_date)
- user บันทึกปันผลที่ได้รับ
- แสดง yield % ต่อหุ้น และ total dividend income ในพอร์ต

**Backend:** model ใหม่ + CRUD endpoints  
**Frontend:** section ใหม่ใน stock detail หรือหน้าแยก

---

### 3. Portfolio Performance Benchmark

**วิธีทำ:**
- เปรียบเทียบ P&L ของพอร์ต vs ดัชนี SET100 หรือ S&P500
- ดึงราคาดัชนีจาก yfinance (`^GSPC`, `^SET.BK`)
- กราฟเส้นเปรียบเทียบ % return

**Backend:** ไม่ต้องเพิ่ม endpoint (ใช้ `/api/price/history` ที่มีอยู่)  
**Frontend:** useMemo คำนวณ portfolio return % + LineChart เปรียบเทียบ

---

### 4. Note ประวัติ (Investment Journal)

**ปัญหาปัจจุบัน:** Plan feature เก็บได้แค่ note เดียวต่อหุ้น  
**วิธีทำ:**
- model `HoldingNote` (holding FK, content, created_at) แบบ append-only
- แสดง timeline journal ของแต่ละหุ้น

**Backend:** model ใหม่ + CRUD endpoints  
**Frontend:** section ใหม่ใน stock detail modal

---

## 🟢 Priority ต่ำ (nice-to-have)

### 5. Auto avg_cost จาก Transactions

**ปัญหาปัจจุบัน:** Transaction Log มีอยู่แล้ว แต่ไม่ auto-calculate avg_cost จาก transactions  
**วิธีทำ:**
- backend: คำนวณ FIFO/VWAP avg_cost จาก HoldingTransaction ทุกครั้งที่ save transaction
- frontend: disable input ช่อง Avg Cost เมื่อมี transactions

---

### 6. Email Notifications (Target/Stop-Loss)

**วิธีทำ:**
- Celery / cron job ตรวจ current_price vs target_price/stop_loss ทุก N นาที
- ส่ง email ผ่าน Django email backend เมื่อถึงเงื่อนไข

---

### 7. Multi-Currency P&L (สกุลเงินอื่นนอกจาก THB/USD)

**วิธีทำ:**
- รองรับ EUR, JPY, etc. ใน currency field
- ดึง FX rate สำหรับทุกสกุลเงิน

---

## สรุปลำดับที่แนะนำ (ถัดไป)

| ลำดับ | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Password Reset | กลาง | สูง (UX สำคัญ) |
| 2 | Auto avg_cost | ต่ำ | กลาง |
| 3 | Portfolio Benchmark | ต่ำ | กลาง |
| 4 | Dividend Tracker | สูง | กลาง |
| 5 | Investment Journal | กลาง | ต่ำ |
