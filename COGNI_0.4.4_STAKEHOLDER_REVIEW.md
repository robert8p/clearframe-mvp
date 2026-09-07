# Cogni 0.4.4 — end-to-end product and stakeholder review

7 September 2026. Android / Expo preview only. iPhone is deliberately deferred.

## Verdict

The 0.4.3 source has a substantially more reliable foundation than its early versions: protected account routes, server-authoritative scoring and entitlements, five answer formats, explicit confidence choices, actual progress history, controllable feedback and tested font scaling. However, the product still asks people to create an account before experiencing its value. Home foregrounds XP, answer counts and qualifications about scores. A completed activity offers limited lasting value beyond the next activity. A polished dark interface does not, by itself, make those journeys compelling.

The highest-value release is therefore a clearer activation and return loop, not a new architecture, intrusive notifications, fabricated achievements or a visual reset. The positioning is **thinking practice for real life**. The user should experience an interesting decision, understand the reasoning, keep a useful idea and have a reason to revisit it.

This is an expert source and interface review, informed by native screenshots and regression evidence from 0.4.3. It is not user research, a comparative usability trial or proof of commercial traction. The separate release-verification report must record the finished 0.4.4 artifact and installed tests before this release is called verified.

## Stakeholder findings and implemented response

| Stakeholder | Critical finding | Change in this release | Remaining evidence needed |
|---|---|---|---|
| Prospective learner | Account creation precedes a meaningful experience. Generic benefit copy is weaker than showing a real decision. | Three interactive, no-account sample decisions with explanations, no timer and no score; a direct signup handoff. | Observe sample completion and signup conversion with consenting testers. |
| New learner | Optional personalisation adds apparent onboarding effort. | Six learning contexts remain; additional details are explicitly optional and collapsed until requested. | Check whether people understand each context without assistance. |
| Returning learner | Counts and caveats dominate Home; the next step is not the whole reason to return. | Clear primary training action followed by a thinking toolkit and a rotating real-life application prompt. XP and measured performance remain available, lower down. | Observe next-day return and whether saved ideas are actually revisited. |
| Busy professional / manager / executive | Thinking exercises need an explicit connection to real decisions. | Twelve rotating reflection lenses, each with audience-specific application context. No claims that a rotation is an adaptive learning model. | Interviews about examples, relevance and transfer to real work. |
| Learning designer | Explanations are fleeting and end-of-session review focuses on the last answer. | Save a key idea after an answer; show up to three takeaways actually submitted in this visit; recall before revealing a saved idea. | Retention/transfer testing. This is not a validated spaced-repetition scheduler. |
| Learner wellbeing | Stronger engagement mechanics could reward compulsive use rather than learning. | Optional 2/3/5-day weekly target, default off, with no push prompts, streak loss or penalties. A missed day does not erase progress. | Test whether targets feel supportive, not obligatory. |
| Accessibility | New cards and controls must not regress the existing font-scale repair. | Scrollable screens, minimum 48dp target controls, radio semantics, textual state, save announcements and reduced-motion-aware feedback. Large-text rhythm uses a textual alternative. | Installed large-text review plus physical-device TalkBack, touch and audio evaluation. |
| Product / growth | The marketing promise exceeds what screenshots or general copy demonstrate. | Welcome leads with a real decision; explicitly labels curated content and free test preview. Opt-in sharing contains the chosen idea, not private scores or account details. | Positioning/creative testing and sustainable acquisition costs. No viral-growth claim. |
| Commercial owner | Paid subscriptions are not ready to transact. Cosmetic paywall changes cannot resolve store setup. | Preserve the disabled-sales preview and server entitlement boundary. No fabricated price, trial, entitlement or purchase success. | RevenueCat/store product setup and real store billing tests in a separate release. |
| Privacy / security | Local saved content creates a new data-retention surface. | Explicit save action; encrypted SecureStore, per-account namespaces, bounded 12-idea library, atomic two-bank writes, account-switch remount and clear/delete controls. No new server tables or analytics uploads. | Review device-local retention messaging with actual users; cross-device sync is intentionally absent. |
| Offline / reliability | A failed Home fetch previously stopped all useful activity. | Cached private takeaways remain reachable; Home's error state links to the toolkit. Live questions and scores still require a connection. | Native offline cold-start test, not merely a mocked network test. |
| Support / operations | A queued EAS build was previously mistaken for delivery. The cloud build later finished while a separate verification step failed. | Android-only release job distinguishes requested, finished, downloaded, signature-verified and installed-tested states. No iPhone credential dependency. | Monitor real installation issues and keep a single clear download link. |
| Maintainer / release engineer | Duplicate legacy workflows and version-specific checks increase release confusion. | Preserve locked dependencies and native identity; source changes carry before/after checksums and are committed before the EAS build. The Android candidate is tested as the exact downloaded binary. | Consolidate legacy release workflows after successful migration, not during an unrelated release. |

