import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="cg-mobile-page">
      <Link href="/settings" className="cg-back-link">← Profile</Link>
      <div className="cg-kicker">Help & support</div>
      <h1 className="cg-screen-title">How can we help?</h1>
      <p className="cg-page-intro">Quick answers for the things most likely to interrupt your learning.</p>

      <div className="cg-support-list">
        <section className="cg-card cg-support-card">
          <span className="cg-support-icon">↻</span>
          <div><h2>Session interrupted?</h2><p>Your completed answers are saved. Return Home and open today’s learning card to continue from the next unanswered question.</p><Link href="/dashboard">Return home →</Link></div>
        </section>
        <section className="cg-card cg-support-card">
          <span className="cg-support-icon">◎</span>
          <div><h2>Change your learning context</h2><p>Update the situations Cogni uses without changing or deleting your historical Development Scores.</p><Link href="/settings#learning-context">Change learning context →</Link></div>
        </section>
        <section className="cg-card cg-support-card">
          <span className="cg-support-icon">?</span>
          <div><h2>What does a score mean?</h2><p>Development Scores reflect observed performance and evidence confidence. They are learning signals, not intelligence scores or psychometric percentiles.</p><Link href="/skills">Explore your skills →</Link></div>
        </section>
        <section className="cg-card cg-support-card">
          <span className="cg-support-icon">✦</span>
          <div><h2>Something feels wrong?</h2><p>For content feedback, use the reaction card after a daily session and add a short note. For a technical issue, note the screen, action and approximate time so it can be traced quickly.</p></div>
        </section>
      </div>

      <Link href="/dashboard" className="cg-button cg-full">Back to Home</Link>
    </div>
  );
}
