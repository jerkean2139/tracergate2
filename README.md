# TracerGate

GHL Marketplace app that connects Go High Level sub-accounts to payment processors (Accept Blue, TRX Services). Stores encrypted credentials per location and proxies charge/refund transactions.

## Architecture

```
Frontend (React + Vite + Tailwind)     Backend (Express + Postgres)
┌──────────────────────────┐           ┌───────────────────────────────┐
│ /            Dashboard    │──proxy──▶│ GET  /health                   │
│ /processors  Config UI   │          │ GET  /auth/callback  (GHL OAuth)│
│                          │          │ GET  /api/status                │
│                          │          │ POST /api/acceptblue/connect    │
│                          │          │ POST /api/acceptblue/charge     │
│                          │          │ POST /api/acceptblue/refund     │
│                          │          │ POST /api/trx/connect           │
│                          │          │ POST /api/trx/charge            │
│                          │          │ POST /api/trx/refund            │
│                          │          │ POST /webhooks/acceptblue       │
│                          │          │ POST /webhooks/ghl              │
└──────────────────────────┘          └──────────────┬────────────────┘
                                                      │
                                      ┌───────────────▼───────────────┐
                                      │  Postgres                      │
                                      │  - ghl_installations           │
                                      │  - acceptblue_creds (encrypted)│
                                      │  - trx_creds (encrypted)       │
                                      │  - acceptblue_webhook_events   │
                                      └────────────────────────────────┘
```

## Setup

### Prerequisites

- Node.js >= 20
- Postgres (local via Docker or Railway)

### Local Development

```bash
# Start local Postgres
docker compose up -d

# Backend
cp backend/env.example backend/.env
# Fill in your GHL and Accept Blue credentials in backend/.env
cd backend
npm install
npm run dev

# Frontend (separate terminal)
npm install
npm run dev
```

The frontend dev server proxies `/api`, `/auth`, and `/webhooks` to `localhost:8787`.

### Environment Variables

See `backend/env.example` for the full list. Key vars:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `APP_ENC_KEY_B64` | 32-byte base64 key for AES-256-GCM credential encryption |
| `GHL_CLIENT_ID` | GHL Marketplace app client ID |
| `GHL_CLIENT_SECRET` | GHL Marketplace app client secret |
| `GHL_REDIRECT_URI` | OAuth callback URL (must match GHL app settings) |
| `ACCEPTBLUE_BASE_URL` | Accept Blue API base (sandbox or production) |
| `TRX_BASE_URL` | TRX Services API base |

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Deploy to Railway

The backend serves the built frontend as static files. Railway config is in `backend/railway.toml`.

```bash
# Build frontend into backend/client
npm run build
cp -r dist backend/client

# Push backend to Railway
cd backend
railway up
```

## Security

- Payment processor credentials are encrypted with AES-256-GCM before storage
- All `/api/*` routes require a valid GHL installation (locationId verified against DB)
- Accept Blue webhooks are verified via HMAC-SHA256 signature
- Webhook events are deduplicated by event ID
- GHL tokens auto-refresh before expiry
