import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditEvents,
  careItems,
  cycles,
  documents,
  libraryItems,
  messages,
  patients,
  staff,
  type CareStatus,
  type Citation,
  type LibraryItem,
} from "@/db/schema";
import { LIBRARY } from "@/demo/library";
import { CLINIC_TZ } from "@/lib/brand";
import { addDays, daysBetween, localDate } from "@/lib/time";
import { retrieve } from "./retrieve";
import { signatureHash } from "./signature";


/** Plan rules: which library items a patient on cycle day `day` has, and how far along they are. */
function planFor(day: number, i: number, lead: boolean): { key: string; status: CareStatus; note?: string; dueIn?: number }[] {
  const plan: { key: string; status: CareStatus; note?: string; dueIn?: number }[] = [
    { key: "consent-ivf", status: "signed" },
    { key: "consent-ai", status: i % 7 === 3 ? "assigned" : "signed", dueIn: 0 },
    { key: "task-pharmacy", status: "completed" },
    { key: "task-sharps", status: day > 1 ? "completed" : "assigned" },
    { key: "video-injection", status: day > 1 || i % 2 ? "completed" : "assigned" },
    { key: "doc-meds", status: day > 2 ? "viewed" : "assigned" },
    { key: "consent-meds", status: lead || i % 5 === 0 ? "assigned" : "signed", dueIn: 1 },
    { key: "video-menopur", status: day > 1 ? "completed" : "viewed" },
    { key: "doc-symptoms", status: day > 4 && i % 3 ? "viewed" : "assigned" },
  ];
  if (day >= 4) plan.push({ key: "video-cetrotide", status: day >= 7 && !lead ? "completed" : lead ? "completed" : "assigned", dueIn: Math.max(0, 6 - day) });
  if (day >= 5) plan.push({ key: "doc-missed", status: lead ? "assigned" : i % 2 ? "viewed" : "assigned" });
  if (day >= 8) plan.push({ key: "video-trigger", status: "assigned", dueIn: 10 - day });
  if (day >= 8) plan.push({ key: "task-ride", status: i % 2 ? "completed" : "assigned", dueIn: 11 - day });
  if (day >= 9) plan.push({ key: "video-retrieval", status: "assigned", dueIn: 12 - day });

  if (lead) {
    const personal: Record<string, string> = {
      "consent-meds": "Please sign before your Day 8 visit tomorrow morning — we’ll go over your new Gonal-F dose then. — Nurse Dana",
      "doc-missed": "Keep this one handy for your evening doses. If you’re ever running late, call us rather than guessing. — Nurse Dana",
    };
    return plan.map((p) => ({ ...p, note: personal[p.key] }));
  }
  return plan;
}

const CHAT_SAMPLES: Record<string, { q: string; a: string; search: string; triage: "routine" | "needs_review"; lang?: "es" | "hi"; qLocal?: string; aLocal?: string }[]> = {
  "Lena M.": [
    {
      q: "Can I keep my Menopur in the fridge?",
      a: "Yes. Your clinic’s guide says Menopur vials and diluent can be kept in the refrigerator or at room temperature. Mix it right before you inject — don’t store mixed medication.",
      search: "store Menopur refrigerator",
      triage: "routine",
    },
  ],
  "Mei L.": [
    {
      q: "When will I know my trigger shot time?",
      a: "Your clinic decides the trigger shot time after a monitoring visit, based on your follicle sizes. The nurse will give you an exact time and it will appear in the app. Take it at exactly that time.",
      search: "trigger shot time monitoring",
      triage: "routine",
    },
  ],
  "Sofia R.": [
    {
      q: "Can I go for a run?",
      qLocal: "¿Puedo salir a correr?",
      a: "Light activity like walking is fine. As your ovaries grow, your clinic asks you to avoid running, jumping and high-impact exercise until they tell you it’s safe.",
      aLocal: "Caminar suavemente está bien. A medida que crecen sus ovarios, su clínica le pide evitar correr, saltar y el ejercicio de alto impacto hasta que le indiquen que es seguro.",
      search: "running exercise activity",
      triage: "routine",
      lang: "es",
    },
  ],
  "Zoe F.": [
    {
      q: "My injection site is a little red, is that okay?",
      a: "Your clinic’s guide says mild redness, stinging or a small bruise at the injection site is common and usually fades in a day or two. Tell your nurse at your next visit if a site stays red, hot or swollen.",
      search: "injection site redness bruise",
      triage: "routine",
    },
  ],
  "Priya S.": [
    {
      q: "I feel more bloated than yesterday",
      a: "Your clinic’s symptom guide says bloating that is getting worse is a reason to call the on-call nurse line the same day. I’ve passed this to your care team too.",
      search: "bloating getting worse same day call",
      triage: "needs_review",
    },
  ],
};

