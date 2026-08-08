import Link from "next/link";

type Props = { href?: string; compact?: boolean };

export function CogniMark({ href = "/", compact = false }: Props) {
  const content = (
    <>
      <span className="cg-logo" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <defs>
            <linearGradient id="cgBrain" x1="4" x2="44" y1="5" y2="43" gradientUnits="userSpaceOnUse">
              <stop stopColor="#18D8FF" />
              <stop offset=".5" stopColor="#5F6CFF" />
              <stop offset="1" stopColor="#B445FF" />
            </linearGradient>
          </defs>
          <path d="M20.5 10.2c-2.9-3.4-8.7-1.5-8.7 3.2-4.4.5-5.8 6.3-2.1 8.5-3.2 3.1-1 8.5 3.4 8.7-.5 4.7 4.8 7.3 8.1 4.2V13.2c0-1.1-.2-2-.7-3Z" fill="none" stroke="url(#cgBrain)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M27.5 10.2c2.9-3.4 8.7-1.5 8.7 3.2 4.4.5 5.8 6.3 2.1 8.5 3.2 3.1 1 8.5-3.4 8.7.5 4.7-4.8 7.3-8.1 4.2V13.2c0-1.1.2-2 .7-3Z" fill="none" stroke="url(#cgBrain)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.5 17.5c3.4-.2 5.4 1.4 6.7 3.6M13.3 26.2c2.9-.5 5.6.6 7.9 3.1M33.5 17.5c-3.4-.2-5.4 1.4-6.7 3.6M34.7 26.2c-2.9-.5-5.6.6-7.9 3.1" fill="none" stroke="url(#cgBrain)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="cg-logo-copy">
        <span className="cg-brand-name">Cogni</span>
        {!compact && <small>Learn smarter. Think deeper.</small>}
      </span>
    </>
  );

  return href ? <Link href={href} className="cg-brand">{content}</Link> : <div className="cg-brand">{content}</div>;
}
