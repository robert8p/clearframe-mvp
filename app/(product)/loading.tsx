export default function ProductLoading() {
  return (
    <div className="cg-mobile-page cg-loading-view" aria-live="polite" aria-busy="true">
      <div className="cg-kicker">Cogni</div>
      <div className="cg-skeleton cg-skeleton-title" />
      <div className="cg-skeleton cg-skeleton-card" />
      <div className="cg-skeleton cg-skeleton-card short" />
      <p>Loading your learning view…</p>
    </div>
  );
}
