import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from "@/lib/supabase";

const FUNCTION_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/mobile-api`;
const REQUEST_TIMEOUT_MS = 12_000;
const GET_RETRY_DELAY_MS = 450;
const CACHE_TTL_MS = 5 * 60 * 1000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string | null = null,
    public details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function todayApiPath() {
  return "/api/mobile/today";
}

function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function cacheKey(path: string) {
  return `cogni:api-cache:${path.split("?")[0]}`;
}

function readCached<T>(path: string): T | null {
  if (!globalThis.localStorage || !path.startsWith("/api/mobile/profile") && !path.startsWith("/api/mobile/today")) return null;
  try {
    const raw = globalThis.localStorage.getItem(cacheKey(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: T };
    if (!parsed.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeCached(path: string, data: unknown) {
  if (!globalThis.localStorage || !path.startsWith("/api/mobile/profile") && !path.startsWith("/api/mobile/today")) return;
  try {
    globalThis.localStorage.setItem(cacheKey(path), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache failure should never block the live app.
  }
}

function parseBody(body: BodyInit | null | undefined) {
  if (typeof body !== "string" || !body.trim()) return undefined;
  try { return JSON.parse(body); } catch { throw new ApiError("The app prepared an invalid request.", 400, "invalid_request"); }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function invoke<T>(path: string, method: string, body: unknown, accessToken: string): Promise<{ response: Response; payload: T | Record<string, unknown> }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ path, method, body, context: { timeZone: timeZone() } }),
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}

function errorFromPayload(payload: unknown, status: number) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const raw = record.error;
  if (typeof raw === "string") return new ApiError(raw, status);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const error = raw as Record<string, unknown>;
    const message = typeof error.message === "string" ? error.message : "Cogni couldn't complete that request.";
    const code = typeof error.code === "string" ? error.code : null;
    const details = error.details && typeof error.details === "object" && !Array.isArray(error.details) ? error.details as Record<string, unknown> : null;
    return new ApiError(message, status, code, details);
  }
  return new ApiError("Cogni couldn't complete that request.", status);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const requestBody = parseBody(options.body);
  const cache = method === "GET" ? readCached<T>(path) : null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ApiError("Please sign in again.", 401, "auth_required");

  let token = session.access_token;
  const maxAttempts = method === "GET" ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      let result = await invoke<T>(path, method, requestBody, token);
      if (result.response.status === 401) {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data.session?.access_token) {
          token = refreshed.data.session.access_token;
          result = await invoke<T>(path, method, requestBody, token);
        }
      }

      if (result.response.ok) {
        const payload = result.payload as T;
        if (method === "GET") writeCached(path, payload);
        return payload;
      }

      const error = errorFromPayload(result.payload, result.response.status);
      if (method === "GET" && attempt + 1 < maxAttempts && (result.response.status === 429 || result.response.status >= 500)) {
        lastError = error;
        await wait(GET_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    } catch (caught) {
      lastError = caught;
      if (caught instanceof ApiError) throw caught;
      if (method === "GET" && attempt + 1 < maxAttempts) {
        await wait(GET_RETRY_DELAY_MS);
        continue;
      }
    }
  }

  if (cache !== null) return cache;
  if (lastError instanceof Error && lastError.name === "AbortError") throw new ApiError("The request took too long. Check your connection and try again.", 408, "timeout");
  throw new ApiError("Connection interrupted. Check your connection and try again.", 0, "connection_interrupted");
}
