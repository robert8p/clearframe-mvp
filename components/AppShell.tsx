import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { CogniMark } from "./CogniMark";

const items = [
  ["/dashboard", "Home"],
  ["/training", "Train"],
  ["/progress", "Progress"],
  ["/skills", "Skills"],
  ["/achievements", "Achievements"],
  ["/settings", "Profile"],
] as const;

export function AppShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className="cg-page">
      <div className="cg-shell">
        <aside className="cg-sidebar">
          <CogniMark href="/dashboard" />
          <nav className="cg-nav">
            {items.map(([href, label]) => (
              <Link key={href} href={href}>
                <span>{label}</span>
              </Link>
            ))}
            {isAdmin && <Link href="/admin"><span>Content admin</span></Link>}
            {isAdmin && <Link href="/analytics"><span>Analytics</span></Link>}
          </nav>

          <div className="cg-tip">
            <div className="cg-kicker">Study buddy</div>
            <p>Your daily edge comes from better questions, not just faster answers.</p>
          </div>

          <div style={{ marginTop: 16 }}>
            <SignOutButton />
          </div>
        </aside>

        <main className="cg-main">{children}</main>
      </div>
    </div>
  );
}
