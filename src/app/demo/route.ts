import { NextResponse, type NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { DEMO_EXTERNAL_ID, demoEnabled, linkDemoRoles } from "@/server/demoAccess";

/**
 * One-click live demo for judges: no sign-up, no typing.
 *
 *   /demo            → clinic view
 *   /demo?as=patient → patient view
 *
 * Signed-in visitors get both demo roles on their own account. Everyone else is
 * signed into a shared demo account with a single-use, 5-minute Clerk sign-in
 * ticket. The demo account only has access to the fictional sample clinic.
 */
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("as") === "patient" ? "/patient" : "/clinic";
  if (!demoEnabled()) return NextResponse.redirect(new URL("/sign-up", req.url));

  const { userId } = await auth();
  if (userId) {
    await linkDemoRoles(userId, "Demo coordinator");
    return NextResponse.redirect(new URL(next, req.url));
  }

  const client = await clerkClient();
  let [user] = (await client.users.getUserList({ externalId: [DEMO_EXTERNAL_ID], limit: 1 })).data;
  user ??= await client.users.createUser({
    externalId: DEMO_EXTERNAL_ID,
    firstName: "Demo",
    lastName: "Judge",
    emailAddress: ["aama.judge+clerk_test@example.com"],
    skipPasswordRequirement: true,
  });

  // Instances that require organization membership would otherwise stop the
  // judge at a "create your organization" screen.
  let orgId: string | undefined;
  try {
    const memberships = await client.users.getOrganizationMembershipList({ userId: user.id, limit: 1 });
    orgId = memberships.data[0]?.organization.id ?? (await client.organizations.createOrganization({ name: "Aama demo", createdBy: user.id })).id;
  } catch {
    orgId = undefined; // Organizations disabled for this instance.
  }

  await linkDemoRoles(user.id, "Demo Judge");
  const ticket = await client.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 300, ...(orgId ? { orgId } : {}) });

  const res = NextResponse.redirect(new URL(`/sign-in?__clerk_ticket=${encodeURIComponent(ticket.token)}`, req.url));
  res.cookies.set("aama_next", next, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 300, path: "/" });
  return res;
}
