import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/server/context";

/**
 * Role router after sign-in. Clinic staff land on the clinic; patients on
 * Today. Two one-shot hints can override that: a pending invite code (finish
 * enrollment first) and the demo's "open the patient view" request.
 */
export async function GET(req: NextRequest) {
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const viewer = await getViewer();
  if (!viewer) return go("/sign-in");

  const invite = req.cookies.get("aama_code")?.value;
  if (invite && !viewer.patient) return go(`/onboarding?code=${encodeURIComponent(invite)}`);

  const wanted = req.cookies.get("aama_next")?.value;
  const target =
    wanted === "/patient" && viewer.patient ? "/patient" : viewer.staff ? "/clinic" : viewer.patient ? "/patient" : "/onboarding";
  const res = go(target);
  // The demo hint applies once, so a later sign-in lands on the clinic again.
  if (wanted) res.cookies.delete("aama_next");
  return res;
}
