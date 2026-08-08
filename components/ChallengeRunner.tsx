"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerResult, Challenge } from "@/lib/types";

type Props = {
  challenges: Challenge[];
  mode: "diagnostic" | "training" | "practice";
  sessionId?: string;
  initialAnsweredChallengeIds?: string[];
  completionHref?: string;
  modeLabel?: string;
};

type Category = { id: string; label: string };

const burstParticles = Array.from({ length: 14 }, (_, index) => ({
  angle: index * (360 / 14),
  distance: 46 + (index % 4) * 8,
  delay: (index % 5) * 22,
}));

const correctMessages = ["Strong call", "Nice reasoning", "Sharp judgement", "Well spotted"];
const partialMessages = ["Nearly there", "Good discrimination", "Close — refine it", "Strong partial read"];
const learningMessages = ["Useful miss", "That’s the trap", "Good learning signal", "Now you’ve seen it"];

const formatMeta: Record<string, { label: string; icon: string; instruction: string }> = {
  single_choice: { label: "Decision", icon: "◎", instruction: "Choose the answer you would act on." },
  multi_select: { label: "Multi-select audit", icon: "☑", instruction: "Select every option that applies." },
  ranking: { label: "Rank the evidence", icon: "↕", instruction: "Tap the cards in strongest-to-weakest order." },
  classification: { label: "Sort the signals", icon: "◫", instruction: "Classify every statement." },
  triage: { label: "Scenario call", icon: "⚡", instruction: "Make the call you would make in the real situation." },
};

function createRuntimeSessionId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function haptic(scoreFraction: number) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(scoreFraction === 1 ? [18, 38, 22] : scoreFraction >= 0.5 ? [18, 18] : [28]);
}

function asNumberArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];
}

function asStringMap(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
}