## Design system and interaction decisions

Keep the recognisable navy, cyan and violet visual language and the five equal-weight navigation destinations. Use one dominant training action, readable headline hierarchy and practical secondary actions. Avoid a huge animated decoration before the product explanation. Allow content to grow with system text size rather than fixing card heights. Feedback remains optional and is never the only indication of success. Preserve the existing Android font-scale measurement plugin.

The welcome sample is a demonstration, not an assessment. It makes no server calls and stores no sample answers. Correct positions vary across the three choices. Full learning still uses the existing server content, question formats, audience contexts, progress calculations and account records.

The toolkit deliberately holds the latest 12 saved ideas. The replacement limit is visible. Saved ideas are encrypted, scoped to the signed-in account and do not sync between devices. Sharing requires an explicit action and opens the platform chooser; it does not send automatically. No learner email, score or practice history enters the share payload. Clearing device tools does not clear online progress. Account deletion attempts to clear the current account's local tools and gives an explicit warning if device cleanup fails.

Weekly rhythm is an optional device-local practice aid. Only a successfully submitted live answer records a practice day. Repeat answers on the same day do not add days. Weeks run Monday–Sunday using the device's local dates. Earlier online history is not backfilled and future dates are not counted. These days never grant XP or premium access.

## Scope deliberately not misrepresented

This release does not deliver arbitrary-topic live AI generation, empirically calibrated ability scores, proven cognitive improvement, paid-store readiness, cross-device notebook sync, push reminders or an iPhone build. The existing adaptive engine is retained, not replaced. No new claim of best-in-class performance is warranted before independent user testing. The concrete ambition is a more useful, distinctive and testable product.

## Verification design

The mobile suite includes the existing 95 tests plus 26 new tests for calendar boundaries, duplicate activity, bounded Unicode content, account separation, cold reads, incomplete chunks, failed atomic commits, interrupted deletion, concurrent operations, all sample handlers and a no-network demo boundary. Existing scoring, auth, billing and UI audits remain. Backend Deno tests must still pass. Native verification covers the exact Expo APK's identity, signing certificate, permissions, startup, in-place upgrade, live account/question flows, saved-idea persistence, offline access, explicit sharing cancellation and large text. Automated checks do not substitute for a screenshot review or physical-device evaluation.

## Reference principles

Material accessibility guidance recommends adequate touch targets and clear semantics: https://m1.material.io/usability/accessibility.html

Retrieval and spaced practice inform the recall-first saved-idea interaction; this release does not implement or validate a scheduling algorithm: https://blog.duolingo.com/spaced-repetition-for-learning/

A qualitative study cautions that gamified systems can shift attention toward the mechanics rather than the intended learning: https://arxiv.org/abs/2203.16175

Expo internal distribution and APK documentation define the actual downloadable Android deliverable: https://docs.expo.dev/build/internal-distribution/ and https://docs.expo.dev/build-reference/apk/
