"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CogniMark } from "./CogniMark";
import { SignOutButton } from "./SignOutButton";

const consumerItems = [
  ["/dashboard", "Home", "home"],
  ["/skills", "Explore", "explore"],
  ["/progress", "Progress", "progress"],
  ["/settings", "Profile", "profile"],
] as const;

function NavIcon({ type }: { type: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "home") return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>;
  if (type === "explore") return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M9 11h4M11 9v4"/></svg>;
  if (type === "progress") return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

export function AppShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const internal = pathname.startsWith("/admin") || pathname.startsWith("/analytics");
  const immersive = pathname.startsWith("/training") || pathname.startsWith("/diagnostic") || pathname.startsWith("/session-complete") || pathname.startsWith("/onboarding");

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
        <main className="cg-admin-main">
          <div className="cg-admin-brandline"><CogniMark href="/dashboard" compact /></div>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="cg-consumer-bg">
      <div className="cg-phone-app">
        <header className="cg-app-brandbar">
          <CogniMark href="/dashboard" compact />
          {isAdmin && pathname === "/settings" ? <Link href="/admin" className="cg-mini-admin">Admin</Link> : null}
        </header>
        <main className={`cg-consumer-main ${immersive ? "immersive" : ""}`}>{children}</main>
        {!immersive && (
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
        )}
      </div>
    </div>
  );
}
