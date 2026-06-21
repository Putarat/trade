# Database Design — Trade Portfolio Tracker

> อัพเดทล่าสุด: 2026-06-21 (session 5)

## Schema ERD

```
+------------------------------------------------------------------+
|  AUTH LAYER                                                       |
|                                                                   |
|  User ──────── UserSession (N)                                    |
|    │                                                              |
|    └─────────── UserAuthProvider (N)   [email/google/apple/line]  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  PORTFOLIO LAYER                                                  |
|                                                                   |
|  User ──── Portfolio (N) ──── PortfolioHolding (N) ──── UserStock|
|                 │                   │                             |
|                 │                   └──── HoldingTransaction (N)  |
|                 │                         (★ NEW session 5)       |
|                 └───── Scan (N) ──── ScanItem (N) ──── UserStock  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  STOCK LAYER                                                      |
|                                                                   |
|  User ──── UserStock (N) ──── StockNameEdit (N)                   |
|             └── is_watchlist (★ NEW session 5)                    |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  ISSUE LAYER                                                      |
|                                                                   |
|  User ──── IssueReport (N)                                        |
|             status: open → in_progress → resolved                 |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  SITE CONFIG LAYER                                                |
|                                                                   |
|  SiteFeature (standalone — PK = key string) (★ NEW session 5)    |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  PAYMENT LAYER                                                    |
|                                                                   |
|  User ──── Wallet (1:1)                                           |
|  User ──── Payment (N) ──── PricingPlan                           |
|  Scan ──── ScanChargeLog (1:1) ──── Payment                       |
+------------------------------------------------------------------+
```

---

## ตารางทั้งหมด

### AUTH

#### `User`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| email | EmailField unique | |
| password_hash | CharField | bcrypt via Django |
| display_name | CharField null | |
| status | CharField | active / suspended / deleted |
| role | CharField | user / admin (default: user) |
| created_at | DateTimeField | auto |
| updated_at | DateTimeField | auto |

#### `UserSession`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE |
| refresh_token_hash | CharField | Bearer token (urlsafe 48) |
| user_agent | TextField null | |
| ip_address | CharField null | |
| expires_at | DateTimeField | +30 วัน |
| created_at | DateTimeField | auto |

#### `UserAuthProvider`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE |
| provider | CharField | email / google / apple / line |
| provider_user_id | CharField | |
| created_at | DateTimeField | |
| *unique_together* | (provider, provider_user_id) | |

---

### PORTFOLIO

#### `Portfolio`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE |
| name | CharField(120) | default "My Portfolio" |
| description | TextField null | |
| is_default | BooleanField | default False |
| cash_balance | Decimal(18,2) null | เงินสดที่ยังไม่ลงทุน (default 0) |
| created_at | DateTimeField | auto |
| updated_at | DateTimeField | auto |
| *unique_together* | (user, name) | |

> แต่ละ user มี portfolio ที่ `is_default=True` 1 อัน สร้างอัตโนมัติตอน register

#### `PortfolioHolding`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| portfolio | FK → Portfolio | CASCADE |
| user_stock | FK → UserStock | CASCADE |
| quantity | Decimal(18,6) | จำนวนหุ้นที่ถือ |
| avg_cost | Decimal(18,6) | ราคาต้นทุนเฉลี่ยต่อหุ้น |
| current_price | Decimal(18,6) null | ราคาตลาดปัจจุบัน (user กรอก หรือดึงจาก yfinance) |
| **target_price** | Decimal(18,6) null | ★ ใหม่ — เป้าหมายราคา |
| **stop_loss** | Decimal(18,6) null | ★ ใหม่ — จุด stop-loss |
| currency | CharField(3) | THB / USD |
| note | TextField null | เหตุผลที่ซื้อหุ้น (Plan feature) |
| updated_at | DateTimeField | auto |
| *unique_together* | (portfolio, user_stock) | |

> `current_price` ใช้คำนวณ P&L: ถ้าไม่มีจะ fallback เป็น avg_cost (P&L = 0)
> `target_price` / `stop_loss` → frontend แสดง badge visual indicator

#### `HoldingTransaction` ★ ใหม่ (migration 0007)
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| holding | FK → PortfolioHolding | CASCADE, related_name="transactions" |
| user | FK → User | CASCADE |
| tx_type | CharField | buy / sell |
| quantity | Decimal(18,6) | จำนวนหุ้นในรายการนี้ |
| price | Decimal(18,6) | ราคาซื้อ/ขายต่อหุ้น |
| currency | CharField(3) | THB / USD |
| note | TextField null | หมายเหตุ |
| tx_date | DateField | วันที่ทำรายการ |
| created_at | DateTimeField | auto |

> ใช้บันทึกประวัติการซื้อขายแต่ละครั้ง
> ไม่ auto-calculate avg_cost — user กรอกเองใน PortfolioHolding

---

### STOCK

#### `UserStock`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE |
| symbol | CharField(20) | ชื่อย่อหุ้น เช่น AAPL, PTT |
| display_name | CharField null | |
| logo_url | TextField null | cache จาก financialmodelingprep |
| sector | CharField(60) null | เช่น Technology |
| exchange | CharField(20) null | เช่น NASDAQ, SET |
| is_active | BooleanField | default True |
| **is_watchlist** | BooleanField | ★ ใหม่ — default False (toggle ด้วย PATCH /api/stocks/<id>/watchlist) |
| created_at | DateTimeField | |
| *unique_together* | (user, symbol) | |

