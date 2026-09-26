import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { retrieve } from "@/server/retrieve";

const QUESTIONS = [
  "Can I take my Menopur late tonight?",
  "How should I store my Gonal-F pen?",
  "Is it okay to drink coffee during stimulation?",
  "How do I mix Menopur?",
  "Can I go for a run?",
  "My injection site is bruised, is that normal?",
  "Can I have a glass of wine?",
  "Is it normal to feel bloated?",
  "Can I drink herbal tea?",
  "What is the weather tomorrow?",
  "When do I start Cetrotide?",
  "Can I bring my medication on a plane?",
];

(async () => {
  const [c] = await db.select().from(clinics).where(eq(clinics.slug, "harbor-sample"));
  for (const q of QUESTIONS) {
    const r = await retrieve(c.id, q, { limit: 3 });
    console.log(`\n${q}`);
    for (const x of r) console.log(`  ${x.score.toFixed(3)}  ${x.title} p${x.page} · ${x.heading}`);
  }
})();
