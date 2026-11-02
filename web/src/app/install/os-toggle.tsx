"use client";

import { useState } from "react";
import { installSteps } from "./steps";

// Both step lists render unconditionally and are only hidden with a CSS class, not excluded from
// the tree — so the full content is present in the server-rendered HTML for crawlers, and JS only
// toggles which one is visible for a human reader.
export function OsToggle() {
  const [os, setOs] = useState<"ios" | "android">("ios");

  return (
    <div>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setOs("ios")}
          className={`rounded-full px-5 py-2 font-bold ${os === "ios" ? "bg-primary text-primary-ink" : "border border-outline"}`}
        >
          📱 iPhone
        </button>
        <button
          onClick={() => setOs("android")}
          className={`rounded-full px-5 py-2 font-bold ${os === "android" ? "bg-primary text-primary-ink" : "border border-outline"}`}
        >
          🤖 Android
        </button>
      </div>

      {(["ios", "android"] as const).map((o) => (
        <ol key={o} className={o === os ? "mt-6 flex flex-col gap-4" : "hidden"}>
          {installSteps[o].map(([title, body], i) => (
            <li key={title} className="flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-outline text-sm font-bold">
                {i + 1}
              </span>
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      ))}
    </div>
  );
}
