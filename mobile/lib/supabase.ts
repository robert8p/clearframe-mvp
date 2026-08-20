import "react-native-url-polyfill/auto";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// Expo only inlines EXPO_PUBLIC values when they are referenced statically with
// dot notation. Do not replace these with a computed lookup or destructuring.
const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const configuredPublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const RUNTIME_CONFIGURATION_ERROR = !configuredUrl
  ? "This Cogni build is missing its Supabase URL."
  : !configuredPublishableKey
    ? "This Cogni build is missing its Supabase publishable key."
    : null;

// Keep module initialisation non-fatal even for a malformed build. Verified
// release builds never use these placeholders; the bundle and emulator gates
// fail before distribution when RUNTIME_CONFIGURATION_ERROR is non-null.
export const SUPABASE_URL = configuredUrl || "https://invalid.invalid";
export const SUPABASE_PUBLISHABLE_KEY = configuredPublishableKey || "missing-publishable-key";

const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 64;
const chunkCountKey = (key: string) => `${key}.__parts`;
const chunkKey = (key: string, index: number) => `${key}.__${index}`;
const memoryStorage = new Map<string, string>();
let secureStoreHealthy: boolean | null = null;
let secureStoreWarningLogged = false;

function secureStoreDisabled() {
  return secureStoreHealthy === false;
}

function disableSecureStore(error: unknown) {
  secureStoreHealthy = false;
  if (secureStoreWarningLogged) return;
  secureStoreWarningLogged = true;
  console.warn(
    "Secure device storage is unavailable; Cogni will keep this session in memory until the app closes.",
    error instanceof Error ? error.message : String(error),
  );
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
    // Restored encrypted preferences can become unreadable when the original
    // Android Keystore key no longer exists. Treat that as disposable local
    // state rather than allowing it to terminate app startup.
    try { await SecureStore.deleteItemAsync(key); } catch { /* best effort */ }
    disableSecureStore(error);
    return null;
  }
}

async function secureDelete(key: string) {
  if (!(await canUseSecureStore())) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    disableSecureStore(error);
  }
}

async function readChunkCount(key: string) {
  const rawCount = await secureGet(chunkCountKey(key));
  if (secureStoreDisabled()) return 0;
  const count = Number(rawCount ?? 0);
  if (Number.isInteger(count) && count > 0 && count <= MAX_CHUNKS) return count;
  if (rawCount !== null) await secureDelete(chunkCountKey(key));
  return 0;
}

async function removeSecureValue(key: string) {
  if (!(await canUseSecureStore())) return;
  const count = await readChunkCount(key);
  if (secureStoreDisabled()) return;
  for (let index = 0; index < count; index += 1) {
    await secureDelete(chunkKey(key, index));
  }
  await secureDelete(chunkCountKey(key));
  await secureDelete(key);
}

const secureStorage: SupportedStorage = {
  async getItem(key) {
    if (await canUseSecureStore()) {
      const count = await readChunkCount(key);
      if (!secureStoreDisabled() && count > 0) {
        const chunks: string[] = [];
        for (let index = 0; index < count; index += 1) {
          const value = await secureGet(chunkKey(key, index));
          if (secureStoreDisabled() || value === null) {
            chunks.length = 0;
            break;
          }
          chunks.push(value);
        }
        if (chunks.length === count) {
          const value = chunks.join("");
          memoryStorage.set(key, value);
          return value;
        }
      }

      // One-release compatibility path for any earlier direct SecureStore value.
      if (!secureStoreDisabled()) {
        const direct = await secureGet(key);
        if (direct) {
          memoryStorage.set(key, direct);
          return direct;
        }
      }
    }

    return memoryStorage.get(key) ?? null;
  },

  async setItem(key, value) {
    // Memory first guarantees a native storage problem can never crash or block
    // the current session. SecureStore remains the persistence layer when healthy.
    memoryStorage.set(key, value);
    if (!(await canUseSecureStore())) return;

    try {
      await removeSecureValue(key);
      if (secureStoreDisabled()) return;

      const chunks = Array.from(
        { length: Math.ceil(value.length / CHUNK_SIZE) },
        (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
      );
      if (!chunks.length || chunks.length > MAX_CHUNKS) {
        disableSecureStore(new Error("Supabase session exceeded the supported secure-storage size."));
        return;
      }

      for (let index = 0; index < chunks.length; index += 1) {
        await SecureStore.setItemAsync(chunkKey(key, index), chunks[index]);
      }
      await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
    } catch (error) {
      disableSecureStore(error);
    }
  },

  async removeItem(key) {
    memoryStorage.delete(key);
    await removeSecureValue(key);
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
