import Link from "next/link";

export default function SupportPage() {
  return (
    <div className="cg-mobile-page">
      <Link href="/settings" className="cg-back-link">← Profile</Link>
      <div className="cg-kicker">Help & support</div>
      <h1 className="cg-screen-title">How can we help?</h1>
      <p className="cg-page-intro">Quick answers for the things most likely to interrupt or confuse your learning.</p>

      <section className="cg-card" id="scores">
        <div className="cg-kicker">Quick guide</div>
        <h2>What the numbers mean</h2>
        <div className="cg-glossary-grid">
          <div className="cg-glossary-row"><strong>Skill score</strong><p>Your current 0–100 score for a skill, based on how you answer. It can move up or down as Cogni sees more evidence.</p></div>
          <div className="cg-glossary-row"><strong>Evidence level</strong><p>How much repeated information Cogni has behind a skill score. A low evidence level means the score may still move quickly.</p></div>
          <div className="cg-glossary-row"><strong>Confidence</strong><p>How sure you said you were about an answer. Comparing confidence with your score helps you judge when to trust your own thinking.</p></div>
          <div className="cg-glossary-row"><strong>XP</strong><p>A reward for completing learning and practice. XP is motivational only; it does not raise your skill score.</p></div>
          <div className="cg-glossary-row"><strong>Streak</strong><p>The number of consecutive days you have completed learning in Cogni.</p></div>
        </div>
      </section>

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
          <div><h2>Why can a score move down?</h2><p>Cogni updates a skill score when new answers add evidence. A lower score is not a penalty; it simply gives Cogni a better idea of what to practise next.</p><Link href="/skills">Open my skills →</Link></div>
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
