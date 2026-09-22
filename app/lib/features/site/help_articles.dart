import 'package:flutter/material.dart';

/// One help-centre article. `sections` are (heading, body) pairs rendered under the intro.
class HelpArticle {
  const HelpArticle({
    required this.slug,
    required this.category,
    required this.icon,
    required this.title,
    required this.excerpt,
    required this.intro,
    required this.sections,
  });

  final String slug, category, title, excerpt, intro;
  final IconData icon;
  final List<(String heading, String body)> sections;

  /// Rough estimate (200 words/min) so cards can show a read time like a normal article index.
  int get minutesRead {
    final words = (intro + sections.map((s) => '${s.$1} ${s.$2}').join(' ')).split(RegExp(r'\s+')).length;
    return (words / 200).ceil().clamp(1, 30);
  }
}

const helpCategories = ['Getting started', 'Buying & payments', 'Installing', 'Using your eSIM'];

const helpArticles = [
  HelpArticle(
    slug: 'what-is-an-esim',
    category: 'Getting started',
    icon: Icons.sim_card_outlined,
    title: 'What is an eSIM, and do I need one?',
    excerpt: 'How an eSIM differs from a physical SIM, and why travellers use one alongside their regular number.',
    intro:
        'An eSIM is a SIM built into your phone rather than a plastic card you insert. Instead of visiting a shop, you '
        'buy a plan online and activate it by scanning a QR code, or entering a short activation code by hand.',
    sections: [
      (
        'Do I still need my regular SIM?',
        'Yes. Our plans are travel data add-ons, not a phone-line replacement. Keep your usual SIM active for calls, '
            'texts and your phone number, and let the eSIM handle data while you travel.',
      ),
      (
        'What do I actually get when I buy a plan?',
        'A QR code and a matching SM-DP+ address and activation code, shown right after payment and saved in My eSIMs. '
            'Either one installs the same plan - the QR code is just a faster way to enter the same details.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'check-compatibility',
    category: 'Getting started',
    icon: Icons.phonelink_setup,
    title: 'Is my phone compatible with eSIM?',
    excerpt: 'What to check before you buy: eSIM support and carrier lock, and where to find both settings.',
    intro:
        'Two things need to be true: your phone model needs to support eSIM, and it needs to be carrier-unlocked. '
        'A phone tied to one carrier usually can\'t add a second, independent data plan.',
    sections: [
      (
        'Phones that typically support eSIM',
        'iPhone XS/XR and newer, Google Pixel 3 and newer, and recent Samsung Galaxy S and Z models. This changes '
            'over time, so check your exact model if you\'re not sure.',
      ),
      (
        'How to check on your phone',
        'iPhone: Settings › General › About, and look for an "EID" entry - if it\'s there, your phone supports eSIM. '
            'Android: Settings › About phone, or search your settings for "eSIM". For carrier lock, your carrier or '
            'your phone\'s manufacturer support page can confirm.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'choosing-a-plan',
    category: 'Getting started',
    icon: Icons.travel_explore,
    title: 'How to choose the right data plan',
    excerpt: 'Balancing data amount, validity days, and single-country vs regional plans.',
    intro:
        'Every plan lists three things: how much data it includes, how many days it stays valid for, and which '
        'country or region it covers.',
    sections: [
      (
        'Single-country or regional?',
        'If your trip stays in one country, a single-country plan is usually cheaper. If you\'re crossing borders '
            '(say, a Europe trip touching three countries), a regional plan covering all of them saves you from '
            'buying separately for each stop.',
      ),
      (
        'How much data to pick',
        'Messaging and browsing use very little data. Streaming video or video calls use a lot more. If you\'re '
            'mostly navigating and messaging, a smaller plan often covers a week comfortably; heavier use calls for '
            'a bigger one.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'ways-to-pay',
    category: 'Buying & payments',
    icon: Icons.payments_outlined,
    title: 'Ways to pay: card and M-Pesa',
    excerpt: 'Both payment methods work the same on mobile and web, and on any device you\'re browsing from.',
    intro: 'You can pay by card through Stripe, or with M-Pesa. Both are available on every plan, on mobile and on web.',
    sections: [
      (
        'Card payments',
        'Card payments are handled by Stripe\'s secure checkout. We never see or store your card details ourselves.',
      ),
      (
        'M-Pesa payments',
        'Enter your M-Pesa number at checkout and approve the prompt on your phone. This works even if you\'re '
            'buying from a computer - the prompt still goes to your phone, not the device you\'re browsing on. See '
            '"Paying with M-Pesa, step by step" for the full walkthrough.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'mpesa-step-by-step',
    category: 'Buying & payments',
    icon: Icons.phone_android,
    title: 'Paying with M-Pesa, step by step',
    excerpt: 'What happens after you enter your number, and what to do if the prompt doesn\'t arrive.',
    intro:
        'M-Pesa checkout uses an STK push: a PIN prompt sent straight to your phone, independent of whatever device '
        'you used to check out.',
    sections: [
      (
        'The steps',
        '1) At checkout, choose M-Pesa and enter your phone number. 2) A PIN prompt arrives on that phone within a '
            'few seconds. 3) Approve it with your M-Pesa PIN. 4) The page you checked out on updates automatically '
            'once payment is confirmed - you don\'t need to refresh anything.',
      ),
      (
        'If the prompt doesn\'t arrive',
        'Double-check the number you entered, and make sure that phone has signal. You can try again from the same '
            'checkout page. If you were charged but the order doesn\'t update, contact us with your phone number and '
            'the time of the charge.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'installing-your-esim',
    category: 'Installing',
    icon: Icons.qr_code_2,
    title: 'Installing your eSIM from the QR code',
    excerpt: 'The normal path: scan the QR with the phone you want the plan on.',
    intro:
        'After payment, your order page shows a QR code plus the same details written out (SM-DP+ address and '
        'activation code). Scanning the QR is the fastest way to install.',
    sections: [
      (
        'iPhone',
        'Settings › Cellular (or Mobile Data) › Add eSIM › Use QR Code, then scan. Full step-by-step: see the '
            'install guide linked below.',
      ),
      (
        'Android',
        'Settings › Network & internet › SIMs › Add eSIM › Scan QR code (menu names vary slightly by brand). Full '
            'step-by-step: see the install guide linked below.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'buying-and-installing-on-the-same-phone',
    category: 'Installing',
    icon: Icons.smartphone,
    title: 'Buying and installing on the same phone',
    excerpt: 'You can\'t scan your own screen - here\'s the manual alternative.',
    intro:
        'If you bought your plan on the same phone you want to install it on, you can\'t point its camera at its own '
        'screen. Use the manual entry option instead - it installs the exact same plan as scanning would.',
    sections: [
      (
        'How',
        'On your order page, copy the SM-DP+ address and the activation code (each has a copy button). Then, '
            'instead of "Scan QR code", choose "Enter details manually" in your phone\'s eSIM setup screen, and paste '
            'the two values in.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'checking-usage-and-expiry',
    category: 'Using your eSIM',
    icon: Icons.data_usage,
    title: 'Checking your data usage and expiry',
    excerpt: 'Where to see what\'s left, and why the number doesn\'t update instantly.',
    intro:
        'Open My eSIMs to see each plan\'s data used, data remaining, and expiry date, all in one place.',
    sections: [
      (
        'Why usage isn\'t real-time',
        'Our provider refreshes usage figures every few hours, not the instant you use data. If you\'ve just used '
            'a large amount, give it a little time before the number updates.',
      ),
      (
        'When the validity clock starts',
        'Depends on the plan: some start counting down the moment you install the profile, others only start once '
            'you actually connect to a network abroad. Each plan says which on its listing and on your order page.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'topping-up',
    category: 'Using your eSIM',
    icon: Icons.add_circle_outline,
    title: 'How to top up your eSIM',
    excerpt: 'Running low mid-trip? Add more data for the same destination.',
    intro: 'You can add more data to an existing trip without installing a second eSIM.',
    sections: [
      (
        'Steps',
        'Open My eSIMs, find the plan that\'s running low, and tap "Top up". That takes you to the plans for that '
            'destination, where you can buy more data the same way you bought the original plan.',
      ),
    ],
  ),
  HelpArticle(
    slug: 'refunds-and-failed-orders',
    category: 'Using your eSIM',
    icon: Icons.undo,
    title: 'Refunds and failed orders',
    excerpt: 'What happens if we can\'t deliver your eSIM, and how to reach us about anything else.',
    intro:
        'If your payment goes through but we\'re unable to deliver a working eSIM, you\'re refunded - you won\'t be '
        'left having paid for nothing.',
    sections: [
      (
        'Other refund requests',
        'Contact us with your order details and what happened. We look at these case by case, since it depends on '
            'things like whether the eSIM has already been installed and used.',
      ),
    ],
  ),
];
