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
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChallengeRunner({
  challenges,
  mode,
  sessionId,
  initialAnsweredChallengeIds = [],
}: Props) {
  const initiallyAnswered = useMemo(
    () => new Set(initialAnsweredChallengeIds),
    [initialAnsweredChallengeIds],
  );

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
  const [runtimeSessionId] = useState(
    () => sessionId ?? createRuntimeSessionId(),
  );
  const [answered, setAnswered] = useState(
    () => new Set(initialAnsweredChallengeIds),
  );

  const router = useRouter();
  const challenge = challenges[index];

  const progress = useMemo(() => {
    if (!challenges.length) return 0;
    return Math.round((answered.size / challenges.length) * 100);
  }, [answered, challenges.length]);

  useEffect(() => {
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: mode === "diagnostic" ? "diagnostic_started" : "session_started",
        properties: {
          session_id: runtimeSessionId,
          resumed: mode === "training" && initialAnsweredChallengeIds.length > 0,
        },
      }),
    });
  }, [
    mode,
    runtimeSessionId,
    initialAnsweredChallengeIds.length,
  ]);

  useEffect(() => {
    if (!challenge) return;

    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName: "challenge_viewed",
        properties: {
          session_id: runtimeSessionId,
          challenge_id: challenge.id,
          index,
        },
      }),
    });
  }, [challenge, index, runtimeSessionId]);

  if (!challenge) {
    return (
      <section className="card">
        <h2>No challenges available</h2>
        <p className="muted">
          Run the seed migration, then refresh this page.
        </p>
      </section>
    );
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
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName:
          mode === "diagnostic" ? "diagnostic_completed" : "session_completed",
        properties: { session_id: runtimeSessionId },
      }),
    });

    router.push(
      mode === "diagnostic"
        ? "/diagnostic/results"
        : "/session-complete",
    );
    router.refresh();
  }

  function next() {
    const nextIndex = challenges.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > index && !answered.has(candidate.id),
    );

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
          <div className="kicker">
            {mode} · {index + 1} of {challenges.length}
          </div>
        </div>
        <span className="pill">
          Difficulty {challenge.difficulty}/100
        </span>
      </div>

      <div className="progress" style={{ marginBottom: 20 }}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="card">
        <div className="kicker">
          {challenge.challenge_type.replaceAll("_", " ")}
        </div>

        <h2 style={{ fontSize: 26, marginTop: 8 }}>
          {challenge.title}
        </h2>

        <p style={{ fontSize: 17 }}>{challenge.prompt}</p>

        <div>
          {challenge.options.map((option, optionIndex) => {
            let className = "option";

            if (selected === optionIndex) className += " selected";
            if (result && optionIndex === result.correctIndex) {
              className += " correct";
            }
            if (
              result &&
              selected === optionIndex &&
              !result.correct
            ) {
              className += " incorrect";
            }

            return (
              <button
                disabled={Boolean(result)}
                className={className}
                key={optionIndex}
                onClick={() => setSelected(optionIndex)}
              >
                <strong>
                  {String.fromCharCode(65 + optionIndex)}.
                </strong>{" "}
                {option}
              </button>
            );
          })}
        </div>

        {challenge.confidence_required && !result && (
          <div style={{ marginTop: 18 }}>
            <label>
              How confident are you? {confidence}%
            </label>
            <input
              style={{ width: "100%" }}
              type="range"
              min="20"
              max="100"
              step="10"
              value={confidence}
              onChange={(event) =>
                setConfidence(Number(event.target.value))
              }
            />
          </div>
        )}

        {!result ? (
          <button
            className="button"
            style={{ marginTop: 20 }}
            disabled={selected === null || busy}
            onClick={submit}
          >
            {busy ? "Checking…" : "Submit answer"}
          </button>
        ) : (
          <div
            style={{ marginTop: 22 }}
            onMouseEnter={() => {
              void fetch("/api/event", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  eventName: "explanation_viewed",
                  properties: {
                    session_id: runtimeSessionId,
                    challenge_id: challenge.id,
                  },
                }),
              });
            }}
          >
            <div className="callout">
              <strong>
                {result.correct ? "Correct" : "Not quite"}.
              </strong>{" "}
              {result.explanation}
            </div>

            <h3>Thinking principle</h3>
            <p>{result.thinkingPrinciple}</p>

            <h3>AI-era application</h3>
            <p className="muted">{result.application}</p>

            {result.errorPattern && !result.correct && (
              <p>
                <span className="pill">
                  Likely pattern:{" "}
                  {result.errorPattern.replaceAll("_", " ")}
                </span>
              </p>
            )}

            <button className="button" onClick={next}>
              {answered.size >= challenges.length
                ? "See results"
                : "Next challenge"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
