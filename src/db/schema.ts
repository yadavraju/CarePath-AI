/**
 * Data model — the "minimum data objects" from the build plan:
 * Clinic · Staff user · Patient alias · Cycle · Protocol version · Schedule item ·
 * Knowledge chunk · Message · Alert · Audit event.
 *
 * Two rules shape everything here:
 *  1. The clinic is the source of truth. Schedule items are only ever written
 *     by staff actions (seed, protocol activation, manual edit) — never by a
 *     model. AI output lands in `messages.meta` and `audit_events`, not in the
 *     schedule.
 *  2. Everything is clinic-scoped. Every row a patient or staff member can
 *     reach carries `clinic_id`, and every query filters on it.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export type Language = "en" | "es" | "hi" | "ne";
export type StaffRole = "coordinator" | "nurse" | "clinician";
export type DocumentKind = "protocol" | "medication_guide" | "missed_dose" | "symptom_guide" | "faq";
export type DocumentStatus = "draft" | "approved" | "retired";
export type ScheduleStatus = "pending" | "confirmed" | "missed" | "superseded";
export type ItemKind = "medication" | "appointment" | "task";
export type Triage = "routine" | "needs_review" | "urgent";
export type AnswerOutcome = "answered" | "withheld" | "urgent" | "timing_question" | "ai_paused";
export type AlertSeverity = "red" | "amber";
export type AlertKind =
  | "urgent_symptom"
  | "missed_confirmation"
  | "unsupported_question"
  | "timing_question"
  | "needs_review";
export type AlertStatus = "open" | "acknowledged" | "contacted" | "resolved";
export type ReviewRating = "helpful" | "unsafe" | "incomplete";
export type NudgeStyle = "plain" | "why" | "checklist";

export type Citation = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  version: number;
  page: number;
  excerpt: string;
};

export type MessageMeta = {
  model?: string;
  promptVersion?: string;
  latencyMs?: number;
  fallback?: boolean;
  fallbackReason?: string;
  reasonForStaff?: string;
  matchedRule?: string;
  intent?: string;
  confidence?: number;
  retrievalScore?: number;
  translationLocked?: string[];
};

export const clinics = pgTable("clinics", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  urgentLine: text("urgent_line").notNull(),
  urgentLineLabel: text("urgent_line_label").notNull().default("On-call nurse line"),
  emergencyInstruction: text("emergency_instruction").notNull(),
  aiPaused: boolean("ai_paused").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  // Demo clock: minutes added to real time for this clinic, so a stage demo
  // can jump to reminder time and the clock keeps running from there.
  demoOffsetMinutes: integer("demo_offset_minutes").notNull().default(0),
  createdAt: createdAt(),
});

export const staff = pgTable(
  "staff",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id"),
    name: text("name").notNull(),
    role: text("role").$type<StaffRole>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("staff_clinic_user_uq").on(t.clinicId, t.clerkUserId)],
);

export const patients = pgTable(
  "patients",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    language: text("language").$type<Language>().notNull().default("en"),
    enrollmentCode: text("enrollment_code").notNull().unique(),
    clerkUserId: text("clerk_user_id"),
    isDemoLead: boolean("is_demo_lead").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("patients_clinic_idx").on(t.clinicId), index("patients_clerk_idx").on(t.clerkUserId)],
);

export const cycles = pgTable(
  "cycles",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    protocolName: text("protocol_name").notNull(),
    startDate: date("start_date").notNull(),
    scheduleVersion: integer("schedule_version").notNull().default(1),
    scheduleChangedAt: timestamp("schedule_changed_at", { withTimezone: true }),
    scheduleChangeNote: text("schedule_change_note"),
    changeAcknowledgedAt: timestamp("change_acknowledged_at", { withTimezone: true }),
    status: text("status").$type<"active" | "completed">().notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [index("cycles_patient_idx").on(t.patientId), index("cycles_clinic_idx").on(t.clinicId)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").$type<DocumentKind>().notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").$type<DocumentStatus>().notNull().default("draft"),
    sourceText: text("source_text").notNull(),
    // Where an imported document came from (a clinic web page or PDF).
    sourceUrl: text("source_url"),
    pageCount: integer("page_count").notNull().default(1),
    injectionFlags: jsonb("injection_flags").$type<string[]>().notNull().default([]),
    approvedByStaffId: uuid("approved_by_staff_id").references(() => staff.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("documents_clinic_idx").on(t.clinicId)],
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    page: integer("page").notNull(),
    heading: text("heading").notNull().default(""),
    content: text("content").notNull(),
    tsv: tsvector("tsv").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(heading, '')), 'A') || setweight(to_tsvector('english', content), 'B')`,
    ),
  },
  (t) => [
    index("chunks_clinic_idx").on(t.clinicId),
    index("chunks_tsv_idx").using("gin", t.tsv),
  ],
);

export const scheduleItems = pgTable(
  "schedule_items",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ItemKind>().notNull().default("medication"),
    cycleDay: integer("cycle_day").notNull(),
    date: date("date").notNull(),
    time: text("time").notNull(), // "HH:MM", clinic local time
    windowMinutes: integer("window_minutes").notNull().default(60),
    title: text("title").notNull(), // medication label or appointment name
    dose: text("dose"),
    instruction: text("instruction").notNull(),
    sourceDocumentId: uuid("source_document_id").references(() => documents.id, { onDelete: "set null" }),
    sourcePage: integer("source_page"),
    scheduleVersion: integer("schedule_version").notNull().default(1),
    changedInVersion: boolean("changed_in_version").notNull().default(false),
    status: text("status").$type<ScheduleStatus>().notNull().default("pending"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    reminderStyle: text("reminder_style").$type<NudgeStyle>(),
    createdByStaffId: uuid("created_by_staff_id").references(() => staff.id),
    createdAt: createdAt(),
  },
  (t) => [index("schedule_cycle_date_idx").on(t.cycleId, t.date)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    role: text("role").$type<"patient" | "assistant" | "staff">().notNull(),
    content: text("content").notNull(),
    // For assistant messages in a non-English language: `content` is what the
    // patient saw, `contentEnglish` is the approved-language original staff review.
    contentEnglish: text("content_english"),
    language: text("language").$type<Language>().notNull().default("en"),
    triage: text("triage").$type<Triage>(),
    outcome: text("outcome").$type<AnswerOutcome>(),
    citations: jsonb("citations").$type<Citation[]>().notNull().default([]),
    meta: jsonb("meta").$type<MessageMeta>().notNull().default({}),
    replyToId: uuid("reply_to_id"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_cycle_idx").on(t.cycleId, t.createdAt)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id, { onDelete: "cascade" }),
    severity: text("severity").$type<AlertSeverity>().notNull(),
    kind: text("kind").$type<AlertKind>().notNull(),
    reason: text("reason").notNull(),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
    scheduleItemId: uuid("schedule_item_id").references(() => scheduleItems.id, { onDelete: "set null" }),
    status: text("status").$type<AlertStatus>().notNull().default("open"),
    handledByStaffId: uuid("handled_by_staff_id").references(() => staff.id),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("alerts_clinic_status_idx").on(t.clinicId, t.status)],
);

export const answerReviews = pgTable("answer_reviews", {
  id: id(),
  clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").notNull().references(() => staff.id),
  rating: text("rating").$type<ReviewRating>().notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

/** Clinic-editable red-flag phrases. Matching one skips the model entirely. */
export const urgentRules = pgTable(
  "urgent_rules",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Pipe-separated phrase variants, matched after normalisation.
    phrases: text("phrases").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("urgent_rules_clinic_idx").on(t.clinicId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    actorType: text("actor_type").$type<"staff" | "patient" | "system" | "ai">().notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_clinic_idx").on(t.clinicId, t.createdAt), index("audit_patient_idx").on(t.patientId)],
);

export type Clinic = typeof clinics.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type UrgentRule = typeof urgentRules.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;

/* ------------------------------------------------ Personalised care plans -- */

export type CareKind = "video" | "document" | "consent" | "task";
export type CareStatus = "assigned" | "viewed" | "completed" | "signed";

/** The clinic's reusable library: education videos, guides, consent forms, tasks. */
export const libraryItems = pgTable(
  "library_items",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CareKind>().notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    url: text("url"),
    body: text("body"),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    minutes: integer("minutes"),
    version: integer("version").notNull().default(1),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("library_clinic_idx").on(t.clinicId)],
);

/**
 * One item on one patient's care plan. Content is SNAPSHOTTED from the library
 * at assignment time, so a signed consent always records the exact text the
 * patient saw — even if the library version changes later.
 */
export const careItems = pgTable(
  "care_items",
  {
    id: id(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id, { onDelete: "cascade" }),
    libraryItemId: uuid("library_item_id").references(() => libraryItems.id, { onDelete: "set null" }),
    kind: text("kind").$type<CareKind>().notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    url: text("url"),
    body: text("body"),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    minutes: integer("minutes"),
    libraryVersion: integer("library_version"),
    personalNote: text("personal_note"),
    dueDate: date("due_date"),
    status: text("status").$type<CareStatus>().notNull().default("assigned"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    signedName: text("signed_name"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signatureHash: text("signature_hash"),
    assignedByStaffId: uuid("assigned_by_staff_id").references(() => staff.id),
    aiSuggested: boolean("ai_suggested").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("care_patient_idx").on(t.patientId), index("care_clinic_idx").on(t.clinicId)],
);

export type LibraryItem = typeof libraryItems.$inferSelect;
export type CareItem = typeof careItems.$inferSelect;
