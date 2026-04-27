╔══════════════════════════════════════════════════════════════════════════╗
║            GymSaaS — COMPLETE STEP BY STEP DEPLOYMENT GUIDE            ║
║                  From Zero to Fully Live in 2-3 Hours                  ║
╚══════════════════════════════════════════════════════════════════════════╝

WHAT YOU WILL HAVE WHEN DONE:
  ✅ Backend API live and running (Render - free)
  ✅ Database hosted on Supabase (free)
  ✅ Your Super Admin Panel live (Vercel - free)
  ✅ Gym Owner Web Panel live (Vercel - free)
  ✅ Flutter APK ready to install on members' phones
  ✅ OTP SMS login working via 2Factor.in
  ✅ Push notifications working via Firebase
  ✅ Daily auto-expiry + reminder scheduler running

YOUR 4 URLS AT THE END:
  https://gym-saas-api.onrender.com          ← Backend API
  https://gym-saas-admin.vercel.app          ← Your super admin panel
  https://gym-saas-gym.vercel.app            ← Gym owner panel
  APK file                                   ← Member mobile app

══════════════════════════════════════════════════════════════════════════
BEFORE YOU START — INSTALL THESE ON YOUR COMPUTER
══════════════════════════════════════════════════════════════════════════

Install these in this order. Each one has a link and exact steps.

─── 1. Git (for uploading code to GitHub) ───────────────────────────────

  Windows:
    1. Go to https://git-scm.com/download/win
    2. Click the top download link (64-bit)
    3. Run the installer — click Next on every screen
    4. Keep all default settings

  Mac:
    1. Open Terminal (press Cmd+Space, type Terminal, press Enter)
    2. Type: git --version
    3. If not installed, Mac will ask you to install Xcode Command Line Tools
    4. Click Install and wait

  Verify it works:
    Open Terminal/Command Prompt → type: git --version
    You should see: git version 2.x.x  ✅

─── 2. Python 3.11 (for backend) ────────────────────────────────────────

  Windows:
    1. Go to https://www.python.org/downloads/
    2. Click the yellow "Download Python 3.11.x" button
    3. Run the installer
    4. ⚠️ VERY IMPORTANT: Check the box "Add Python to PATH" at the bottom
    5. Click "Install Now"

  Mac:
    1. Go to https://www.python.org/downloads/
    2. Download and install Python 3.11.x

  Verify:
    Open new Terminal → type: python --version
    You should see: Python 3.11.x  ✅

─── 3. Node.js 20 (for React panels) ───────────────────────────────────

  1. Go to https://nodejs.org
  2. Click the "LTS" (left) download button
  3. Run installer with default settings

  Verify:
    Terminal → type: node --version
    You should see: v20.x.x  ✅

─── 4. Flutter (for member app) ─────────────────────────────────────────

  Windows:
    1. Go to https://docs.flutter.dev/get-started/install/windows
    2. Download the Flutter SDK zip
    3. Extract to C:\flutter
    4. Add C:\flutter\bin to your PATH environment variable:
       - Search "environment variables" in Windows search
       - Click "Edit the system environment variables"
       - Click "Environment Variables"
       - Under "User variables" find "Path" → click Edit
       - Click New → type: C:\flutter\bin
       - Click OK on all windows
    5. Restart Terminal

  Mac:
    1. Go to https://docs.flutter.dev/get-started/install/macos
    2. Follow the guide for your chip (Intel or Apple Silicon)

  Verify:
    Terminal → type: flutter --version
    You should see: Flutter 3.x.x  ✅

══════════════════════════════════════════════════════════════════════════
STEP 1 — EXTRACT THE ZIP FILE
══════════════════════════════════════════════════════════════════════════

1. Download gymsaas-complete-final.zip

2. Extract it:
   Windows: Right click the zip → Extract All → Choose a folder
   Mac: Double click the zip file

3. You will see a folder called "gym-saas" containing:

   gym-saas/
   ├── app/                  ← FastAPI backend (Python)
   ├── admin-panel/          ← Super admin React panel (YOU)
   ├── gym-admin-panel/      ← Gym owner React panel (Gyms)
   ├── flutter_app/          ← Member mobile app (Flutter)
   ├── Dockerfile            ← Docker config for Render
   ├── render.yaml           ← Render deploy config
   ├── railway.toml          ← Railway deploy config
   ├── requirements.txt      ← Python packages
   ├── .env.production       ← Environment template
   └── STEP_BY_STEP_DEPLOY.md ← This file

