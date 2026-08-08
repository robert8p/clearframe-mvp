# Cogni content method — v0.7.0

Cogni content is designed to train transferable judgement rather than recall trivia. Every scored challenge is mapped to one or more skills and has deterministic answer logic, an explanation, a thinking principle, an AI-age application and error-pattern metadata.

## Daily learning sequence

The current daily loop is:

1. **3-minute lesson** — a memorable story/example introduces one thinking move.
2. **Generate before reveal** — the learner writes a one-sentence instinct before seeing the worked reasoning. This text is deliberately ungraded in the MVP.
3. **Five adaptive judgement reps** — mixed interaction formats target weak/under-observed skills while preserving variety and an AI-verification component.
4. **Immediate feedback** — correctness/partial alignment, explanation, principle, application, error pattern, XP and skill movement.
5. **Personalised completion insight** — actual session evidence is translated into the next useful focus.

## Current content bank

After migration 005, Cogni contains **150 scored challenges**:

- **120 single-choice MCQs**
  - original 100: exactly 25 correct answers in each position A/B/C/D
  - 20 new story-led MCQs: exactly 5 correct answers in each position A/B/C/D
- **8 multi-select audits** — select every valid issue/evidence item
- **8 ranking tasks** — order evidence/questions/actions by strength or decision value
- **8 classification tasks** — sort statements into categories such as evidence vs assumption
- **6 triage decisions** — make a realistic decision under uncertainty

There are also **15 daily lessons**, one aligned to each core skill. Lesson examples include survivorship bias in aircraft damage, ice-cream sales and drowning correlation, a fabricated AI contract clause, a misleading “sales doubled” claim, source provenance, hidden assumptions in delivery forecasts and changing verification thresholds when AI advice becomes high-stakes.

## MCQ construction rules

MCQs must not teach answer-position habits. The seed bank is explicitly balanced across A–D, and the admin API automatically rotates future single-choice questions so the correct answer is placed in the currently least-used position.

Distractors should represent plausible reasoning errors, not joke answers. Every submitted answer receives corrective feedback because exposure to plausible incorrect alternatives can otherwise reinforce misinformation.

Story-led MCQs should use concrete, surprising or recognisable situations; keep the question decision-oriented; avoid unnecessary prose; and make the best answer defensible from the evidence presented rather than from test-taking tricks.

## Alternative-format construction rules

- **Multi-select:** use when more than one issue genuinely applies; partial credit measures discrimination rather than forcing all-or-nothing scoring.
- **Ranking:** use when relative strength/order is the judgement being trained; partial credit is based on positions correctly placed.
- **Classification:** use when the key skill is distinguishing categories across several signals; partial credit is based on item-level classifications.
- **Triage:** use for realistic decisions where the core skill is choosing the safest/highest-value next move.
- **Generate-before-reveal lesson prompt:** use free response to make the learner retrieve/generate a thought, but do not pretend the MVP can reliably psychometrically grade arbitrary prose.

## Content generation workflow

Future AI-assisted content should follow:

**Generate -> validate answer logic -> validate distractors/categories -> check source claims -> check answer-position distribution -> human review -> publish.**

Treat the current bank as pilot-quality training content, not a scientifically normed assessment bank. See `LEARNING_DESIGN_RESEARCH.md` for evidence and design rationale.
