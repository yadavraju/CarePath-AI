import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { careItems, patients } from "@/db/schema";
import { explainConsent } from "@/server/care";
import { signatureHash } from "@/server/signature";

(async () => {
  const [maya] = await db.select().from(patients).where(eq(patients.isDemoLead, true));
  const [consent] = await db.select().from(careItems).where(and(eq(careItems.patientId, maya.id), eq(careItems.kind, "consent"), eq(careItems.status, "assigned")));
  console.log("Pending consent:", consent?.title ?? "(none — already signed)");
  const target = consent ?? (await db.select().from(careItems).where(and(eq(careItems.patientId, maya.id), eq(careItems.kind, "consent"))))[0];
  for (const lang of ["en", "es"] as const) {
    const t = Date.now();
    const r = await explainConsent(target, lang);
    console.log(`\n[${lang}] ${r.engine} ${Date.now() - t}ms\n${r.summary}\n - ${r.keyPoints.join("\n - ")}`);
  }
  const at = new Date("2026-09-26T20:00:00Z");
  const a = signatureHash({ title: target.title, body: target.body, name: "Maya R", at, patientId: maya.id });
  const b = signatureHash({ title: target.title, body: target.body + " ", name: "Maya R", at, patientId: maya.id });
  console.log("\nHash stable:", a === signatureHash({ title: target.title, body: target.body, name: "Maya R", at, patientId: maya.id }), "| changes if text changes:", a !== b);
})();