export async function seedLibraryAndCare(clinicId: string) {
  const now = new Date();
  const today = localDate(now, CLINIC_TZ);

  const team = await db
    .insert(staff)
    .values([
      { clinicId, name: "Dr. Anika Patel (sample)", role: "clinician" },
      { clinicId, name: "Leo Chen (sample)", role: "coordinator" },
    ])
    .returning();
  const [dana] = await db.select().from(staff).where(and(eq(staff.clinicId, clinicId), eq(staff.role, "nurse")));
  const assigners = [dana, ...team];

  const guides = await db.select().from(documents).where(eq(documents.clinicId, clinicId));
  const lib = await db
    .insert(libraryItems)
    .values(
      LIBRARY.map((l) => ({
        clinicId,
        kind: l.kind,
        title: l.title,
        summary: l.summary,
        body: l.body ?? null,
        minutes: l.minutes ?? null,
        documentId: l.guideKind ? (guides.find((g) => g.kind === l.guideKind)?.id ?? null) : null,
        tags: l.tags,
        version: l.kind === "consent" ? 2 : 1,
      })),
    )
    .returning();
  const byKey = new Map<string, LibraryItem>(LIBRARY.map((l, i) => [l.key, lib[i]]));

  const roster = await db
    .select({ patient: patients, cycle: cycles })
    .from(cycles)
    .innerJoin(patients, eq(cycles.patientId, patients.id))
    .where(eq(cycles.clinicId, clinicId));

  for (const [i, { patient, cycle }] of roster.entries()) {
    const day = daysBetween(cycle.startDate, today) + 1;
    const plan = planFor(day, i, patient.isDemoLead);
    const rows = plan.map((p, j) => {
      const item = byKey.get(p.key)!;
      const assignedAt = new Date(now.getTime() - (day + 3 - Math.min(j, day)) * 86_400_000);
      const doneAt = new Date(assignedAt.getTime() + (6 + ((i + j) % 30)) * 3_600_000);
      const signed = p.status === "signed";
      const signedName = signed ? `${patient.alias.replace(/\s.*$/, "")} ${patient.alias.split(" ")[1]?.replace(".", "") ?? ""}`.trim() : null;
      return {
        clinicId,
        patientId: patient.id,
        cycleId: cycle.id,
        libraryItemId: item.id,
        kind: item.kind,
        title: item.title,
        summary: item.summary,
        body: item.body,
        url: item.url,
        documentId: item.documentId,
        minutes: item.minutes,
        libraryVersion: item.version,
        personalNote: p.note ?? null,
        dueDate: p.dueIn != null && !["completed", "signed"].includes(p.status) ? addDays(today, p.dueIn) : null,
        status: p.status,
        viewedAt: p.status !== "assigned" ? doneAt : null,
        completedAt: p.status === "completed" ? doneAt : null,
        signedName,
        signedAt: signed ? doneAt : null,
        signatureHash: signed ? signatureHash({ title: item.title, body: item.body, name: signedName!, at: doneAt, patientId: patient.id }) : null,
        assignedByStaffId: assigners[(i + j) % assigners.length].id,
        createdAt: assignedAt,
      };
    });
    await db.insert(careItems).values(rows);
    const signedRows = rows.filter((r) => r.status === "signed");
    if (signedRows.length) {
      await db.insert(auditEvents).values(
        signedRows.map((r) => ({
          clinicId,
          patientId: patient.id,
          actorType: "patient" as const,
          actorId: patient.id,
          action: "care.signed",
          summary: `${patient.alias} signed “${r.title}” v${r.libraryVersion}`,
          data: { signatureHash: r.signatureHash },
          createdAt: r.signedAt!,
        })),
      );
    }

    for (const [k, s] of (CHAT_SAMPLES[patient.alias] ?? []).entries()) {
      const at = new Date(now.getTime() - (180 + k * 60 + i * 7) * 60000);
      const [hit] = await retrieve(clinicId, s.search, { limit: 1 });
      const citations: Citation[] = hit
        ? [{ chunkId: hit.id, documentId: hit.documentId, documentTitle: hit.title, version: hit.version, page: hit.page, excerpt: hit.content.slice(0, 300) }]
        : [];
      const [q] = await db
        .insert(messages)
        .values({ clinicId, cycleId: cycle.id, patientId: patient.id, role: "patient", content: s.qLocal ?? s.q, language: s.lang ?? "en", triage: s.triage, createdAt: at })
        .returning();
      await db.insert(messages).values({
        clinicId,
        cycleId: cycle.id,
        patientId: patient.id,
        role: "assistant",
        content: s.aLocal ?? s.a,
        contentEnglish: s.aLocal ? s.a : null,
        language: s.lang ?? "en",
        triage: s.triage,
        outcome: "answered",
        citations,
        meta: { model: "claude-opus-5", promptVersion: "answer-v2", reasonForStaff: `Patient asked: ${s.q}`, retrievalScore: hit?.score },
        replyToId: q.id,
        createdAt: new Date(at.getTime() + 4000),
      });
    }
  }
}
