import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  alerts,
  auditEvents,
  messages,
  scheduleItems,
  urgentRules,
  type AlertKind,
  type AnswerOutcome,
  type Citation,
  type Clinic,
  type Cycle,
  type Message,
  type MessageMeta,
  type Patient,
  type Triage,
} from "@/db/schema";
import { ANSWER_PROMPT_VERSION, generateAnswer } from "@/lib/ai/answer";
import { AIUnavailable, aiConfigured } from "@/lib/ai/client";
import { englishSearchQuery } from "@/lib/ai/searchQuery";
import { translateLocked, TRANSLATE_PROMPT_VERSION } from "@/lib/ai/translate";
import { CLINIC_TZ } from "@/lib/brand";
import { extractTerms, MIN_EVIDENCE_SCORE, MIN_EXTRACTIVE_SCORE } from "@/lib/retrieval/query";
import { DEFAULT_URGENT_RULES, isTimingOrDoseChange, matchUrgent } from "@/lib/safety/rules";
import { localDate } from "@/lib/time";
import { formatClock } from "@/lib/utils";
import { clinicNow } from "./clock";
import { retrieve, type Retrieved } from "./retrieve";

type Ctx = { clinic: Clinic; patient: Patient; cycle: Cycle };

type Draft = {
  outcome: AnswerOutcome;
  triage: Triage;
  text: string;
  citations: Citation[];
  meta: MessageMeta;
  alert?: { severity: "red" | "amber"; kind: AlertKind; reason: string };
};

const WITHHELD_TEXT =
  "I need your care team to answer this. I couldn't find it in your clinic's approved guides, so I won't guess. I've sent your question to your nurse.";

function cite(r: Retrieved): Citation {
  return {
    chunkId: r.id,
    documentId: r.documentId,
    documentTitle: r.title,
    version: r.version,
    page: r.page,
    excerpt: r.content.length > 320 ? `${r.content.slice(0, 317)}…` : r.content,
  };
}

/** Offline path: quote the most relevant sentences of the best passage. */
function extractiveAnswer(question: string, top: Retrieved) {
  const terms = new Set(extractTerms(question));
  const sentences = top.content.split(/(?<=[.!?])\s+/);
  const scored = sentences.map((s, i) => ({
    s,
    i,
    score: s
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter((w) => terms.has(w.replace(/-/g, ""))).length,
  }));
  const picked = scored
    .filter((x) => !/^SAMPLE CONTENT/i.test(x.s))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
  return `Here's what your clinic's ${top.title} says: “${picked.join(" ")}”`;
}

async function todaysScheduleText(ctx: Ctx, now: Date) {
  const today = localDate(now, CLINIC_TZ);
  const items = await db
    .select()
    .from(scheduleItems)
    .where(and(eq(scheduleItems.cycleId, ctx.cycle.id), eq(scheduleItems.date, today)))
    .orderBy(asc(scheduleItems.time));
  const live = items.filter((i) => i.status !== "superseded");
  if (live.length === 0) return "No items scheduled today.";
  return live
    .map((i) => `${formatClock(i.time)} — ${i.title}${i.dose ? ` ${i.dose}` : ""} (${i.status})`)
    .join("\n");
}

