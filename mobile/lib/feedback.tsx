import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { createFeedbackAudio, createPreferenceWriter, isSoundCue, type FeedbackCue } from "./feedback-runtime";
import { TONES, writeWav, type SoundCue } from "./feedback-sounds";

export type { FeedbackCue } from "./feedback-runtime";
type FeedbackContextValue = {
  ready: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  playFeedback: (cue: FeedbackCue) => void;
};

const SOUND_KEY = "cogni.feedback.sound.v1";
const HAPTICS_KEY = "cogni.feedback.haptics.v1";
// Invalidate zero-byte/partial files produced by the old WAV allocation bug.
const SOUND_VERSION = 3;
const FeedbackContext = createContext<FeedbackContextValue | null>(null);
const report = (error: unknown) => { if (__DEV__) console.warn("Cogni feedback unavailable", error); };
const preferenceFallback = new Map<string, string>();

async function canUsePreferenceStore() {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    report(error);
    return false;
  }
}

async function readPreference(key: string) {
  if (!(await canUsePreferenceStore())) return preferenceFallback.get(key) ?? null;
  try {
    const value = key === SOUND_KEY
      ? await SecureStore.getItemAsync(SOUND_KEY)
      : key === HAPTICS_KEY
        ? await SecureStore.getItemAsync(HAPTICS_KEY)
        : await SecureStore.getItemAsync(key);
    if (value !== null) preferenceFallback.set(key, value);
    return value;
  } catch (error) {
    report(error);
    return preferenceFallback.get(key) ?? null;
  }
}

async function writePreference(key: string, value: string) {
  preferenceFallback.set(key, value);
  if (!(await canUsePreferenceStore())) return;
  await SecureStore.setItemAsync(key, value);
}

function soundFile(cue: SoundCue) {
  const bytes = writeWav(TONES[cue]); // Synthesis must succeed BEFORE creating a file.
  const file = new File(Paths.cache, `cogni-feedback-v${SOUND_VERSION}-${cue}.wav`);
  if (!file.exists || file.size !== bytes.length) {
    file.create({ intermediates: true, overwrite: true });
    file.write(bytes);
  }
  return file;
}

async function makePlayer(cue: SoundCue) {
  const player = createAudioPlayer({ uri: soundFile(cue).uri });
  player.volume = 0.55;
  try {
    // Wait for native readiness, but never hold a learning interaction open.
    if (!player.isLoaded) await new Promise<void>((resolve, reject) => {
      let subscription: { remove: () => void } | undefined;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true; clearTimeout(timer); subscription?.remove();
        if (error) reject(error); else resolve();
      };
      const timer = setTimeout(() => finish(new Error("Feedback audio load timed out")), 1500);
      try {
        subscription = player.addListener("playbackStatusUpdate", (status) => {
          if (status.isLoaded) finish();
        });
        if (settled) subscription.remove();
        else if (player.isLoaded) finish();
      } catch (error) { finish(error instanceof Error ? error : new Error("Feedback audio unavailable")); }
    });
    return player;
  } catch (error) {
    player.release();
    throw error;
  }
}

async function performHaptic(cue: FeedbackCue) {
  if (Platform.OS === "android") {
    const androidCue = cue === "selection" ? Haptics.AndroidHaptics.Segment_Tick
      : cue === "correct" || cue === "complete" ? Haptics.AndroidHaptics.Confirm
        : cue === "incorrect" ? Haptics.AndroidHaptics.Reject : Haptics.AndroidHaptics.Segment_Frequent_Tick;
    await Haptics.performAndroidHapticsAsync(androidCue);
  } else if (cue === "selection") {
    await Haptics.selectionAsync();
  } else if (cue === "correct" || cue === "complete") {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (cue === "incorrect") {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } else {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  }
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const readyRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const hapticsEnabledRef = useRef(true);
  const screenReaderRef = useRef(false);
  const activeRef = useRef(AppState.currentState === "active");
  const audioRef = useRef<ReturnType<typeof createFeedbackAudio> | null>(null);
  const lastSelectionAtRef = useRef(0);
  const persist = useMemo(() => createPreferenceWriter(writePreference, report), []);

  useEffect(() => {
    let cancelled = false;
    let screenReaderChanged = false;
    readyRef.current = false;
    const audio = createFeedbackAudio({
      configure: () => setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: "mixWithOthers",
      }),
      createPlayer: makePlayer,
      onError: report,
    });
    audioRef.current = audio;
    activeRef.current = AppState.currentState === "active";
    audio.setActive(activeRef.current);
    const appSubscription = AppState.addEventListener("change", (state) => {
      activeRef.current = state === "active";
      audio.setActive(activeRef.current);
    });
    const readerSubscription = AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
      screenReaderChanged = true;
      screenReaderRef.current = enabled;
      audio.setEnabled(readyRef.current && soundEnabledRef.current && !enabled);
    });
    void Promise.all([
      readPreference(SOUND_KEY),
      readPreference(HAPTICS_KEY),
      AccessibilityInfo.isScreenReaderEnabled().catch(() => true),
    ]).then(([storedSound, storedHaptics, readerEnabled]) => {
      if (cancelled) return;
      soundEnabledRef.current = storedSound !== "false";
      hapticsEnabledRef.current = storedHaptics !== "false";
      if (!screenReaderChanged) screenReaderRef.current = readerEnabled;
      setSoundEnabledState(soundEnabledRef.current);
      setHapticsEnabledState(hapticsEnabledRef.current);
      readyRef.current = true;
      setReady(true);
      audio.setEnabled(soundEnabledRef.current && !screenReaderRef.current);
    });
    return () => {
      cancelled = true;
      readyRef.current = false;
      appSubscription.remove();
      readerSubscription.remove();
      audio.dispose();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, []);

  const playFeedback = useCallback((cue: FeedbackCue) => {
    if (!readyRef.current || !activeRef.current) return;
    if (cue === "selection") {
      const now = Date.now();
      if (now - lastSelectionAtRef.current < 70) return;
      lastSelectionAtRef.current = now;
    }
    if (hapticsEnabledRef.current) void performHaptic(cue).catch(report);
    // Screen-reader speech takes priority. Selection remains haptic-only.
    if (soundEnabledRef.current && isSoundCue(cue) && !screenReaderRef.current) {
      void audioRef.current?.play(cue);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    if (!readyRef.current) return;
    soundEnabledRef.current = enabled;
    setSoundEnabledState(enabled);
    void persist(SOUND_KEY, String(enabled));
    audioRef.current?.setEnabled(enabled && !screenReaderRef.current);
    if (enabled && !screenReaderRef.current) void audioRef.current?.play("correct");
  }, [persist]);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    if (!readyRef.current) return;
    hapticsEnabledRef.current = enabled;
    setHapticsEnabledState(enabled);
    void persist(HAPTICS_KEY, String(enabled));
    // Native Switch already supplies its own toggle feedback; no second buzz.
  }, [persist]);

  const value = useMemo<FeedbackContextValue>(() => ({
    ready, soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled, playFeedback,
  }), [ready, soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled, playFeedback]);
  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const value = React.useContext(FeedbackContext);
  if (!value) throw new Error("useFeedback must be used inside FeedbackProvider");
  return value;
}
