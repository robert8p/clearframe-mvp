import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogni — Train your mind for the AI age",
  description: "Adaptive judgement training for critical thinking, evidence evaluation and AI-output verification.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
