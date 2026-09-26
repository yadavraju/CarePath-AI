import "server-only";

/**
 * Patient invites. The email only ever carries the clinic name, the one-time
 * enrollment code and a join link — no alias, protocol or health detail.
 *
 * Sending uses Resend when RESEND_API_KEY is set. Without it (or if sending
 * fails) the clinician still gets the code, the link and a prefilled mail
 * draft to send from their own inbox.
 */

// No 0/O or 1/I/L, so a code read over the phone survives.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newEnrollmentCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function inviteMessage({ clinicName, code, joinUrl }: { clinicName: string; code: string; joinUrl: string }) {
  const subject = `${clinicName} invited you to Aama`;
  const text = [
    `Hello,`,
    ``,
    `${clinicName} uses Aama to share your treatment schedule, reminders and approved answers to your questions.`,
    ``,
    `1. Open ${joinUrl}`,
    `2. Create your account`,
    `3. Enter your enrollment code: ${code}`,
    ``,
    `The code links one account to your care plan. Please don't share it.`,
    `If something feels urgent, call the clinic — don't wait for the app.`,
  ].join("\n");
  return { subject, text };
}

export async function sendInviteEmail(to: string, message: { subject: string; text: string }): Promise<"sent" | "not_configured" | "failed"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "not_configured";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.INVITE_FROM_EMAIL ?? "Aama <onboarding@resend.dev>", to: [to], subject: message.subject, text: message.text }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
