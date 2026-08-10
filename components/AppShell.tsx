"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CogniMark } from "./CogniMark";
import { SignOutButton } from "./SignOutButton";

const consumerItems = [
  ["/dashboard", "Home", "home"],
  ["/skills", "Skills", "explore"],
  ["/train", "Train", "train"],
  ["/progress", "Progress", "progress"],
  ["/settings", "Profile", "profile"],
] as const;

function NavIcon({ type }: { type: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "home") return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>;
  if (type === "explore") return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /><path d="M9 11h4M11 9v4" /></svg>;
  if (type === "train") return <svg {...common}><path d="M8 5.5v13l10-6.5Z" fill="currentColor" stroke="none" /></svg>;
  if (type === "progress") return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7" /></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
}

function learningBack(pathname: string) {
  if (pathname === "/diagnostic") return { href: "/onboarding", label: "Back" };
  if (pathname.startsWith("/practice")) return { href: "/skills", label: "Back to skills" };
  return { href: "/dashboard", label: "Back" };
}

function AmbientLayer() {
  return <div className="cg-ambient-layer" aria-hidden="true"><span className="cg-ambient-orb one" /><span className="cg-ambient-orb two" /><span className="cg-ambient-orb three" /><span className="cg-ambient-star a" /><span className="cg-ambient-star b" /><span className="cg-ambient-star c" /><span className="cg-ambient-star d" /></div>;
}

export function AppShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const internal = pathname.startsWith("/admin") || pathname.startsWith("/analytics");
  const onboarding = pathname.startsWith("/onboarding");
  const activeDiagnostic = pathname === "/diagnostic";
  const learning = pathname.startsWith("/lesson") || pathname.startsWith("/training") || pathname.startsWith("/practice") || activeDiagnostic;

  if (internal) return <div className="cg-admin-page"><a className="cg-skip-link" href="#main-content">Skip to content</a><AmbientLayer /><aside className="cg-admin-sidebar"><CogniMark href="/dashboard" /><nav className="cg-admin-nav" aria-label="Internal tools"><Link href="/dashboard">Consumer app</Link><Link href="/admin">Content</Link><Link href="/analytics">Engagement</Link><Link href="/analytics/audience">Audience quality</Link></nav><SignOutButton /></aside><main id="main-content" className="cg-admin-main"><div className="cg-admin-brandline"><CogniMark href="/dashboard" compact /></div>{children}</main></div>;

  const profileBranch = pathname.startsWith("/settings") || pathname.startsWith("/achievements") || pathname.startsWith("/support");
  const homeBranch = pathname === "/dashboard" || onboarding || pathname.startsWith("/diagnostic/results");
  const trainBranch = pathname === "/train" || pathname === "/session-complete" || pathname.startsWith("/lesson") || pathname.startsWith("/training") || pathname.startsWith("/practice");
  const back = learningBack(pathname);
  const brandHref = activeDiagnostic || onboarding ? "/onboarding" : "/dashboard";

  return <div className="cg-consumer-bg"><div className="cg-phone-app"><a className="cg-skip-link" href="#main-content">Skip to content</a><AmbientLayer />
    <div className={`cg-persistent-top ${learning ? "is-learning" : ""}`}>
      <header className="cg-app-brandbar"><CogniMark href={brandHref} compact />{isAdmin && pathname === "/settings" ? <Link href="/admin" className="cg-mini-admin">Admin</Link> : null}</header>
      {learning && <nav className="cg-immersive-toolbar" aria-label="Learning navigation">
        <Link href={back.href} className="cg-immersive-back">← {back.label}</Link>
        <div className="cg-immersive-shortcuts"><Link href="/dashboard" className="cg-immersive-shortcut">Home</Link><Link href="/settings" className="cg-immersive-shortcut">Profile</Link></div>
      </nav>}
    </div>
    <main id="main-content" className={`cg-consumer-main ${learning ? "immersive" : ""}`}>{children}</main>
    <nav className="cg-bottom-nav" aria-label="Main navigation">{consumerItems.map(([href, label, icon]) => {
      const resolvedHref = onboarding && href === "/dashboard" ? "/onboarding" : href;
      const active = href === "/dashboard" ? homeBranch : href === "/train" ? trainBranch : href === "/settings" ? profileBranch : pathname === href || pathname.startsWith(href);
      const className = `${active ? "active " : ""}${icon === "train" ? "cg-nav-train" : ""}`.trim();
      return <Link key={href} href={resolvedHref} className={className} aria-current={active ? "page" : undefined}><NavIcon type={icon} /><span>{label}</span></Link>;
    })}</nav>
  </div></div>;
}
