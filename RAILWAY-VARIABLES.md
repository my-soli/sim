# Railway environment variables — copy/paste reference

*Each block below is formatted for Railway's **Variables → Raw Editor** (paste the whole block at once). Fill in any blank `KEY=` value before pasting — don't paste empty secrets over real ones.*

---

## Backend service ("sim")

### Already set (confirmed in Railway)
Don't need to touch these — listed just for reference.
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<already set>
PROVIDER=<check current value — mock or esimaccess>
PAYMENTS_MODE=<check current value — mock or live>
OTP_DEV_ECHO=<check current value>
ADMIN_EMAILS=shalinrono@gmail.com
MPESA_CALLBACK_SECRET=<already set>
```

### Missing — needed now, for eSIM Access to actually work
```
ESIMACCESS_ACCESS_CODE=
ESIMACCESS_SECRET_KEY=
```
If `PROVIDER=esimaccess` is already set without these two present, the app is crashing right now — confirm this got done.

### Missing — needed before flipping `PAYMENTS_MODE=live`
```
APP_URL=
PUBLIC_API_URL=https://sim-production-98aa.up.railway.app
```
`APP_URL` is where Stripe redirects back to after checkout — set it once you know the final frontend domain (new Next.js-on-Railway service, or Cloudflare Pages). `PUBLIC_API_URL` is this backend's own public URL — the value above is already correct, just needs adding.

### Needed later — Stripe go-live
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Needed later — Daraja (M-Pesa) go-live
```
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
```
(`MPESA_BASE_URL` currently likely points at the sandbox URL — this is the production one, only switch it once you have real production Daraja credentials.)

### Optional — defaults already exist in code, only set to override
```
MARKUP_PERCENT=40
LOW_BALANCE_CENTS=5000
KES_PER_USD=129
```

---

## Web service ("e-sim-website")

### Required — nothing will load without this
```
NEXT_PUBLIC_API_BASE=https://sim-production-98aa.up.railway.app
```

---

## Not a Railway variable — separate code change still pending
CORS is currently wide open (`origin: true` in `backend/src/main.ts`). Once the final frontend domain(s) are known, this should be locked down to just those domains. Flagging here so it doesn't get lost, not something you paste anywhere.
