/**
 * Shared primitives. Class strings are complete literals so Tailwind's scanner
 * keeps them (never compose utilities from fragments at runtime).
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

export const SHELL = "mx-auto w-full max-w-6xl px-5 sm:px-8";

export const BTN =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 h-11 text-[15px] font-semibold text-white font-display " +
  "transition-all duration-200 hover:-translate-y-px hover:bg-ink/90 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2";

export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-full bg-transparent px-5 h-11 text-[15px] font-semibold text-ink font-display " +
  "ring-1 ring-line transition-colors duration-200 hover:bg-raised hover:ring-ink/25 disabled:opacity-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export const BTN_SM =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 h-8 text-[13px] font-semibold font-display transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30";

export const CARD = "rounded-2xl bg-raised ring-1 ring-line";

export const EYEBROW = "font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint";

export const INPUT =
  "w-full rounded-xl bg-raised px-3.5 h-11 text-[15px] text-ink ring-1 ring-line placeholder:text-ink-faint " +
  "focus:outline-none focus:ring-2 focus:ring-teal/50";

type Tone = "teal" | "red" | "amber" | "neutral" | "navy";

const CHIP: Record<Tone, string> = {
  teal: "bg-teal-soft text-teal-deep",
  red: "bg-alert-soft text-alert",
  amber: "bg-caution-soft text-caution",
  neutral: "bg-sunken text-ink-soft",
  navy: "bg-navy text-white",
};

export function Chip({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[12px] font-semibold whitespace-nowrap", CHIP[tone], className)}>
      {children}
    </span>
  );
}

const DOT: Record<Tone, string> = {
  teal: "bg-teal",
  red: "bg-alert animate-pulse-ring",
  amber: "bg-caution",
  neutral: "bg-ink-faint",
  navy: "bg-navy",
};

export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", DOT[tone], className)} />;
}

export function Wordmark({ href = "/", small = false }: { href?: string; small?: boolean }) {
  return (
    <Link href={href} className="flex w-fit items-center gap-2" aria-label="Aama home">
      <LogoMark className={small ? "h-6 w-6" : "h-7 w-7"} />
      <span className={cn("font-display font-bold tracking-[-0.02em] text-ink", small ? "text-[15px]" : "text-[17px]")}>Aama</span>
    </Link>
  );
}

/** A plus inside a ring — the "clinic-approved" mark from the build plan cover. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="#173a4f" />
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="#7fd6cc" strokeWidth="1.5" />
      <path d="M16 10v12M10 16h12" stroke="#7fd6cc" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function SourceTag({ title, page, version }: { title: string; page: number; version: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-teal-soft/70 px-1.5 py-0.5 font-display text-[11.5px] font-semibold text-teal-deep">
      {title} · p.{page} · v{version}
    </span>
  );
}
