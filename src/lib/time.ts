/**
 * Clinic-local time helpers. Schedule items store a local date ("YYYY-MM-DD")
 * and a local clock time ("HH:MM"); everything that decides "is this due / is
 * this missed" converts through here so the answer never depends on the
 * server's own timezone.
 */

function partsIn(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Local calendar date in `tz`, as YYYY-MM-DD. */
export function localDate(date: Date, tz: string) {
  const p = partsIn(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Offset of `tz` from UTC at `date`, in minutes. */
function offsetMinutes(date: Date, tz: string) {
  const p = partsIn(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** The instant at which local `YYYY-MM-DD HH:MM` occurs in `tz`. */
export function zonedInstant(isoDate: string, hhmm: string, tz: string) {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const first = new Date(guess.getTime() - offsetMinutes(guess, tz) * 60000);
  // Re-check once to settle DST boundaries.
  return new Date(guess.getTime() - offsetMinutes(first, tz) * 60000);
}

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function weekdayLabel(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export function shortDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
