/**
 * Protocol parsing — shared shape + the deterministic parser.
 *
 * The AI parser (src/lib/ai/protocol.ts) handles free-form clinic documents and
 * returns this same shape; this parser handles the structured line format and
 * is the offline fallback. Either way a human confirms the table before any of
 * it becomes a schedule.
 */
import { z } from "zod";
import { addDays } from "@/lib/time";

export const ParsedItemSchema = z.object({
  dayStart: z.number().int().min(1).max(40),
  dayEnd: z.number().int().min(1).max(40),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  kind: z.enum(["medication", "appointment", "task"]),
  title: z.string().min(1),
  dose: z.string().nullable(),
  instruction: z.string(),
  sourcePage: z.number().int().nullable(),
});

export const ParsedProtocolSchema = z.object({
  protocolName: z.string(),
  items: z.array(ParsedItemSchema),
  warnings: z.array(z.string()),
});

export type ParsedItem = z.infer<typeof ParsedItemSchema>;
export type ParsedProtocol = z.infer<typeof ParsedProtocolSchema>;

function to24h(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const APPOINTMENT_WORDS = /visit|appointment|ultrasound|monitoring|blood test|retrieval|transfer|consult/i;

export function parseProtocolText(text: string): ParsedProtocol {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  let protocolName = "";

  for (const line of lines) {
    const dayMatch = line.match(/^day\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*[|·:]\s*(.+)$/i);
    if (!dayMatch) {
      if (!protocolName && /protocol/i.test(line)) protocolName = line.replace(/\s*[—-]\s*sample.*$/i, "").trim();
      continue;
    }
    const dayStart = Number(dayMatch[1]);
    const dayEnd = Number(dayMatch[2] ?? dayMatch[1]);
    const parts = dayMatch[3].split("|").map((p) => p.trim());
    if (parts.length < 3) {
      warnings.push(`Couldn't read: "${line}"`);
      continue;
    }
    const [rawTime, title, rawDose = "-", instruction = "", rawPage = ""] = parts;
    const time = to24h(rawTime);
    if (!time) {
      warnings.push(`No valid time on: "${line}"`);
      continue;
    }
    if (dayEnd < dayStart) {
      warnings.push(`Day range runs backwards on: "${line}"`);
      continue;
    }
    const page = rawPage.match(/(\d+)/);
    items.push({
      dayStart,
      dayEnd,
      time,
      kind: APPOINTMENT_WORDS.test(title) ? "appointment" : "medication",
      title,
      dose: rawDose === "-" || rawDose === "" ? null : rawDose,
      instruction,
      sourcePage: page ? Number(page[1]) : null,
    });
  }

  if (items.length === 0) warnings.push("No schedule lines found. Expected: Day 1-10 | 19:30 | Name | Dose | Instruction | p.1");
  return { protocolName: protocolName || "Imported protocol", items, warnings };
}

/** Expand day ranges into one row per dose, dated from the cycle's Day 1. */
export function expandItems(items: ParsedItem[], startDate: string) {
  return items.flatMap((it) =>
    Array.from({ length: it.dayEnd - it.dayStart + 1 }, (_, i) => {
      const day = it.dayStart + i;
      return {
        cycleDay: day,
        date: addDays(startDate, day - 1),
        time: it.time,
        kind: it.kind,
        title: it.title,
        dose: it.dose,
        instruction: it.instruction,
        sourcePage: it.sourcePage,
        windowMinutes: it.kind === "appointment" ? 120 : 60,
      };
    }),
  );
}
