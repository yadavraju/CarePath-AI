import type { Metadata, Viewport } from "next";
import { Hedvig_Letters_Serif, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const hedvig = Hedvig_Letters_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hedvig",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.product}`,
  description:
    "AI-native patient journeys for specialist clinics — built from your protocols, grounded in your documents, with nurse escalation. First agent live: IVF medication co-pilot.",
};

export const viewport: Viewport = { themeColor: "#f7f5f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${hedvig.variable}`}>
      <body>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#33302a",
              colorBackground: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-inter)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
