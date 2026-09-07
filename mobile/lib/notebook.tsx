import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "./auth";
import { createNotebookRepository, emptyNotebook, localDay, recordDay, saveIdea, type Notebook, type SavedIdea } from "./notebook-store";

type Tools = { data: Notebook; ready: boolean; busy: boolean; error: string; today: string; reload: () => Promise<void>; save: (idea: Omit<SavedIdea, "savedOn">) => Promise<void>; remove: (id: string) => Promise<void>; setGoal: (goal: Notebook["goal"]) => Promise<void>; recordPracticeDay: () => Promise<void>; clear: () => Promise<void> };
const Context = createContext<Tools | null>(null);
function ScopedNotebook({ accountId, children }: { accountId: string | null; children: React.ReactNode }) {
  const repository = useMemo(() => accountId ? createNotebookRepository(SecureStore, accountId) : null, [accountId]);
  const [data, setData] = useState(emptyNotebook);
  const [ready, setReady] = useState(false), [pending, setPending] = useState(0), [error, setError] = useState("");
  const [today, setToday] = useState(localDay);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const refreshDate = () => { if (AppState.currentState === "active") setToday(localDay()); };
    const app = AppState.addEventListener("change", refreshDate);
    const timer = setInterval(refreshDate, 60000);
    return () => { active.current = false; app.remove(); clearInterval(timer); };
  }, []);
  const reload = useCallback(async () => {
    if (!repository) { setReady(true); return; }
    try { const next = await repository.load(); if (active.current) { setData(next); setReady(true); setError(""); } }
    catch { if (active.current) { setReady(false); setError("Device storage is unavailable. Your online learning progress is unaffected. Try again, or clear only these device tools."); } }
  }, [repository]);
  useEffect(() => { void reload(); }, [reload]);
  const run = useCallback(async (operation: () => Promise<Notebook>) => {
    if (!repository || !active.current) throw new Error("Sign in to use your practice tools.");
    setPending(value => value + 1); setError("");
    try { const next = await operation(); if (active.current) { setData(next); setReady(true); } }
    catch { if (active.current) setError("Couldn’t save on this device. Your online answers are safe. Please try again."); throw new Error("Device save failed."); }
    finally { if (active.current) setPending(value => Math.max(0, value - 1)); }
  }, [repository]);
  const save = useCallback((idea: Omit<SavedIdea, "savedOn">) => run(() => repository!.update(current => saveIdea(current, { ...idea, savedOn: localDay() }))), [repository, run]);
  const remove = useCallback((id: string) => run(() => repository!.update(current => ({ ...current, ideas: current.ideas.filter(idea => idea.id !== id) }))), [repository, run]);
  const setGoal = useCallback((goal: Notebook["goal"]) => run(() => repository!.update(current => ({ ...current, goal: [2, 3, 5].includes(Number(goal)) ? goal : null }))), [repository, run]);
  const recordPracticeDay = useCallback(() => run(() => repository!.update(current => recordDay(current, localDay()))), [repository, run]);
  const clear = useCallback(() => run(() => repository!.clear()), [repository, run]);
  const value = useMemo(() => ({ data, ready, busy: pending > 0, error, today, reload, save, remove, setGoal, recordPracticeDay, clear }), [data, ready, pending, error, today, reload, save, remove, setGoal, recordPracticeDay, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function NotebookProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth(); const id = session?.user.id ?? null;
  // Remount before rendering a new identity: no old-account hydration frame.
  return <ScopedNotebook key={id ?? "signed-out"} accountId={id}>{children}</ScopedNotebook>;
}
export function useNotebook() { const value = React.useContext(Context); if (!value) throw new Error("NotebookProvider is missing."); return value; }
