import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * The link in a patient invite: /join?code=ABCD-2345. The code rides along in
 * a short-lived cookie through sign-up, then pre-fills the enrollment form.
 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase().slice(0, 32);
  const { userId } = await auth();
  const target = userId ? `/onboarding?code=${encodeURIComponent(code)}` : "/sign-up";
  const res = NextResponse.redirect(new URL(target, req.url));
  if (code) res.cookies.set("aama_code", code, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 3600, path: "/" });
  return res;
}
