import { clerkMiddleware } from "@clerk/nextjs/server";

/*
 * Session handling only. Authorization lives with the data: every protected
 * layout calls requireStaff()/requirePatient() and every server action calls
 * staffForAction()/patientForAction(), which also enforce clinic scoping —
 * something a path matcher here could never do.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
