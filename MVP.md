# (Product Name) — MVP Overview, Costs, Brand & Go-to-Market

*Working document — last updated 2026-10-22. The brand name has not been decided yet — "(Product Name)" is used as a placeholder throughout; swap it everywhere once the real name is locked in.*

---

## 1. What this product is

A travel eSIM storefront: we buy mobile data plans wholesale from **eSIM Access** (a global eSIM wholesaler covering 190+ destinations) and resell them with a markup. Customers pay by card (Stripe) or M-Pesa, get a QR code instantly, and activate data the moment they land — no physical SIM swap, no roaming bill shock.

**Current status: fully built, fully deployed, running in MOCK mode.** Nothing is connected to real money or real eSIM inventory yet. That's the main gap between "demo" and "business."

---

## 2. What's built and live right now

### Live infrastructure
| Layer | Where | URL |
|---|---|---|
| Backend API | Railway | `sim-production-98aa.up.railway.app` |
| Database | Railway (Postgres) | private, wired to backend |
| Frontend (web) | Cloudflare Pages | `e-sim-bq2.pages.dev` |
| Source code | GitHub | `my-soli/sim` |

### Backend features (NestJS + Prisma + Postgres)
- Email/phone OTP login + JWT sessions
- Provider abstraction: a **mock provider** (fully working offline, fake data) and a **real eSIM Access client** (built against their actual API, catalog sync verified — 140 real packages pulled in — but never used to place a real paid order)
- Catalog auto-sync job with configurable markup (`MARKUP_PERCENT`, currently 40%)
- Order flow: create → pay → provision → confirm (webhook or polling) → ready, with duplicate-webhook and double-payment protection
- Stripe checkout handler + M-Pesa STK-push handler (both fully working in mock mode; neither ever tested against a real Stripe or Safaricom account)
- Admin endpoints: view orders, issue refunds, see margin per order, wallet/balance tracking
- 24 automated unit tests + an end-to-end smoke test, all passing

### Frontend features (Flutter — one codebase for web, Android, and eventually iOS)
- Home page, destination search/filter, country + plan pages (with SMS-capability and activation-type badges)
- Checkout: card via Stripe redirect, M-Pesa via STK push + polling — same flow on web and mobile
- Order confirmation with a client-rendered QR code, plus manual activation details
- "My eSIMs" with live usage bars and a top-up entry point
- Help Centre: 10 real articles across 4 categories, plus the original click-to-expand FAQ
- About, Contact, draft Terms & Privacy (not lawyer-reviewed yet)
- Fully responsive (phone / tablet / desktop), audited and fixed for narrow-screen overflow
- **Bright/light-only theme** ("Ocean Breeze" — see §5), no dark mode, Delius font throughout
- Basic SEO: real meta description, Open Graph/Twitter cards, JSON-LD, `robots.txt`, `sitemap.xml` (see the honest caveat in §7)
- Tested working end-to-end on a real Android phone over USB, and in a real browser against the live backend

---

## 3. What the product currently holds vs. what it should hold

### Holds today (v1 / MVP scope)
- OTP auth, full catalog browse, checkout (2 payment rails), order delivery, usage tracking, help content, legal placeholders, admin tooling, responsive bright UI.

### Explicitly deferred for this MVP (already decided, not a gap)
- Automated top-up (manual button exists, no auto-renew)
- Multi-language UI
- Referral/affiliate program
- Unlimited-data plans
- Multi-provider routing (abstraction exists, only eSIM Access is wired in)
- Native desktop apps

### Gaps worth closing soon (v1.1 / early roadmap — not started)
- **Analytics** — no Google Analytics / Plausible / conversion tracking set up anywhere. We are flying blind on traffic and conversion right now.
- **Push/email notifications** — e.g. "your data is almost used up," "your eSIM expires in 2 days, top up now." No notification system exists.
- **App store presence** — the Flutter app runs on Android already; there's no Play Store or App Store listing yet.
- **Live chat / support widget** — support today is email-only (`mailto:`).
- **Multi-currency display** — prices show in one currency; showing a local-currency estimate would reduce checkout friction for travelers.
- **Reviews/testimonials** — none exist yet (no customers yet), but the page structure should accommodate them once we have some.
- **Monitoring/alerting** — if the Railway backend goes down at 2am, nobody is notified.

---

## 4. Decisions only you two can make

These are blocking real launch, not technical work:

1. **Final brand name.** Not decided yet — "(Product Name)" is used as a placeholder throughout this doc and the app. Needs a trademark/domain availability check before it's final.
2. **Domain name.** Currently on Railway's and Cloudflare's default URLs. Need to buy and wire up a real domain (cost in §7).
3. **Support email.** Currently `support@example.com`.
4. **Legal review of Terms & Privacy.** Current drafts are AI-written placeholders, not reviewed by a lawyer. Matters more once real money and real personal data (phone numbers, payment info) are involved.
5. **Launch market / primary currency.** The M-Pesa integration points at Kenya/East Africa; confirm that's the intended first market, since it shapes pricing currency, marketing channels, and which paybill/business registration to pursue.
6. **Logo and real visual identity.** The app currently uses a generic SIM-card icon and Flutter's default app icons/favicon — there is no real logo.
7. **Brand tone/voice.** Not defined yet — playful and youthful? Efficient and corporate? Should guide copywriting going forward.

