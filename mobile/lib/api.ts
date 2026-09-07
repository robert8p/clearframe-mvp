import { removeLegacyResponseCache, sameAccount, throwIfCancelled } from "./request-safety";
import { cleanDisplayPayload, cleanDisplayCopy } from "@/lib/copy";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from "@/lib/supabase";

const FUNCTION_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/mobile-api`;
const REQUEST_TIMEOUT_MS = 12_000;
const GET_RETRY_DELAY_MS = 450;
try { removeLegacyResponseCache(globalThis.localStorage); } catch { /* Native storage may be unavailable. */ }

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

function parseBody(body: BodyInit | null | undefined) {
  if (typeof body !== "string" || !body.trim()) return undefined;
  try { return JSON.parse(body); } catch { throw new ApiError("The app prepared an invalid request.", 400, "invalid_request"); }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function invoke<T>(path: string, method: string, body: unknown, accessToken: string, signal?: AbortSignal | null): Promise<{ response: Response; payload: T | Record<string, unknown> }> {
  throwIfCancelled(signal);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
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
    signal?.removeEventListener("abort", cancel);
  }
}

function errorFromPayload(payload: unknown, status: number) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const raw = record.error;
  if (typeof raw === "string") return new ApiError(cleanDisplayCopy(raw), status);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const error = raw as Record<string, unknown>;
    const message = typeof error.message === "string" ? cleanDisplayCopy(error.message) : "Cogni couldn't complete that request.";
    const code = typeof error.code === "string" ? error.code : null;
    const details = error.details && typeof error.details === "object" && !Array.isArray(error.details) ? cleanDisplayPayload(error.details as Record<string, unknown>) : null;
    return new ApiError(message, status, code, details);
  }
  return new ApiError("Cogni couldn't complete that request.", status);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const requestBody = parseBody(options.body);
  throwIfCancelled(options.signal);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ApiError("Please sign in again.", 401, "auth_required");

  const accountId = session.user.id;
  const assertAccount = async () => {
    throwIfCancelled(options.signal);
    const current = await supabase.auth.getSession();
    if (!sameAccount(accountId, current.data.session?.user.id)) throw new ApiError("Your account changed. Please reopen this screen.", 401, "account_changed");
  };
  let token = session.access_token;
  const maxAttempts = method === "GET" ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await assertAccount();
      let result = await invoke<T>(path, method, requestBody, token, options.signal);
      if (result.response.status === 401) {
        await assertAccount();
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data.session?.access_token) {
          if (!sameAccount(accountId, refreshed.data.session.user.id)) throw new ApiError("Please sign in again.", 401, "account_changed");
          token = refreshed.data.session.access_token;
          result = await invoke<T>(path, method, requestBody, token, options.signal);
        }
      }

      if (result.response.ok) {
        const payload = cleanDisplayPayload(result.payload as T);
        // Account deletion deliberately invalidates the caller’s server session.
        if (!(path === "/api/mobile/account" && method === "DELETE")) await assertAccount();
        throwIfCancelled(options.signal);
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
      throwIfCancelled(options.signal);
      lastError = caught;
      if (caught instanceof ApiError) throw caught;
      if (method === "GET" && attempt + 1 < maxAttempts) {
        await wait(GET_RETRY_DELAY_MS);
        continue;
      }
    }
  }

  throwIfCancelled(options.signal);
  if (lastError instanceof Error && lastError.name === "AbortError") throw new ApiError("The request took too long. Check your connection and try again.", 408, "timeout");
  throw new ApiError("Connection interrupted. Check your connection and try again.", 0, "connection_interrupted");
}
