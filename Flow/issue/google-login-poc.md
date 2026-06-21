# POC: Google Login (OAuth 2.0) — ฟรีไหม และต้องทำอะไรบ้าง

## สรุปก่อนเลย: ฟรีไหม?

| รายการ | ฟรี? | หมายเหตุ |
|--------|------|----------|
| Google OAuth 2.0 API | ✅ ฟรี | ไม่มีค่าใช้จ่าย ใช้ได้ไม่จำกัด |
| Google Cloud Console (project) | ✅ ฟรี | สร้าง project ได้ฟรี |
| Credential (Client ID/Secret) | ✅ ฟรี | ไม่เสียค่าสร้าง |
| Google Identity Services SDK | ✅ ฟรี | JS library ฟรี |
| Rate limit (basic) | ✅ ฟรี | 10,000 req/day default quota |
| Google Workspace (ถ้าต้องการ admin) | ❌ มีค่าใช้จ่าย | ถ้าต้องการ domain-level control |

**สรุป: Google Login ฟรี 100% สำหรับการ authenticate user ทั่วไป**

---

## Flow การทำงาน (OAuth 2.0 Authorization Code Flow)

```
User คลิก "Login with Google"
        ↓
App redirect ไป Google OAuth Consent Screen
        ↓
User กด Allow
        ↓
Google ส่ง Authorization Code กลับมา (callback URL)
        ↓
Backend แลก Code เป็น Access Token + ID Token
        ↓
ดึงข้อมูล user จาก ID Token (email, name, picture)
        ↓
สร้าง session / JWT ของระบบเอง
        ↓
User เข้าระบบสำเร็จ
```

---

## สิ่งที่ต้องทำ (Step by Step)

### Step 1: ตั้งค่า Google Cloud Console
1. ไปที่ [https://console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง Project ใหม่ (หรือใช้ project เดิม)
3. ไปที่ **APIs & Services → OAuth consent screen**
   - เลือก User Type: **External** (สำหรับ user ทั่วไป) หรือ **Internal** (เฉพาะ org)
   - กรอก App name, Email
   - เพิ่ม Scopes: `email`, `profile`, `openid`
4. ไปที่ **APIs & Services → Credentials**
   - คลิก **Create Credentials → OAuth client ID**
   - เลือก Application type: **Web application**
   - เพิ่ม **Authorized redirect URIs** เช่น `http://localhost:3000/auth/google/callback`
   - รับ **Client ID** และ **Client Secret**

### Step 2: ฝั่ง Backend (Node.js/Express ตัวอย่าง)

```bash
npm install passport passport-google-oauth20 express-session
```

```javascript
// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // หา user ใน DB หรือ สร้างใหม่
  const user = await User.findOrCreate({
    googleId: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
    avatar: profile.photos[0].value
  });
  return done(null, user);
}));
```

```javascript
// routes/auth.js
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard'); // login สำเร็จ
  }
);
```

### Step 3: ฝั่ง Frontend

```html
<!-- วิธีง่ายสุด: ใช้ Google Sign-In button -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<div id="g_id_onload"
  data-client_id="YOUR_GOOGLE_CLIENT_ID"
  data-callback="handleCredentialResponse">
</div>
<div class="g_id_signin" data-type="standard"></div>

<script>
function handleCredentialResponse(response) {
  // response.credential คือ JWT (ID Token)
  // ส่งไป verify ที่ backend
  fetch('/auth/google/verify', {
    method: 'POST',
    body: JSON.stringify({ token: response.credential }),
    headers: { 'Content-Type': 'application/json' }
  });
}
</script>
```

### Step 4: Environment Variables

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
SESSION_SECRET=your-session-secret
```

---

## Library ที่แนะนำตามภาษา/Framework

| Stack | Library |
|-------|---------|
| Node.js + Express | `passport-google-oauth20` |
| Next.js | `next-auth` (built-in Google provider) |
| Python + FastAPI | `authlib` หรือ `python-social-auth` |
| Go | `golang.org/x/oauth2/google` |
| PHP (Laravel) | `laravel/socialite` |
| .NET | `Microsoft.AspNetCore.Authentication.Google` |

### Next.js (วิธีที่ง่ายที่สุด)

```bash
npm install next-auth
```

```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ]
});
```

```javascript
// Login button
import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginButton() {
  const { data: session } = useSession();
  if (session) return <button onClick={() => signOut()}>Logout</button>;
  return <button onClick={() => signIn('google')}>Login with Google</button>;
}
```

---

## ข้อจำกัดที่ต้องรู้

### ตอน Development (Testing mode)
- ใช้ได้กับ **100 user แรก** ที่ add เป็น Test users บน Console
- ถ้าจะให้ user ทั่วไป login ได้ ต้อง **Publish app** (ผ่าน verification)

### Google Verification (ถ้า scope เกิน email/profile)
- scope แค่ `email`, `profile`, `openid` → **ไม่ต้อง verify**
- ถ้าต้องการ Gmail, Calendar, Drive → **ต้อง verify** (กระบวนการนาน 2-4 สัปดาห์)

### Quota
- Default: **10,000 requests/day** (เกือบทุก project ไม่ถึง)
- เพิ่ม quota ได้ฟรีโดยการ request เพิ่ม

---

## Checklist POC

- [ ] สร้าง Google Cloud Project
- [ ] ตั้งค่า OAuth Consent Screen
- [ ] สร้าง OAuth 2.0 Client ID
- [ ] เพิ่ม Redirect URI (localhost สำหรับ dev)
- [ ] เก็บ Client ID / Secret ใน `.env`
- [ ] ติดตั้ง library ตาม stack ที่ใช้
- [ ] ทดสอบ login flow บน localhost
- [ ] เพิ่ม Test users (ถ้า app ยัง testing mode)
- [ ] เก็บ user info ลง Database (email, googleId, name, avatar)
- [ ] ออก session/JWT ของระบบเองหลัง verify แล้ว

---

## ค่าใช้จ่ายสรุป

```
Google OAuth Login  →  ฟรี ✅
Google Cloud (project, credentials)  →  ฟรี ✅
ไม่มี billing ซ่อน ถ้าใช้แค่ OAuth login
```

> **Note:** Google Cloud จะขอ billing account เพื่อ verify ตัวตน แต่ **ไม่มีการตัดเงิน** สำหรับ OAuth API ที่ใช้งานปกติ
