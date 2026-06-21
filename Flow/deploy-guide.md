# Deploy Guide — Trade (ขึ้น Online ราคาถูก)

> เป้าหมาย: ให้คนทดลองใช้ได้จริง ค่าใช้จ่าย **$0–5/เดือน**
> อัพเดท: 2026-06-21

---

## สถานะปัจจุบัน

| ขั้นตอน | สถานะ | รายละเอียด |
|---|---|---|
| ✅ แก้โค้ด | สำเร็จ | WhiteNoise, gunicorn, settings, Procfile, build.sh |
| ✅ Build frontend | สำเร็จ | dist → backend/templates + backend/static |
| ✅ Push GitHub | สำเร็จ | https://github.com/Putarat/trade (branch: master) |
| ✅ Supabase | สำเร็จ | Project: veulcflqolztmfxopyoh, Region: Singapore |
| ✅ Render config | สำเร็จ | Root=backend, Build=bash build.sh, Start=gunicorn, Plan=Free |
| ⏳ Render env vars | รอดำเนินการ | ใส่ตัวแปรใน Environment tab แล้วกด Deploy |
| ⏳ Google OAuth | รอดำเนินการ | เพิ่ม Render URL ใน Authorized Origins |

> รหัสผ่านและ credentials ทั้งหมดอยู่ใน `Flow/credentials.md` (gitignored — ไม่ขึ้น GitHub)

---

## สรุปก่อน — ข้อจำกัดที่ต้องรู้

| ข้อจำกัด | ผลกระทบ |
|---|---|
| **EasyOCR ใช้ RAM ~2GB** | ฟีเจอร์ scan ภาพจะใช้ไม่ได้บน free tier → ปิดไว้ก่อน |
| **`yfinance` และ `bcrypt` ไม่อยู่ใน requirements.txt** | ต้องเพิ่มก่อน deploy |
| **ALLOWED_HOSTS = localhost เท่านั้น** | ต้องเพิ่ม production domain |
| **ไม่มี CORS config** | ต้องเพิ่มถ้า frontend/backend คนละ domain |

---

## Architecture ที่แนะนำ (ง่ายและถูกสุด)

```
┌─────────────────────────────────┐
│  Render.com (Web Service)        │  ← Django รัน Gunicorn
│  - serve /api/*  (REST API)      │    + serve React SPA (static)
│  - serve /*  (index.html)        │
└──────────────┬──────────────────┘
               │ PostgreSQL URL
┌──────────────▼──────────────────┐
│  Supabase (Database)             │  ← PostgreSQL free tier
│  500MB / ไม่หมดอายุ              │
└─────────────────────────────────┘
```

**ข้อดี:** domain เดียว, ไม่มีปัญหา CORS, deploy ครั้งเดียว  
**ค่าใช้จ่าย: $0/เดือน** (Render free tier + Supabase free)  
**ข้อเสีย:** Render free จะ **sleep หลัง 15 นาทีที่ไม่มีคนใช้** (request แรกช้า ~30 วินาที)

> ถ้าไม่ยอมให้ sleep → ใช้ **Render Starter $7/เดือน** หรือ **Railway ~$5/เดือน**

---

## ขั้นตอนทั้งหมด

### Step 1 — แก้โค้ด (ทำครั้งเดียว)

#### 1.1 เพิ่ม packages ใน `backend/requirements.txt`

```
Django==3.2.25
Pillow==10.4.0
psycopg2_binary==2.9.11
python-decouple==3.8
google-auth==2.29.0
yfinance>=0.2.0
bcrypt>=4.0.0
whitenoise==6.7.0
gunicorn==22.0.0
```

> **ตัด `easyocr==1.7.2` ออก** — ใส่กลับเมื่ออยากเปิด scan feature บน paid tier

#### 1.2 แก้ `backend/config/settings.py`