async function decide(ctx: Ctx, question: string): Promise<Draft> {
  const { clinic } = ctx;
  const call = `${clinic.urgentLineLabel.split("·")[0].trim()} at ${clinic.urgentLine}`;

  // 1 — Deterministic red flags. Runs first, cannot be overridden by a model.
  const rules = await db.select().from(urgentRules).where(eq(urgentRules.clinicId, clinic.id));
  const match = matchUrgent(question, rules.length ? rules : DEFAULT_URGENT_RULES);
  if (match) {
    const [guide] = await retrieve(clinic.id, "emergency severe call 911", { kind: "symptom_guide", limit: 1 });
    return {
      outcome: "urgent",
      triage: "urgent",
      text: `${clinic.emergencyInstruction} I've alerted your care team.`,
      citations: guide ? [cite(guide)] : [],
      meta: { matchedRule: `${match.label}: "${match.phrase}"`, promptVersion: "red-flag-v1", reasonForStaff: `Red-flag rule matched (${match.label}).` },
      alert: { severity: "red", kind: "urgent_symptom", reason: `Urgent symptom phrase detected — ${match.label}` },
    };
  }

  // 2 — Clinic has paused AI answers: route everything to a human.
  if (clinic.aiPaused) {
    return {
      outcome: "ai_paused",
      triage: "needs_review",
      text: `Your clinic has paused automatic answers right now, so I've sent your question straight to your care team. For anything time-sensitive, call the ${call}.`,
      citations: [],
      meta: { reasonForStaff: "AI answers paused by clinic; routed to staff." },
      alert: { severity: "amber", kind: "needs_review", reason: "Question received while AI answers are paused" },
    };
  }

  // 3 — Dose/timing change requests never get a generated instruction.
  if (isTimingOrDoseChange(question)) {
    const guides = await retrieve(clinic.id, `${question} missed late dose double`, { kind: "missed_dose", limit: 2 });
    const best = guides.find((g) => /late|miss/i.test(g.heading)) ?? guides[0];
    return {
      outcome: "timing_question",
      triage: "needs_review",
      text: `I can't change your timing or dose — only your care team can. Your clinic's guide says not to double up or take two doses close together, and to call the on-call nurse line for time-sensitive medication questions. Please call the ${call} now.`,
      citations: best ? [cite(best)] : [],
      meta: { intent: "timing", promptVersion: "timing-refusal-v1", reasonForStaff: "Patient asked to move, skip or change a dose; routed to on-call." },
      alert: { severity: "amber", kind: "timing_question", reason: "Time-sensitive medication question" },
    };
  }

  // 4 — Retrieval over approved, clinic-scoped content. Clinic guides are in
  // English, so a question in another language is searched via English terms.
  let searchText = question;
  let searchNote: string | undefined;
  if (aiConfigured() && (ctx.patient.language !== "en" || /[^\x00-\x7F]/.test(question))) {
    try {
      searchText = await englishSearchQuery(question);
      searchNote = `searched as "${searchText}"`;
    } catch {
      searchNote = "cross-language search unavailable";
    }
  }
  const passages = await retrieve(clinic.id, searchText, { limit: 4 });
  const topScore = passages[0]?.score ?? 0;

  // 5 — Claude answers from those passages only, with triage for staff.
  if (aiConfigured()) {
    try {
      const now = clinicNow(clinic);
      const { data, model, latencyMs } = await generateAnswer({
        question,
        passages: passages.map((p, i) => ({ ...p, id: `p${i + 1}` })),
        todaysSchedule: await todaysScheduleText(ctx, now),
      });
      const byAlias = new Map(passages.map((p, i) => [`p${i + 1}`, p]));
      const evidence = data.evidence_ids.map((id) => byAlias.get(id)).filter((p): p is Retrieved => !!p);
      const baseMeta: MessageMeta = {
        model,
        promptVersion: ANSWER_PROMPT_VERSION,
        latencyMs,
        intent: data.intent,
        confidence: data.confidence,
        retrievalScore: topScore,
        reasonForStaff: searchNote ? `${data.reason_for_staff} (${searchNote})` : data.reason_for_staff,
      };

      if (data.urgency === "urgent") {
        return {
          outcome: "urgent",
          triage: "urgent",
          text: `${clinic.emergencyInstruction} I've alerted your care team.`,
          citations: [],
          meta: baseMeta,
          alert: { severity: "red", kind: "urgent_symptom", reason: `AI triage: urgent — ${data.reason_for_staff}` },
        };
      }

      // Hard stop: no answer without valid, sufficiently strong, non-conflicting evidence.
      const grounded = data.supported && !data.conflict && evidence.length > 0 && data.answer.trim() && topScore >= MIN_EVIDENCE_SCORE;
      if (!grounded) {
        const why = data.conflict ? "Clinic sources conflict" : "Not supported by approved clinic content";
        return {
          outcome: "withheld",
          triage: data.urgency,
          text: WITHHELD_TEXT,
          citations: [],
          meta: { ...baseMeta, fallbackReason: why },
          alert: { severity: "amber", kind: "unsupported_question", reason: `Question not supported by protocol — ${why.toLowerCase()}` },
        };
      }

      return {
        outcome: "answered",
        triage: data.urgency,
        text: data.answer.trim(),
        // One citation per document page, even if two passages came from it.
        citations: evidence.filter((p, i) => evidence.findIndex((q) => q.documentId === p.documentId && q.page === p.page) === i).map(cite),
        meta: baseMeta,
        alert:
          data.urgency === "needs_review"
            ? { severity: "amber", kind: "needs_review", reason: `Needs review — ${data.reason_for_staff}` }
            : undefined,
      };
    } catch (err) {
      // Fall through to the deterministic path below.
      const reason = err instanceof AIUnavailable ? err.message : "AI error";
      return offlineAnswer(question, passages, topScore, reason);
    }
  }

  return offlineAnswer(question, passages, topScore, "AI not configured");
}

