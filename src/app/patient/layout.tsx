import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Phone, Stethoscope } from "lucide-react";
import { isDone } from "@/components/CareKind";
import { HelpNow } from "@/components/patient/HelpNow";
import { LanguagePicker } from "@/components/patient/LanguagePicker";
import { DemoGuide } from "@/components/DemoGuide";
import { AppShell, RailSection, type NavItem } from "@/components/shell/AppShell";
import { Dot } from "@/components/ui";
import { db } from "@/db";
import { careItems, patients, scheduleItems } from "@/db/schema";
import { CLINIC_TZ } from "@/lib/brand";
import { liveState } from "@/lib/schedule";
import { localDate } from "@/lib/time";
import { formatClock } from "@/lib/utils";
import { clinicNow, getViewer, requirePatient } from "@/server/context";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { patient, clinic, cycle } = await requirePatient();
  const viewer = await getViewer();
  const now = clinicNow(clinic);
  const today = localDate(now, CLINIC_TZ);

  const [doses, care] = await Promise.all([
    db
      .select()
      .from(scheduleItems)
      .where(and(eq(scheduleItems.cycleId, cycle.id), inArray(scheduleItems.date, [today])))
      .orderBy(asc(scheduleItems.time)),
    db.select().from(careItems).where(eq(careItems.patientId, patient.id)),
  ]);
  const pendingCare = care.filter((c) => !isDone(c.status, c.kind)).length;

  const nav: NavItem[] = [
    { href: "/patient", label: "Today", icon: "today", exact: true },
    { href: "/patient/care", label: "My care", icon: "guides", badge: pendingCare || undefined },
    { href: "/patient/plan", label: "Full plan", icon: "plan" },
  ];

  const [demoLead] = clinic.isDemo
    ? await db.select({ id: patients.id }).from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.isDemoLead, true)))
    : [];

  return (
    <AppShell
      overlay={clinic.isDemo && demoLead ? <DemoGuide mayaId={demoLead.id} /> : null}
      homeHref="/patient"
      workspaceLabel={clinic.name}
      nav={nav}
      topRight={
        <>
          <div className="hidden sm:block">
            <LanguagePicker value={patient.language} />
          </div>
          <HelpNow urgentLine={clinic.urgentLine} urgentLineLabel={clinic.urgentLineLabel} emergencyInstruction={clinic.emergencyInstruction} />
        </>
      }
      rail={
        <>
          <RailSection title="Today’s doses">
            {doses
              .filter((d) => d.status !== "superseded")
              .map((d) => {
                const s = liveState(d, now, CLINIC_TZ);
                return (
                  <div key={d.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
                    <Dot tone={s === "done" ? "teal" : s === "missed" ? "red" : s === "due" ? "amber" : "neutral"} className="h-2 w-2" />
                    <span className="w-[62px] shrink-0 font-display text-[12px] font-semibold text-ink-soft">{formatClock(d.time)}</span>
                    <span className={`truncate text-[12.5px] ${s === "done" ? "text-ink-faint line-through" : "text-ink"}`}>
                      {d.title}
                    </span>
                  </div>
                );
              })}
          </RailSection>
          <RailSection title="Your care team">
            <a href={`tel:${clinic.urgentLine.replace(/[^\d+]/g, "")}`} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-sunken/60">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <span>
                <span className="block font-display text-[12.5px] font-semibold text-ink">{clinic.urgentLine}</span>
                <span className="block text-[11.5px] text-ink-faint">{clinic.urgentLineLabel}</span>
              </span>
            </a>
          </RailSection>
        </>
      }
      railFooter={
        viewer?.staff ? (
          <Link href="/clinic" className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-display text-[12.5px] font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
            <Stethoscope className="h-4 w-4 text-navy" /> Switch to clinic view
          </Link>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
