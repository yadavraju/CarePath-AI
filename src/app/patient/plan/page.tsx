import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { Chip, EYEBROW } from "@/components/ui";
import { db } from "@/db";
import { scheduleItems } from "@/db/schema";
import { CLINIC_TZ } from "@/lib/brand";
import { liveState } from "@/lib/schedule";
import { localDate, shortDate, weekdayLabel } from "@/lib/time";
import { formatClock } from "@/lib/utils";
import { clinicNow, requirePatient } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function Plan() {
  const { clinic, cycle } = await requirePatient();
  const now = clinicNow(clinic);
  const today = localDate(now, CLINIC_TZ);
  const items = await db
    .select()
    .from(scheduleItems)
    .where(eq(scheduleItems.cycleId, cycle.id))
    .orderBy(asc(scheduleItems.date), asc(scheduleItems.time));
  const byDay = new Map<number, typeof items>();
  for (const i of items.filter((x) => x.status !== "superseded")) {
    byDay.set(i.cycleDay, [...(byDay.get(i.cycleDay) ?? []), i]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-8">
      <Link href="/patient" className="inline-flex items-center gap-1 font-display text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Today
      </Link>
      <p className={`${EYEBROW} mt-4`}>{cycle.protocolName} · schedule v{cycle.scheduleVersion}</p>
      <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-ink">Your full plan</h1>
      <p className="mt-1 text-[14px] text-ink-soft">Issued by your care team. Only they can change it.</p>
      <div className="mt-6 space-y-3">
        {[...byDay.entries()].map(([day, rows]) => {
          const date = rows[0].date;
          const isToday = date === today;
          return (
            <section key={day} className={`rounded-2xl p-4 ring-1 ${isToday ? "bg-raised ring-teal/40" : "bg-raised/70 ring-line"}`}>
              <h2 className="flex items-center gap-2 font-display text-[14px] font-semibold text-ink">
                Day {day} · {weekdayLabel(date)}, {shortDate(date)} {isToday && <Chip tone="teal">Today</Chip>}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {rows.map((i) => {
                  const s = liveState(i, now, CLINIC_TZ);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-2 text-[14px] text-ink">
                      <span className="w-[72px] shrink-0 font-display font-semibold text-ink-soft">{formatClock(i.time)}</span>
                      <span className="flex-1">
                        {i.title} {i.dose}
                      </span>
                      {i.changedInVersion && <Chip tone="amber">Changed v{i.scheduleVersion}</Chip>}
                      {s === "done" && <Chip tone="teal">Done</Chip>}
                      {s === "missed" && <Chip tone="red">Not confirmed</Chip>}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
