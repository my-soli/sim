export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function dataLabel(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export const daysLabel = (days: number) => (days === 1 ? "1 day" : `${days} days`);

/** Regional indicator flag emoji for an ISO alpha-2 code; falls back to a globe for region codes. */
export function flagFor(code: string, regional = false): string {
  if (regional || code.length !== 2) return "🌍";
  const base = 0x1f1e6 - 0x41;
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(base + c.charCodeAt(0)))
    .join("");
}

/** Short label for when a plan's validity countdown starts (provider's activeType: 1 = install, 2 = connection). */
export const activeTypeLabel = (activeType: number) =>
  activeType === 2 ? "Countdown starts when you connect abroad" : "Countdown starts as soon as you install it";

export function expiryLabel(at: string | null): string {
  if (!at) return "";
  const diffMs = new Date(at).getTime() - Date.now();
  if (diffMs < 0) return "Expired";
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(diffMs / 3_600_000);
  return `Expires in ${hours}h`;
}
