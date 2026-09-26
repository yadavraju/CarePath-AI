import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/context";

/** Role router: staff land on the copilot, patients on Today; the demo remembers which view was asked for. */
export default async function AppRouter() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  const wanted = (await cookies()).get("aama_next")?.value;
  if (wanted === "/patient" && viewer.patient) redirect("/patient");
  if (wanted === "/clinic" && viewer.staff) redirect("/clinic");
  if (viewer.staff && !viewer.patient) redirect("/clinic");
  if (viewer.patient && !viewer.staff) redirect("/patient");
  redirect("/onboarding");
}
