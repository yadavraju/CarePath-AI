/**
 * Static product mockups for the landing page — drawn from the build plan's
 * own screens, rendered as real markup rather than screenshots so they stay
 * crisp and match the live app's tokens.
 */
import { Mic, Phone, Send } from "lucide-react";
import { Chip, Dot } from "@/components/ui";

export function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[360px] rounded-[2.2rem] bg-navy p-2.5 shadow-[0_30px_80px_-30px_rgba(23,58,79,0.55)]">
      <div className="overflow-hidden rounded-[1.8rem] bg-canvas">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="font-display text-[13px] font-bold text-ink">Aama</span>
          <span className="font-display text-[12px] text-ink-soft">Tuesday · Day 7</span>
        </div>
        <div className="mx-3 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl bg-raised p-3 ring-1 ring-line">
            <Dot tone="teal" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[13px] font-semibold text-ink">7:30 PM · Gonal-F 225 IU</p>
              <p className="text-[11.5px] text-ink-soft">Lower abdomen, same time each evening</p>
            </div>
            <Chip tone="teal">Upcoming</Chip>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-raised p-3 ring-1 ring-line">
            <Dot tone="teal" />
            <p className="flex-1 font-display text-[13px] font-semibold text-ink">Watch the Menopur mixing guide</p>
            <span className="text-[11.5px] text-ink-soft">2 min</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-caution-soft/60 p-3 ring-1 ring-caution/20">
            <Dot tone="amber" />
            <p className="flex-1 font-display text-[13px] font-semibold text-ink">Tomorrow’s schedule changed</p>
            <Chip tone="amber">Review</Chip>
          </div>
        </div>
        <div className="m-3 rounded-2xl bg-raised p-3 ring-1 ring-line">
          <p className="font-display text-[12px] font-semibold text-ink-soft">Ask the clinic companion</p>
          <p className="mt-2 ml-auto w-fit rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[12.5px] text-white">Can I take this late?</p>
          <div className="mt-2 rounded-2xl rounded-bl-md bg-canvas p-3 text-[12.5px] leading-relaxed text-ink">
            I can’t change your timing. Your clinic’s missed-dose guide says to call the on-call line for time-sensitive
            medication questions.
            <span className="mt-1.5 block font-display text-[11px] font-semibold text-teal-deep">Missed-Dose Guide · p.3 · v2</span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-full bg-canvas px-3 py-2 ring-1 ring-line">
            <span className="flex-1 text-[12px] text-ink-faint">Ask about your plan…</span>
            <Mic className="h-4 w-4 text-ink-faint" />
            <Send className="h-4 w-4 text-ink" />
          </div>
        </div>
        <div className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-full bg-alert py-2.5 font-display text-[12.5px] font-semibold text-white">
          <Phone className="h-3.5 w-3.5" /> Help now
        </div>
      </div>
    </div>
  );
}

export function DashboardMock() {
  const rows = [
    { tone: "red" as const, name: "Patient A", reason: "Urgent symptom phrase detected", right: <Chip tone="red">Review now</Chip> },
    { tone: "amber" as const, name: "Patient B", reason: "Medication not confirmed", right: <span className="text-[13px] text-ink-soft">42 min</span> },
    { tone: "amber" as const, name: "Patient C", reason: "Question not supported by protocol", right: <span className="text-[13px] text-ink-soft">New</span> },
    { tone: "teal" as const, name: "15 patients", reason: "No open exception", right: <Chip tone="teal">On track</Chip> },
  ];
  return (
    <div className="rounded-3xl bg-raised p-5 ring-1 ring-line shadow-[0_24px_60px_-30px_rgba(51,48,42,0.35)]">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <span className="font-display text-[13px] font-semibold text-ink-soft">Active cycles · 18</span>
        <span className="font-display text-[12px] text-ink-faint">Updated 8:42 AM</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
          <Dot tone={r.tone} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[14px] font-semibold text-ink">{r.name}</p>
            <p className="text-[13px] text-ink-soft">{r.reason}</p>
          </div>
          {r.right}
        </div>
      ))}
    </div>
  );
}

/** The clinician half of the hero: a slice of the nurse's queue. */
export function MiniQueueMock() {
  const rows = [
    { tone: "red" as const, name: "Maya R.", reason: "Urgent symptom — breathing", right: "Review now" },
    { tone: "amber" as const, name: "Priya S.", reason: "Cetrotide not confirmed", right: "42 min" },
    { tone: "amber" as const, name: "Ana G.", reason: "Question not in the guides", right: "New" },
  ];
  return (
    <div className="w-72 rounded-2xl bg-raised p-3.5 ring-1 ring-line shadow-[0_24px_60px_-24px_rgba(23,58,79,0.45)]">
      <p className="flex items-center justify-between px-1 font-display text-[12px] font-semibold text-ink-soft">
        <span>Nurse queue · Needs you</span>
        <span className="rounded-full bg-alert px-1.5 text-[10.5px] font-bold text-white">1</span>
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li key={r.name} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${r.tone === "red" ? "bg-alert-soft/70" : ""}`}>
            <Dot tone={r.tone} className="h-2 w-2" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[12.5px] font-semibold text-ink">{r.name}</span>
              <span className="block truncate text-[11.5px] text-ink-soft">{r.reason}</span>
            </span>
            <span className={`text-[11px] font-semibold ${r.tone === "red" ? "text-alert" : "text-ink-faint"}`}>{r.right}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
