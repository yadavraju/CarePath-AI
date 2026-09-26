import Link from "next/link";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { ArrowLeftRight, BotOff, HeartPulse, Plus } from "lucide-react";
import { AutoRefresh } from "@/components/clinic/AutoRefresh";
import { DemoGuide } from "@/components/DemoGuide";
import { AppShell, RailSection, type NavItem } from "@/components/shell/AppShell";
import { Dot } from "@/components/ui";
import { db } from "@/db";
import { alerts, clinics, patients, staff } from "@/db/schema";
import { getViewer, requireStaff } from "@/server/context";
import { sweepMissed } from "@/server/reminders";
import { switchClinic } from "./actions";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const { clinic } = await requireStaff();
  const viewer = await getViewer();
  await sweepMissed(clinic);

  const open = await db
    .select({ alert: alerts, alias: patients.alias })
    .from(alerts)
    .innerJoin(patients, eq(alerts.patientId, patients.id))
    .where(and(eq(alerts.clinicId, clinic.id), ne(alerts.status, "resolved")))
    .orderBy(asc(alerts.createdAt));
  // One row per patient, most severe alert first.
  const byPatient = new Map<string, (typeof open)[number]>();
  for (const row of [...open].sort((a, b) => (a.alert.severity === "red" ? -1 : 0) - (b.alert.severity === "red" ? -1 : 0))) {
    if (!byPatient.has(row.alert.patientId)) byPatient.set(row.alert.patientId, row);
  }
  const needs = [...byPatient.values()];
  const redCount = needs.filter((n) => n.alert.severity === "red" && n.alert.status === "open").length;

  const nav: NavItem[] = [
    { href: "/clinic", label: "Copilot", icon: "copilot", exact: true },
    { href: "/clinic/attention", label: "Needs attention", icon: "queue", badge: redCount || undefined },
    { href: "/clinic/patients", label: "Patients", icon: "patients" },
    { href: "/clinic/library", label: "Care library", icon: "guides" },
    { href: "/clinic/protocols", label: "Protocols & guides", icon: "protocols" },
    { href: "/clinic/settings", label: "Controls", icon: "controls" },
  ];


  // Other clinics this login belongs to, for the workspace switcher.
  const otherClinics = viewer
    ? await db
        .select({ id: clinics.id, name: clinics.name, isDemo: clinics.isDemo })
        .from(staff)
        .innerJoin(clinics, eq(staff.clinicId, clinics.id))
        .where(and(eq(staff.clerkUserId, viewer.userId), ne(clinics.id, clinic.id)))
        .orderBy(desc(staff.createdAt))
    : [];
  // Offer clinic sign-up only to people exploring the sample who have no clinic of their own yet.
  const offerSetup = clinic.isDemo && !otherClinics.some((c) => !c.isDemo);

  const [demoLead] = clinic.isDemo
    ? await db.select({ id: patients.id }).from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.isDemoLead, true)))
    : [];

  return (
    <AppShell
      overlay={clinic.isDemo && demoLead ? <DemoGuide mayaId={demoLead.id} /> : null}
      homeHref="/clinic"
      workspaceLabel={clinic.name}
      nav={nav}
      topRight={
        // Only surfaced when it changes behaviour: paused AI routes every question to staff.
        clinic.aiPaused ? (
          <Link href="/clinic/settings" className="hidden items-center gap-1.5 rounded-full bg-caution-soft px-3 py-1 font-display text-[12px] font-semibold text-caution sm:inline-flex">
            <BotOff className="h-3.5 w-3.5" /> AI answers paused
          </Link>
        ) : null
      }
      rail={
        <RailSection title={needs.length ? `Needs attention · ${needs.length}` : "Needs attention"}>
          {needs.length === 0 && <p className="px-2.5 py-1.5 text-[12.5px] text-ink-faint">No open exceptions.</p>}
          {needs.map(({ alert, alias }) => (
            <Link
              key={alert.patientId}
              href={`/clinic/patients/${alert.patientId}`}
              className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sunken/60"
            >
              <Dot tone={alert.severity === "red" ? "red" : "amber"} className="mt-1.5 h-2 w-2" />
              <span className="min-w-0">
                <span className="block truncate font-display text-[13px] font-semibold text-ink">{alias}</span>
                <span className="block truncate text-[12px] text-ink-soft">{alert.reason}</span>
              </span>
            </Link>
          ))}
        </RailSection>
      }
      railFooter={
        <div className="space-y-0.5">
          {otherClinics.filter((c) => clinic.isDemo || !c.isDemo).map((c) => (
            <form key={c.id} action={switchClinic.bind(null, c.id)}>
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-display text-[12.5px] font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-ink-faint" /> <span className="truncate">Switch to {c.name}</span>
              </button>
            </form>
          ))}
          {offerSetup && (
            <Link href="/onboarding?setup=1#clinic" className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-display text-[12.5px] font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
              <Plus className="h-4 w-4 text-ink-faint" /> Set up your own clinic
            </Link>
          )}
          {viewer?.patient && (
            <Link href="/patient" className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-display text-[12.5px] font-semibold text-ink-soft hover:bg-sunken hover:text-ink">
              <HeartPulse className="h-4 w-4 text-teal" /> Switch to patient view
            </Link>
          )}
        </div>
      }
    >
      <AutoRefresh everyMs={8000} />
      {children}
    </AppShell>
  );
}
