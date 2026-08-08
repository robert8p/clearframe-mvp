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
          <div><h2>Change your learning context</h2><p>Change the situations Cogni uses without changing or deleting your past skill scores.</p><Link href="/settings#learning-context">Change learning context →</Link></div>
        </section>
        <section className="cg-card cg-support-card">
          <span className="cg-support-icon">?</span>
          <div><h2>What do my scores mean?</h2><p>Your skill score is based on how you answer. Evidence level shows how much information Cogni has for that score. Neither is an intelligence score or a ranking against other people.</p><Link href="/skills">Explore your skills →</Link></div>
        </section>
        <section className="cg-card cg-support-card">
          <span className="cg-support-icon">✦</span>
          <div><h2>Something feels wrong?</h2><p>For content feedback, use the reaction card after a daily session and add a short note. For a technical issue, note the screen, what you did and roughly when it happened.</p></div>
        </section>
      </div>

      <Link href="/dashboard" className="cg-button cg-full">Back to Home</Link>
    </div>
  );
}
