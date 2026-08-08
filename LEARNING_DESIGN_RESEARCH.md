# Cogni v0.7 learning-design research

This upgrade deliberately moves Cogni from a mainly multiple-choice quiz into a short **teach -> retrieve/generate -> practise in varied formats -> explain -> reflect** loop.

## Research signals used

### 1. Retrieval practice should remain central
Dunlosky et al. (2013) rated practice testing and distributed practice among the highest-utility learning techniques reviewed. Roediger & Karpicke (2006) found that retrieval through testing improved delayed retention compared with repeated study. This supports keeping five active judgement reps after the lesson rather than turning Cogni into passive reading.

Sources:
- Dunlosky J, Rawson KA, Marsh EJ, Nathan MJ, Willingham DT. *Improving Students' Learning With Effective Learning Techniques*. Psychological Science in the Public Interest (2013). PMID 26173288.
- Roediger HL, Karpicke JD. *Test-enhanced learning: taking memory tests improves long-term retention*. Psychological Science (2006). PMID 16507066.

### 2. MCQs can teach, but feedback matters
Butler & Roediger (2008) found that multiple-choice testing can improve retention, but plausible wrong options can also introduce misinformation; feedback reduced that negative effect. Cogni therefore keeps immediate explanatory feedback and does not use wrong answers as unexplained dead ends.

Source:
- Butler AC, Roediger HL. *Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing*. Memory & Cognition (2008). PMID 18491500.

### 3. Worked examples help teach a reasoning move before practice
Worked-example research shows benefits for learning and cognitive efficiency, especially for novices, and has also been demonstrated in less structured reasoning domains. Cogni's daily lesson therefore shows a concrete story, the hidden twist, the underlying thinking move and an application before the learner enters mixed practice.

Sources:
- Van Gog T et al. *Effects of worked examples, example-problem, and problem-example pairs on novices' learning*. Contemporary Educational Psychology (2011), 36(3), 212–218.
- Rourke A, Sweller J. *The worked example and expertise reversal effect in less structured tasks: Learning to reason about legal cases*. Contemporary Educational Psychology (2013), 38(2), 118–125.

### 4. Scenario/case tasks improve authenticity for judgement training
University assessment guidance describes case/scenario tasks as useful for applying knowledge to real situations and developing reasoning, problem-solving and decision-making. Cogni therefore uses scenario triage and story-led prompts rather than abstract fact recall wherever possible.

Sources:
- Charles Sturt University, *Case study analysis or scenario-based questions*.
- UNSW Teaching Gateway, *Assessment by Case Studies and Scenarios*.

### 5. Generate-before-reveal is included, but not fake-graded
Retrieval/self-generation can strengthen learning, while arbitrary short prose is not yet a validated scoring target for Cogni. Each lesson therefore asks the learner to write one sentence before reveal. It stays local/ungraded in the MVP; the learning benefit comes from generating an answer, not from pretending an LLM grade is psychometrically trustworthy.

Related evidence:
- Larsen DP et al. *Comparative effects of test-enhanced learning and self-explanation on long-term retention*. Medical Education (2013). PMID 23746156.

### 6. Correct-answer position needs explicit control
A 2026 study of MCQ generation across LLMs reports systematic correct-answer position biases and argues that reliable generation requires controllable position assignment. Cogni does not leave this to chance: the original bank is 25/25/25/25 across A–D, the 20 new story MCQs are 5/5/5/5, and future admin-authored single-choice questions are rotated into the least-used answer position.

Source:
- Tang X, Duan X, Cai ZG. *Do Large Language Models Plan Answer Positions? Position Bias in Multiple-Choice Question Generation*. arXiv:2605.01846 (2026).

## Why these five scored interaction formats

The evidence base supports retrieval, feedback, authentic scenarios, examples and active generation more strongly than it supports any claim that one UI interaction is universally superior. Accordingly, Cogni treats the following as **measurement/design hypotheses to validate**, not scientifically proven rankings of question formats:

- **Single-choice:** fast decision discrimination; strong feedback can correct distractor effects.
- **Multi-select:** tests whether a learner can identify all relevant signals rather than stop at the first plausible one.
- **Ranking:** tests relative evidence strength, priority or decision value.
- **Classification:** tests category boundaries across multiple statements and enables granular partial credit.
- **Triage:** makes the learner choose an action under realistic uncertainty.

The product should instrument completion, accuracy/partial alignment, response time, confidence, subsequent retention and user return rates by format. That data should determine which formats genuinely improve Cogni outcomes over time.
