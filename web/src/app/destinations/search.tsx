"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function DestinationsSearch({ initialQuery }: { initialQuery: string }) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.replace(value.trim() ? `/destinations?q=${encodeURIComponent(value.trim())}` : "/destinations");
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex items-center gap-2 rounded-full border border-outline bg-surface px-4 py-1">
      <span aria-hidden>🔎</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search country or region"
        className="flex-1 bg-transparent py-2.5 outline-none"
      />
      {value && (
        <button aria-label="Clear" onClick={() => setValue("")} className="text-muted">
          ✕
        </button>
      )}
    </div>
  );
}
