export const installSteps = {
  ios: [
    ["Check your iPhone is compatible", "You need an eSIM-capable, carrier-unlocked iPhone (XS/XR or newer) on iOS 12.1 or later."],
    ["Connect to Wi-Fi", "You need an internet connection to download the eSIM."],
    ["Open Settings › Cellular", 'Tap "Add eSIM" (on some versions: "Add Cellular Plan").'],
    [
      "Scan the QR code",
      'Tap "Use QR Code" and scan the QR from your order. Bought on this phone? Choose "Enter Details Manually" and paste the SM-DP+ address and activation code.',
    ],
    ["Label your plan", 'Name it something like "Travel data" so it\'s easy to find.'],
    ["Turn on data roaming when you land", 'Settings › Cellular › your travel plan › enable "Data Roaming", and set it as your Cellular Data line.'],
  ],
  android: [
    ["Check your phone is compatible", "You need an eSIM-capable, unlocked Android phone (e.g. Pixel 3+, Galaxy S20+)."],
    ["Connect to Wi-Fi", "You need an internet connection to download the eSIM."],
    [
      "Open Settings › Network & internet › SIMs",
      'Tap "Add eSIM" or "+". Menu names vary slightly by brand (Samsung: Connections › SIM manager › Add eSIM).',
    ],
    [
      "Scan the QR code",
      'Choose "Scan QR code" and scan the QR from your order. Bought on this phone? Choose "Need help?" › "Enter it manually" and paste the activation string.',
    ],
    ["Confirm the download", 'Tap "Continue" / "Activate" when prompted.'],
    ["Turn on data roaming when you land", 'Set the travel eSIM as your mobile data SIM and enable "Roaming" for it.'],
  ],
} as const;
