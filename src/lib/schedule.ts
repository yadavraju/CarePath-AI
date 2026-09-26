/**
 * The deterministic schedule engine.
 *
 * "AI can parse and explain; only clinic-approved data changes medication
 * timing or dose." Nothing in this file calls a model, and nothing that calls a
 * model writes to the schedule.
 */
import { zonedInstant } from "./time";

export type ItemLike = {
  date: string;
  time: string;
  windowMinutes: number;
  status: "pending" | "confirmed" | "missed" | "superseded";
  snoozedUntil?: Date | null;
};

export type LiveState = "done" | "missed" | "due" | "snoozed" | "upcoming" | "later";

/** How many minutes before a dose the reminder fires. */
export const REMIND_BEFORE_MIN = 30;

export function dueAt(item: Pick<ItemLike, "date" | "time">, tz: string) {
  return zonedInstant(item.date, item.time, tz);
}

/** End of the clinic's confirmation window — after this, silence is a missed check-in. */
export function windowEnd(item: Pick<ItemLike, "date" | "time" | "windowMinutes">, tz: string) {
  return new Date(dueAt(item, tz).getTime() + item.windowMinutes * 60000);
}

export function liveState(item: ItemLike, now: Date, tz: string): LiveState {
  if (item.status === "confirmed") return "done";
  if (item.status === "missed") return "missed";
  const due = dueAt(item, tz).getTime();
  const end = windowEnd(item, tz).getTime();
  const t = now.getTime();
  if (item.snoozedUntil && item.snoozedUntil.getTime() > t && t < end) return "snoozed";
  if (t >= due - REMIND_BEFORE_MIN * 60000 && t <= end) return "due";
  if (t > end) return "missed";
  if (due - t <= 6 * 3600_000) return "upcoming";
  return "later";
}

/** Pending items whose window has closed without a confirmation. */
export function isOverdue(item: ItemLike, now: Date, tz: string) {
  return item.status === "pending" && now.getTime() > windowEnd(item, tz).getTime();
}
