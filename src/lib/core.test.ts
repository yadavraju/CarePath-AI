import { describe, expect, it } from "vitest";
import { DEMO_DOCUMENTS, DEMO_PROTOCOL_TEXT } from "@/demo/content";
import { selectNudgeStyle } from "./nudge";
import { expandItems, parseProtocolText } from "./protocol/parse";
import { chunkDocument } from "./retrieval/chunk";
import { buildTsQuery } from "./retrieval/query";
import { liveState } from "./schedule";
import { addDays, localDate, zonedInstant } from "./time";
import { lockTokens, unlockTokens } from "./translate/lock";

const TZ = "America/Los_Angeles";

describe("time", () => {
  it("resolves a local clock time to the right instant across DST", () => {
    expect(zonedInstant("2026-07-01", "19:30", TZ).toISOString()).toBe("2026-07-02T02:30:00.000Z");
    expect(zonedInstant("2026-12-01", "19:30", TZ).toISOString()).toBe("2026-12-02T03:30:00.000Z");
  });
  it("computes the local date, not the UTC date", () => {
    expect(localDate(new Date("2026-09-27T03:00:00Z"), TZ)).toBe("2026-09-26");
  });
  it("adds days across month ends", () => expect(addDays("2026-09-28", 5)).toBe("2026-10-03"));
});

describe("schedule engine", () => {
  const item = { date: "2026-09-26", time: "19:30", windowMinutes: 60, status: "pending" as const };
  const at = (hhmm: string) => zonedInstant("2026-09-26", hhmm, TZ);
  it.each([
    ["12:00", "later"],
    ["15:00", "upcoming"],
    ["19:05", "due"],
    ["20:25", "due"],
    ["20:31", "missed"],
  ])("at %s the item is %s", (t, state) => expect(liveState(item, at(t), TZ)).toBe(state));
  it("a confirmed item stays done", () => expect(liveState({ ...item, status: "confirmed" }, at("23:00"), TZ)).toBe("done"));
});

describe("protocol parser", () => {
  it("parses the sample protocol", () => {
    const p = parseProtocolText(DEMO_PROTOCOL_TEXT);
    expect(p.warnings).toEqual([]);
    expect(p.items).toHaveLength(6);
    expect(p.items[0]).toMatchObject({ dayStart: 1, dayEnd: 10, time: "19:30", title: "Gonal-F", dose: "225 IU", sourcePage: 1 });
    expect(p.items[3]).toMatchObject({ kind: "appointment", dose: null });
  });
  it("expands day ranges into dated rows", () => {
    const rows = expandItems(parseProtocolText(DEMO_PROTOCOL_TEXT).items, "2026-09-20");
    expect(rows.filter((r) => r.title === "Cetrotide").map((r) => r.date)).toEqual([
      "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29",
    ]);
  });
  it("warns instead of guessing on unreadable lines", () => {
    const p = parseProtocolText("Day 3 | whenever | Gonal-F | 225 IU | x | p.1");
    expect(p.items).toHaveLength(0);
    expect(p.warnings[0]).toMatch(/No valid time/);
  });
  it("accepts 12-hour times", () => {
    expect(parseProtocolText("Day 2 | 7:30 PM | Menopur | 75 IU | mix | p.3").items[0].time).toBe("19:30");
  });
});

describe("chunking", () => {
  it("keeps page numbers for citations", () => {
    const { chunks, pageCount } = chunkDocument(DEMO_DOCUMENTS[1].text);
    expect(pageCount).toBe(3);
    expect(chunks.find((c) => c.heading === "If you are late or miss a dose")?.page).toBe(3);
  });
});

describe("retrieval query", () => {
  it("drops generic words so they are not evidence", () => {
    expect(buildTsQuery("Is coffee okay during stimulation?")).toBe("coffee:* | caffeine:*");
  });
  it("does not prefix-match short words", () => {
    expect(buildTsQuery("herbal tea")).toBe("herbal:* | tea");
  });
  it("returns null when nothing is searchable", () => expect(buildTsQuery("hi there")).toBeNull());
});

describe("translation locking", () => {
  const text = "Take Gonal-F 150 IU at 7:30 PM on Day 8. Store below 77°F for up to 28 days. Call (555) 010-4477.";
  it("locks medication names, doses, times and phone numbers", () => {
    const { masked, tokens } = lockTokens(text);
    expect(tokens).toEqual(expect.arrayContaining(["Gonal-F", "150 IU", "7:30 PM", "Day 8", "77°F", "28 days", "(555) 010-4477"]));
    expect(masked).not.toMatch(/Gonal|150|7:30|4477/);
  });
  it("round-trips a faithful translation", () => {
    const { masked, tokens } = lockTokens(text);
    expect(unlockTokens(masked.replace("Take", "Tome"), tokens)).toBe(text.replace("Take", "Tome"));
  });
  it("rejects a translation that dropped or duplicated a lock", () => {
    const { masked, tokens } = lockTokens(text);
    expect(unlockTokens(masked.replace("⟦1⟧", ""), tokens)).toBeNull();
    expect(unlockTokens(masked.replace("⟦1⟧", "⟦0⟧"), tokens)).toBeNull();
  });
});

describe("nudge selector", () => {
  it("explores unused styles first", () => {
    expect(selectNudgeStyle([{ style: "plain", minutesToConfirm: 5 }]).style).toBe("why");
  });
  it("then picks the fastest style, counting misses as slow", () => {
    const history = [
      { style: "plain" as const, minutesToConfirm: 30 },
      { style: "why" as const, minutesToConfirm: 4 },
      { style: "why" as const, minutesToConfirm: null },
      { style: "checklist" as const, minutesToConfirm: 12 },
    ];
    expect(selectNudgeStyle(history).style).toBe("checklist");
  });
});
