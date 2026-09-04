import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

export type FeedbackCue = "selection" | "correct" | "review" | "incorrect" | "complete";

type FeedbackContextValue = {
  ready: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  playFeedback: (cue: FeedbackCue) => void;
};

type Tone = {
  frequency: number;
  durationMs: number;
  gapMs?: number;
  gain?: number;
};

const SOUND_KEY = "cogni.feedback.sound.v1";
const HAPTICS_KEY = "cogni.feedback.haptics.v1";
const SAMPLE_RATE = 22_050;
const SOUND_VERSION = 1;

const TONES: Record<FeedbackCue, Tone[]> = {
  selection: [{ frequency: 620, durationMs: 42, gain: 0.16 }],
  correct: [
    { frequency: 523.25, durationMs: 62, gapMs: 14, gain: 0.19 },
    { frequency: 659.25, durationMs: 105, gain: 0.20 },
  ],
  review: [
    { frequency: 493.88, durationMs: 70, gapMs: 12, gain: 0.14 },
    { frequency: 440, durationMs: 100, gain: 0.13 },
  ],
  incorrect: [
    { frequency: 392, durationMs: 70, gapMs: 14, gain: 0.13 },
    { frequency: 329.63, durationMs: 110, gain: 0.12 },
  ],
  complete: [
    { frequency: 523.25, durationMs: 72, gapMs: 14, gain: 0.18 },
    { frequency: 659.25, durationMs: 82, gapMs: 14, gain: 0.19 },
    { frequency: 783.99, durationMs: 150, gain: 0.20 },
  ],
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

type Player = ReturnType<typeof createAudioPlayer>;

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function writeWav(notes: Tone[]) {
  const totalSamples = notes.reduce(
    (sum, note) => sum + Math.ceil((note.durationMs + (note.gapMs ?? 0)) * SAMPLE_RATE / 1000),
    0,
  );
  const bytes = new Uint8Array(44 + totalSamples * 2);
  const view = new DataView(bytes.buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, totalSamples * 2, true);

  let outputIndex = 0;
  for (const note of notes) {
    const noteSamples = Math.ceil(note.durationMs * SAMPLE_RATE / 1000);
    const gapSamples = Math.ceil((note.gapMs ?? 0) * SAMPLE_RATE / 1000);
    const attackSamples = Math.max(1, Math.floor(0.006 * SAMPLE_RATE));
    const releaseSamples = Math.max(1, Math.min(noteSamples, Math.floor(0.035 * SAMPLE_RATE)));
    const gain = note.gain ?? 0.16;

    for (let index = 0; index < noteSamples; index += 1) {
      const time = index / SAMPLE_RATE;
      const attack = Math.min(1, index / attackSamples);
      const release = Math.min(1, (noteSamples - index) / releaseSamples);
      const envelope = Math.sin(Math.PI / 2 * Math.min(attack, release)) ** 2;
      const fundamental = Math.sin(2 * Math.PI * note.frequency * time);
      const harmonic = 0.12 * Math.sin(2 * Math.PI * note.frequency * 2 * time);
      const sample = Math.max(-1, Math.min(1, (fundamental + harmonic) * gain * envelope));
      view.setInt16(44 + outputIndex * 2, Math.round(sample * 32_767), true);
      outputIndex += 1;
    }
    outputIndex += gapSamples;
  }

  return bytes;
}

function soundFile(cue: FeedbackCue) {
  const file = new File(Paths.cache, `cogni-feedback-v${SOUND_VERSION}-${cue}.wav`);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
    file.write(writeWav(TONES[cue]));
  }
  return file;
}

