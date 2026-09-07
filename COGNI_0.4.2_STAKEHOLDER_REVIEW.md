# Cogni 0.4.2 — stakeholder review and implemented response

Review date: 7 September 2026. Baseline: `3abd8bd6ab1889f8a198814531984a135e469107` (tested 0.4.1, build 56). This is an expert review through stakeholder perspectives, not interviews with those stakeholders, an independent penetration test, clinical validation, or legal certification. Release verification is a separate record; source implementation is not itself proof of installed-app behaviour.

## Product decision

Improve the working thinking-training product rather than bolt on a different application. The implementation contains curated, context-adapted judgement practice, lessons, multiple interaction formats, evidence-informed scores and subscription infrastructure. The broader brief's arbitrary-topic, live AI-generated learning is a future capability, not something this review found implemented. Keep “Train your thinking”; do not imply that current feedback is a live conversational AI coach.

The release direction is a sophisticated consumer learning product: a single obvious next action, calm navy surfaces, indigo primary actions, restrained mint and lavender accents, generous readable type, useful feedback, and minimal decorative movement. The previous neon/orb hierarchy squeezed important Home text into a narrow column. The revised authenticated Home gives the next activity the full card width. This is an intentional design improvement, not an unverified claim of market-leading conversion or retention.

## Findings and action register

| Stakeholder | Priority and evidence in baseline | Response in 0.4.2 | Residual limitation |
|---|---|---|---|
| New learner | High: Home hero orb competes with headline, many parallel cards, zero average before any evidence. `mobile/app/(tabs)/home.tsx`; installed 0.4.1 screenshots. | Full-width training card, fewer competing blocks, clear next activity, “No score yet” rather than a misleading 0% grade. | Formative usability research is still needed; no first-session conversion lift is claimed. |
| Returning learner | High: every focus refresh replaces content with a full-screen loader; failed refresh can serve disk cache. Four tab screens and `mobile/lib/api.ts`. | Account-scoped in-memory view while refreshing; pull-to-refresh, cancellation and explicit retry notice. No persisted personal-response fallback. | This deliberately is not an offline-training mode. A fresh launch requires a connection. |
| Learner choosing a skill | High: static map and some non-actionable skill bars; seed scores can resemble measurement. Skills/Home source. | Search, All/Practised/New filters, whole actionable skill cards, observation labels and “Not measured yet”. Existing server-backed Pro gating remains. | Prioritisation uses observed scores, not a causal prediction of which practice will improve real-world ability most. |
| Learning designer | High: progress index increases on submission before advancing; shallow exit after the last answer; baseline `question-runner.tsx`. | Current-question ordinal follows the question index. Completion pauses on a thinking principle, then returns to training. Existing answer explanations and different interaction formats are retained. | No efficacy claim or new scoring model. The 906 challenge/111 lesson content estate has not been independently adjudicated item by item in this release. |
| Measurement / learner trust | High: missing average looks like zero, one history point appears as change, order is assumed. Progress/profile engine sources. | Distinguish null from a genuine zero; state recent average uses up to 200 answers; date-sort and deduplicate history; require two recorded dates for a difference; chart actual observations. | Scores are not population percentiles or statistically calibrated confidence. Chart spacing represents recorded days, not elapsed-time spacing; this is stated visibly. |
| Accessibility user | High: decorative motion and compressed text compete with reading; some classification outcomes rely on colour. Shared UI and question runner. | Static ambient background, simpler surfaces, flexible text, large-text ring fallback, radio checked semantics, written category feedback, wrapped confidence controls, explicit focus/pressed/disabled states. Main actions remain 56dp minimum, other interactive controls 48dp minimum. | Automated contrast and emulator large-text checks do not replace TalkBack/VoiceOver and motor-accessibility testing on physical devices. |
| Privacy / security reviewer | High: the old response-cache keys name endpoints, not accounts; no account ownership check before accepting a late response. `mobile/lib/api.ts`. | Remove cache reads/writes; purge legacy profile/today cache keys; reject results after an account change; propagate cancellation; retain authenticated server requests. Tests exercise actual API source with mocked network/session transitions. | A vulnerable code path is not proof that a real user's data leaked. Native runtime storage availability varies. This is not a full device forensic audit. |
| Account owner | Medium: auth initialisation can fall back to an older session; sign-out result errors are ignored. `auth.tsx` and Profile. | Use the latest session only; propagate sign-out errors and show a truthful failure message. | Successful password replacement and recovery-email delivery still need their own end-to-end coverage; existing form navigation checks are not that proof. |
| Subscriber / commercial owner | High release gate: store SDK keys and genuine store-channel purchase evidence are absent. Existing release configuration. | Preserve free-core access, server-authoritative entitlements and the dismissible pre-store paywall; stop labelling all unlocked history as Pro-only. Keep production billing disabled. | Paid launch still requires real Apple/Google products, keys, sandbox/internal-channel transactions, restore, cancellation, expiry and account-switching tests. |
| Support operator | Medium: support requests report 0.4.0 regardless of the installed version. `mobile/app/support.tsx`. | Use actual app version in the support payload, learning-help default and a clear message-length requirement. | A monitored public contact route for users unable to sign in, response ownership and service targets need an owner decision. No invented support address or SLA. |
| Prospective web customer | Medium: mobile landing hides core value behind a fake device treatment; “AI coach” wording exceeds current behaviour. `app/page.tsx` and CSS. | Responsive editorial landing, honest learning promise and an interactive local example before account creation. It explicitly does not affect a learning score or call an AI service. | Authenticated website screens are not made identical to the native application in this release. New public-page tests do not constitute full authenticated web E2E. |
| Engineer / release owner | High: `main` is behind the tested release; string-based checks alone miss behavioural faults. | Build from the tested 0.4.1 source on an isolated 0.4.2 branch; reusable resource/learning components; additional behavioural tests and installed-app checks; preserve old release. | Legacy CSS layering, historical branches and lack of a root web lockfile remain technical debt. A release must identify the actual compiled commit, not only the workflow-trigger commit. |
| Founder / investor | High strategic gap: polished UI does not establish demand, retention, learning transfer or unit economics. | Lower friction and clearer product truth; prioritise a reliable testable increment without unverified paid activation. | No retention, learning-effect or revenue improvement can be claimed without measured user evidence. Arbitrary-topic generation needs a separately specified content/safety/evaluation programme. |