4. IMPORTANT — Generate your SECRET KEY now. You'll need it soon:
   Open Terminal → go to the gym-saas folder:

   Windows: cd C:\path\to\gym-saas
   Mac:     cd ~/path/to/gym-saas

   Then run:
   python -c "import secrets; print(secrets.token_hex(32))"

   Copy the output. Looks like: a3f8b2c1d4e5f6a7b8c9...
   SAVE THIS — paste it in Notepad for now
1585d744b6bc42558b624a1a34aaaf478f92ea7752cb434263a0b0851e5c3c29
══════════════════════════════════════════════════════════════════════════
STEP 2 — SUPABASE DATABASE (FREE POSTGRESQL)
══════════════════════════════════════════════════════════════════════════

─── 2.1 Create your account ─────────────────────────────────────────────

1. Open browser → go to: https://supabase.com
2. Click green "Start your project" button (top right)
3. Click "Sign up" → sign up with Google or email
4. Verify your email if needed

─── 2.2 Create the database ─────────────────────────────────────────────

1. After login, click "New project"
2. Fill in these details:
   Organization: (your name - auto filled)
   Project name: gym-saas
   Database Password: Create a STRONG password
                      Password: 0jgGwKOqWw0iBoMI
                      ⚠️ WRITE THIS DOWN — you need it in Step 3
   Region: Southeast Asia (Singapore)
3. Click "Create new project"
4. Wait 1-2 minutes (you will see a loading animation)
5. When done you will see your project dashboard

─── 2.3 Get your database URL ───────────────────────────────────────────

1. In left sidebar → click "Settings" (gear icon at the bottom)
2. Click "Database"
3. Scroll down to find "Connection string"
4. Click the "URI" tab
5. You will see something like:
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefgh.supabase.co:5432/postgres
6. REPLACE [YOUR-PASSWORD] with your actual password from step 2.2
7. Example result:
   postgresql://postgres:0jgGwKOqWw0iBoMI@db.rqqfxrsgebdpqanjrdgq.supabase.co:5432/postgres
8. COPY THIS ENTIRE STRING and save it in Notepad

   ⚠️ If your password has @ or # symbols, replace them:
   @ → %40
   # → %23
   Example: password "Test@123" becomes "Test%40123" in the URL

══════════════════════════════════════════════════════════════════════════
STEP 3 — GITHUB (UPLOAD YOUR CODE)
══════════════════════════════════════════════════════════════════════════

─── 3.1 Create GitHub account ───────────────────────────────────────────

1. Go to https://github.com
2. Click "Sign up" → fill your details → verify email
   (Skip if you already have an account)

─── 3.2 Create repository ───────────────────────────────────────────────

1. After login → click "+" icon (top right corner)
2. Click "New repository"
3. Fill in:
   Repository name: gym-saas
   Description: Gym Management SaaS
   Visibility: ✅ Private (important!)
4. Do NOT check any Initialize checkboxes
5. Click "Create repository"
6. On the next page you will see setup instructions
7. Copy your repository URL — looks like:
   https://github.com/Blackbeast4545/gym-saas.git

─── 3.3 Create Personal Access Token (GitHub password for code) ─────────

GitHub no longer accepts your login password for code uploads.
You need a "token" instead.

1. Click your profile photo (top right) → Settings
2. Scroll all the way down → click "Developer settings" (left sidebar)
3. Click "Personal access tokens" → "Tokens (classic)"
4. Click "Generate new token" → "Generate new token (classic)"
5. Note: gym-saas-upload
6. Expiration: 90 days (or "No expiration" for permanent)
7. Scopes: Check the "repo" checkbox (first one)
8. Click "Generate token" (green button at bottom)
9. ⚠️ COPY THE TOKEN IMMEDIATELY — it shows only once!
   Looks like: ghp_xxxxxxxxxxxxxxxxxxxx
   Token:- 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
   Paste it in Notepad

─── 3.4 Upload code to GitHub ───────────────────────────────────────────

