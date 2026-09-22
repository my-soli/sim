# Tembea — travel eSIM storefront (MVP)

A branded storefront on top of the [eSIM Access](https://docs.esimaccess.com/) wholesale eSIM API. Backend in
NestJS + Prisma + PostgreSQL, storefront in Flutter (mobile + web) from one codebase.

> **Status: MVP, not production-ready.** "Tembea" and the support email are placeholders, Terms/Privacy are
> DRAFT text, and the real eSIM Access / Stripe / M-Pesa clients have not been exercised against live
> credentials. See [What's not done](#whats-not-done-yet) before launching this for real.

## Repository layout

```
esim-app/
├─ backend/     NestJS API: auth, catalog sync, orders, payments, admin
├─ app/         Flutter app: iOS, Android, web from one codebase
└─ docs/        Provider API reference (Postman export), not committed if it contains secrets
```

## How it fits together

- **Provider abstraction.** All eSIM Access-specific code lives behind `EsimProvider`
  (`backend/src/provider/esim-provider.ts`). Checkout and order logic only ever talk to that interface, so a
  second wholesale provider can be added without touching them. Two implementations exist:
  - `MockEsimProvider` — deterministic, offline, no account needed. Default for local dev, since eSIM Access has
    no sandbox environment.
  - `EsimAccessProvider` — the real client, built from eSIM Access's official Postman collection. Package list,
    ordering, profile lookup, usage, balance, cancel and webhook parsing are implemented; **it has never been
    called against a live account.**
- **Orders are webhook-first, with polling as a fallback.** After payment, the backend calls the provider to
  create the order, then either waits for the provider's `ORDER_STATUS` webhook or polls
  `esim/query` until the profile is allocated (there's no sandbox to rely purely on webhooks against).
- **Payments run in "mock" mode by default** (`PAYMENTS_MODE=mock`): both Stripe and M-Pesa checkout auto-succeed
  a few seconds after you click pay, so the whole flow works with zero payment credentials. Setting
  `PAYMENTS_MODE=live` switches to real Stripe Checkout and Safaricom Daraja STK push — untested against real
  keys.
- **Catalog sync** is a scheduled job (`backend/src/catalog/catalog.ts`) that pulls the provider's package list
  daily, applies `MARKUP_PERCENT`, and caches it in `packages_cache`. Only one provider is ever "live" at a time;
  switching `PROVIDER` retires the previous provider's cached packages so a customer can't buy a `mock_*` plan
  against the real provider (or vice versa).

## Prerequisites

- Node.js 20+ and npm
- Flutter 3.24+ (stable channel) with the web and your target mobile platform(s) enabled
- PostgreSQL 14+ (a local install, or a container — anything reachable via `DATABASE_URL`)
- For a physical Android/iOS device: the phone and your computer on the same Wi-Fi network

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` (see [Environment variables](#backend-environment-variables) below). The defaults work for local
dev with no external accounts: mock provider, mock payments, OTP codes echoed back in the API response instead
of emailed.

Create the database and run migrations:

```bash
# Point DATABASE_URL at a Postgres server you control, then:
npx prisma migrate dev
```

Run it:

```bash
npm run start:dev       # NestJS in watch mode, http://localhost:3100 by default (see PORT in .env)
```

On first boot with an empty `packages_cache`, the backend automatically syncs the catalog from whichever
provider is configured (`mock` by default), so `/catalog/countries` returns data immediately.

### Tests

```bash
npm test          # unit tests (src/**/*.spec.ts) — pure logic, no DB or network needed
npm run test:e2e  # full-stack smoke test — needs DATABASE_URL reachable and the mock provider (PROVIDER=mock)
```

### Admin access

Any email listed in `ADMIN_EMAILS` (comma-separated) becomes an admin the first time they sign in via OTP.
Admin endpoints (`/admin/orders`, `/admin/margin`, `/admin/wallet`, `/admin/orders/:id/refund`,
`/admin/catalog/sync`) require that account's JWT.

## 2. Flutter app setup

```bash
cd app
flutter pub get
```

**Web** (fastest way to see the storefront):

```bash
flutter run -d web-server --web-hostname localhost --web-port 8090
# open http://localhost:8090
```

**Android emulator** — no flags needed; the app auto-targets `10.0.2.2` (the emulator's alias for your host
machine) to reach the backend on `localhost:3100`.

```bash
flutter run -d <emulator-id>
```

**A physical phone (Android or iOS)** — the phone can't resolve `localhost` as your PC, so point it at your
machine's LAN IP explicitly:

```bash
flutter run -d <device-id> --dart-define=API_BASE=http://<your-pc-lan-ip>:3100
```

Find your PC's LAN IP with `ipconfig` (Windows) or `ifconfig`/`ip addr` (macOS/Linux). Your phone and PC must be
on the same network, and your OS firewall must allow inbound connections to port 3100.

**Production web build:**

```bash
flutter build web --dart-define=API_BASE=https://your-api-domain.example
# serves the static output from app/build/web
```

## Backend environment variables

All of these live in `backend/.env` (copy from `backend/.env.example`).

| Variable | Purpose | Local dev default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | — (required) |
| `JWT_SECRET` | Signs auth tokens | any string; **use a long random one before going live** |
| `PORT` | Backend HTTP port | `3100` |
| `APP_URL` | Public URL of the Flutter web app (used in Stripe redirect URLs) | `http://localhost:8090` |
| `PUBLIC_API_URL` | Public URL of this API (used in M-Pesa's callback URL) | `http://localhost:3100` |
| `PROVIDER` | `mock` (offline) or `esimaccess` (live) | `mock` |
| `ESIMACCESS_ACCESS_CODE` | Your eSIM Access API key, from their console's developer section | — |
| `MARKUP_PERCENT` | Retail markup applied over wholesale cost | `40` |
| `PAYMENTS_MODE` | `mock` (auto-succeeds) or `live` (real Stripe/M-Pesa) | `mock` |
| `STRIPE_SECRET_KEY` | Stripe secret key | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | — |
| `MPESA_BASE_URL` | Daraja API base (sandbox or production) | Safaricom sandbox |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` | Daraja app credentials | — |
| `MPESA_SHORTCODE` / `MPESA_PASSKEY` | Daraja paybill/till + STK passkey | — |
| `MPESA_CALLBACK_SECRET` | Random string embedded in the M-Pesa callback URL as a shared secret | change me |
| `KES_PER_USD` | USD→KES conversion used to quote M-Pesa amounts | `129` |
| `OTP_DEV_ECHO` | If `true`, `/auth/otp/request` returns the code in the response (dev only) | `true` |
| `ADMIN_EMAILS` | Comma-separated emails granted admin on first sign-in | `admin@example.com` |
| `LOW_BALANCE_CENTS` | Threshold for the hourly provider-balance check | `5000` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Outgoing email. Empty `SMTP_HOST` logs emails to the console instead of sending | — |

The Flutter app has one build-time variable, `API_BASE` (see above), passed via `--dart-define`, not an `.env`
file.

## Going live with eSIM Access

There is no sandbox — testing spends your real provider balance. Deposit a small amount first. Then:

1. Set `PROVIDER=esimaccess` and `ESIMACCESS_ACCESS_CODE` in `backend/.env`.
2. Restart the backend. Because the package cache is keyed per-provider, it auto-syncs the real catalog on
   boot and retires any `mock` packages so they can't still be bought.
3. Leave `PAYMENTS_MODE=mock` for your first order so no real card/M-Pesa charge happens.
4. Place a small test order in the app and confirm it reaches `READY` with a real QR code.
5. Cancel the test eSIM before installing it (`POST /admin/orders/:id/refund`, or via the eSIM Access console)
   to get the wholesale cost back — cancellation only works before the profile is installed.

## What's not done yet

- **Voice / SMS / phone numbers.** eSIM Access sells data plans only. Some plans can receive SMS
  (`smsStatus`, surfaced as a badge/filter in the app); nothing here provides calls or a phone number — that
  needs a different or additional supplier.
- **Live payments untested.** Stripe and M-Pesa Daraja integrations are written but have not run against real
  keys.
- **SMS/phone OTP delivery.** Phone-number OTPs are only logged server-side; there's no SMS gateway wired up.
  Email OTP works once `SMTP_HOST` is set.
- **Push notifications.** Users have a `pushToken` column but nothing sends to FCM/APNs yet. Low-data/expiry
  alerts currently go out by email only.
- **eSIM Access "Set Webhook" call** isn't wired up — the backend can *receive and parse* their webhooks at
  `POST /webhooks/provider`, but nothing registers that URL with eSIM Access yet. Order provisioning still works
  via polling either way.
- **Top-up** is a manual "buy another plan" flow, not the provider's dedicated top-up endpoint.
- **No admin UI** — only the admin API endpoints exist.
- **Brand, legal, and content placeholders**: brand name and support email (`app/lib/core/brand.dart`),
  Terms/Privacy (`app/lib/features/site/info_pages.dart`, marked DRAFT — have a lawyer review before launch).
- Before public launch: set `OTP_DEV_ECHO=false`, use a long random `JWT_SECRET`, restrict CORS to your real
  domain, and serve everything over HTTPS.
