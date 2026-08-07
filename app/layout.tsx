import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clearframe — Human Judgement Training",
  description: "Adaptive training for critical thinking and AI-era judgement.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
