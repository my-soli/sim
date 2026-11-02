export interface Faq {
  q: string;
  a: string;
  group: string;
}

export const allFaqs: Faq[] = [
  {
    q: "What is an eSIM?",
    a: "An eSIM is a SIM that is built into your phone. Instead of swapping a plastic card, you download a data plan by scanning a QR code, so you can switch on local data the moment you land.",
    group: "Getting started",
  },
  {
    q: "Is my phone compatible?",
    a: "Most phones from around 2018 onward support eSIM (for example iPhone XS/XR and newer, Google Pixel 3 and newer, and recent Samsung Galaxy S and Z models). Your phone must also be carrier-unlocked. Check your phone's settings or your manufacturer's website to be sure.",
    group: "Getting started",
  },
  {
    q: "How do I get my eSIM after paying?",
    a: "As soon as your payment is confirmed we prepare your eSIM. Your QR code and manual activation details appear on the order page and stay available under My eSIMs.",
    group: "Getting started",
  },
  {
    q: "Can I install it on the phone I'm buying on?",
    a: "Yes. You can't scan a QR code on the same screen, so use the manual details (SM-DP+ address and activation code) instead. If you're buying on a computer, scan the QR with your phone's camera.",
    group: "Getting started",
  },
  {
    q: "How do I pay?",
    a: "Pay by card through Stripe, or with M-Pesa. For M-Pesa, enter your phone number and approve the PIN prompt that arrives on your phone. This works even if you're browsing on a computer.",
    group: "Payments",
  },
  {
    q: "Can I make calls and send texts?",
    a: "Our plans are built around mobile data and don't include calls. Some plans can also receive SMS, and those are marked with an SMS badge on the plan list. Keep your regular SIM active for your usual number, and use apps like WhatsApp for calls and messages over data.",
    group: "Using your eSIM",
  },
  {
    q: "How do I check how much data I have left?",
    a: "Open My eSIMs to see your data used and remaining, and when each plan expires. Usage figures update every few hours, so they aren't real-time.",
    group: "Using your eSIM",
  },
  {
    q: "Can I top up?",
    a: "Yes. In My eSIMs, tap Top up on a plan to see the available plans for that destination and buy more data.",
    group: "Using your eSIM",
  },
  {
    q: "What if my eSIM doesn't arrive?",
    a: "If we can't deliver your eSIM you'll be refunded. If something else goes wrong, contact support with your order details and we'll help.",
    group: "Payments",
  },
];