1. Open Terminal/Command Prompt
2. Navigate to your gym-saas folder:
   Windows: cd C:\path\to\gym-saas
   Mac:     cd ~/path/to/gym-saas

3. Run these commands ONE BY ONE (press Enter after each):

   git init

   git add .

   git commit -m "Initial GymSaaS release"

   git branch -M main

   git remote add origin https://github.com/YOURUSERNAME/gym-saas.git
   (replace YOURUSERNAME with your actual GitHub username)

   git push -u origin main

4. When asked for username: enter your GitHub username
5. When asked for password: paste your Personal Access Token (NOT your login password)

6. After success, go to https://github.com/YOURUSERNAME/gym-saas
   You should see all your files there ✅

══════════════════════════════════════════════════════════════════════════
STEP 4 — FIREBASE (PUSH NOTIFICATIONS)
══════════════════════════════════════════════════════════════════════════

─── 4.1 Create Firebase project ─────────────────────────────────────────

1. Go to https://console.firebase.google.com
2. Sign in with Google account
3. Click "Create a project"
4. Project name: gym-saas → click Continue
5. Disable Google Analytics → click Continue
6. Click "Create project" → wait 30 seconds
7. Click "Continue"

─── 4.2 Add Android app (for Flutter member app) ────────────────────────

1. On the project overview page, click the Android icon (📱)
2. Android package name: com.gymsaas.member
3. App nickname: GymSaaS Member
4. Leave SHA-1 blank
5. Click "Register app"
6. Click "Download google-services.json"
7. SAVE THIS FILE — you'll add it to Flutter in Step 7

─── 4.3 Get server key (for backend push notifications) ─────────────────

1. Click the gear icon ⚙️ (top left, next to "Project Overview")
2. Click "Project settings"
3. Click "Service accounts" tab
4. Make sure "Firebase Admin SDK" is selected
5. Click "Generate new private key" button
6. Click "Generate key" in the popup
7. A JSON file downloads automatically
8. RENAME this file to: firebase-credentials.json
9. SAVE IT somewhere safe — you'll upload it in Step 5

══════════════════════════════════════════════════════════════════════════
STEP 5 — RENDER (DEPLOY THE BACKEND API)
══════════════════════════════════════════════════════════════════════════

─── 5.1 Create Render account ───────────────────────────────────────────

1. Go to https://render.com
2. Click "Get Started for Free"
3. Click "Sign in with GitHub" → click "Authorize Render"
4. You are now logged in

─── 5.2 Deploy the API ──────────────────────────────────────────────────

1. Click "New +" button (top right)
2. Click "Web Service"
3. You see "Connect a repository"
4. Find "gym-saas" in the list → click "Connect"
   If you don't see it:
   → Click "Configure account"
   → Grant access to your gym-saas repository
   → Come back and try again

5. Fill in the settings:
   Name:      gym-saas-api
   Region:    Singapore
   Branch:    main
   Runtime:   Docker
   (Dockerfile path auto-detects)

6. Scroll down to "Environment Variables"
7. Click "Add Environment Variable" and add EACH of these:

   ┌──────────────────────────────┬───────────────────────────────────────────┐
   │ KEY                          │ VALUE                                     │
   ├──────────────────────────────┼───────────────────────────────────────────┤
   │ DATABASE_URL                 │ (your Supabase URI from Step 2.3)         │
   │ SECRET_KEY                   │ (the random key you generated in Step 1)  │
   │ ALGORITHM                    │ HS256                                     │
   │ ACCESS_TOKEN_EXPIRE_MINUTES  │ 1440                                      │
   │ SUPER_ADMIN_EMAIL            │ youremail@gmail.com                       │
   │ SUPER_ADMIN_PASSWORD         │ YourAdminPassword@123                     │
   │ TWO_FACTOR_API_KEY           │ (from 2Factor.in — or leave blank now)    │
   │ TWO_FACTOR_SENDER_ID         │ GYMSAS                                    │
   │ APP_NAME                     │ GymSaaS                                   │
   │ APP_VERSION                  │ 1.0.0                                     │
   │ DEBUG                        │ false                                     │
   │ ALLOWED_ORIGINS              │ *                                         │
   └──────────────────────────────┴───────────────────────────────────────────┘

   NOTE: Set ALLOWED_ORIGINS to * for now.
   After Vercel deploy is done, come back and change * to your actual URLs.