---

## 5. Brand guidelines (current state)

### Name & tagline
- Name: **(Product Name)** *(not decided yet — pending decision #1 above)*
- Tagline: "Travel data, sorted before you land."

### Color palette — "Ocean Breeze" (current, bright/light-only, no dark mode)
| Role | Hex | Use |
|---|---|---|
| Background | `#F5FAFF` | page background, cool near-white |
| Surface | `#FFFFFF` | cards, app bar |
| Ink (text) | `#10243E` | body text, text on fixed-white surfaces |
| Primary | `#00B8D9` | buttons, links, app bar, brand mark |
| Accent | `#FF4D8D` | CTAs, highlights, gradient banners |

This is the **second** palette tried this round (the first, "Sky & Coral," was rejected). If this one doesn't land either after seeing it live, the fix is a five-minute edit — don't hesitate to iterate again.

### Typography
- **Delius** (Google Fonts), one weight (400) with synthetic bold for heavier text. Confirmed as the font to keep.

### Logo / icon
- No real logo exists. The in-app "brand mark" is currently a generic SIM-card icon inside a gradient square. Favicon and app icons are still Flutter's default placeholders. **This needs real design work before public launch** — see cost estimate in §7.

---

## 6. Remaining technical work to go live

| # | Task | Owner |
|---|---|---|
| 1 | eSIM Access: fund a real account, get AccessCode, flip `PROVIDER=esimaccess` | Business + 1 env var |
| 2 | Stripe: verified business account, bank payout linked, live keys + webhook, flip `PAYMENTS_MODE=live` | Business + env vars |
| 3 | M-Pesa: registered paybill/till, Daraja production credentials (slowest — real business registration with Safaricom) | Business + env vars |
| 4 | Security: `OTP_DEV_ECHO=false` (stop echoing login codes in API responses) | 1 env var |
| 5 | Security: lock CORS to the real production domain instead of allowing all origins | Small code change |
| 6 | Buy + wire up a custom domain (DNS → Cloudflare Pages + Railway) | Business + config |
| 7 | Real logo/app icons | Design |
| 8 | Basic uptime monitoring/alerting (e.g. a free UptimeRobot check) | Small setup |
| 9 | One real, small, end-to-end test transaction per payment rail before trusting it | Testing |

---

## 7. Costs — approximate, with sources

**These are estimates from third-party sources as of October 2026, not official quotes. Confirm directly with each provider before budgeting.**

### One-time / setup costs
| Item | Approx. cost | Notes |
|---|---|---|
| Domain name (.com) | **$10–20 first year, $15–40/yr renewal** | Prices rising ~7% industry-wide from Nov 2026; renewal is usually pricier than the first year |
| Logo / brand identity design | **$0 (DIY) – $300–800 (freelance designer)** | A simple, well-made logo + icon set is enough for MVP; full brand guidelines deck is a bigger spend, not needed yet |
| Legal review of Terms & Privacy | **$0 (template service) – $300–1,500 (lawyer, one-time)** | Varies hugely by jurisdiction; a templated service (e.g. Termly) is a cheap stopgap, a real lawyer matters more once processing real payments |
| M-Pesa paybill/till setup | **Unclear — likely $0–low, but timeline matters more than cost** | No confirmed official application fee found; a Buy Goods till can take 1–3 business days via Safaricom's self-service portal, a Paybill takes 3–10 business days (longer in regulated sectors) |
| eSIM Access initial float | **$0 required — $50–100 is a comfortable starting buffer** | *(Corrected 2026-11-02)* eSIM Access publishes no minimum order quantity or signup fee — you only pay for what you order. A small float just avoids an order failing for lack of balance; it's not a requirement they impose. See `BUILD-VS-WHOLESALER.md` for the full breakdown. |

### Recurring monthly costs
| Item | Approx. cost/month | Notes |
|---|---|---|
| Railway (backend + Postgres) | **$15–40/mo** | $5 Hobby plan base + metered CPU/RAM/storage; a small always-on Postgres instance alone is commonly $10–20/mo on top |
| Cloudflare Pages (frontend) | **$0** | Static hosting and bandwidth are free and unlimited on Cloudflare's free tier; only relevant if we add server-side functions later |
| Support email (e.g. you@realdomain.com) | **$0 (registrar email forwarding) – $7/user/mo (Google Workspace Starter, annual billing)** | Workspace adds calendar, shared drive, etc.; forwarding is free but looks less professional |
| Uptime monitoring | **$0** | Free tiers (UptimeRobot, Better Uptime) are enough at this stage |

### Per-transaction costs (eat into the 40% markup)
| Rail | Fee | Notes |
|---|---|---|
| Stripe (card) | **~2.9% + $0.30** per successful charge (US rate; international cards add more) | Real cost can run 4–7% of revenue once currency conversion/international surcharges apply |
| M-Pesa | Safaricom cut merchant fees in Aug 2026; collection into a Buy Goods till is reportedly free below ~KES 500, then a small percentage above that, capped | Figures are from secondary sources — confirm against Safaricom's current official tariff before pricing plans |

### Worked example: why "40% markup" isn't 40% margin
| | Card (Stripe) | M-Pesa |
|---|---|---|
| Wholesale cost | $5.00 | $5.00 |
| Sell price (40% markup) | $7.00 | $7.00 |
| Payment fee | ~$0.50 (2.9% + $0.30) | ~$0.05–0.15 (estimate, small plans likely free) |
| **Real margin** | **$1.50 (~21% of price)** | **~$1.85–1.95 (~26–28% of price)** |

The gap matters most on cheap plans, where the flat $0.30 Stripe fee is a bigger bite. Nudging up the markup slightly on low-priced plans, or steering price-sensitive customers toward M-Pesa where that rail is available, both help.

---

## 8. Marketing strategy

### Who we're selling to
Travelers who need data the moment they land — the exact people who are, by definition, not reachable through traditional local ads once they're already traveling. Marketing has to catch them **before departure**, during trip planning.

### Positioning
"Buy your data before you fly. Scan a QR code, land connected." The competitive wedge vs. the many existing eSIM apps (Airalo, Holafly, Yesim, etc.) needs to be explicit — likely candidates: **M-Pesa support** (most competitors don't take it, and it's a real differentiator for East African travelers and the diaspora), simpler plan selection, and local trust/support.

### Phase 1 — pre-launch (free/cheap, do first)
- SEO content: a blog post per popular destination ("Best eSIM for Kenya," "How to get data in Tanzania on arrival") — slow to pay off but compounds, and the backend already has per-country data to drive this
- Build a waiting list / early-access page before full launch to seed initial demand
- Personal network + diaspora WhatsApp/Facebook groups — M-Pesa support is a strong, specific pitch here
- Partner conversations with Kenyan travel agencies, tour operators, and hostels — ask to be the "recommended data plan" for their customers

### Phase 2 — launch
- Targeted Google Ads on high-intent, low-competition keywords ("esim kenya," "esim tanzania data plan") — travel eSIM keywords are generally cheaper than mainstream travel keywords
- Instagram/TikTok short-form content: "landed and connected in 30 seconds" style demos — this is a visual, demo-friendly product
- Airport/diaspora community partnerships: QR flyers or counters where travelers already gather (SACCOs, travel agencies, diaspora associations abroad)
- Affiliate/referral incentive for early users to share with other travelers (flagged as deferred to build, but a simple manual "give $2, get $2" code can launch before the automated version exists)

### Phase 3 — growth
- Build out the referral program properly once there's real usage data to tune it
- Expand destination-specific SEO content as the catalog proves out which countries convert
- Revisit paid acquisition once there's a real cost-per-acquisition number to optimize against — don't guess a budget before Phase 1/2 give real data

### What marketing needs from the product (and doesn't have yet)
- **Analytics are not set up at all** — this should be fixed before spending a single dollar on paid acquisition, or there's no way to know what's working.
- A referral/promo code mechanism (even a manual one) to support word-of-mouth in Phase 1.

---

## 9. Immediate next steps

1. Decide on the open items in §4 (name, domain, support email, launch market) — these block almost everything else.
2. Set up analytics before any marketing spend.
3. Work through the three "go live" accounts in §6, roughly in order: Stripe (fastest to verify), eSIM Access (needs a funded float), M-Pesa (slowest — register the paybill in parallel with the other two so its lead time doesn't block launch).
4. Get a real logo made — cheap and fast, but currently missing.
5. Decide the final color palette (currently "Ocean Breeze" — confirm or iterate once more).
6. Bundle the two security fixes (`OTP_DEV_ECHO=false`, CORS lockdown) into whichever Railway env-var session handles the provider go-live, since they touch the same settings screen.

---

*Sources for cost figures (third-party, not official provider pages — verify before committing budget): Railway pricing comparisons (makerkit.dev, costbench.com, livemy.app, sota.io), Stripe fee breakdowns (merchantcostconsulting.com, dodopayments.com, activepieces.com), Safaricom M-Pesa tariff reporting (The Standard, paybillke.com, tech-ish.com), Cloudflare Pages limits (flaviocopes.com, costbench.com), domain pricing (Upwork, Elementor, openprovider.com), Google Workspace pricing (emailvendorselection.com, Lark Suite), and eSIM reseller minimum top-ups (eSIM Go help center, MobiMatter reseller page) — eSIM Access's own minimum was not published anywhere found, so that figure is inferred from comparable providers.*
