COGNI UI + BRAND PATCH

This patch does three things:
1. Renames the product from Clearframe to Cogni.
2. Reworks the UI to a premium dark neon aesthetic inspired by the reference image.
3. Improves the profile/coach logic so unassessed 50-point skills are not incorrectly presented as weak measured skills.

Replace/add the files using the same relative paths.

Files included:
- components/CogniMark.tsx                         ADD
- app/layout.tsx                                  REPLACE
- app/globals.css                                 REPLACE
- app/page.tsx                                    REPLACE
- components/AppShell.tsx                         REPLACE
- components/AuthForm.tsx                         REPLACE
- components/SkillBars.tsx                        REPLACE
- components/CoachCard.tsx                        REPLACE
- components/ChallengeRunner.tsx                  REPLACE
- app/login/page.tsx                              REPLACE
- app/signup/page.tsx                             REPLACE
- app/(product)/onboarding/page.tsx               REPLACE
- app/(product)/dashboard/page.tsx                REPLACE
- app/(product)/diagnostic/results/page.tsx       REPLACE
- app/(product)/skills/page.tsx                   REPLACE
- app/(product)/progress/page.tsx                 REPLACE
- app/(product)/session-complete/page.tsx         REPLACE
- app/api/coach/route.ts                          REPLACE

Notes:
- This patch is compatible with the persisted-session training implementation as long as the current training page already passes sessionId and initialAnsweredChallengeIds into ChallengeRunner.
- After committing, redeploy in Vercel.