8. Scroll to bottom → click "Create Web Service"
9. Render now builds your app — this takes 5-10 minutes first time
   You can watch the build logs scroll by in real time
   Look for: "Application startup complete" in the logs

10. When you see green "Live" status at the top → it's deployed! ✅
    Your API URL shows at top: https://gym-saas-api.onrender.com
    COPY AND SAVE THIS URL

─── 5.3 Test your API ───────────────────────────────────────────────────

1. Open browser
2. Go to: https://gym-saas-api.onrender.com/health
3. You should see: {"status": "healthy"}  ✅
   If you see an error → check Render logs tab for details

─── 5.4 Upload Firebase credentials ─────────────────────────────────────

The firebase-credentials.json file must be on the server.
We'll add it as an environment variable:

1. Open your firebase-credentials.json in Notepad/TextEdit
2. Select ALL the text (Ctrl+A) and copy it
3. In Render → your gym-saas-api service → Environment tab
4. Click "Add Environment Variable"
5. Key:   FIREBASE_CREDENTIALS_JSON
6. Value: (paste the entire JSON content)
7. Click Save

Then add one more variable:
   Key:   FIREBASE_CREDENTIALS_PATH
   Value: ./firebase-credentials.json

8. Render will automatically redeploy with the new variables

─── 5.5 Deploy the Scheduler ────────────────────────────────────────────

The scheduler runs daily at 8AM IST to:
  - Auto-expire gym subscriptions
  - Send 3-day expiry reminders to members
  - Send expired-today notifications

1. In Render → click "New +" → "Background Worker"
2. Connect the same gym-saas repository
3. Settings:
   Name:           gym-saas-scheduler
   Branch:         main
   Runtime:        Docker
   Start Command:  python -m app.services.scheduler

4. Add the SAME environment variables as Step 5.2
   (DATABASE_URL, SECRET_KEY, TWO_FACTOR_API_KEY, etc.)

5. Click "Create Background Worker" ✅

══════════════════════════════════════════════════════════════════════════
STEP 6 — 2FACTOR.IN (OTP + SMS + WHATSAPP)
══════════════════════════════════════════════════════════════════════════

─── 6.1 Create account ──────────────────────────────────────────────────

1. Go to https://2factor.in
2. Click "Sign Up"
3. Enter phone number → verify with OTP
4. Fill in details and complete registration

─── 6.2 Get API key ─────────────────────────────────────────────────────

1. After login → Dashboard
2. Look for "API Key" section
3. Copy your API key (long string of letters and numbers)
4. Go to Render → gym-saas-api → Environment tab
5. Find TWO_FACTOR_API_KEY → click Edit → paste your key
6. Save → Render redeploys automatically

─── 6.3 Add balance ─────────────────────────────────────────────────────

1. In 2Factor dashboard → "Recharge"
2. Minimum ₹100 to activate
3. Pay via UPI or card

─── 6.4 Testing without Sender ID ──────────────────────────────────────

Sender ID registration takes 3-7 days (TRAI requirement).
Until it's approved, the system runs in TEST MODE automatically:
  - OTP is printed to Render logs (not sent to phone)
  - Any OTP you enter as "123456" will work
  - This is ONLY for testing — real SMS works after approval

══════════════════════════════════════════════════════════════════════════
STEP 7 — VERCEL (DEPLOY BOTH REACT PANELS)
══════════════════════════════════════════════════════════════════════════

You will deploy TWO separate sites on Vercel:
  1. Super Admin Panel (admin-panel folder) — FOR YOU ONLY
  2. Gym Admin Panel (gym-admin-panel folder) — FOR GYM OWNERS

─── 7.1 Create Vercel account ───────────────────────────────────────────

1. Go to https://vercel.com
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel
4. Complete setup

─── 7.2 Deploy Super Admin Panel ────────────────────────────────────────

1. Click "Add New…" → "Project"
2. Find gym-saas repo → click "Import"
3. IMPORTANT — change the Root Directory:
   Click "Edit" next to Root Directory
   Type: admin-panel
   Click the checkmark to confirm
