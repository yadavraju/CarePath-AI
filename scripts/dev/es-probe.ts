import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clinics, cycles, patients } from "@/db/schema";
import { askQuestion } from "@/server/ask";

(async () => {
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, "harbor-sample"));
  const [p] = await db.select().from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.isDemoLead, true)));
  const [cycle] = await db.select().from(cycles).where(eq(cycles.patientId, p.id));
  for (const q of ["¿Cómo guardo mi pluma de Gonal-F?", "¿Puedo salir a correr?"]) {
    const { reply } = await askQuestion({ clinic, patient: { ...p, language: "es" }, cycle }, q);
    console.log(`\nQ: ${q} → ${reply.outcome}`);
    console.log("  ES:", reply.content);
    console.log("  EN:", reply.contentEnglish);
    console.log("  locked:", reply.meta.translationLocked, "| cites:", reply.citations.map((c) => `${c.documentTitle} p.${c.page}`).join(", "));
    console.log("  staff:", reply.meta.reasonForStaff);
  }
})();
