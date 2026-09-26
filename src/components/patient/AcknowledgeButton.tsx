"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { acknowledgeChange } from "@/app/patient/actions";
import { BTN_SM } from "@/components/ui";

export function AcknowledgeButton() {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => acknowledgeChange())} disabled={pending} className={`${BTN_SM} bg-ink text-white hover:bg-ink/90`}>
      <Check className="h-3.5 w-3.5" /> {pending ? "Saving…" : "I’ve reviewed this"}
    </button>
  );
}
