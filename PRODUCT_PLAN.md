# Product Plan A–J — Cogni v0.7.0

## A. Product architecture
Cogni is a daily professional judgement gym. A diagnostic estimates starting capability; a short adaptive lesson teaches one thinking move; a learner model then selects five mixed-format practice challenges; every response teaches an explicit principle; evidence accumulates into a transparent Judgement Profile. B2B is an aggregation layer on top of the same learning evidence, with minimum-cohort and consent controls rather than manager access to detailed individual answers.

## B. MVP scope
Implemented core: auth, diagnostic, 15-skill profile, 150 scored challenges, 15 daily lessons, adaptive five-item persisted session, five interaction formats, explanations, confidence, error patterns, partial-credit scoring, exact skill deltas, XP/streak, mobile web, admin single-choice creation, basic analytics and RLS. Should-next: lesson/content CMS for all formats, content quality review queue, richer spaced retrieval, weekly review, cohort pilots and retention instrumentation. Later: Stripe, leagues/team challenges, normative percentiles only after validation, full IRT/BKT, SSO/SCIM, native mobile and enterprise exports.

## C. Data model
Users -> responses -> challenges; challenges <-> skills; users <-> skill scores; users -> error patterns; users -> daily lesson completions; training sessions -> assigned lesson and persisted challenges; organisations <-> members; events capture product behaviour. Answer keys are separated from challenge presentation. Generalised JSON answer payloads support non-MCQ interactions while score_fraction preserves graded alignment from 0 to 1.

## D. Scoring model
0–100 Development Score per skill plus separate evidence reliability. Logistic expected-success update uses observed performance from 0–1, allowing partial credit for multi-select/ranking/classification while retaining binary exact-correctness. Higher K is used for diagnostic, lower K for training, with no speed-as-intelligence assumption. Confidence and error patterns are stored for calibration and later models. Replaceable by IRT/BKT after sufficient validation data.

## E. First seven days
Day 0: landing -> sign-up -> diagnostic -> Judgement Profile -> first daily lesson -> mixed session. Days 1–2: lesson and practice focus on weakest measured skills, with AI-verification coverage. Day 3: spaced repeat. Day 4: first weekly pattern insight. Day 5: increase one difficulty band if evidence supports it. Day 6: transfer scenarios and unfamiliar interaction formats. Day 7: weekly review of practice frequency, score movement, calibration and next focus—without percentile claims.

## F. Screen map
Landing; sign-up; login; onboarding; diagnostic; diagnostic results; dashboard; **daily lesson**; training; embedded answer feedback; session complete; skills/explore; progress; achievements; settings/profile; admin content; internal analytics.

## G. Stack
Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Supabase Postgres/Auth/RLS, Vercel, optional OpenAI server-side coach and GitHub. One deployable web application remains intentional for the MVP.

## H. Build sequence
1 security/data foundation; 2 auth; 3 challenge engine; 4 diagnostic/scoring; 5 adaptive persisted sessions; 6 motivation/feedback; **7 mixed-format practice + daily micro-lessons**; 8 content management/analytics; 9 B2B privacy model; 10 validation study and psychometric instrumentation.

## I. Ten biggest risks
1 false scientific credibility; 2 weak content quality; 3 novelty wears off; 4 scores fail to transfer to work; 5 partial-credit rules do not predict real judgement; 6 enterprise privacy concerns; 7 AI-assisted content generation introduces answer/distractor bias; 8 adaptive model overfits sparse evidence; 9 B2C willingness-to-pay is weak; 10 B2B buyer/user incentives diverge. Each should be converted into a measurable validation question.

## J. Grant/R&D considerations
Potential genuine uncertainty exists in reasoning-error inference, adaptive sequencing efficacy, mixed-format measurement, confidence-calibration interventions, free-text rubric reliability and transfer measurement. Document hypotheses, baselines, failed approaches, evaluation data and technical breakthroughs contemporaneously. Seek professional advice before making a UK R&D tax or grant claim.
