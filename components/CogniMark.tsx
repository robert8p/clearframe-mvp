import Link from "next/link";

type Props = {
  href?: string;
  compact?: boolean;
};

export function CogniMark({ href = "/", compact = false }: Props) {
  const content = (
    <>
      <span className="cg-mark" aria-hidden="true">
        <span className="cg-mark-inner">
          <span className="cg-mark-left" />
          <span className="cg-mark-right" />
        </span>
      </span>
      <span>
        <span className="cg-brand-name">Cogni</span>
        {!compact && (
          <small className="cg-brand-tag">Learn smarter. Think deeper.</small>
        )}
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={`cg-brand ${compact ? "compact" : ""}`}>
      {content}
    </Link>
  ) : (
    <div className={`cg-brand ${compact ? "compact" : ""}`}>{content}</div>
  );
}
