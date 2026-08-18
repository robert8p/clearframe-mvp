# Product Plan A–J — Cogni v0.8.0

## A. Product architecture
Cogni is a mobile-first adaptive judgement-training app for the AI age. A starting check estimates a learner's current evidence base; short daily lessons teach one thinking move; adaptive mixed-format practice then applies that move in situations matched to the learner's context. Responses update a transparent Development Score per skill together with a separate evidence/reliability signal. The active product is the Expo / React Native app in `mobile/`; the former Next.js client is legacy compatibility code only.

## B. Current product scope
Implemented core: Supabase Auth; secure native session storage; audience-aware onboarding; casual, student and professional contexts through executive level; starting check; daily micro-lessons; persisted adaptive sessions; five interaction formats; partial-credit grading; confidence capture; 0–100 Development Scores with separate evidence reliability; reduced evidence weight for repeated questions; XP and streaks; focused skill practice; per-situation relevance feedback; account deletion; accessibility and mobile quality guardrails; server-side scoring with answer keys hidden from the client.

Should-next: internal-alpha retention/completion instrumentation; physical-device walkthroughs across representative audiences and screen sizes; interruption/resume testing; weekly review and spaced-retrieval improvements; content-quality review workflow; cohort pilot evidence; stronger transfer measurement; leaked-password protection before wider external access.

Later, only after evidence supports it: enterprise cohort views with privacy thresholds and consent controls; SSO/SCIM; validated benchmark or normative claims; more advanced psychometric models; monetisation and team features.

## C. Learner promise
The product should answer four questions quickly and repeatedly:

1. **Why should I care?** The situation should feel relevant to a real decision the learner may face.
2. **Why this now?** Cogni should make adaptive selection understandable rather than mysterious.
3. **How much effort is this?** Daily practice should feel bounded and easy to start.
4. **What changed and what should I do next?** Progress should lead directly to useful practice rather than passive score-watching.

Context personalises situations and stakes; it must never be presented as a proxy for innate ability.

## D. Evidence and scoring model
Each skill has a 0–100 Development Score plus separate evidence reliability. Scores are adaptive learning indicators, not population percentiles, validated latent-trait estimates or permanent grades. Early scores should visibly carry limited evidence. Repeated questions contribute less independent evidence. Partial-credit formats preserve graded alignment from 0 to 1; confidence is stored separately for calibration work. Replace or extend the heuristic only when validation data justify a stronger model such as IRT/BKT.

## E. First seven days
Day 0: sign-up -> choose learning context -> starting check -> first skill profile -> short lesson -> adaptive practice. The learner should understand that the starting check is not pass/fail and takes only a few minutes.

Days 1–2: lesson and practice focus on the weakest measured areas while maintaining broad AI-verification and evidence-evaluation coverage. Explain why the situations were chosen.

Day 3: spaced retrieval and a previously seen principle in a different context.

Day 4: first pattern insight showing score together with evidence strength.

Day 5: increase difficulty only if evidence supports it; otherwise preserve useful challenge without artificial escalation.

Day 6: transfer scenarios outside the learner's most familiar setting.

Day 7: weekly review of practice, score movement, evidence growth, calibration and the next best skill to practise—without percentile or diagnostic claims.

## F. Active screen map
Entry / welcome; sign-up; login; password recovery; onboarding; starting check; Train hub; daily lesson; adaptive question session; embedded answer feedback; focused skill practice; Skills; Progress; Profile / settings.

The learner-facing hierarchy is intentionally simple: **Home -> Train -> understand feedback -> Progress -> act on the next skill**.

## G. Active technology stack
- **Client:** Expo / React Native with Expo Router in `mobile/`
- **Build/release:** Expo / EAS; Android preview workflow is manual to avoid unnecessary build consumption
- **Authentication:** Supabase Auth
- **API:** authenticated Supabase Edge Function `mobile-api`
- **Persistence:** Supabase Postgres
- **Sensitive grading:** server-side only; answer keys are not shipped to the client
- **Session storage:** native secure storage with migration from the earlier local session store
- **Quality gates:** ESLint, Expo dependency check, UI audit, logic/security audit, TypeScript, Edge Function typecheck and behavioural tests

Vercel is not part of the active mobile runtime. The old Next.js/Vercel client remains only as temporary legacy compatibility source and must not be treated as the product architecture.

## H. Stakeholder guardrails
**Learner:** low friction, clear time commitment, immediate feedback, relevant situations, no shame-based scoring, accessible controls and obvious next action.

**Learning / L&D:** every interaction must map to an explicit skill and principle; adaptation must remain interpretable; transfer and retention claims require evidence.

**Manager / enterprise buyer:** future reporting should prefer aggregated capability trends and cohort-level evidence. Detailed individual answers must not become a default management-surveillance surface.

**Security / privacy:** least privilege, server-side privileged writes, secure session handling, minimal device permissions, user-owned data access and complete account deletion are release requirements rather than optional polish.

**Commercial / growth:** optimise activation, completion, return rate and perceived usefulness before adding pricing complexity or social mechanics. Differentiation should come from relevant adaptive practice plus evidence transparency—not inflated scientific claims.

**Executive / investor:** defensibility depends on content quality, behavioural data, learning efficacy, trust and an improving selection engine. Feature count is not the moat.

**Research / psychometrics:** distinguish observed performance, confidence and evidence strength; document uncertainty; test transfer and calibration before stronger assessment language.

## I. Primary risks and validation questions
1. **False scientific credibility** — do users correctly understand what Development Scores do and do not mean?
2. **Weak transfer** — does improvement on Cogni predict better reasoning in materially different situations?
3. **Content quality variance** — can every item survive expert review for ambiguity, distractor quality and answer-key validity?
4. **Novelty decay** — do learners return after the first week when visual novelty matters less?
5. **Sparse-evidence overfitting** — does adaptation remain stable when only a small number of observations exist?
6. **Buyer/user incentive conflict** — can enterprise value be demonstrated without turning learner evidence into surveillance?
7. **AI-assisted content bias** — do generated or assisted items introduce systematic answer patterns or audience stereotypes?
8. **Misleading progress motivation** — does score movement encourage useful practice rather than gaming or discouragement?
9. **Privacy/security failure** — can the app maintain least privilege, minimal permissions and deletion guarantees as enterprise features are added?
10. **Willingness to pay** — is repeated practical value strong enough to support B2C or B2B pricing after retention is proven?

## J. Release and R&D discipline
Before wider external access, complete representative physical-device QA, interruption/resume checks, small-screen/accessibility verification, leaked-password protection, retention/completion instrumentation and a documented pilot protocol.

For genuine R&D work, record hypotheses, baselines, failed approaches, evaluation data and technical uncertainty contemporaneously. Candidate research areas include adaptive sequencing efficacy, confidence-calibration interventions, mixed-format measurement, reasoning-error inference, transfer measurement and future free-text rubric reliability. Stronger scientific or commercial claims must follow evidence, not precede it.
