# Product Plan A–J

## A. Product architecture
Clearframe is a daily professional judgement gym. A diagnostic estimates starting capability; a lightweight learner model selects short challenges; every answer teaches an explicit thinking principle; evidence accumulates into a transparent profile. B2B is an aggregation layer on top of the same learning evidence, with minimum-cohort and consent controls rather than manager access to detailed individual answers.

## B. MVP scope
Must: auth, diagnostic, 15-skill profile, 100 seed challenges, adaptive 5-item session, explanations, confidence, error patterns, XP/streak, mobile web, admin creation, basic analytics, RLS. Should: AI coach, industry tags, achievements, progress trends, content review workflow. Later: Stripe, leagues, team competitions, normative percentiles, full IRT, SSO/SCIM, native mobile, enterprise data exports.

## C. Data model
Users -> responses -> challenges; challenges <-> skills; users <-> skill scores; users -> error patterns; organisations <-> members; events capture product behaviour. Answer keys are separated from challenge presentation.

## D. Scoring model
0–100 Development Score per skill plus separate evidence reliability. Logistic expected-success update, higher K for diagnostic, lower K for training, no speed-as-intelligence assumption. Store confidence and error patterns for later models. Replaceable by IRT/BKT later.

## E. First seven days
Day 0 landing -> sign-up -> diagnostic -> profile -> first session. Days 1–2 focus on weakest two skills plus one AI audit. Day 3 introduces spaced repeat. Day 4 gives first weekly pattern insight. Day 5 increases one difficulty band if evidence supports it. Day 6 mixes transfer scenarios. Day 7 shows a weekly review: practice frequency, score changes, calibration signal and next focus—without percentile claims.

## F. Screen map
Landing; sign-up; login; onboarding; diagnostic; diagnostic results; dashboard; training; answer explanation (embedded); session complete; skills; progress; achievements; settings; admin content; internal analytics.

## G. Stack
Next.js 16 Active LTS App Router, React 19, TypeScript, Tailwind 4, Supabase Postgres/Auth/RLS, Vercel, OpenAI server-side optional, GitHub. This is intentionally one deployable web app rather than microservices.

## H. Build sequence
1 security/data foundation; 2 auth; 3 challenge engine; 4 diagnostic/scoring; 5 adaptive sessions; 6 gamification; 7 AI free-text/coach; 8 admin/analytics; 9 B2B privacy model; 10 validation study instrumentation.

## I. Ten biggest risks
1 false scientific credibility; 2 weak challenge quality; 3 novelty wears off; 4 scores fail to transfer to work; 5 LLM grading inconsistency; 6 enterprise privacy concerns; 7 content-generation contamination; 8 adaptive model overfits sparse data; 9 B2C willingness-to-pay weak; 10 B2B buyer/user incentives diverge. Each should be converted into a measurable validation question rather than hidden by features.

## J. Grant/R&D considerations
Potential genuine uncertainty exists in automatic reasoning-error inference, adaptive sequencing efficacy, free-text rubric reliability, confidence-calibration intervention and transfer measurement. Document hypotheses, baselines, failed approaches, evaluation datasets and technical breakthroughs contemporaneously. Seek professional advice before making any UK R&D tax or grant claim.
