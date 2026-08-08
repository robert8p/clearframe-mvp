"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerResult, Challenge } from "@/lib/types";

type Props = { challenges: Challenge[]; mode: "diagnostic" | "training"; sessionId?: string; initialAnsweredChallengeIds?: string[] };

function createRuntimeSessionId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChallengeRunner({ challenges, mode, sessionId, initialAnsweredChallengeIds = [] }: Props) {
  const initiallyAnswered = useMemo(() => new Set(initialAnsweredChallengeIds), [initialAnsweredChallengeIds]);
  const firstPendingIndex = Math.max(0, challenges.findIndex((challenge) => !initiallyAnswered.has(challenge.id)));
  const [index, setIndex] = useState(firstPendingIndex);
  const [selected, setSelected] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(60);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [runtimeSessionId] = useState(() => sessionId ?? createRuntimeSessionId());
  const [answered, setAnswered] = useState(() => new Set(initialAnsweredChallengeIds));
  const router = useRouter();
  const challenge = challenges[index];
  const progress = challenges.length ? Math.round(((answered.size + (result && !answered.has(challenge?.id) ? 1 : 0)) / challenges.length) * 100) : 0;

  useEffect(() => {
    void fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventName: mode === "diagnostic" ? "diagnostic_started" : "session_started", properties: { session_id: runtimeSessionId } }) });
  }, [mode, runtimeSessionId]);

  if (!challenge) return <section className="cg-card"><h2>No challenges available</h2></section>;

  async function submit() {
    if (selected === null) return;
    setBusy(true);
    const response = await fetch("/api/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId: challenge.id, selectedIndex: selected, confidence, responseTimeMs: Date.now() - startedAt, mode, sessionId: runtimeSessionId }) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error || "Could not submit answer");
    setResult(body);
    setAnswered((current) => new Set([...current, challenge.id]));
  }

  function next() {
    const nextIndex = challenges.findIndex((candidate, candidateIndex) => candidateIndex > index && !answered.has(candidate.id));
    if (nextIndex === -1) {
      router.push(mode === "diagnostic" ? "/diagnostic/results" : "/session-complete");
      router.refresh();
      return;
    }
    setIndex(nextIndex); setSelected(null); setResult(null); setConfidence(60); setStartedAt(Date.now());
  }

  return (
    <div className="cg-quiz-screen">
      <div className="cg-quiz-header">
        <span className="cg-kicker">{mode === "diagnostic" ? "Diagnostic" : "Quiz"}</span>
        <span className="cg-pill">{index + 1} of {challenges.length}</span>
      </div>
      <div className="progress"><span style={{ width: `${Math.max(progress, ((index) / challenges.length) * 100)}%` }} /></div>

      <div className="cg-question-meta">
        <span>{challenge.challenge_type.replaceAll("_", " ")}</span>
        <span>Difficulty {challenge.difficulty}</span>
      </div>
      <h1 className="cg-question-title">{challenge.title}</h1>
      <p className="cg-question-prompt">{challenge.prompt}</p>

      <div className="cg-answer-stack">
        {challenge.options.map((option, optionIndex) => {
          let className = "option";
          if (selected === optionIndex) className += " selected";
          if (result && optionIndex === result.correctIndex) className += " correct";
          if (result && selected === optionIndex && !result.correct) className += " incorrect";
          return <button key={optionIndex} disabled={Boolean(result)} className={className} onClick={() => setSelected(optionIndex)}><span className="cg-option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></button>;
        })}
      </div>

      {challenge.confidence_required && !result && (
        <div className="cg-confidence">
          <div><strong>Confidence</strong><span>{confidence}%</span></div>
          <input type="range" min="20" max="100" step="10" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
        </div>
      )}

      {!result ? (
        <button className="cg-button cg-full" disabled={selected === null || busy} onClick={submit}>{busy ? "Checking…" : "Submit answer"}</button>
      ) : (
        <div className="cg-result-panel">
          <div className={`cg-result-label ${result.correct ? "good" : "bad"}`}>{result.correct ? "Correct" : "Not quite"}</div>
          <p>{result.explanation}</p>
          <div className="cg-lesson-chip"><strong>Thinking principle</strong><span>{result.thinkingPrinciple}</span></div>
          <div className="cg-lesson-chip"><strong>AI-age application</strong><span>{result.application}</span></div>
          {result.errorPattern && !result.correct && <span className="cg-pill">Pattern: {result.errorPattern.replaceAll("_", " ")}</span>}
          <button className="cg-button cg-full" onClick={next}>{answered.size >= challenges.length ? "See results" : "Next question"}</button>
        </div>
      )}
    </div>
  );
}
