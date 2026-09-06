import { TONES, type SoundCue } from "./feedback-sounds";

export type FeedbackCue = "selection" | SoundCue;
export function isSoundCue(cue: FeedbackCue): cue is SoundCue { return cue !== "selection"; }

export type FeedbackPlayer = {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
  release: () => void;
};

type Dependencies = {
  configure: () => Promise<void>;
  createPlayer: (cue: SoundCue) => FeedbackPlayer | Promise<FeedbackPlayer>;
  onError?: (error: unknown) => void;
};

/** Latest outcome wins. Pending seeks cannot play after mute, background or disposal. */
export function createFeedbackAudio({ configure, createPlayer, onError = () => undefined }: Dependencies) {
  const players = new Map<SoundCue, FeedbackPlayer>();
  let disposed = false;
  let enabled = false;
  let active = true;
  let revision = 0;
  let preparation: Promise<void> | null = null;
  let playback = Promise.resolve();
  const allowed = () => !disposed && enabled && active;
  const safely = (action: () => void) => { try { action(); } catch (error) { onError(error); } };
  const pauseAll = () => { for (const player of players.values()) safely(() => player.pause()); };
  const releaseAll = () => {
    for (const player of players.values()) safely(() => player.release());
    players.clear();
  };

  function prepare(): Promise<void> {
    if (!allowed() || players.size === Object.keys(TONES).length) return Promise.resolve();
    if (preparation) return preparation;
    preparation = Promise.resolve().then(async () => {
      await configure();
      for (const cue of Object.keys(TONES) as SoundCue[]) {
        if (!allowed()) return;
        if (players.has(cue)) continue;
        const player = await createPlayer(cue);
        // A native player may finish loading after the provider has gone away.
        if (!allowed()) { safely(() => player.release()); return; }
        players.set(cue, player);
      }
    }).catch((error) => {
      releaseAll();
      if (!disposed) onError(error);
    }).finally(() => { preparation = null; });
    return preparation;
  }

  function play(cue: SoundCue): Promise<void> {
    const request = ++revision;
    pauseAll();
    if (!allowed()) return Promise.resolve();
    const current = () => request === revision && allowed();
    playback = playback.then(async () => {
      if (!current()) return;
      await prepare();
      if (!current()) return;
      const player = players.get(cue);
      if (!player) return;
      await player.seekTo(0);
      if (!current()) return;
      player.play();
    }).catch((error) => { if (!disposed) onError(error); });
    return playback;
  }

  return {
    prepare,
    play,
    setEnabled(value: boolean) {
      enabled = value;
      revision += 1;
      if (!allowed()) pauseAll();
      else void prepare();
    },
    setActive(value: boolean) {
      active = value;
      revision += 1;
      if (!allowed()) pauseAll();
      else void prepare();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision += 1;
      pauseAll();
      releaseAll();
    },
  };
}

/** Serialise writes per preference so rapid toggles persist the latest choice. */
export function createPreferenceWriter(write: (key: string, value: string) => Promise<void>, onError: (error: unknown) => void) {
  const pending = new Map<string, Promise<void>>();
  return (key: string, value: string) => {
    const task = (pending.get(key) ?? Promise.resolve())
      .then(() => write(key, value))
      .catch(onError);
    pending.set(key, task);
    void task.then(() => { if (pending.get(key) === task) pending.delete(key); });
    return task;
  };
}