4. Framework preset should auto-detect as "Vite"
5. Build Command: npm run build  (auto-filled)
6. Output Directory: dist  (auto-filled)
7. Under "Environment Variables" section → click "Add"
   Name:  VITE_API_URL
   Value: https://gym-saas-api.onrender.com/api/v1
   (use YOUR actual Render URL from Step 5)
8. Click "Deploy"
9. Wait 2-3 minutes
10. Your URL: https://gym-saas-admin.vercel.app
    COPY AND SAVE THIS URL ✅

─── 7.3 Test Super Admin Login ──────────────────────────────────────────

1. Open: https://gym-saas-admin.vercel.app
2. You should see a login screen
3. Login with:
   Email:    (what you set as SUPER_ADMIN_EMAIL in Render)
   Password: (what you set as SUPER_ADMIN_PASSWORD in Render)
4. You should see the Dashboard! ✅

─── 7.4 Deploy Gym Admin Panel ──────────────────────────────────────────

1. Back in Vercel → click "Add New…" → "Project"
2. Find gym-saas repo → click "Import" (same repo, different folder)
3. IMPORTANT — change Root Directory:
   Click "Edit" next to Root Directory
   Type: gym-admin-panel
   Click the checkmark to confirm
4. Under "Environment Variables" → click "Add"
   Name:  VITE_API_URL
   Value: https://gym-saas-api.onrender.com/api/v1
5. Click "Deploy"
6. Your URL: https://gym-saas-gym.vercel.app
   COPY AND SAVE THIS URL ✅

─── 7.5 Update CORS on Render ───────────────────────────────────────────

Now that both panels are deployed, update Render to allow them:

1. Render → gym-saas-api → Environment tab
2. Find ALLOWED_ORIGINS
3. Change from * to:
   https://gym-saas-admin.vercel.app,https://gym-saas-gym.vercel.app
4. Save → Render redeploys

══════════════════════════════════════════════════════════════════════════
STEP 8 — FLUTTER MEMBER APP (BUILD APK)
══════════════════════════════════════════════════════════════════════════

─── 8.1 Update API URL ──────────────────────────────────────────────────

1. Open VS Code (or any editor)
2. Open file: flutter_app/lib/utils/constants.dart
3. Find this line:
   static const String baseUrl = 'http://10.0.2.2:8000/api/v1';
4. Change it to:
   static const String baseUrl = 'https://gym-saas-api.onrender.com/api/v1';
   (use YOUR actual Render URL)
5. Save the file

─── 8.2 Add Firebase to Flutter ─────────────────────────────────────────

1. Find the google-services.json file you downloaded in Step 4.2
2. Copy it into: flutter_app/android/app/
   Full path: flutter_app/android/app/google-services.json
   NOTE: The android/ folder is created by Flutter automatically.
         If it doesn't exist yet, run "flutter create ." inside flutter_app first.

─── 8.3 Initialize Flutter project (if needed) ──────────────────────────

If the flutter_app/android/ folder is missing:

1. Open Terminal
2. Navigate into flutter_app folder:
   cd flutter_app
3. Run:
   flutter create --project-name gym_saas_member .
   (the dot at the end is important)
4. This creates all the Android and iOS files
5. Now copy google-services.json into the new android/app/ folder

─── 8.4 Build the APK ───────────────────────────────────────────────────

1. Open Terminal
2. Navigate to flutter_app:
   cd flutter_app
3. Get all packages:
   flutter pub get
   Wait for it to finish downloading
4. Build release APK:
   flutter build apk --release
   This takes 3-5 minutes
5. When done, find your APK at:
   flutter_app/build/app/outputs/flutter-apk/app-release.apk

─── 8.5 Install on phones ───────────────────────────────────────────────

Option A — Send directly to phone:
1. Transfer app-release.apk to your phone via USB, WhatsApp, or Google Drive
2. On phone: Settings → Security → Enable "Install from unknown sources"
   (On Android 8+: Settings → Apps → Special app access → Install unknown apps)
3. Open the APK file on your phone → Install
4. Open GymSaaS app → enter Gym ID and phone number

Option B — Install on Android device via USB:
1. Enable USB Debugging on phone:
   Settings → About Phone → tap "Build Number" 7 times
   Settings → Developer Options → enable USB Debugging
