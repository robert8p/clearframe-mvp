# MVP Scoring

Scores are labelled **Development Scores**, 0–100. Initial score is 50. Each response updates mapped skills using a lightweight logistic expected-success model. A correct response produces a positive update proportional to how unexpected the success was; an incorrect response produces a negative update proportional to how expected success was. Diagnostic items use a higher learning rate because they are explicitly sampling ability; ordinary training uses a lower rate.

Reliability is tracked separately as `1 - exp(-attempts/8)`. This is not psychometric test reliability; it is an MVP evidence-density indicator that prevents early scores being shown with false certainty.

Response time, confidence and recurring error tags are stored but speed is not directly rewarded. A future validated version can replace the update function with IRT/Bayesian knowledge tracing without changing the core response schema.
