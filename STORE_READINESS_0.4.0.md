# Cogni 0.4.0 — store readiness pack

Last updated: 31 August 2026

Status: **pre-store closed-test candidate**. Source and server foundations are implemented. Google Play and App Store subscription products, RevenueCat store connections, public SDK keys, signed store builds and sandbox purchases are still required before paid-launch claims.

## Listing copy

### Apple subtitle

**Train better judgement daily**

### Google Play short description

**Daily adaptive practice for sharper reasoning, judgement and AI verification.**

### Long description

Cogni turns better thinking into a daily practice.

Start with a short check, then build a personalised learning profile through practical decisions that exercise evidence evaluation, reasoning, AI verification, bias awareness and uncertainty.

**Build a useful daily habit**

- Complete a short daily insight and assigned core training session.
- Practise situations adapted to your learning context and recent evidence.
- Track skill-by-skill performance with separate evidence reliability.
- Use XP and streaks to make consistent practice easier.

**Cogni Pro accelerates the outcome**

- Unlock unlimited additional focused skill practice.
- Choose the skill you want to train next.
- See your complete available daily skill-progress history and trend insights.
- Keep entitlement linked to your Cogni account when the store purchase is recognised.

The free experience remains useful: account creation, onboarding, starting check, daily core learning, basic Skills, basic Progress, XP/streaks and account/privacy controls remain available without Cogni Pro.

Cogni's Development Score is an adaptive learning indicator with separate evidence reliability. It is not a population percentile, validated IQ or cognitive-ability score, employment assessment, psychometric diagnosis or permanent grade.

Subscriptions are billed by Apple App Store or Google Play and renew automatically unless cancelled in store subscription settings. Exact local price, billing period and any eligible introductory offer are shown by the store before purchase.

### Cogni Pro subscription display name

**Cogni Pro**

### Cogni Pro subscription description

**Unlock unlimited additional focused skill practice and your complete available progress-history trends. Your daily core learning remains available on the free plan.**

## Recommended launch pricing

- Monthly UK reference price: **£7.99**
- Annual UK reference price: **£39.99**
- Introductory trial: **none at launch**

The app must display only the local store/RevenueCat price. These are console reference prices, not executable UI strings.

### Pricing evidence reviewed on 31 August 2026

Current UK App Store listings showed:

- Elevate: £9.99 monthly and £39.99 annual offers.
- Lumosity: £8.99 monthly and annual offers including £39.99 and £64.99.
- Peak: annual offers around £25.99, with multiple lower/discounted monthly variants.
- Impulse: multiple offers including £5.99–£6.99 and annual/special offers around £27.99–£49.99.

£7.99 positions Cogni below mature monthly anchors while £39.99 creates a clear annual value step without relying on extreme discounting. The useful free tier already provides product evaluation, so a trial would add measurement complexity before Cogni has enough clean conversion and retention evidence.

## Free versus Cogni Pro

### Always free

- account creation, authentication and password recovery
- onboarding and starting check
- Home and current daily lesson
- one assigned core training session per day
- basic Skills map
- basic Progress snapshot
- normal XP and streak
- Profile, support, privacy/security controls and account deletion

### Cogni Pro

- unlimited additional focused skill practice
- intentional skill selection
- complete available daily progress history
- deeper trend interpretation and next-best-practice insight

The free daily experience must still work after dismissing the paywall.

## Paywall review copy

Headline: **Accelerate your progress with Cogni Pro**

Value points:

- Train any skill, not only today's assigned core session.
- Add focused practice whenever you have time.
- See your complete available skill-history trends.

Required controls:

- monthly option
- annual option and genuine saving comparison
- store-derived price and period
- eligible introductory offer only when the storefront confirms it
- subscribe CTA
- Restore purchases
- Not now
- Privacy Policy
- Terms of Use
- Subscription Terms
- clear auto-renew disclosure

## Apple App Privacy — architecture-grounded draft

Re-check against the exact submitted binary and final vendor configuration.

- **Purchases / Purchase History** — linked to the user; app functionality and subscription management. Cogni stores product/status/timing metadata, not payment-card details.
- **Contact Info / Email Address** — linked to the user; account and support functionality.
- **Identifiers / User ID** — linked to the user; account, entitlement reconciliation and security.
- **User Content / Other User Content** — learning responses, support requests and optional profile context; linked to the user; functionality and personalisation.
- **Usage Data / Product Interaction** — sessions, answers, paywall/purchase/restore events; linked to the user; functionality, analytics and personalisation.

The implemented app has no advertising SDK and does not intentionally perform cross-app advertising tracking. Confirm this again from the exact release binary before answering Apple's tracking questions.

## Google Play Data Safety — architecture-grounded draft

Data collected or processed includes:

- email/account identifier
- stable user ID
- optional learning/profile context
- learning responses and interaction data
- progress/session state
- support requests submitted by the user
- subscription and purchase-entitlement metadata

Purposes include app functionality, account management, personalisation, analytics, fraud/security, support and subscription management. Google Play processes payment-card details; Cogni does not store them.

Supabase and RevenueCat are service providers. Apply Google's then-current definitions of collected and shared rather than assuming service-provider processing means “not collected.”

Supported security statements:

- HTTPS/TLS in transit
- in-app account deletion
- authenticated server-side access checks
- server-owned premium entitlement writes
- private authenticated support submission
- no full payment-card storage by Cogni

Do not claim end-to-end encryption, independent security certification or clinically validated cognitive improvement.

## Required screenshots and assets

1. Welcome/value proposition.
2. Starting check or daily lesson.
3. Daily training question and answer analysis.
4. Skills map.
5. Progress snapshot with score plus evidence explanation.
6. Cogni Pro paywall showing real store-derived monthly and annual prices from a store-installed test build.
7. Optional Pro progress-history view after a verified sandbox purchase.

Also verify:

- App Store 1024×1024 icon without transparency
- Google Play 512×512 icon
- Google Play 1024×500 feature graphic
- phone screenshots at current store-required sizes
- privacy-policy URL
- support URL
- Google Play account-deletion URL
- subscription review notes explaining Free versus Pro and Restore purchases

## Public static pages

After the legal Pages workflow is enabled/deployed:

- Privacy: `https://robert8p.github.io/clearframe-mvp/privacy.html`
- Terms: `https://robert8p.github.io/clearframe-mvp/terms.html`
- Subscription terms: `https://robert8p.github.io/clearframe-mvp/subscriptions.html`
- Support: `https://robert8p.github.io/clearframe-mvp/support.html`
- Account deletion: `https://robert8p.github.io/clearframe-mvp/delete-account.html`

## Support architecture

Authenticated users can submit a private support request from **Profile → Cogni Support**. The request is written through authenticated `mobile-api` to a server-only queue with account email, category, app version and platform. The client cannot read or edit the queue directly.

The store listings also need a real developer/support contact for signed-out users. This must be a monitored business contact, not a public GitHub issue tracker.

## Remaining public-launch gates

- enter the operator's legal/developer identity where required
- configure a monitored public support email/contact
- obtain professional review of Privacy, Terms and Subscription Terms before broad public paid launch
- finalise age-rating/minimum-age answers
- configure stores and RevenueCat
- complete Play/TestFlight billing tests
- verify the exact submitted binary and screenshots
