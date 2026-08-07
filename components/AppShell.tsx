import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

const items = [
  ["/dashboard", "Today"], ["/training", "Train"], ["/skills", "Skills"],
  ["/progress", "Progress"], ["/achievements", "Achievements"], ["/settings", "Settings"],
];

export function AppShell({ children, isAdmin=false }: { children: React.ReactNode; isAdmin?: boolean }) {
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">Clearframe<small>Human judgement</small></Link>
      <nav className="nav">
        {items.map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}
        {isAdmin && <><Link href="/admin">Content admin</Link><Link href="/analytics">Analytics</Link></>}
      </nav>
      <div style={{marginTop:28}}><SignOutButton /></div>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
