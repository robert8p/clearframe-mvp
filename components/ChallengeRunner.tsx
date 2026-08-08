"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerResult, Challenge } from "@/lib/types";

type Props = {
  challenges: Challenge[];
  mode: "diagnostic" | "training";
  sessionId?: string;
  initialAnsweredChallengeIds?: string[];
};

function createRuntimeSessionId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChallengeRunner({ challenges, mode, sessionId, initialAnsweredChallengeIds = [] }: Props) {
  const initiallyAnswered = useMemo(() => new Set(initialAnsweredChallengeIds), [initialAnsweredChallengeIds]);

  const firstPendingIndex = Math.max(
    0,
    challenges.findIndex((challenge) => !initiallyAnswered.has(challenge.id)),
  );

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

  const progress = useMemo(() => {
    if (!challenges.length) return 0;
    return Math.round(((index + (result ? 1 : 0)) / challenges.length) * 100);
  }, [challenges.length, index, result]);

  useEffect(() => {
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: mode === "diagnostic" ? "diagnostic_started" : "session_started",
        properties: { session_id: runtimeSessionId },
      }),
    });
  }, [mode, runtimeSessionId]);

  useEffect(() => {
    if (!challenge) return;
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: "challenge_viewed",
        properties: { session_id: runtimeSessionId, challenge_id: challenge.id, index },
      }),
    });
  }, [challenge, index, runtimeSessionId]);

  if (!challenge) {
    return <section className="cg-card"><h2>No challenges available</h2></section>;
  }

  async function submit() {
    if (selected === null) return;
    setBusy(true);

    const response = await fetch("/api/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge.id,
        selectedIndex: selected,
        confidence,
        responseTimeMs: Date.now() - startedAt,
        mode,
        sessionId: runtimeSessionId,
      }),
    });

    const body = await response.json();
    setBusy(false);

    if (!response.ok) {
      alert(body.error || "Could not submit answer");
      return;
    }

    setResult(body);
    setAnswered((current) => {
      const next = new Set(current);
      next.add(challenge.id);
      return next;
    });
  }

  function finishSession() {
    router.push(mode === "diagnostic" ? "/diagnostic/results" : "/session-complete");
    router.refresh();
  }

  function next() {
    const nextIndex = challenges.findIndex((candidate, candidateIndex) => candidateIndex > index && !answered.has(candidate.id));
    if (nextIndex === -1) {
      finishSession();
      return;
    }
    setIndex(nextIndex);
    setSelected(null);
    setResult(null);
    setConfidence(60);
    setStartedAt(Date.now());
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="topbar">
        <div>
          <div className="cg-kicker">{mode} · Question {index + 1} of {challenges.length}</div>
          <h1 style={{ fontSize: 42, marginBottom: 8 }}>Stay sharp.</h1>
          <p className="muted">Think before you commit. Cogni rewards reasoning quality.</p>
        </div>
        <div className="inline-list">
          <span className="cg-pill">Difficulty {challenge.difficulty}/100</span>
          <span className="cg-pill">Progress {progress}%</span>
        </div>
      </div>

      <div className="progress" style={{ marginBottom: 20 }}><span style={{ width: `${progress}%` }} /></div>

      <section className="cg-card">
        <span className="cg-pill">{challenge.challenge_type.replaceAll("_", " ")}</span>
        <h2 style={{ fontSize: 30, marginTop: 16 }}>{challenge.title}</h2>
        <p style={{ color: "#eff2ff", fontSize: 18 }}>{challenge.prompt}</p>

        <div style={{ marginTop: 18 }}>
          {challenge.options.map((option, optionIndex) => {
            let className = "option";
            if (selected === optionIndex) className += " selected";
            if (result && optionIndex === result.correctIndex) className += " correct";
            if (result && selected === optionIndex && !result.correct) className += " incorrect";
            return (
              <button key={optionIndex} className={className} disabled={Boolean(result)} onClick={() => setSelected(optionIndex)}>
                <strong>{String.fromCharCode(65 + optionIndex)}.</strong> {option}
              </button>
            );
          })}
        </div>

        {challenge.confidence_required && !result && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <label style={{ margin: 0 }}>How confident are you?</label>
              <span className="cg-pill">{confidence}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="10"
              value={confidence}
              style={{ width: "100%", marginTop: 12, accentColor: "#7c5cff" }}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
          </div>
        )}

        {!result ? (
          <button className="cg-button" style={{ marginTop: 20 }} disabled={selected === null || busy} onClick={submit}>
            {busy ? "Checking…" : "Submit answer"}
          </button>
        ) : (
          <div style={{ marginTop: 22 }}>
            <div className="callout">
              <strong>{result.correct ? "Correct" : "Not quite"}.</strong> {result.explanation}
            </div>
            <h3>Thinking principle</h3>
            <p>{result.thinkingPrinciple}</p>
            <h3>AI-age application</h3>
            <p>{result.application}</p>
            {result.errorPattern && !result.correct && (
              <p><span className="cg-pill">Likely pattern: {result.errorPattern.replaceAll("_", " ")}</span></p>
            )}
            <button className="cg-button" onClick={next}>
              {answered.size >= challenges.length ? "See results" : "Next question"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
