"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLanguage } from "@/app/patient/actions";
import type { Language } from "@/db/schema";
import { LANGUAGES } from "@/lib/brand";

export function LanguagePicker({ value }: { value: Language }) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex h-9 items-center gap-1.5 rounded-full bg-raised px-3 ring-1 ring-line">
      <Languages className="h-3.5 w-3.5 text-ink-faint" />
      <span className="sr-only">Answer language</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => start(() => setLanguage(e.target.value as Language))}
        className="bg-transparent font-display text-[13px] font-semibold text-ink focus:outline-none"
      >
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
