# (Product Name) — Plain-English Overview

*No jargon version. Last updated 2026-10-22. The brand name isn't decided yet — "(Product Name)" is a placeholder used everywhere until we pick one.*

---

## 1. What are we actually building?

An app/website where travelers buy mobile internet data for their phone (an "eSIM") before or when they land in another country. Instead of buying a physical SIM card at the airport, they pay us, get a QR code on their screen, scan it, and their phone has internet in that country within minutes.

We don't create this data ourselves — we buy it in bulk from a wholesale supplier (a company called **eSIM Access**) and sell it to customers at a markup, the same way a retailer buys stock from a wholesaler and sells it with a profit margin.

---

## 2. Where things actually stand right now

**Short version: the whole product is built and working — but it's running in "practice mode." No real customer has paid real money yet, and we're not yet connected to the real data supplier.**

Think of it like a restaurant that has finished building out the kitchen, printed the menu, trained the staff, and is running full rehearsal service every night — but hasn't opened the doors to real paying customers or started buying real ingredients yet.

### What works today, right now, if you open the app:
- You can create an account and log in
- You can search for a country and see data plans with real prices
- You can "pay" by card or M-Pesa (fake payments right now — no real money moves)
- You instantly get a QR code and activation instructions
- You can see your data usage and top up
- There's a full help section, FAQs, About/Contact pages, and draft Terms & Privacy pages
- It works on a phone, tablet, and computer screen, and looks the same clean, bright design everywhere
- It's genuinely live on the internet right now — you can open it in a browser and click through it exactly like a customer would

### What it's not yet:
- It's not connected to the real wholesale data supplier (so right now it can't actually deliver a working eSIM to anyone)
- It's not connected to real Stripe or real M-Pesa accounts (so right now it can't actually take anyone's money)
- Nobody has reviewed the Terms & Privacy pages as a lawyer would
- There's no real company logo — it's using a placeholder icon
- There's no way yet to see "how many people visited the site" or "how many people almost bought but didn't" — no tracking is switched on

---

## 3. What needs to happen before we can actually launch and make money

Three accounts need to be set up and connected — these are the three places where real money and real product actually move:

1. **The data supplier (eSIM Access)** — set up a real account and put real money into it (like a prepaid account you top up before you can sell anything). Without this step, we have nothing to sell.
2. **Card payments (Stripe)** — set up a real, verified business account so we can accept real credit/debit cards and actually receive the money into a real bank account.
3. **M-Pesa** — register a real business paybill/till number with Safaricom so we can accept M-Pesa payments. This one typically takes the longest (days, sometimes weeks) because it's a real business registration process, so it's worth starting early.

Alongside that, two small technical safety fixes need to happen (quick, no cost, just need to be done before real customers show up), and we need to buy a proper domain name (see costs below) instead of using the temporary web addresses we're on now.

---

## 4. Decisions only the two of you can make

Nothing below needs a developer — these are business/taste decisions:

1. **What do we actually call this thing?** Name needs to be checked that nobody else owns it and that the matching website address is available.
2. **What website address (domain) do we want to buy?**
3. **What email address should customers write to for support?** (currently a placeholder)
4. **Do we pay a lawyer to check our Terms & Privacy pages**, or use a cheaper template service for now?
5. **Where are we launching first?** Everything so far is built assuming Kenya/East Africa as the first market (because of the M-Pesa support) — confirm that's really the plan, since it affects pricing currency and marketing.
6. **Do we want a real logo made?** (We don't have one yet — just a placeholder icon.)
7. **What's the personality of the brand?** Playful and fun, or serious and professional? This affects how everything is worded.

---

## 5. What it looks like (current design)

- **Colors (code name "Ocean Breeze"):** a bright, clean, white/light-blue background, with a bright cyan-blue as the main color and a punchy pink/magenta for buttons and highlights. No dark mode — it's bright and light everywhere, by request.
- **Font:** a rounded, friendly typeface called Delius.
- We've tried two color directions already and rejected the first one — if this second one doesn't feel right once you look at it live, say so, it's a quick change.
- **No real logo yet** — this is one of the most visible gaps before a public launch.

---

## 6. What will this cost? (ballpark figures, not final quotes)

**One-time costs:**
| What | Roughly how much |
|---|---|
| Buying the website address (domain name) | $10–20 to start, a bit more each year after |
| Getting a real logo designed | Free if one of us does it, or roughly $300–800 to hire someone |
| Legal check of Terms & Privacy | Free-ish with a template service, or $300–1,500 for an actual lawyer |
| Starting balance to put into the data supplier account | At least $200–500 just to get going — this isn't a fee, it's like buying initial inventory |

**Ongoing monthly costs:**
| What | Roughly how much |
|---|---|
| Keeping the website/app's "engine" running (servers + database) | Roughly $15–40/month |
| Hosting the actual website pages | Free |
| A professional support email address | Free, or about $7/month if we want a proper business email setup |

**Costs that happen per sale (not fixed, these come out of each transaction):**
- Card payments (Stripe) take roughly **3% of each sale, plus a small flat fee** — this matters most on cheap plans, since the flat fee is a bigger bite of a small sale
- M-Pesa's cut is smaller, especially after a 2026 fee reduction — likely cheaper than card payments for us

**Reality check on our profit margin:** We're planning to mark up what we pay the wholesaler by 40%. But once payment processing fees are taken out, our actual profit is closer to **20–28% of the sale price**, not the full 40% — card payments eat more of the margin than M-Pesa does, especially on smaller/cheaper plans.

*(All figures above are from public pricing pages and third-party comparisons as of October 2026, not quotes we've personally gotten — treat them as planning estimates, not guarantees.)*

---

## 7. How do we actually get customers? (marketing plan)

**The core challenge:** our customers need data *before* they land somewhere — so we can't just rely on local advertising once they've already arrived. We need to reach people while they're still planning their trip, back home.

**Our edge:** most competing eSIM apps don't support M-Pesa. That's a real, specific advantage for Kenyan/East African travelers and the diaspora — this should be front and center in how we talk about the product.

**Step 1 — before we even fully launch (cheap or free):**
- Write simple blog-style pages for popular destinations ("Best data plan for Kenya," "Getting internet in Tanzania on arrival") — slow to build momentum but keeps paying off over time through Google search
- Build a simple "sign up to be notified when we launch" page to start collecting interested people now
- Personally reach out in diaspora WhatsApp/Facebook groups — the M-Pesa angle is a strong, specific pitch here
- Talk to travel agencies, tour companies, and hostels about recommending us to their customers

**Step 2 — at launch:**
- Run small, targeted Google ads on searches like "esim kenya" — these are cheaper to advertise on than big general travel keywords
- Short, simple videos for Instagram/TikTok showing "landed and connected in 30 seconds" — this product is very visual and demo-friendly
- A simple "refer a friend, you both get a discount" offer — doesn't need to be fancy or automatic at first, even a manual promo code works to start

**Step 3 — once we have real customers and real data:**
- Build the referral program out properly
- Spend more on ads, but only once we actually know what it costs us to get one customer — guessing a budget before that is a waste
- Keep expanding the destination-specific content to the countries that are actually selling well

**One important gap:** we currently have **no way to measure any of this** — no tracking is set up to tell us how many people visit the site or where they come from. This needs to be switched on before we spend a single dollar on advertising, or we won't know what's working.

---

## 8. What should happen next, in order

1. Decide the open questions in section 4 — these block almost everything else.
2. Turn on basic visitor tracking (cheap/free, quick to do).
3. Start the three real-account setups in section 3 — start M-Pesa early since it's the slowest.
4. Get a real logo made.
5. Confirm (or change again) the color direction once you've actually looked at the live site.