export function ChallengeRunner({ challenges, mode, sessionId, initialAnsweredChallengeIds = [], completionHref, modeLabel }: Props) {
  const initiallyAnswered = useMemo(() => new Set(initialAnsweredChallengeIds), [initialAnsweredChallengeIds]);
  const pending = challenges.findIndex((challenge) => !initiallyAnswered.has(challenge.id));
  const [index, setIndex] = useState(Math.max(0, pending));
  const [selected, setSelected] = useState<number | null>(null);
  const [multiSelected, setMultiSelected] = useState<number[]>([]);
  const [ranking, setRanking] = useState<number[]>([]);
  const [classification, setClassification] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState(60);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [runtimeSessionId] = useState(() => sessionId ?? createRuntimeSessionId());
  const [answered, setAnswered] = useState(() => new Set(initialAnsweredChallengeIds));
  const router = useRouter();
  const challenge = challenges[index];
  const interactionType = challenge?.interaction_type ?? "single_choice";
  const meta = formatMeta[interactionType] ?? formatMeta.single_choice;
  const categories = ((challenge?.interaction_config?.categories ?? []) as Category[]).filter((item) => item?.id && item?.label);
  const progress = challenges.length ? Math.round(((answered.size + (result && !answered.has(challenge?.id) ? 1 : 0)) / challenges.length) * 100) : 0;
  const remaining = Math.max(challenges.length - answered.size, 0);

  useEffect(() => {
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: mode === "diagnostic" ? "diagnostic_started" : mode === "practice" ? "practice_started" : "session_started", properties: { session_id: runtimeSessionId, resumed: initialAnsweredChallengeIds.length > 0 } }),
    });
  }, [mode, runtimeSessionId, initialAnsweredChallengeIds.length]);

  useEffect(() => {
    if (!challenge) return;
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "challenge_viewed", properties: { session_id: runtimeSessionId, challenge_id: challenge.id, interaction_type: interactionType, index } }),
    });
  }, [challenge, interactionType, index, runtimeSessionId]);

  if (!challenge) return <section className="cg-card"><h2>No challenges available</h2></section>;

  const isReady = interactionType === "multi_select"
    ? multiSelected.length > 0
    : interactionType === "ranking"
      ? ranking.length === challenge.options.length
      : interactionType === "classification"
        ? challenge.options.length > 0 && challenge.options.every((_, optionIndex) => Boolean(classification[String(optionIndex)]))
        : selected !== null;

  async function submit() {
    if (!isReady || busy) return;
    setBusy(true);
    const responsePayload = interactionType === "multi_select"
      ? multiSelected
      : interactionType === "ranking"
        ? ranking
        : interactionType === "classification"
          ? classification
          : selected;
    const response = await fetch("/api/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge.id,
        selectedIndex: interactionType === "single_choice" || interactionType === "triage" ? selected : undefined,
        responsePayload,
        confidence,
        responseTimeMs: Date.now() - startedAt,
        mode,
        sessionId: runtimeSessionId,
      }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error || "Could not submit answer");
    setResult(body);
    setAnswered((current) => new Set([...current, challenge.id]));
    haptic(Number(body.scoreFraction ?? (body.correct ? 1 : 0)));
  }

  function finishSession() {
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: mode === "diagnostic" ? "diagnostic_completed" : mode === "practice" ? "practice_completed" : "session_completed", properties: { session_id: runtimeSessionId } }),
    });
    router.push(completionHref ?? (mode === "diagnostic" ? "/diagnostic/results" : mode === "practice" ? "/skills" : "/session-complete"));
    router.refresh();
  }

  function next() {
    const nextIndex = challenges.findIndex((candidate, candidateIndex) => candidateIndex > index && !answered.has(candidate.id));
    if (nextIndex === -1) return finishSession();
    setIndex(nextIndex);
    setSelected(null);
    setMultiSelected([]);
    setRanking([]);
    setClassification({});
    setResult(null);
    setConfidence(60);
    setStartedAt(Date.now());
  }

  const scoreFraction = result?.scoreFraction ?? (result?.correct ? 1 : 0);
  const reactionMessage = result
    ? result.correct
      ? correctMessages[index % correctMessages.length]
      : scoreFraction >= 0.5
        ? partialMessages[index % partialMessages.length]
        : learningMessages[index % learningMessages.length]
    : null;
  const correctList = asNumberArray(result?.correctAnswer);
  const correctMap = asStringMap(result?.correctAnswer);

  function renderInteraction() {
    if (interactionType === "multi_select") {
      return (
        <div className="cg-answer-stack cg-multi-stack">
          {challenge.options.map((option, optionIndex) => {
            const active = multiSelected.includes(optionIndex);
            const isCorrectChoice = result ? correctList.includes(optionIndex) : false;
            const wasWrongChoice = result ? active && !isCorrectChoice : false;
            return (
              <button
                key={optionIndex}
                disabled={Boolean(result)}
                className={`option cg-option-enter cg-multi-option ${active ? "selected" : ""} ${isCorrectChoice ? "correct" : ""} ${wasWrongChoice ? "incorrect" : ""}`}
                style={{ animationDelay: `${70 + optionIndex * 48}ms` }}
                onClick={() => setMultiSelected((current) => current.includes(optionIndex) ? current.filter((value) => value !== optionIndex) : [...current, optionIndex])}
              >
                <span className="cg-check-box">{active ? "✓" : ""}</span><span>{option}</span>{result && isCorrectChoice && <span className="cg-answer-check">✓</span>}
              </button>
            );
          })}
        </div>
      );
    }

    if (interactionType === "ranking") {
      const unranked = challenge.options.map((option, optionIndex) => ({ option, optionIndex })).filter((item) => !ranking.includes(item.optionIndex));
      return (
        <div className="cg-ranking-wrap">
          <div className="cg-ranked-list">
            {ranking.map((optionIndex, rankIndex) => (
              <button key={optionIndex} disabled={Boolean(result)} className="cg-ranked-item" onClick={() => setRanking((current) => current.filter((value) => value !== optionIndex))}>
                <span>{rankIndex + 1}</span><strong>{challenge.options[optionIndex]}</strong>{!result && <small>tap to remove</small>}
              </button>
            ))}
          </div>
          {!result && unranked.length > 0 && <div className="cg-rank-pool">{unranked.map(({ option, optionIndex }) => <button key={optionIndex} onClick={() => setRanking((current) => [...current, optionIndex])}><span>＋</span>{option}</button>)}</div>}
          {result && <div className="cg-correct-order"><span className="cg-kicker">Best order</span>{correctList.map((optionIndex, rankIndex) => <div key={rankIndex}><b>{rankIndex + 1}</b><span>{challenge.options[optionIndex]}</span></div>)}</div>}
        </div>
      );
    }

    if (interactionType === "classification") {
      return (
        <div className="cg-classification-stack">
          {challenge.options.map((option, optionIndex) => (
            <div className="cg-classification-card" key={optionIndex}>
              <strong>{option}</strong>
              <div className="cg-category-buttons">
                {categories.map((category) => {
                  const active = classification[String(optionIndex)] === category.id;
                  const correctCategory = result ? correctMap[String(optionIndex)] === category.id : false;
                  const wrong = result ? active && !correctCategory : false;
                  return <button key={category.id} disabled={Boolean(result)} className={`${active ? "active" : ""} ${correctCategory ? "correct" : ""} ${wrong ? "incorrect" : ""}`} onClick={() => setClassification((current) => ({ ...current, [String(optionIndex)]: category.id }))}>{category.label}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (interactionType === "triage") {
      return (
        <div className="cg-triage-grid">
          {challenge.options.map((option, optionIndex) => {
            const correctIndex = result?.correctIndex ?? -1;
            return <button key={optionIndex} disabled={Boolean(result)} className={`cg-triage-card ${selected === optionIndex ? "selected" : ""} ${result && optionIndex === correctIndex ? "correct" : ""} ${result && selected === optionIndex && optionIndex !== correctIndex ? "incorrect" : ""}`} onClick={() => setSelected(optionIndex)}><span>{["→", "?", "!"][optionIndex] ?? "•"}</span><strong>{option}</strong></button>;
          })}
        </div>
      );
    }

    return (
      <div className="cg-answer-stack">
        {challenge.options.map((option, optionIndex) => {
          let className = "option cg-option-enter";
          if (selected === optionIndex) className += " selected";
          if (result && optionIndex === result.correctIndex) className += " correct";
          if (result && selected === optionIndex && !result.correct) className += " incorrect";
          return (
            <button key={optionIndex} disabled={Boolean(result)} className={className} style={{ animationDelay: `${70 + optionIndex * 48}ms` }} onClick={() => setSelected(optionIndex)}>
              <span className="cg-option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{result && optionIndex === result.correctIndex && <span className="cg-answer-check">✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`cg-quiz-screen ${result ? (result.correct ? "is-correct" : scoreFraction >= 0.5 ? "is-partial" : "is-learning") : ""}`}>
      <div className="cg-quiz-header">
        <span className="cg-kicker">{modeLabel ?? (mode === "diagnostic" ? "Diagnostic" : mode === "practice" ? "Skill practice" : "Daily challenge")}</span>
        <span className="cg-pill cg-question-count">{index + 1} of {challenges.length}</span>
      </div>
      <div className="progress cg-animated-progress" aria-label={`${progress}% complete`}><span style={{ width: `${Math.max(progress, (index / challenges.length) * 100)}%` }} /></div>

      <div key={challenge.id} className="cg-question-stage">
        {challenge.scenario_context && <div className="cg-context-strip">{challenge.scenario_context}</div>}
        <div className="cg-format-banner"><span>{meta.icon}</span><div><strong>{meta.label}</strong><small>{String(challenge.interaction_config?.instructions ?? meta.instruction)}</small></div></div>
        <div className="cg-question-meta"><span>{challenge.challenge_type.replaceAll("_", " ")}</span><span>Difficulty {challenge.difficulty}</span></div>
        <h1 className="cg-question-title">{challenge.title}</h1>
        <p className="cg-question-prompt">{challenge.prompt}</p>

        {renderInteraction()}

        {challenge.confidence_required && !result && (
          <div className="cg-confidence cg-enter-up">
            <div><strong>How confident are you?</strong><span>{confidence}%</span></div>
            <input type="range" min="20" max="100" step="10" value={confidence} onChange={(event: { target: { value: string } }) => setConfidence(Number(event.target.value))} />
            <small>{confidence >= 80 ? "High conviction — worth checking if you’re wrong" : confidence >= 50 ? "Moderate conviction" : "Healthy doubt"}</small>
          </div>
        )}

        {!result ? (
          <button className={`cg-button cg-full cg-submit-answer ${isReady ? "ready" : ""}`} disabled={!isReady || busy} onClick={submit}>
            {busy ? <><span className="cg-spinner" /> Checking your reasoning…</> : interactionType === "ranking" ? "Lock in this order" : interactionType === "classification" ? "Check my sorting" : interactionType === "multi_select" ? "Submit selections" : "Make the call"}
          </button>
        ) : (
          <div className="cg-result-panel" aria-live="polite">
            <div className={`cg-feedback-hero ${result.correct ? "good" : scoreFraction >= 0.5 ? "partial" : "learning"}`}>
              {result.correct && <div className="cg-burst" aria-hidden="true">{burstParticles.map((particle, particleIndex) => <i key={particleIndex} style={{ ["--angle" as string]: `${particle.angle}deg`, ["--distance" as string]: `${particle.distance}px`, animationDelay: `${particle.delay}ms` }} />)}</div>}
              <div className="cg-feedback-icon">{result.correct ? "✓" : scoreFraction >= 0.5 ? "≈" : "↗"}</div>
              <div><span>{result.correct ? "Nailed it" : scoreFraction >= 0.5 ? `${Math.round(scoreFraction * 100)}% aligned` : "Learning signal"}</span><strong>{reactionMessage}</strong></div>
              <div className="cg-xp-pop">+{result.xpEarned} XP</div>
            </div>

            <p className="cg-feedback-explanation">{result.explanation}</p>
            {result.skillUpdates?.length > 0 && <div className="cg-live-skill-updates">{result.skillUpdates.slice(0, 2).map((skill) => <div key={skill.slug}><span>{skill.name ?? skill.slug.replaceAll("-", " ")}</span><strong>{typeof skill.delta === "number" ? `${skill.delta >= 0 ? "+" : ""}${skill.delta.toFixed(1)}` : Math.round(skill.score)}</strong></div>)}</div>}
            <div className="cg-lesson-chip cg-reveal-card"><strong>Thinking principle</strong><span>{result.thinkingPrinciple}</span></div>
            <div className="cg-lesson-chip cg-reveal-card delay"><strong>AI-age application</strong><span>{result.application}</span></div>
            {result.errorPattern && !result.correct && <span className="cg-pill cg-pattern-pill">Pattern: {result.errorPattern.replaceAll("_", " ")}</span>}
            <div className="cg-momentum-line"><span>{answered.size >= challenges.length ? "Daily session complete" : `${remaining} ${remaining === 1 ? "question" : "questions"} left`}</span><strong>{Math.round((answered.size / challenges.length) * 100)}%</strong></div>
            <button className="cg-button cg-full cg-next-answer" onClick={next}>{answered.size >= challenges.length ? "See my results ✦" : "Keep going →"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