2. Connect phone to computer via USB
3. Run: flutter install

══════════════════════════════════════════════════════════════════════════
STEP 9 — CONNECT YOUR DOMAIN (OPTIONAL)
══════════════════════════════════════════════════════════════════════════

If you have a domain like yourdomain.com:

─── 9.1 Add domain to Vercel panels ─────────────────────────────────────

For Super Admin panel:
1. Vercel → admin panel project → Settings → Domains
2. Add: admin.yourdomain.com
3. Vercel shows you DNS records to add

For Gym panel:
1. Vercel → gym panel project → Settings → Domains
2. Add: gym.yourdomain.com

─── 9.2 Add domain to Render API ────────────────────────────────────────

1. Render → gym-saas-api → Settings → Custom Domains
2. Add: api.yourdomain.com
3. Render shows you the CNAME value to add

─── 9.3 Add DNS records ─────────────────────────────────────────────────

Login to your domain registrar (GoDaddy, Hostinger, Namecheap, etc.)
Go to DNS settings. Add these records:

   TYPE   | NAME    | VALUE
   ────────────────────────────────────────────────────────────
   CNAME  | admin   | cname.vercel-dns.com
   CNAME  | gym     | cname.vercel-dns.com
   CNAME  | api     | (value shown by Render)

Wait 15-30 minutes for DNS to update.

─── 9.4 Update environment variables ────────────────────────────────────

After domain is connected:

In Render:
   ALLOWED_ORIGINS → https://admin.yourdomain.com,https://gym.yourdomain.com

In Vercel admin panel:
   VITE_API_URL → https://api.yourdomain.com/api/v1

In Vercel gym panel:
   VITE_API_URL → https://api.yourdomain.com/api/v1

In Flutter constants.dart:
   baseUrl = 'https://api.yourdomain.com/api/v1'
   Rebuild APK after this change

══════════════════════════════════════════════════════════════════════════
STEP 10 — FIRST TIME SETUP (USING THE SYSTEM)
══════════════════════════════════════════════════════════════════════════

─── 10.1 Login to Super Admin ───────────────────────────────────────────

1. Open: https://gym-saas-admin.vercel.app
2. Email:    (your SUPER_ADMIN_EMAIL from Render)
3. Password: (your SUPER_ADMIN_PASSWORD from Render)

─── 10.2 Create your first gym ──────────────────────────────────────────

1. Click "Gyms" in sidebar → "Add Gym" button
2. Fill in:
   Gym Name:        Fitness Zone
   Owner Name:      Raj Sharma
   Phone:           9876543210
   Email:           raj@gmail.com
   City:            Ahmedabad
   Owner Password:  GymOwner@123   ← gym owner uses this to login
   Plan:            Basic
   Price Paid:      999
   Start Date:      today's date
   Expiry Date:     one month from today
3. Click "Create Gym"
4. A UUID like 550e8400-e29b-41d4-a716-446655440000 appears
   THIS IS THE GYM ID — share it with the gym owner

─── 10.3 Gym owner logs in ──────────────────────────────────────────────

1. Gym owner opens: https://gym-saas-gym.vercel.app
2. Gym ID:   550e8400-e29b-41d4-a716-446655440000  (UUID from above)
3. Phone:    9876543210
4. Password: GymOwner@123

─── 10.4 Gym owner adds members ─────────────────────────────────────────

In the Gym Admin Panel:
1. Click "Members" → "Add Member"
2. Fill member details (name, phone, etc.)
3. Set plan expiry date

─── 10.5 Members login via Flutter app ──────────────────────────────────

1. Member opens GymSaaS app on their phone
2. Enters Gym ID: 550e8400-e29b-41d4-a716-446655440000
3. Enters their phone number (must match what gym added)
4. Receives OTP on phone
5. Enters OTP → logged in! ✅

─── 10.6 Print gym QR code ──────────────────────────────────────────────

For members to check in attendance:
1. Gym owner logs into gym panel
2. Click "QR Code" in sidebar
3. Click "Print QR"
4. Print and stick at gym entrance
5. Members scan with the app to mark attendance

══════════════════════════════════════════════════════════════════════════
STEP 11 — KEEP THE SERVER ALIVE (IMPORTANT)
══════════════════════════════════════════════════════════════════════════

