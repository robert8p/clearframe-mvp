import React, { createContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthValue = { session: Session | null; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

function parametersFromUrl(url: string) {
  const result = new URLSearchParams();
  const query = url.includes("?") ? url.split("?")[1]?.split("#")[0] ?? "" : "";
  const hash = url.includes("#") ? url.split("#")[1] ?? "" : "";
  for (const source of [query, hash]) {
    const params = new URLSearchParams(source);
    params.forEach((value, key) => result.set(key, value));
  }
  return result;
}

async function applyAuthUrl(url: string | null) {
  if (!url) return;
  const params = parametersFromUrl(url);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const code = params.get("code");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) console.warn("Could not establish Cogni auth session from link", error.message);
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn("Could not exchange Cogni auth code", error.message);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void Promise.all([supabase.auth.getSession(), Linking.getInitialURL()]).then(async ([sessionResult, initialUrl]) => {
      if (initialUrl) await applyAuthUrl(initialUrl);
      const latest = await supabase.auth.getSession();
      if (mounted) { setSession(latest.data.session ?? sessionResult.data.session); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next); setLoading(false);
    });
    const linkListener = Linking.addEventListener("url", ({ url }) => { void applyAuthUrl(url); });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      linkListener.remove();
      appState.remove();
    };
  }, []);

  const value = useMemo<AuthValue>(() => ({ session, loading, signOut: async () => { await supabase.auth.signOut(); } }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
