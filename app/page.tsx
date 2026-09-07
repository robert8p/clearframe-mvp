import Link from "next/link";
import { CogniMark } from "@/components/CogniMark";
import { PracticePreview } from "@/components/PracticePreview";
export default function LandingPage() {
  return <main className="cg-public-shell cg-editorial-landing">
    <header className="cg-landing-header"><CogniMark /><Link className="cg-quiet-link" href="/login">Sign in →</Link></header>
    <div className="cg-public-grid">
      <section className="cg-public-copy">
        <div className="cg-kicker">A daily practice for a clearer mind</div>
        <h1>Train your thinking<span className="cg-headline-accent">One decision at a time.</span></h1>
        <p className="cg-public-lead">Weigh evidence. Question assumptions. Check AI answers. Build a thoughtful daily habit with short decisions and useful explanations.</p>
        <div className="cg-public-actions"><Link className="cg-button" href="/signup">Get started →</Link><a className="cg-quiet-link" href="#try-cogni">Try a decision first ↓</a></div>
        <p className="cg-landing-trust">Your starting check and daily core learning stay free.</p>
        <div className="cg-public-features">
          <div><span className="cg-feature-dot cyan" aria-hidden="true"/><div><strong>Practice that adapts</strong><p>Relevant situations chosen around your learning context and recent answers.</p></div></div>
          <div><span className="cg-feature-dot purple" aria-hidden="true"/><div><strong>The reasoning, not just the result</strong><p>Explore a key idea after each answer and how to apply it.</p></div></div>
          <div><span className="cg-feature-dot green" aria-hidden="true"/><div><strong>Progress without labels</strong><p>Read your scores alongside their evidence—not as an assessment of who you are.</p></div></div>
        </div>
      </section>
      <section id="try-cogni" className="cg-public-phone" aria-label="Try a Cogni practice example"><PracticePreview /><Link className="cg-button secondary cg-full" href="/signup">Get started</Link><p className="cg-phone-signin">Already have an account? <Link href="/login">Sign in</Link></p></section>
    </div>
    <footer className="cg-landing-footer"><span>Cogni · Train your thinking</span><span>Learning indicators, not formal assessments.</span></footer>
  </main>;
}
