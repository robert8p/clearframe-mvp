/** Private, device-local practice tools. Never used for scores or entitlements. */
export type SavedIdea = { id: string; title: string; principle: string; application: string; savedOn: string };
export type Notebook = { version: 1; goal: 2 | 3 | 5 | null; days: string[]; ideas: SavedIdea[] };
export type EncryptedStorage = { getItemAsync(key: string): Promise<string | null>; setItemAsync(key: string, value: string): Promise<void>; deleteItemAsync(key: string): Promise<void> };
export const MAX_IDEAS = 12;
const MAX_PARTS = 96;
const PART_SIZE = 1800;
export function emptyNotebook(): Notebook { return { version: 1, goal: null, days: [], ideas: [] }; }
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function text(value: unknown, max: number) { return typeof value === "string" ? Array.from(value.trim()).slice(0, max).join("") : ""; }
export function ideaFrom(value: unknown): SavedIdea | null {
  if (!value || typeof value !== "object") return null;
  const x = value as Record<string, unknown>;
  const id = text(x.id, 100), title = text(x.title, 100), principle = text(x.principle, 420), application = text(x.application, 420);
  if (!id || !title || !principle || !validDay(x.savedOn)) return null;
  return { id, title, principle, application, savedOn: x.savedOn };
}
export function parseNotebook(raw: string): Notebook {
  const x = JSON.parse(raw);
  if (!x || x.version !== 1 || !Array.isArray(x.days) || !Array.isArray(x.ideas)) throw new Error("Saved practice tools could not be read.");
  const ids = new Set<string>();
  const ideas = x.ideas.map(ideaFrom).filter((idea: SavedIdea | null): idea is SavedIdea => {
    if (!idea || ids.has(idea.id)) return false;
    ids.add(idea.id); return true;
  }).slice(0, MAX_IDEAS);
  return { version: 1, goal: [2, 3, 5].includes(x.goal) ? x.goal : null, days: [...new Set<string>(x.days.filter(validDay))].sort().slice(-28), ideas };
}
export function saveIdea(state: Notebook, value: SavedIdea): Notebook {
  const idea = ideaFrom(value);
  if (!idea) throw new Error("This idea is not ready to save.");
  return { ...state, ideas: [idea, ...state.ideas.filter(item => item.id !== idea.id)].slice(0, MAX_IDEAS) };
}
export function recordDay(state: Notebook, day: string): Notebook {
  if (!validDay(day)) throw new Error("Invalid practice date.");
  return state.days.includes(day) ? state : { ...state, days: [...state.days, day].sort().slice(-28) };
}
export function weekProgress(state: Notebook, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const today = localDay(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(date.getDate() + index);
    const key = localDay(date);
    return { key, label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index], done: key <= today && state.days.includes(key), today: key === today, future: key > today };
  });
  return { days, count: days.filter(day => day.done).length, goal: state.goal };
}

/** Two encrypted banks: a failed write never replaces the last complete snapshot.
 * ASCII JSON keeps every SecureStore value below 2KB even with emoji/non-Latin text.
 * A serial queue protects rapid taps, concurrent activity and clear operations. */
export function createNotebookRepository(storage: EncryptedStorage, accountId: string) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(accountId)) throw new Error("Invalid account scope.");
  const prefix = `cogni.tools.v1.${accountId}`;
  let state: Notebook | null = null;
  let bank: "a" | "b" | null = null;
  let queue = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation); queue = result.then(() => undefined, () => undefined); return result;
  };
  async function read() {
    if (state) return state;
    const pointer = await storage.getItemAsync(`${prefix}.current`);
    if (pointer === null) { state = emptyNotebook(); bank = null; return state; }
    if (pointer !== "a" && pointer !== "b") throw new Error("Saved practice tools could not be read.");
    const count = Number(await storage.getItemAsync(`${prefix}.${pointer}.count`));
    if (!Number.isInteger(count) || count < 1 || count > MAX_PARTS) throw new Error("Saved practice tools are incomplete.");
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => storage.getItemAsync(`${prefix}.${pointer}.${i}`)));
    if (parts.some(part => part === null)) throw new Error("Saved practice tools are incomplete.");
    state = parseNotebook(parts.join("")); bank = pointer; return state;
  }
  async function write(next: Notebook) {
    const raw = JSON.stringify(next).replace(/[\u007f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
    const count = Math.ceil(raw.length / PART_SIZE);
    if (count > MAX_PARTS) throw new Error("Saved ideas are too large for device storage.");
    const target = bank === "a" ? "b" : "a";
    for (let i = 0; i < count; i++) await storage.setItemAsync(`${prefix}.${target}.${i}`, raw.slice(i * PART_SIZE, (i + 1) * PART_SIZE));
    await storage.setItemAsync(`${prefix}.${target}.count`, String(count));
    await storage.setItemAsync(`${prefix}.current`, target);
    state = next; bank = target; return next;
  }
  return {
    load: () => serial(read),
    update: (change: (current: Notebook) => Notebook) => serial(async () => {
      const current = await read(); const next = change(current);
      return next === current ? current : write(next);
    }),
    clear: () => serial(async () => {
      // Delete both banks, including partial writes, only within this account.
      // Keep the pointer until all chunks are removed; an interrupted clear is
      // reported as incomplete, never shown as a successfully cleared notebook.
      state = null; bank = null;
      for (const slot of ["a", "b"]) {
        for (let i = 0; i < MAX_PARTS; i++) await storage.deleteItemAsync(`${prefix}.${slot}.${i}`);
        await storage.deleteItemAsync(`${prefix}.${slot}.count`);
      }
      await storage.deleteItemAsync(`${prefix}.current`);
      state = emptyNotebook(); bank = null; return state;
    }),
  };
}
