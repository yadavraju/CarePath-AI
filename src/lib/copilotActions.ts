import { z } from "zod";

/**
 * Actions the copilot can stage. The model never executes one: it returns a
 * proposal, staff press Confirm, and the server re-validates and runs it
 * through the same actions the UI uses (same clinic scoping, same audit log).
 */
export const CopilotActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("alert"), alertId: z.uuid(), status: z.enum(["acknowledged", "contacted", "resolved"]) }),
  z.object({ type: z.literal("resolve_all"), patientId: z.uuid() }),
  z.object({ type: z.literal("message_patient"), patientId: z.uuid(), text: z.string().trim().min(2).max(1000) }),
  z.object({
    type: z.literal("assign_care"),
    patientId: z.uuid(),
    libraryItemId: z.uuid(),
    note: z.string().trim().max(400).optional(),
    dueDate: z.iso.date().optional(),
  }),
  z.object({
    type: z.literal("add_patient"),
    alias: z.string().trim().min(2).max(40),
    email: z.union([z.literal(""), z.email()]).default(""),
    language: z.enum(["en", "es", "hi", "ne"]).default("en"),
    protocolName: z.string().trim().min(2).max(80),
    startDate: z.iso.date(),
  }),
  z.object({ type: z.literal("ai_pause"), paused: z.boolean() }),
]);

export type CopilotAction = z.infer<typeof CopilotActionSchema>;

export type CopilotProposal = { id: string; label: string; detail?: string; action: CopilotAction };

export type CopilotActionResult = { ok: true; note: string; href?: string } | { ok: false; error: string };