#### `StockNameEdit`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | |
| user_stock | FK → UserStock | |
| old_symbol | CharField | |
| new_symbol | CharField | |
| edited_at | DateTimeField | auto |

---

### ISSUES

#### `IssueReport`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE, related_name="issues" |
| subject | CharField(200) | หัวข้อปัญหา |
| description | TextField | รายละเอียด |
| status | CharField | open / in_progress / resolved (default: open) |
| admin_note | TextField null | หมายเหตุจาก admin |
| created_at | DateTimeField | auto |
| updated_at | DateTimeField | auto |

**Status Lifecycle:**
```
open  →  in_progress  →  resolved
  └────────────────────────────↑  (admin สามารถวนกลับได้)
```

---

### SITE CONFIG

#### `SiteFeature` ★ ใหม่ (migration 0006)
| Field | Type | Note |
|---|---|---|
| key | CharField(100) PK | เช่น "maintenance", "new_ui" |
| enabled | BooleanField | default True |
| message | TextField null | ข้อความแสดงต่อ user ถ้า disabled |
| updated_at | DateTimeField | auto |

> Admin toggle ผ่าน PATCH `/api/config/features/<key>` — ไม่มี UI สำหรับ add/delete key

---

### SCAN

#### `Scan`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE |
| portfolio | FK → Portfolio null | CASCADE SET_NULL |
| source_image_url | TextField null | |
| status | CharField | queued / processing / completed / failed |
| ocr_raw_text | TextField null | |
| error_message | TextField null | |
| score | Decimal(4,1) null | |
| portfolio_type | CharField null | |
| total_value_thb | Decimal null | |
| created_at | DateTimeField | |
| completed_at | DateTimeField null | |

#### `ScanItem`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| scan | FK → Scan | CASCADE |
| user_stock | FK → UserStock | CASCADE |
| quantity | Decimal(18,6) | จาก OCR (ส่วนใหญ่ = 0) |
| price | Decimal(18,6) | จาก OCR (ส่วนใหญ่ = 0) |
| currency | CharField(3) | |
| fx_rate_to_thb | Decimal | |
| value_thb | Decimal | |
| source | CharField | ocr / manual |
| confidence | Decimal(5,4) null | OCR confidence score |
| created_at | DateTimeField | |
| *index* | (scan, user_stock) | |

---

### PAYMENT

#### `Wallet`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | OneToOne → User | CASCADE |
| scan_credits | IntegerField | default 0 |
| updated_at | DateTimeField | auto |

#### `PricingPlan`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| name | CharField | |
| plan_type | CharField | pay_per_use / package / subscription |
| price_thb | Decimal | |
| scans_included | IntegerField | |
| duration_days | IntegerField null | |
| is_active | BooleanField | |
| created_at | DateTimeField | |

#### `Payment`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| user | FK → User | CASCADE |
| pricing_plan | FK → PricingPlan null | SET_NULL |
| amount_thb | Decimal | |
| payment_method | CharField | promptpay / card / transfer / wallet |
| status | CharField | pending / paid / failed / refunded / canceled |
| provider_txn_id | CharField unique null | |
| paid_at | DateTimeField null | |
| created_at | DateTimeField | |

#### `ScanChargeLog`
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| scan | OneToOne → Scan | CASCADE |
| user | FK → User | CASCADE |
| payment | FK → Payment null | SET_NULL |
| charge_model | CharField | pay_per_scan |
| amount_thb | Decimal | |
| credits_used | IntegerField | |
| charged_at | DateTimeField | |

---

### LEGACY

#### `StockRecord` (deprecated — ไม่ใช้แล้ว)
| Field | Type | Note |
|---|---|---|
| id | UUID PK | |
| stock_name | CharField(20) | ชื่อหุ้น |
| image_url | TextField | |
| created_at | DateTimeField | |

> ไม่มี user FK → orphaned table → จะลบใน migration ถัดไป

---

## Relationship Summary

```
User
├── 1:N  UserSession
├── 1:N  UserAuthProvider
├── 1:1  Wallet
├── 1:N  Payment
├── 1:N  IssueReport           [status: open/in_progress/resolved]
├── 1:N  Portfolio             [is_default=True คือ default portfolio]
│         └── 1:N  PortfolioHolding  →  N:1  UserStock [is_watchlist]
│                   └── 1:N  HoldingTransaction  (★ NEW)
│         └── 1:N  Scan
│                   └── 1:N  ScanItem  →  N:1  UserStock
│                   └── 1:1  ScanChargeLog  →  N:1  Payment
└── 1:N  UserStock
          └── 1:N  StockNameEdit

SiteFeature (standalone — key PK)  (★ NEW)
```

---

## Migration History

| Migration | เพิ่มอะไร |
|---|---|
| 0001 | ตาราง Auth, Payment, Stock, Scan ทั้งหมด (initial) |
| 0002 | Portfolio, PortfolioHolding, UserStock.sector/exchange, Scan.portfolio FK |
| 0003 | PortfolioHolding.note |
| 0004 | User.role, IssueReport |
| 0005 | Portfolio.cash_balance, PortfolioHolding.current_price |
| 0006 | SiteFeature ★ |
| 0007 | UserStock.is_watchlist, PortfolioHolding.target_price/stop_loss, HoldingTransaction ★ |

ทุก migration เป็น **additive** (backward-compatible) ข้อมูลเดิมไม่กระทบ
