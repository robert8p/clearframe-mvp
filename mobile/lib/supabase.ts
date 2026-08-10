import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://dhklfrqhsmofqrawfdjz.supabase.co";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_Y1pPv4wp0DcQuq3XCEB0GA_mJtNPE2b";

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
