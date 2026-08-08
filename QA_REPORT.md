# Cogni v0.5.0 QA

UI refresh based on the supplied Cogni reference.

Checks performed:
- Exact supplied Cogni brain + wordmark asset included at `public/cogni-logo.png`.
- Shared consumer shell renders Cogni branding on every consumer page.
- Admin and analytics surfaces render Cogni branding in sidebar and content header.
- Public landing, login and signup continue to use the shared CogniMark component.
- Consumer bottom navigation changed to the four-tab reference pattern: Home, Explore, Progress, Profile.
- Training/diagnostic/results/onboarding use immersive mode without the bottom nav, while retaining the Cogni brand header.
- Priority skill labels explicitly wrap and no longer use ellipsis.
- Production domain remains `https://gocogni.vercel.app`.
