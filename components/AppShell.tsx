import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { CogniMark } from "./CogniMark";

const items = [
  ["/dashboard", "Today"],
  ["/training", "Train"],
  ["/skills", "Skills"],
  ["/progress", "Progress"],
  ["/achievements", "Achievements"],
  ["/settings", "Settings"],
] as const;

export function AppShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <CogniMark href="/dashboard" />

        <nav className="nav">
          {items.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <Link href="/admin">Content admin</Link>
              <Link href="/analytics">Analytics</Link>
            </>
          )}
        </nav>

        <div className="card" style={{ marginTop: 22, padding: 16 }}>
          <div className="kicker">Daily principle</div>
          <p style={{ margin: "10px 0 0" }}>
            Good judgement is not just knowing more. It is questioning better.
          </p>
        </div>

        <div style={{ marginTop: 18 }}>
          <SignOutButton />
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
