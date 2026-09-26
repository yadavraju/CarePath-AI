import { redirect } from "next/navigation";

/** Old URL — the page is now "Needs attention". */
export default function QueueRedirect() {
  redirect("/clinic/attention");
}
