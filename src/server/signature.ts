import "server-only";
import { createHash } from "node:crypto";

/**
 * Tamper-evidence for an e-signature: a SHA-256 over who signed, exactly what
 * text they saw, the name they typed and when. Stored with the care item and
 * the audit event, so any later change to either record is detectable.
 */
export function signatureHash(parts: { title: string; body: string | null; name: string; at: Date; patientId: string }) {
  return createHash("sha256")
    .update([parts.patientId, parts.title, parts.body ?? "", parts.name, parts.at.toISOString()].join("␞"))
    .digest("hex");
}