async function performHaptic(cue: FeedbackCue) {
  if (Platform.OS === "android") {
    const androidCue = cue === "selection"
      ? Haptics.AndroidHaptics.Segment_Tick
      : cue === "correct" || cue === "complete"
        ? Haptics.AndroidHaptics.Confirm
        : cue === "incorrect"
          ? Haptics.AndroidHaptics.Reject
          : Haptics.AndroidHaptics.Segment_Frequent_Tick;
    await Haptics.performAndroidHapticsAsync(androidCue);
    return;
  }

  if (cue === "selection") {
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
  const soundEnabledRef = useRef(true);
  const hapticsEnabledRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const playersRef = useRef<Map<FeedbackCue, Player>>(new Map());
  const preparationRef = useRef<Promise<void> | null>(null);
  const lastSelectionAtRef = useRef(0);

  const prepareAudio = useCallback(async () => {
    if (playersRef.current.size === Object.keys(TONES).length) return;
    if (preparationRef.current) return preparationRef.current;

    preparationRef.current = (async () => {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: "mixWithOthers",
      });
      for (const cue of Object.keys(TONES) as FeedbackCue[]) {
        if (playersRef.current.has(cue)) continue;
        const player = createAudioPlayer({ uri: soundFile(cue).uri });
        player.volume = 0.55;
        playersRef.current.set(cue, player);
      }
    })().catch((error) => {
      if (__DEV__) console.warn("Cogni feedback audio could not be prepared", error);
    }).finally(() => {
      preparationRef.current = null;
    });

    return preparationRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      SecureStore.getItemAsync(SOUND_KEY),
      SecureStore.getItemAsync(HAPTICS_KEY),
    ]).then(([storedSound, storedHaptics]) => {
      if (cancelled) return;
      const nextSound = storedSound !== "false";
      const nextHaptics = storedHaptics !== "false";
      soundEnabledRef.current = nextSound;
      hapticsEnabledRef.current = nextHaptics;
      setSoundEnabledState(nextSound);
      setHapticsEnabledState(nextHaptics);
      setReady(true);
      if (nextSound) void prepareAudio();
    }).catch((error) => {
      if (__DEV__) console.warn("Cogni feedback preferences could not be loaded", error);
      if (!cancelled) setReady(true);
    });

    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState !== "active") {
        for (const player of playersRef.current.values()) player.pause();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
      for (const player of playersRef.current.values()) player.remove();
      playersRef.current.clear();
    };
  }, [prepareAudio]);

  const playFeedback = useCallback((cue: FeedbackCue) => {
    if (!ready || appStateRef.current !== "active") return;
    if (cue === "selection") {
      const now = Date.now();
      if (now - lastSelectionAtRef.current < 70) return;
      lastSelectionAtRef.current = now;
    }

    if (hapticsEnabledRef.current) {
      void performHaptic(cue).catch((error) => {
        if (__DEV__) console.warn("Cogni haptic feedback failed", error);
      });
    }

    if (soundEnabledRef.current) {
      void (async () => {
        await prepareAudio();
        const player = playersRef.current.get(cue);
        if (!player) return;
        await player.seekTo(0);
        player.play();
      })().catch((error) => {
        if (__DEV__) console.warn("Cogni sound feedback failed", error);
      });
    }
  }, [prepareAudio, ready]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    setSoundEnabledState(enabled);
    void SecureStore.setItemAsync(SOUND_KEY, String(enabled)).catch((error) => {
      if (__DEV__) console.warn("Cogni sound preference could not be saved", error);
    });
    if (enabled) {
      void prepareAudio().then(() => {
        const player = playersRef.current.get("correct");
        if (!player || appStateRef.current !== "active") return;
        void player.seekTo(0).then(() => player.play()).catch(() => undefined);
      });
    } else {
      for (const player of playersRef.current.values()) player.pause();
    }
  }, [prepareAudio]);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    const shouldPreview = hapticsEnabledRef.current || enabled;
    hapticsEnabledRef.current = enabled;
    setHapticsEnabledState(enabled);
    void SecureStore.setItemAsync(HAPTICS_KEY, String(enabled)).catch((error) => {
      if (__DEV__) console.warn("Cogni haptic preference could not be saved", error);
    });
    if (shouldPreview && Platform.OS === "android") {
      void Haptics.performAndroidHapticsAsync(enabled ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off).catch(() => undefined);
    } else if (shouldPreview) {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({
    ready,
    soundEnabled,
    hapticsEnabled,
    setSoundEnabled,
    setHapticsEnabled,
    playFeedback,
  }), [hapticsEnabled, playFeedback, ready, setHapticsEnabled, setSoundEnabled, soundEnabled]);

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const value = React.useContext(FeedbackContext);
  if (!value) throw new Error("useFeedback must be used inside FeedbackProvider");
  return value;
}
