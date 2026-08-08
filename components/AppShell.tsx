"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CogniMark } from "./CogniMark";
import { SignOutButton } from "./SignOutButton";

const consumerItems = [
  ["/dashboard", "Home", "home"],
  ["/training", "Train", "train"],
  ["/progress", "Progress", "progress"],
  ["/skills", "Skills", "skills"],
  ["/settings", "Profile", "profile"],
] as const;

function NavIcon({ type }: { type: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "home") return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>;
  if (type === "train") return <svg {...common}><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="m10 8 6 4-6 4Z"/></svg>;
  if (type === "progress") return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>;
  if (type === "skills") return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

export function AppShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const internal = pathname.startsWith("/admin") || pathname.startsWith("/analytics");

  if (internal) {
    return (
      <div className="cg-admin-page">
        <aside className="cg-admin-sidebar">
          <CogniMark href="/dashboard" />
          <nav className="cg-admin-nav">
            <Link href="/dashboard">Consumer app</Link>
            <Link href="/admin">Content</Link>
            <Link href="/analytics">Analytics</Link>
          </nav>
          <SignOutButton />
        </aside>
        <main className="cg-admin-main">{children}</main>
      </div>
    );
  }

  return (
    <div className="cg-consumer-bg">
      <div className="cg-phone-app">
        <main className="cg-consumer-main">{children}</main>
        <nav className="cg-bottom-nav" aria-label="Primary">
          {consumerItems.map(([href, label, icon]) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={active ? "active" : ""}>
                <NavIcon type={icon} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        {isAdmin && pathname === "/settings" && (
          <div className="cg-admin-shortcut">
            <Link href="/admin">Internal tools</Link>
          </div>
        )}
      </div>
    </div>
  );
}
