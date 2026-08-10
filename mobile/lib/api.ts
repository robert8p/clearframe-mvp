import { supabase } from "@/lib/supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://gocogni.vercel.app").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ApiError("Please sign in again.", 401);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(typeof payload?.error === "string" ? payload.error : "Something went wrong.", response.status);
  return payload as T;
}
