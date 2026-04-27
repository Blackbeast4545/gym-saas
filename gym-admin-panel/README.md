# FitNexus — Gym Admin Panel

React web panel for gym owners and receptionists.

## Pages

| Page        | Who can access       | What it does                                    |
|-------------|----------------------|-------------------------------------------------|
| Dashboard   | Owner + Receptionist | Stats, today's check-ins, alerts                |
| Members     | Owner + Receptionist | Add/edit/search/filter members                  |
| Plans       | Owner + Receptionist | Create membership plans (monthly/quarterly etc) |
| Payments    | Owner + Receptionist | Record payments, download PDF receipts          |
| Attendance  | Owner + Receptionist | Today's check-ins, manual check-in              |
| QR Code     | Owner + Receptionist | View, download, print gym QR for entrance       |
| Workouts    | Owner + Receptionist | Create workout plans, assign to members         |
| Diet Plans  | Owner + Receptionist | Create diet plans, view member diet             |
| Notify      | Owner + Receptionist | Send SMS/WhatsApp/push to all or selected       |
| Staff       | Owner only           | Add/remove receptionist staff                   |

## Run locally

```bash
cd gym-admin-panel
npm install
npm run dev
# Opens at http://localhost:3001
```

## Deploy to Vercel

1. Push to GitHub
2. Vercel → New Project → Import repo
3. Set Root Directory: `gym-admin-panel`
4. Add env var: `VITE_API_URL` = your backend URL
5. Deploy

## Login

Gym owners use:
- Gym ID (UUID given by super admin when gym was created)
- Phone number (registered when gym was created)
- Password (set by super admin when creating the gym)

Receptionists use same login but with their own phone + password set by the owner.
