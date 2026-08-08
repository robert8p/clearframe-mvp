const DEFAULT_APP_URL = "https://gocogni.vercel.app";

export function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const raw = configured || DEFAULT_APP_URL;
  return raw.replace(/\/$/, "");
}

export const APP_URL = getAppUrl();
