/** Legacy responses were not scoped to a user. Never read or recreate them. */
export function removeLegacyResponseCache(storage: Pick<Storage, "removeItem"> | null | undefined) {
  for (const path of ["/api/mobile/profile", "/api/mobile/today"]) {
    try { storage?.removeItem(`cogni:api-cache:${path}`); } catch { /* Unavailable storage must not block sign-in. */ }
  }
}
export function sameAccount(expected: string, actual: string | null | undefined) { return Boolean(expected && actual && expected === actual); }
export function throwIfCancelled(signal?: AbortSignal | null) {
  if (signal?.aborted) { const error = new Error("Request cancelled"); error.name = "AbortError"; throw error; }
}
/** Use an epoch as well as AbortController: even a non-cancellable promise can finish late. */
export function createRequestEpoch() {
  let epoch = 0;
  return { next: () => ++epoch, invalidate: () => { epoch++; }, isCurrent: (value: number) => epoch === value };
}
