import { CopilotChat } from "@/components/clinic/CopilotChat";
import { CLINIC_TZ } from "@/lib/brand";
import { timeAgo } from "@/lib/utils";
import { clinicNow, requireStaff } from "@/server/context";
import { listExceptions } from "@/server/copilot";

export const dynamic = "force-dynamic";

// Action-first starters; the sample clinic's name its patients.
const DEMO_STARTERS = [
  "Who needs me first?",
  "Mark Priya as contacted",
  "Message Ana that her nurse will call her today",
  "Assign the injection video to Maya, due in 2 days",
];
const STARTERS = [
  "Who needs me first?",
  "Add a patient: Sara K., antagonist protocol, Day 1 today",
  "Which consents are still unsigned?",
  "Pause AI answers",
];

export default async function CopilotHome() {
  const { clinic, staff } = await requireStaff();
  const now = clinicNow(clinic);
  const hour = Number(now.toLocaleString("en-US", { timeZone: CLINIC_TZ, hour: "numeric", hourCycle: "h23" }));
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const exceptions = await listExceptions({ clinic });
  const seen = new Set<string>();
  const needs = exceptions
    .filter((e) => (seen.has(e.patientId) ? false : (seen.add(e.patientId), true)))
    .slice(0, 3)
    .map((e) => ({
      patientId: e.patientId,
      alias: e.patient,
      reason: e.reason,
      severity: e.severity,
      age: timeAgo(new Date(now.getTime() - e.minutesAgo * 60000), now),
    }));
  const urgent = exceptions.filter((e) => e.severity === "red" && e.status === "open").length;
  const subtitle =
    seen.size === 0
      ? "No open exceptions. Tell me what to get done."
      : `${seen.size} patient${seen.size === 1 ? "" : "s"} need you${urgent ? ` · ${urgent} urgent` : ""}. I can handle the follow-ups — you confirm each one.`;

  return <CopilotChat greeting={`Good ${part}, ${staff.name.split(" ")[0]}`} subtitle={subtitle} starters={clinic.isDemo ? DEMO_STARTERS : STARTERS} needs={needs} />;
}
