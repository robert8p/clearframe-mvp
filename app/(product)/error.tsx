"use client";

import Link from "next/link";

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="cg-mobile-page cg-state-view" role="alert">
      <div className="cg-state-icon">↻</div>
      <div className="cg-kicker">Something interrupted Cogni</div>
      <h1 className="cg-screen-title">This view didn’t load cleanly.</h1>
      <p>Retry first. Your completed answers and saved progress are stored separately from this screen.</p>
      <button type="button" className="cg-button cg-full" onClick={reset}>Try again</button>
      <Link href="/dashboard" className="cg-button secondary cg-full">Back to Home</Link>
    </div>
  );
}
