import Link from "next/link";

type Props = {
  compact?: boolean;
  href?: string;
  subtitle?: string;
};

export function CogniMark({
  compact = false,
  href,
  subtitle = "AI-powered learning for a sharper mind",
}: Props) {
  const inner = (
    <>
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-core">C</span>
      </span>
      <span>
        <span className="brand-name">Cogni</span>
        {!compact && <small>{subtitle}</small>}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`brand ${compact ? "compact" : ""}`}>
        {inner}
      </Link>
    );
  }

  return <div className={`brand ${compact ? "compact" : ""}`}>{inner}</div>;
}
