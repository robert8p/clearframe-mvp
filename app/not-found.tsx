import Link from "next/link";
import { CogniMark } from "@/components/CogniMark";

export default function NotFound() {
  return (
    <main className="cg-public-shell cg-not-found">
      <section className="cg-card cg-state-view">
        <CogniMark />
        <div className="cg-state-icon">404</div>
        <div className="cg-kicker">Page not found</div>
        <h1>That path doesn’t exist.</h1>
        <p>Use one of the routes below to get back into Cogni.</p>
        <Link href="/" className="cg-button cg-full">Go to Cogni</Link>
        <Link href="/login" className="cg-button secondary cg-full">Sign in</Link>
      </section>
    </main>
  );
}