Render free tier SLEEPS after 15 minutes of no traffic.
This means the first request after sleep takes 30-60 seconds.

FIX — UptimeRobot (free ping service):

1. Go to https://uptimerobot.com
2. Sign up for free
3. Click "Add New Monitor"
4. Monitor Type: HTTP(s)
5. Friendly Name: GymSaaS Keep Alive
6. URL: https://gym-saas-api.onrender.com/health
7. Monitoring interval: Every 5 minutes
8. Click "Create Monitor"

Now UptimeRobot pings your server every 5 minutes to keep it awake ✅

For production with paying clients:
Upgrade Render to "Starter" plan = $7/month
Server never sleeps, much faster response times

══════════════════════════════════════════════════════════════════════════
TROUBLESHOOTING — FIX COMMON PROBLEMS
══════════════════════════════════════════════════════════════════════════

PROBLEM: Admin panel shows blank page or error
─────────────────────────────────────────────
Check 1: Is the API running?
  → Open https://gym-saas-api.onrender.com/health in browser
  → Should show: {"status": "healthy"}
  → If not: check Render logs

Check 2: CORS error in browser console?
  → Press F12 → Console tab → look for "CORS" error
  → Fix: Update ALLOWED_ORIGINS in Render env to include your Vercel URL

Check 3: API URL wrong in Vercel?
  → Vercel → your project → Settings → Environment Variables
  → Check VITE_API_URL has /api/v1 at the end
  → Redeploy after changing

PROBLEM: "Invalid credentials" on login
────────────────────────────────────────
  → Check SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in Render env vars
  → Check Render logs — should show "[SEED] Super admin created: ..."
  → If not seeded: Render → Manual Deploy → Deploy latest commit

PROBLEM: Database connection error
─────────────────────────────────────
  → Check DATABASE_URL in Render env vars
  → Make sure password in URL has special chars encoded:
    @ → %40  |  # → %23  |  space → %20
  → Check Supabase project is not paused (free tier pauses after 1 week idle)
    Fix: Login to Supabase → your project → click "Restore"

PROBLEM: OTP not received on phone
─────────────────────────────────────
  → Check TWO_FACTOR_API_KEY is correct in Render
  → Check 2Factor.in account has balance
  → For TESTING: any phone gets OTP "123456" when DEBUG=true
  → Check Render logs for error messages from 2Factor

PROBLEM: Flutter app cannot connect
──────────────────────────────────────
  → Open flutter_app/lib/utils/constants.dart
  → Check baseUrl is your actual Render URL (not localhost)
  → Must end with /api/v1
  → Rebuild APK after changing: flutter build apk --release

PROBLEM: Push notifications not working
─────────────────────────────────────────
  → Make sure google-services.json is in flutter_app/android/app/
  → Make sure FIREBASE_CREDENTIALS_JSON is set in Render env
  → Rebuild and reinstall the Flutter APK

PROBLEM: Render build fails with Docker error
──────────────────────────────────────────────
  → Check Render build logs — it shows the exact error
  → Most common: a Python import error due to missing package
  → Fix: make sure all files are in GitHub: git status
  → Try: git add . && git commit -m "fix" && git push

PROBLEM: Gym owner cannot login
──────────────────────────────────
  → Gym ID must be the exact UUID shown when you created the gym
  → Phone must exactly match what was entered when creating the gym
  → Password is the owner_password you set when creating the gym
  → Login URL is the gym-admin-panel Vercel URL, NOT the admin panel URL

PROBLEM: Members cannot login with OTP
────────────────────────────────────────
  → Member must be added by gym owner first (in gym admin panel)
  → Phone must match exactly (no spaces, no +91)
  → Gym ID must be correct
  → Check if 2Factor.in has balance

PROBLEM: Supabase database paused
───────────────────────────────────
  Supabase free tier pauses if no activity for 7 days
  Fix:
  1. Login to Supabase → your project
  2. You will see a "Restore" button if paused
  3. Click Restore → wait 2 minutes

══════════════════════════════════════════════════════════════════════════
QUICK REFERENCE CHEAT SHEET
══════════════════════════════════════════════════════════════════════════