```python
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY", default="dev-only-secret-key")
DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="127.0.0.1,localhost"
).split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",   # ← เพิ่ม
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.TokenAuthMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],   # ← เพิ่ม
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="postgres"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="127.0.0.1"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise — serve React SPA
STATICFILES_DIRS = [BASE_DIR / "static"]
WHITENOISE_INDEX_FILE = True   # serve index.html สำหรับ SPA routes

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

#### 1.3 เพิ่ม catch-all URL สำหรับ React SPA ใน `backend/config/urls.py`

เพิ่มที่ **ท้ายสุด** ของ `urlpatterns`:

```python
from django.views.generic import TemplateView

urlpatterns = [
    # ... API paths ทั้งหมด (ไม่เปลี่ยน) ...

    # SPA catch-all — ต้องอยู่ล่างสุดเสมอ
    path("", TemplateView.as_view(template_name="index.html")),
    re_path(r"^(?!api|static|media).*$",
            TemplateView.as_view(template_name="index.html")),
]
```

เพิ่ม import บนสุด:
```python
from django.urls import path, re_path
from django.views.generic import TemplateView
```

#### 1.4 สร้างไฟล์ `backend/Procfile` (Render/Railway ต้องการ)

```
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

#### 1.5 สร้างไฟล์ `backend/build.sh` (script รัน deploy)

```bash
#!/usr/bin/env bash
set -e
pip install -r requirements.txt
python manage.py migrate --no-input
python manage.py collectstatic --no-input
```

---

### Step 2 — Build Frontend + Copy ไปที่ Django

```powershell
# 1. Build React
cd C:\ProjectAll\TradeFULL\Trade\frontend
npm run build

# 2. Copy dist ไปที่ Django templates + static
# - index.html → backend/templates/index.html
# - assets/ → backend/static/assets/

# สร้างโฟลเดอร์ถ้ายังไม่มี
mkdir -p C:\ProjectAll\TradeFULL\Trade\backend\templates
mkdir -p C:\ProjectAll\TradeFULL\Trade\backend\static

# Copy
copy frontend\dist\index.html backend\templates\index.html
xcopy /E /Y frontend\dist\assets backend\static\assets\
```

> ทุกครั้งที่แก้ frontend ต้อง build ใหม่แล้ว copy ซ้ำ

---

### Step 3 — ตั้งค่า Database (Supabase)

