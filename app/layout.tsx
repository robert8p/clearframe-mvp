import type { Metadata } from "next";
import { APP_URL } from "@/lib/app-url";
import "./globals.css";
import "./cogni-v081.css";
import "./cogni-v082-readability.css";
import "./cogni-v090-engagement.css";
import "./cogni-v010-ux.css";
import "./cogni-v0101-fixes.css";
import "./cogni-v011-navigation.css";
import "./cogni-v011-depth.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "Cogni",
  title: { default: "Cogni — Train your mind for the AI age", template: "%s | Cogni" },
  description: "Short daily practice for critical thinking, checking evidence and checking AI answers.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Cogni", title: "Cogni — Train your mind for the AI age", description: "Short daily practice for critical thinking, checking evidence and checking AI answers.", url: "/" },
  twitter: { card: "summary", title: "Cogni — Train your mind for the AI age", description: "Short daily practice for critical thinking, checking evidence and checking AI answers." },
  appleWebApp: { capable: true, title: "Cogni", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