Fill this in as you complete each step:

  ITEM                  URL / VALUE                   DONE?
  ─────────────────────────────────────────────────────────────
  Supabase DB URL       postgresql://...               [ ]
  GitHub Repo           github.com/____/gym-saas       [ ]
  Render API URL        https://_______.onrender.com   [ ]
  Super Admin Panel     https://_______.vercel.app     [ ]
  Gym Admin Panel       https://_______.vercel.app     [ ]
  Flutter APK           app-release.apk                [ ]
  UptimeRobot           Set up monitor                 [ ]

  YOUR LOGINS:
  Super Admin Email:    _______________________________
  Super Admin Password: _______________________________

  COSTS (free tier):
  Supabase:    Free (500MB storage)
  Render:      Free (sleeps after 15min) OR $7/month (no sleep)
  Vercel:      Free (unlimited deploys)
  2Factor.in:  ~₹0.15 per SMS
  Firebase:    Free (unlimited push)

══════════════════════════════════════════════════════════════════════════
FOLDER GUIDE — WHICH FOLDER DOES WHAT
══════════════════════════════════════════════════════════════════════════

  gym-saas/
  │
  ├── app/                     BACKEND (Python FastAPI)
  │   ├── main.py              → Start of the API server
  │   ├── models/models.py     → All 13 database tables
  │   ├── routers/             → API endpoints
  │   │   ├── auth.py          → Login for all 3 roles
  │   │   ├── super_admin.py   → Your admin APIs
  │   │   ├── gym_admin.py     → Gym owner APIs
  │   │   ├── attendance.py    → QR scan + check-in
  │   │   ├── notifications.py → SMS + WhatsApp + push
  │   │   └── member_app.py    → Flutter app APIs
  │   ├── services/            → Background services
  │   │   ├── scheduler.py     → Daily expiry checker
  │   │   ├── otp_service.py   → 2Factor.in SMS
  │   │   ├── qr_service.py    → QR code generator
  │   │   └── receipt_service.py → PDF receipts
  │   └── core/
  │       ├── config.py        → Reads .env settings
  │       └── security.py      → JWT tokens + auth guards
  │
  ├── admin-panel/             SUPER ADMIN REACT PANEL (YOU)
  │   └── src/pages/
  │       ├── Dashboard.jsx    → Platform stats + charts
  │       ├── Gyms.jsx         → Create/manage gyms
  │       ├── Subscriptions.jsx→ Renew/expire plans
  │       └── Revenue.jsx      → Revenue reports
  │
  ├── gym-admin-panel/         GYM OWNER REACT PANEL (GYMS)
  │   └── src/pages/
  │       ├── Dashboard.jsx    → Daily stats + alerts
  │       ├── Members.jsx      → Add/edit/search members
  │       ├── Plans.jsx        → Membership plan setup
  │       ├── Payments.jsx     → Record payments + receipts
  │       ├── Attendance.jsx   → Today's check-ins
  │       ├── QRPage.jsx       → Print gym QR code
  │       ├── Workout.jsx      → Create workout plans
  │       ├── Diet.jsx         → Create diet plans
  │       ├── Notify.jsx       → Bulk notifications
  │       └── Staff.jsx        → Add receptionists
  │
  ├── flutter_app/             MEMBER MOBILE APP (Flutter)
  │   └── lib/
  │       ├── main.dart        → App entry point
  │       ├── screens/         → All app screens
  │       └── services/        → API + auth
  │
  ├── Dockerfile               → How to package for Render
  ├── render.yaml              → Render deploy settings
  ├── requirements.txt         → Python packages list
  └── .env.production          → Copy this to .env

══════════════════════════════════════════════════════════════════════════
YOU ARE DONE! 🎉
══════════════════════════════════════════════════════════════════════════

Your GymSaaS platform is now:
  ✅ Fully live and accessible from anywhere
  ✅ Secure with JWT authentication
  ✅ Multi-tenant (each gym's data is isolated)
  ✅ Automated (daily expiry checks + notifications)
  ✅ Scalable (add unlimited gyms)

Next steps to grow your business:
  1. Sign up your first 2-3 gyms for free (beta testing)
  2. Collect feedback and fix any issues
  3. Start charging from month 2 onwards
  4. Upgrade Render to paid plan when you have 5+ paying gyms

Good luck with GymSaaS! 💪