function offlineAnswer(question: string, passages: Retrieved[], topScore: number, reason: string): Draft {
  // Stricter bar than the AI path: without a model to judge relevance, only a
  // strong lexical match is quoted.
  if (passages[0] && topScore >= MIN_EXTRACTIVE_SCORE) {
    return {
      outcome: "answered",
      triage: "routine",
      text: extractiveAnswer(question, passages[0]),
      citations: [cite(passages[0])],
      meta: { fallback: true, fallbackReason: reason, retrievalScore: topScore, promptVersion: "extractive-v1" },
    };
  }
  return {
    outcome: "withheld",
    triage: "needs_review",
    text: WITHHELD_TEXT,
    citations: [],
    meta: { fallback: true, fallbackReason: reason, retrievalScore: topScore },
    alert: { severity: "amber", kind: "unsupported_question", reason: "Question not supported by protocol" },
  };
}

export async function askQuestion(ctx: Ctx, question: string): Promise<{ question: Message; reply: Message }> {
  const { clinic, patient, cycle } = ctx;
  const [patientMsg] = await db
    .insert(messages)
    .values({ clinicId: clinic.id, cycleId: cycle.id, patientId: patient.id, role: "patient", content: question, language: patient.language })
    .returning();

  const draft = await decide(ctx, question);

  // Multilingual explanation — same approved text, locked tokens, verified.
  let shown = draft.text;
  let english: string | null = null;
  if (patient.language !== "en") {
    try {
      const t = await translateLocked(draft.text, patient.language);
      if (t) {
        shown = t.text;
        english = draft.text;
        draft.meta.translationLocked = t.locked;
      } else {
        draft.meta.fallbackReason = [draft.meta.fallbackReason, "translation failed verification; showed English"].filter(Boolean).join("; ");
      }
    } catch {
      draft.meta.fallbackReason = [draft.meta.fallbackReason, "translation unavailable; showed English"].filter(Boolean).join("; ");
    }
  }

  const [reply] = await db
    .insert(messages)
    .values({
      clinicId: clinic.id,
      cycleId: cycle.id,
      patientId: patient.id,
      role: "assistant",
      content: shown,
      contentEnglish: english,
      language: english ? patient.language : "en",
      triage: draft.triage,
      outcome: draft.outcome,
      citations: draft.citations,
      meta: draft.meta,
      replyToId: patientMsg.id,
    })
    .returning();

  const [question_] = await db.update(messages).set({ triage: draft.triage }).where(eq(messages.id, patientMsg.id)).returning();

  if (draft.alert) {
    await db.insert(alerts).values({
      clinicId: clinic.id,
      patientId: patient.id,
      cycleId: cycle.id,
      severity: draft.alert.severity,
      kind: draft.alert.kind,
      reason: draft.alert.reason,
      messageId: patientMsg.id,
    });
  }

  await db.insert(auditEvents).values({
    clinicId: clinic.id,
    patientId: patient.id,
    actorType: draft.meta.model ? "ai" : "system",
    actorId: draft.meta.model ?? "rules",
    action: `answer.${draft.outcome}`,
    summary: `${draft.outcome === "answered" ? "Answered" : draft.outcome === "withheld" ? "Withheld answer" : draft.outcome === "urgent" ? "Urgent guidance shown" : draft.outcome === "timing_question" ? "Routed timing question" : "Routed to staff"} · triage ${draft.triage}`,
    data: {
      messageId: reply.id,
      promptVersion: draft.meta.promptVersion ?? "rules-v1",
      translatePromptVersion: english ? TRANSLATE_PROMPT_VERSION : undefined,
      model: draft.meta.model,
      sources: draft.citations.map((c) => ({ document: c.documentTitle, version: c.version, page: c.page })),
      fallback: draft.meta.fallback ?? false,
      fallbackReason: draft.meta.fallbackReason,
    },
  });

  return { question: question_, reply };
}