1. ไปที่ [supabase.com](https://supabase.com) → **New project**
2. ตั้งชื่อ project: `trade`
3. ตั้ง password DB (จดไว้)
4. Region: **Southeast Asia (Singapore)**
5. เมื่อสร้างเสร็จ → **Project Settings → Database**
6. คัดลอก **Connection string** (URI format):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
7. เก็บ URI ไว้ใช้ใน Step 4

---

### Step 4 — Deploy บน Render.com

#### 4.1 Push โค้ดขึ้น GitHub ก่อน

```bash
# ที่ root ของโปรเจกต์
git init
git add .
git commit -m "initial deploy"
# สร้าง repo ใหม่ที่ github.com แล้ว
git remote add origin https://github.com/<your-username>/trade.git
git push -u origin main
```

สร้าง `.gitignore` ที่ root:
```
.venv/
backend/.venv/
node_modules/
__pycache__/
*.pyc
backend/.env
frontend/.env
backend/db.sqlite3
backend/media/
frontend/dist/
```

#### 4.2 สร้าง Web Service บน Render

1. ไปที่ [render.com](https://render.com) → **New → Web Service**
2. Connect GitHub repo ที่สร้างไว้
3. ตั้งค่า:

| Setting | ค่า |
|---|---|
| **Name** | `trade-backend` |
| **Region** | Singapore |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `bash build.sh` |
| **Start Command** | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2` |
| **Plan** | Free |

#### 4.3 ตั้ง Environment Variables บน Render

ไปที่ **Environment** tab เพิ่มตัวแปรเหล่านี้:

| Key | Value |
|---|---|
| `SECRET_KEY` | สุ่ม string ยาวๆ เช่น `python -c "import secrets; print(secrets.token_hex(50))"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `trade-backend.onrender.com` (URL ที่ Render ให้มา) |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | password ของ Supabase |
| `DB_HOST` | `db.[PROJECT-REF].supabase.co` |
| `DB_PORT` | `5432` |
| `GOOGLE_CLIENT_ID` | Client ID เดิม |

#### 4.4 Deploy

กด **Create Web Service** — Render จะ:
1. Clone repo
2. รัน `build.sh` (pip install + migrate + collectstatic)
3. Start Gunicorn

URL จะได้มาเช่น: `https://trade-backend.onrender.com`

---

### Step 5 — อัปเดต Google OAuth

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Credentials → แก้ไข Web client 1**
3. เพิ่มใน **Authorized JavaScript origins**:
   ```
   https://trade-backend.onrender.com
   ```
4. Save

---

### Step 6 — ทดสอบ

เปิด `https://trade-backend.onrender.com` ในเบราว์เซอร์

ตรวจสอบ:
- [ ] หน้า Login โหลดได้
- [ ] สมัครสมาชิก + login ได้
- [ ] เพิ่มหุ้นด้วยมือได้
- [ ] ดึงราคาหุ้นได้ (yfinance)
- [ ] Price History chart แสดงได้
- [ ] Google Login ทำงาน

---

## ปัญหาที่มักเจอ

| ปัญหา | วิธีแก้ |
|---|---|
| **500 error หลัง deploy** | ดู Logs ใน Render Dashboard → มักเกิดจาก env var ขาด หรือ migrate ยังไม่รัน |
| **React หน้าขาว / 404 บน refresh** | ตรวจว่า catch-all URL ใน urls.py ถูกต้อง |
| **Google Login ไม่ทำงาน** | ตรวจ Authorized JavaScript origins ใน Google Console |
| **yfinance ดึงราคาไม่ได้** | Yahoo Finance มี rate-limit — ลองใหม่อีกครั้ง ไม่ใช่ bug |
| **Render เปิดช้ามาก (30 วิ)** | free tier sleep อยู่ — request แรกต้อง wake up, ปกติ |
| **static files (CSS/JS) 404** | ตรวจว่า `collectstatic` รันแล้ว และ `WhiteNoiseMiddleware` อยู่ถูกที่ใน MIDDLEWARE |

---

## ต้องการ Upgrade เมื่อไหร่

| สถานการณ์ | ทำอะไร | ค่าใช้จ่าย |
|---|---|---|
| ไม่ยอมให้ sleep | Render Starter plan | $7/เดือน |
| อยากเปิด OCR scan feature | ต้องการ RAM ≥ 2GB → Render Standard | $25/เดือน |
| DB ใกล้เต็ม 500MB | Supabase Pro | $25/เดือน |
| อยากใช้ custom domain | Render รองรับทุก plan รวม free | $10-15/ปี (ค่า domain) |

---

## ทางเลือกอื่น (ถ้าอยากจ่ายน้อยกว่า Render Starter)

### Railway.app (~$5/เดือน, ไม่ sleep)

เหมือน Render แต่:
- ไม่มี free tier (มี $5 trial)
- ไม่ sleep
- PostgreSQL built-in (ไม่ต้องใช้ Supabase)
- Deploy ง่ายกว่า (detect Django อัตโนมัติ)

### Hetzner VPS (€4.5/เดือน ≈ 170 บาท, ไม่ sleep, ไม่จำกัด)

เหมาะถ้าอยากควบคุมเต็มที่:
- CX22: 2 vCPU, 4GB RAM → รัน EasyOCR ได้ด้วย
- ต้องตั้ง Nginx + Gunicorn เอง
- ยุ่งยากกว่าแต่ถูกสุดในระยะยาว

---

## สรุปเส้นทางที่แนะนำ

```
วันนี้ (ทดสอบ ฟรี):
  Render free + Supabase free
  → $0/เดือน, sleep ได้, OCR ปิด

ถ้าคนใช้เยอะขึ้น:
  Render Starter + Supabase free
  → $7/เดือน, ไม่ sleep, OCR ยังปิด

ถ้าอยากเปิด OCR:
  Hetzner CX22 VPS + PostgreSQL local
  → €4.5/เดือน (~170 บาท), ควบคุมเต็มที่
```
