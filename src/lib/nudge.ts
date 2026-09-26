/**
 * Adherence nudge selector (AI job #5, kept deterministic on purpose).
 *
 * Picks one of three clinic-approved reminder wordings based on which one this
 * patient has confirmed fastest after. It may change WORDING only — the time,
 * medication and dose come from the schedule item and are inserted verbatim.
 */
import type { NudgeStyle } from "@/db/schema";

export type NudgeHistory = { style: NudgeStyle; minutesToConfirm: number | null }[];

export const NUDGE_STYLES: NudgeStyle[] = ["plain", "why", "checklist"];

export function selectNudgeStyle(history: NudgeHistory): { style: NudgeStyle; reason: string } {
  // Explore each style once before exploiting.
  for (const style of NUDGE_STYLES) {
    if (!history.some((h) => h.style === style)) {
      return { style, reason: `Trying the "${style}" wording — not used yet this cycle.` };
    }
  }
  let best: { style: NudgeStyle; score: number } | null = null;
  for (const style of NUDGE_STYLES) {
    const rows = history.filter((h) => h.style === style);
    // Missed confirmations count as a slow 180-minute response.
    const avg = rows.reduce((s, r) => s + (r.minutesToConfirm ?? 180), 0) / rows.length;
    if (!best || avg < best.score) best = { style, score: avg };
  }
  return {
    style: best!.style,
    reason: `"${best!.style}" wording gets the fastest confirmations (avg ${Math.round(best!.score)} min).`,
  };
}

export function nudgeText(style: NudgeStyle, item: { title: string; dose: string | null; timeLabel: string }) {
  const med = item.dose ? `${item.title} ${item.dose}` : item.title;
  switch (style) {
    case "why":
      return `${med} at ${item.timeLabel}. Taking it on time keeps your stimulation on the plan your clinic set.`;
    case "checklist":
      return `${item.timeLabel}: ${med}. Wash hands · prepare pen · inject · tap Done.`;
    default:
      return `Time for ${med} at ${item.timeLabel}.`;
  }
}
