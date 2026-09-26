export const BRAND = {
  name: "Aama",
  product: "AI companions for specialist clinics",
  tagline: "Patients know what’s next. Nurses know who needs them.",
} as const;

/** Clinic-local timezone used for "today" and due times. */
export const CLINIC_TZ = process.env.NEXT_PUBLIC_CLINIC_TZ || "America/Los_Angeles";

export const LANGUAGES = {
  en: "English",
  es: "Español",
  hi: "हिन्दी",
  ne: "नेपाली",
} as const;
