# MVP Scoring

Scores are labelled **Development Scores**, 0–100. Initial score is 50. Each response updates mapped skills using a lightweight logistic expected-success model. A correct response produces a positive update proportional to how unexpected the success was; an incorrect response produces a negative update proportional to how expected success was. Diagnostic items use a higher learning rate because they are explicitly sampling ability; ordinary training uses a lower rate.

Reliability is tracked separately as `1 - exp(-attempts/8)`. This is not psychometric test reliability; it is an MVP evidence-density indicator that prevents early scores being shown with false certainty.

Response time, confidence and recurring error tags are stored but speed is not directly rewarded. A future validated version can replace the update function with IRT/Bayesian knowledge tracing without changing the core response schema.

## Profile interpretation and evidence confidence

Version 0.4 adds an explicit evidence-confidence layer separate from Development Score. The label is an MVP heuristic based on repeated observations and average score reliability. It is intentionally described as **Early**, **Developing**, **Moderate**, or **Strong evidence**, not as psychometric validity or a population percentile.

The diagnostic profile identifies an emerging strength, a highest-value measured development area, a recurring reasoning-error pattern where one is actually observed, and a three-skill weekly focus path. Session-completion insights are deterministic and grounded in session accuracy, confidence, recorded reasoning-error patterns and exact skill changes.
