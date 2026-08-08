import Link from "next/link";

type Props = { href?: string; compact?: boolean; className?: string };

export function CogniMark({ href = "/", compact = false, className = "" }: Props) {
  const mark = (
    <span className={`cg-reference-brand ${compact ? "compact" : ""} ${className}`.trim()}>
      <img src="/cogni-logo.png" alt="Cogni" className="cg-reference-logo" />
    </span>
  );

  return href ? <Link href={href} className="cg-reference-brand-link">{mark}</Link> : mark;
}
