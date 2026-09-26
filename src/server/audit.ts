import "server-only";
import { db } from "@/db";
import { auditEvents } from "@/db/schema";

type AuditInput = typeof auditEvents.$inferInsert;

export function auditRow(input: AuditInput): AuditInput {
  return input;
}

export async function audit(input: AuditInput) {
  await db.insert(auditEvents).values(input);
}
