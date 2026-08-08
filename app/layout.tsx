import type { Metadata } from "next";
import { APP_URL } from "@/lib/app-url";
import "./globals.css";
import "./cogni-v081.css";
import "./cogni-v082-readability.css";
import "./cogni-v090-engagement.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "Cogni",
  title: { default: "Cogni — Train your mind for the AI age", template: "%s | Cogni" },
  description: "Adaptive judgement training for critical thinking, evidence evaluation and AI-output verification.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Cogni", title: "Cogni — Train your mind for the AI age", description: "Adaptive judgement training for critical thinking, evidence evaluation and AI-output verification.", url: "/" },
  twitter: { card: "summary", title: "Cogni — Train your mind for the AI age", description: "Adaptive judgement training for critical thinking, evidence evaluation and AI-output verification." },
  appleWebApp: { capable: true, title: "Cogni", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