## Privacy and monetisation readback

A read-only production preflight found monetisation disabled, 906 challenges and 111 daily lessons. Subscription-entitlement, webhook-event, monetisation-configuration, support-request and answer-key tables have RLS enabled. Both `anon` and `authenticated` roles lack INSERT/UPDATE/DELETE grants on the three subscription/configuration tables. The escaped-control-copy constraint remains validated.

The security advisor returned eight informational “RLS enabled, no policy” notices on server-only tables. These are not an instruction to expose answer keys, webhooks or internal configuration. No permissive client policy was added to silence an informational notice. This pass does not certify every database object; it preserves and tests the existing server boundary. No live backend entitlement or webhook implementation is changed for this release.

## Design system and interaction contract

The primary visual unit is the activity card, not a decorative orb. Home and Train share the same next-action logic and presentation. Secondary choices are visibly subordinate. Unmeasured skills use a dash and a written evidence state. XP is labelled as earned activity, not ability. Outcomes retain visible explanations even when sound or haptics are disabled. Animated decoration is not used to hide content or suggest progress.

Text is allowed to grow and wrap. Progress charts use real recorded points, with a text alternative and an explicit scale. The public example is locally evaluated, keyboard-operable, repeatable and clearly separated from personal assessment. Existing brand identity, package ID and signing identity are retained; this is not a new app requiring account migration.

## Release acceptance

Required: mobile lint/types/dependency/copy/UI/security audits; pure behavioural tests; actual signed APK identity, permissions and checksum; installed authentication, tabs, skill search/reset, training entry, answer/next/resume, sound/haptic settings persistence and preview, large-text screenshots, account lifecycle and disabled paywall; web compilation and public-page navigation/demo tests; iOS JavaScript compilation. Preserve failures rather than converting missing evidence to a pass. Publish the APK only after its release gates succeed.

Use disposable identities for runtime verification, then delete through the app API and verify sign-in rejection. Never use Rob's personal account for destructive testing. Exact build and runtime results belong in the release verification record.

## Deferred launch gates, not silently completed work

1. Real store subscription setup and transactions, a signed iPhone/TestFlight build, and physical iOS/Android feedback/accessibility tests.
2. Owner-confirmed legal operator/contact details, applicable age policy, privacy disclosures and external-console declarations. Existing legal drafts are not a compliance certification.
3. Authenticated website E2E, successful password reset/change and cross-device recovery, broader interruption/connectivity matrix, security testing beyond this source/readback review.
4. User research, learning-item adjudication, retention and genuine learning-transfer evidence before claiming commercial or educational outcomes.

## Source basis and external design references

Product scope and constraints: supplied Cogni continuation brief, 6 September 2026; actual 0.4.1 repository and prior signed-build screenshots. Current service state: connected GitHub and Supabase readbacks, 7 September 2026. Review judgements and priorities above are the reviewer's analysis.

External reference guidance, rather than proof of product certification:
- Apple Human Interface Guidelines, Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- W3C WCAG 2.2 quick reference: https://www.w3.org/WAI/WCAG22/quickref/
- Expo SDK 54 Audio: https://docs.expo.dev/versions/v54.0.0/sdk/audio/
- Supabase JavaScript getSession documentation: https://supabase.com/docs/reference/javascript/auth-getsession

Local session comparison in the client is a UI/data-lifecycle safeguard, not server authorisation. The existing server validates the user and enforces premium access independently.
