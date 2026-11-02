"use client";

import { useRouter } from "next/navigation";

export function HeroSearch() {
  const router = useRouter();
  return (
    <form
      className="flex max-w-[560px] items-center gap-2 rounded-full bg-white/95 p-1.5 pl-5"
      onSubmit={(e) => {
        e.preventDefault();
        const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
        router.push(q ? `/destinations?q=${encodeURIComponent(q)}` : "/destinations");
      }}
    >
      <input
        name="q"
        placeholder="Where are you travelling to?"
        className="flex-1 bg-transparent py-3 text-ink outline-none placeholder:text-muted"
      />
      <button type="submit" className="rounded-full bg-primary px-5 py-3 font-bold text-primary-ink">
        Search
      </button>
    </form>
  );
}
