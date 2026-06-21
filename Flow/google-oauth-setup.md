# Google OAuth Setup — วิธีตั้งค่า Google Login

## ข้อมูล Credentials (Project: Trade)

| รายการ | ค่า |
|--------|-----|
| Google Cloud Project | Trade |
| Client ID | `1012679588200-tkg532v9ps8jg1ve5ihmsi0hqu1pjkg0.apps.googleusercontent.com` |
| Client Secret | เก็บใน `.env` (ห้าม commit ขึ้น git) |
| สร้างเมื่อ | 21 June 2026 |
| Authorized JS Origin | `http://localhost:5173` |
| Status | Enabled |

> **Client Secret** เก็บแยกต่างหาก อย่า share ใน document สาธารณะ

---

## ขั้นตอนที่ทำไปแล้ว (ครั้งแรก)

### 1. Google Cloud Console
1. เปิด `https://console.cloud.google.com`
2. Project ชื่อ **Trade** ถูกเลือกอยู่ (มุมบนซ้าย)
3. ไปที่ **APIs & Services → OAuth consent screen** (หรือ Google Auth Platform)
4. คลิก **Get started**
5. กรอก App name: `Trade`, Support email: email ของคุณ
6. User Type: **External**
7. คลิก **Continue** จนเสร็จ

### 2. สร้าง OAuth Client ID
1. ไปที่ **Clients** (เมนูซ้าย)
2. คลิก **Create client** หรือ **+ Create credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Web client 1`
5. Authorized JavaScript origins: `http://localhost:5173`
6. Authorized redirect URIs: `http://localhost:5173`
7. คลิก **Create** → ได้ Client ID และ Client Secret

### 3. ใส่ค่าใน Project
แก้ไข 2 ไฟล์:

**`backend/.env`**
```env
GOOGLE_CLIENT_ID=1012679588200-tkg532v9ps8jg1ve5ihmsi0hqu1pjkg0.apps.googleusercontent.com
```

**`frontend/.env`**
```env
VITE_GOOGLE_CLIENT_ID=1012679588200-tkg532v9ps8jg1ve5ihmsi0hqu1pjkg0.apps.googleusercontent.com
```

---

## โค้ดที่เพิ่มเข้าไป

### Backend (`backend/requirements.txt`)
```
google-auth==2.29.0
```

### Backend (`config/urls.py`) — endpoint ใหม่
```
POST /api/auth/google
Body: { "credential": "<Google ID Token>" }
Response: { "token": "...", "user": { ... } }
```

**Logic:**
1. รับ Google ID Token จาก frontend
2. Verify ด้วย `google.oauth2.id_token.verify_oauth2_token()`
3. ดึง `sub` (Google user ID), `email`, `name`
4. หา `UserAuthProvider` ที่ตรงกัน
   - ถ้าเจอ → ใช้ user นั้น
   - ถ้าไม่เจอ → สร้าง user ใหม่ หรือ link กับ email เดิม
5. สร้าง `UserSession` → ส่ง token กลับ

### Frontend (`frontend/index.html`)
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### Frontend (`frontend/src/App.jsx`)
- เพิ่มปุ่ม **"เข้าสู่ระบบด้วย Google"** ใน LoginPage
- เพิ่มฟังก์ชัน `handleGoogleLogin()` ที่:
  1. เรียก `google.accounts.id.initialize()` พร้อม Client ID
  2. เรียก `google.accounts.id.prompt()` เปิด One Tap popup
  3. เมื่อได้ credential → POST ไป `/api/auth/google`
  4. รับ token → เก็บใน localStorage เหมือน login ปกติ

---

## ถ้าต้อง Deploy ขึ้น Production

1. ไปที่ Google Cloud Console → Clients → แก้ไข client นี้
2. เพิ่ม **Authorized JavaScript origins** ใหม่:
   ```
   https://yourdomain.com
   ```
3. แก้ไข `frontend/.env` (หรือ environment variable ของ server):
   ```env
   VITE_GOOGLE_CLIENT_ID=1012679588200-tkg532v9ps8jg1ve5ihmsi0hqu1pjkg0.apps.googleusercontent.com
   ```
4. แก้ไข `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=1012679588200-tkg532v9ps8jg1ve5ihmsi0hqu1pjkg0.apps.googleusercontent.com
   ```

---

## ถ้าต้องทำใหม่ (เครื่องใหม่ / Developer คนใหม่)

1. ขอ Client ID และ Client Secret จากเจ้าของ project
2. ใส่ใน `backend/.env` และ `frontend/.env` ตามด้านบน
3. `pip install google-auth==2.29.0`
4. Restart backend และ frontend

---

## Test Users (ตอน development)

เนื่องจาก app ยังอยู่ใน **Testing mode** — มีเฉพาะ email ที่เพิ่มเป็น Test User เท่านั้นที่ login ได้

เพิ่ม Test User:
1. Google Cloud Console → **Audience** (เมนูซ้าย)
2. หัวข้อ **Test users** → **Add users**
3. ใส่ email ที่ต้องการทดสอบ

ถ้าต้องการให้ user ทั่วไป login ได้ → ต้อง **Publish app** (กด Publish ใน Audience)
