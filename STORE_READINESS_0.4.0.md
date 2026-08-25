# Cogni 0.4.0 — Store Readiness Pack

Status: prepared for closed testing. Final store answers must be checked against the exact submitted binary and active third-party configuration.

## Listing copy

### Apple subtitle

**Train better judgement daily**

### Google Play short description

**Daily adaptive practice for sharper reasoning, judgement and AI verification.**

### Long description

Cogni turns better thinking into a daily practice.

Start with a short check, then build a personalised learning profile through practical decisions that exercise evidence evaluation, reasoning, AI verification, bias awareness and uncertainty.

**A useful daily habit**
- A short daily insight and assigned core training session
- Adaptive situations based on your learning context and recent evidence
- Skill-by-skill progress with separate evidence reliability
- XP and streaks to help make practice consistent

**Cogni Pro accelerates the outcome**
- Unlimited additional focused skill practice
- Choose the skill you want to train next
- Full available skill-progress history and trends in the mobile view
- Entitlement follows your Cogni account across supported devices when the store purchase is recognised

The free experience remains useful: account creation, onboarding, starting check, daily core learning, basic Skills, basic Progress, XP/streaks and account/privacy controls remain available without Cogni Pro.

Cogni's Development Score is an adaptive learning indicator with separate evidence reliability. It is not a population percentile, validated IQ/cognitive-ability score, employment assessment, psychometric diagnosis or permanent grade.

Subscriptions are billed by Apple App Store or Google Play and renew automatically unless cancelled in store subscription settings. Exact local price, billing period and any eligible introductory offer are shown by the store before purchase.

### Cogni Pro subscription description

**Cogni Pro unlocks unlimited additional focused skill practice and full available progress-history trends. Your daily core learning remains available on the free plan.**

## Recommended launch pricing

- Monthly: **£7.99** UK reference price.
- Annual: **£39.99** UK reference price.
- Introductory trial: **do not launch with one initially**. The useful free tier already provides a low-friction evaluation path; add a store-configured trial later only after enough clean paywall/conversion data exists to measure incrementality.
- Stores must localise final prices. The app always displays the store/RevenueCat-returned price, never these hardcoded reference values.

Pricing rationale: current UK App Store listings around the launch window show mature alternatives near £8.99–£9.99 monthly and annual offers spanning roughly £28.99–£64.99. Cogni's proposed monthly price starts below the mature monthly anchors while £39.99 annual keeps a clear long-term value step.

## Apple App Privacy — architecture-grounded draft

Declare only categories actually present in the submitted binary and service configuration. Current implementation supports the following draft:

- **Purchases / Purchase History** — linked to user; App Functionality. Cogni stores subscription product/status/timing, not payment-card details.
- **Contact Info / Email Address** — linked to user; App Functionality and account management.
- **Identifiers / User ID** — linked to user; App Functionality, subscription reconciliation and security.
- **User Content / Other User Content** — learning responses and optional profile context; linked to user; App Functionality and Personalisation.
- **Usage Data / Product Interaction** — sessions, answers, paywall/purchase/restore events; linked to user; App Functionality, Analytics and Personalisation as applicable.

Current architecture does **not** intentionally add advertising tracking or third-party ad SDKs. Re-check the exact binary before answering Apple's tracking questions.

## Google Play Data Safety — architecture-grounded draft

Current implementation collects:

- email/account identifier;
- stable user ID;
- optional learning/profile context;
- learning responses and interaction data;
- learning/progress state;
- subscription/purchase entitlement metadata.

Purposes include app functionality, account management, personalisation, analytics, fraud/security and subscription management. Card details are processed by Google Play, not stored by Cogni.

RevenueCat and Supabase are service providers used to operate the app. Validate Google's then-current definitions of **collected** versus **shared** when completing the form; do not mark data as not collected merely because a service provider processes it.

Security statements supported by current implementation:

- data encrypted in transit by HTTPS/TLS;
- users can request deletion in-app;
- authenticated access is scoped server-side;
- premium entitlement writes are server-owned;
- no full payment-card information is stored by Cogni.

Do not claim independent security certification or end-to-end encryption unless separately obtained and verified.

## Required store screenshots / assets

1. Welcome / value proposition.
2. Starting check or daily lesson.
3. Daily training question experience.
4. Skills map.
5. Progress snapshot with score + evidence explanation visible.
6. Cogni Pro paywall showing real store-derived monthly and annual prices in a store-installed test build.
7. Optional Pro progress-history screen after a verified sandbox purchase.

Also prepare/verify:

- 1024×1024 App Store icon without transparency as required by Apple tooling;
- Google Play 512×512 icon;
- Google Play 1024×500 feature graphic;
- phone screenshots at currently required store resolutions;
- privacy-policy URL;
- support URL;
- account-deletion URL for Google Play;
- subscription review notes explaining Free versus Pro and where Restore purchases is located.

## Public URLs after GitHub Pages is enabled from `/docs`

- Privacy: `https://robert8p.github.io/clearframe-mvp/privacy.html`
- Terms: `https://robert8p.github.io/clearframe-mvp/terms.html`
- Subscription terms: `https://robert8p.github.io/clearframe-mvp/subscriptions.html`
- Support: `https://robert8p.github.io/clearframe-mvp/support.html`
- Account deletion: `https://robert8p.github.io/clearframe-mvp/delete-account.html`

## Remaining legal/support release gates

- Add the operator's legal identity where required by applicable consumer/privacy law.
- Add a private customer-support contact address to `docs/support.html` and the store listings.
- Have Privacy, Terms and Subscription Terms reviewed professionally before a broad public paid launch.
- Reconcile age-rating/minimum-age answers with final target audience and store questionnaires.
