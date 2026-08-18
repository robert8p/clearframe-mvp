import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

function requiredPublicEnvironment(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Cogni is missing ${name}.`);
  return value;
}

export const SUPABASE_URL: string = requiredPublicEnvironment("EXPO_PUBLIC_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY: string = requiredPublicEnvironment("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const CHUNK_SIZE = 1800;
const chunkCountKey = (key: string) => `${key}.__parts`;
const chunkKey = (key: string, index: number) => `${key}.__${index}`;
let secureStoreHealthy: boolean | null = null;
let secureStoreWarningLogged = false;

function secureStoreDisabled() { return secureStoreHealthy === false; }
function legacyGet(key: string) {
  try { return globalThis.localStorage?.getItem(key) ?? null; }
  catch { return null; }
}
function legacySet(key: string, value: string) {
  try { globalThis.localStorage?.setItem(key, value); }
  catch { /* storage failure must not crash startup */ }
}
function legacyRemove(key: string) {
  try { globalThis.localStorage?.removeItem(key); }
  catch { /* storage failure must not crash startup */ }
}
function disableSecureStore(error: unknown) {
  secureStoreHealthy = false;
  if (!secureStoreWarningLogged) {
    secureStoreWarningLogged = true;
    console.warn("Secure device storage is unavailable; Cogni is using its local compatibility store for this session.", error instanceof Error ? error.message : String(error));
  }
}
async function canUseSecureStore() {
  if (secureStoreDisabled()) return false;
  if (secureStoreHealthy === true) return true;
  try {
    secureStoreHealthy = await SecureStore.isAvailableAsync();
    return secureStoreHealthy;
  } catch (error) {
    disableSecureStore(error);
    return false;
  }
}
async function secureGet(key: string) {
  if (!(await canUseSecureStore())) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    // Android backup/device-transfer can leave encrypted SharedPreferences that
    // can no longer be decrypted because the old Keystore key was destroyed.
    // Treat that as recoverable local state, never as an app-startup failure.
    try { await SecureStore.deleteItemAsync(key); } catch { /* best effort */ }
    disableSecureStore(error);
    return null;
  }
}
async function secureDelete(key: string) {
  if (!(await canUseSecureStore())) return;
  try { await SecureStore.deleteItemAsync(key); }
  catch (error) { disableSecureStore(error); }
}
async function removeSecureChunks(key: string) {
  if (!(await canUseSecureStore())) return;
  const rawCount = await secureGet(chunkCountKey(key));
  if (secureStoreDisabled()) return;
  const count = Number(rawCount ?? 0);
  if (Number.isInteger(count) && count > 0 && count <= 64) {
    for (let index = 0; index < count; index += 1) await secureDelete(chunkKey(key, index));
  }
  await secureDelete(chunkCountKey(key));
  await secureDelete(key);
}

const secureStorage: SupportedStorage = {
  async getItem(key) {
    if (await canUseSecureStore()) {
      const rawCount = await secureGet(chunkCountKey(key));
      const count = Number(rawCount ?? 0);
      if (!secureStoreDisabled() && Number.isInteger(count) && count > 0 && count <= 64) {
        const chunks: string[] = [];
        for (let index = 0; index < count; index += 1) {
          const value = await secureGet(chunkKey(key, index));
          if (secureStoreDisabled() || value === null) { chunks.length = 0; break; }
          chunks.push(value);
        }
        if (chunks.length === count) return chunks.join("");
      }

      if (!secureStoreDisabled()) {
        const direct = await secureGet(key);
        if (direct) return direct;
      }
    }

    // Compatibility and recovery path from the previous SQLite/localStorage adapter.
    const legacy = legacyGet(key);
    if (legacy) {
      await secureStorage.setItem(key, legacy);
      return legacy;
    }
    return null;
  },
  async setItem(key, value) {
    // Keep a recoverable copy until the secure write has completed successfully.
    legacySet(key, value);
    if (!(await canUseSecureStore())) return;
    try {
      await removeSecureChunks(key);
      if (secureStoreDisabled()) return;
      const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
      for (let index = 0; index < chunks.length; index += 1) {
        await SecureStore.setItemAsync(chunkKey(key, index), chunks[index]);
      }
      await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
      legacyRemove(key);
    } catch (error) {
      // Preserve the compatibility copy and continue. Authentication can safely
      // recover without turning a device-specific keystore failure into a crash.
      disableSecureStore(error);
    }
  },
  async removeItem(key) {
    legacyRemove(key);
    await removeSecureChunks(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
