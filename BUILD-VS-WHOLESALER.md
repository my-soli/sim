# Build your own eSIM infrastructure vs. use a wholesaler

*Last updated 2026-11-02. Figures below are from public vendor pricing, GSMA's own published guidance, and industry blogs — not quotes we've personally gotten. Treat as planning estimates, confirm before committing money.*

---

## The short answer

**Building your own (becoming an actual eSIM issuer) is a telecom infrastructure project costing hundreds of thousands to millions of dollars and 1–3+ years, even in the cheapest version.** Using a wholesaler (what we do today) can realistically cost **close to $0 in required minimums**, just the cost of running our own servers (~$15–40/month) plus whatever float we choose to prefund. For a startup at our stage, there is no real contest — the wholesaler route is the only viable one right now. The rest of this doc explains why, in detail, so the reasoning is on record.

---

## 1. What "building your own" actually means

An eSIM isn't just a QR code — it's a real mobile network subscription. To issue one yourself (not reselling someone else's), you need **three separate things**, each a real business/engineering project on its own:

### a) GSMA security accreditation (SAS-SM)
The server that generates and delivers eSIM profiles (called an **SM-DP+**) must be certified under GSMA's Security Accreditation Scheme before any real mobile network will trust it. This isn't optional paperwork — it's a real security audit.

- **"Dry audit" (provisional certification):** roughly **€23,000–€26,000** for a consumer-only scope (per GSMA's own 2023 published cost guidance, the most recent we could find — confirm current pricing with GSMA directly)
- **"Wet audit" (full certification):** roughly an additional **€11,000–€13,000**
- Certification isn't permanent — it's renewed annually, with recurring audit costs
- Timeline: months, not weeks, for the full process

### b) The SM-DP+ platform itself
Even after certification, you need the actual software/server infrastructure that generates eSIM profiles and talks to carriers. Options:
- **Build it yourself** — a serious telecom software project, cost scales with how custom it is; not something our current team builds alongside everything else
- **License a white-label platform** from a vendor (e.g. Hayo, Telnyx, Monty Mobile, Cisco) — pricing is quote-based and not published, but these vendors exist specifically because building this yourself is hard enough that most companies don't

### c) Actual mobile network agreements (the real bottleneck)
This is the part that makes this a telecom business, not a software business. To let a customer's eSIM actually get data in Kenya, Tanzania, France, etc., you need either:
- A direct wholesale/roaming agreement with a real mobile network operator in that country, **or**
- A relationship with an aggregator who already has those agreements (which is, functionally, what our current wholesaler already is)

Industry vendor estimates for what this whole path costs, by tier:

| Tier | What it means | Rough cost | Rough timeline |
|---|---|---|---|
| **Branded reseller** (what we do today) | Resell someone else's already-built network access | Very low — mainly just working capital | 2–4 months to launch |
| **Light MVNO** | Your own billing/customer management, but still riding on a host network's core infrastructure | **$100,000 – $500,000** | Many months |
| **Full MVNO** | Your own core network infrastructure, direct carrier agreements | **$1,000,000 – $5,000,000+** | 1–3+ years |

*(These figures come from MVNO platform vendors — companies that sell the infrastructure to do this — so they have an incentive to make it sound achievable. Treat them as a floor, not a ceiling. One widely-cited older industry figure put a full home-grown build at $30–50 million before specialist platforms existed to cut that cost down; that's 20 years old but illustrates how big this problem really is in its most extreme form.)*

### Bottom line on "build your own"
This is a genuinely different business — closer to starting a telecom carrier than running a storefront. It requires serious capital, specialist legal/regulatory work per country, and a multi-year horizon. It is **not** a "developer builds an API" problem — the API is the easy 5% of this; the carrier relationships and security certification are the hard 95%.

---

## 2. What using a wholesaler actually costs (the realistic path, what we already do)

This is what our current product is built on. Real, current pricing we found from a few wholesale/aggregator providers:

| Provider | Minimum commitment | Notes |
|---|---|---|
| **eSIM Access** (our current wholesaler) | **No minimum order quantity, no signup fee** — pay only for what you order | This is their own published answer to "is there a minimum" |
| Telnyx | No minimum | ~$0.70 per eSIM profile + ~$2/month per active SIM + data at wholesale rates |
| MobiMatter | ~$250 minimum wallet top-up | To activate a reseller account |
| eSIM Go | Tiered: $0 / $25,000 / $100,000 / $250,000 monthly commitment | Higher tiers unlock better wholesale rates — only relevant once we have real volume |

**Correction to our earlier MVP doc:** we'd previously estimated needing $200–500 as a minimum float for eSIM Access specifically. That was an inference from *other* providers' minimums — eSIM Access's own documentation says there's **no minimum order quantity or fee to start**. In practice we still want *some* working capital sitting in the account (so an order never fails because the balance hit zero), but that's a comfort buffer we choose, not a requirement they impose. **$50–100 is plenty to start testing with real small orders.**

### The real minimum cost to operate via the wholesaler route
| Item | Cost |
|---|---|
| Wholesaler account minimum | **$0** (eSIM Access has none) |
| Comfortable working float (our choice, not required) | **$50–100** to start |
| Our own servers/database to run the storefront | **~$15–40/month** (already covered in the MVP doc) |
| Payment processing | Percentage per sale, not upfront (also already covered in the MVP doc) |

That's it. There's no telecom licensing, no security audit, no carrier negotiation — the wholesaler has already done and paid for all of that, which is the entire point of using one.

---

## 3. Side-by-side comparison

| | **Build your own (full independence)** | **Use a wholesaler (current approach)** |
|---|---|---|
| Upfront cost | $100K (light) to $5M+ (full) | ~$0–100 |
| Time to launch | Months to years | Already live |
| Ongoing cost | Annual re-certification, carrier contract renewals, infrastructure upkeep | A percentage margin per sale, same as any reseller business |
| Regulatory/legal burden | Telecom licensing, per-country carrier contracts, security re-audits | None — the wholesaler carries this |
| Control over coverage/pricing | Full control, eventually | Dependent on wholesaler's rates and country coverage |
| Margin ceiling | Higher, eventually, if volume justifies it | Capped by wholesale price + markup |
| Realistic for us right now | No | Yes — this is what's already built and live |

---

## 4. Is there a middle ground?

Yes — and it's worth doing *before* ever considering full independence:

**Multi-wholesaler sourcing.** Our backend already has a "provider abstraction" built in — it's designed to plug in more than one wholesaler and pick whichever has the best price or coverage for a given country, rather than depending on eSIM Access alone. This is realistic, cheap (weeks of engineering work, not months), and reduces single-vendor risk without touching any of the telecom-carrier complexity above. This is the sensible next step if/when eSIM Access's pricing or coverage becomes a limiting factor — not building our own SM-DP+.

**When would full independence ever make sense?** Only at serious scale — think the point where wholesale margins are clearly capping growth and sales volume could justify a seven-figure infrastructure investment. That's a "revisit in a few years if this is working" conversation, not a now conversation.

---

## 5. Recommendation

Stay on the wholesaler model. It's already built, already live, costs next to nothing to keep running, and carries none of the regulatory/capital risk of becoming an actual telecom provider. If/when wholesale economics start to pinch, the next real step is adding a second or third wholesaler for price competition — not building an SM-DP+.

---

*Sources: GSMA's own SAS-SM cost guidance PDFs (v8.1/v9, gsma.com), MVNO launch cost estimates from iplook.com and mvno-index.com (MVNO platform vendors — treat as a floor), eSIM Access's own published MOQ policy (esimaccess.com/docs), and wholesale pricing pages/blogs from Telnyx, MobiMatter, and eSIM Go via esim.tech and builders.firsty.app.*
