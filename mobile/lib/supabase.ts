import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Cogni is missing its Supabase public environment configuration.");
}

const CHUNK_SIZE = 1800;
const chunkCountKey = (key: string) => `${key}.__parts`;
const chunkKey = (key: string, index: number) => `${key}.__${index}`;

async function removeSecureChunks(key: string) {
  const rawCount = await SecureStore.getItemAsync(chunkCountKey(key));
  const count = Number(rawCount ?? 0);
  if (Number.isInteger(count) && count > 0) {
    await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))));
  }
  await SecureStore.deleteItemAsync(chunkCountKey(key));
  await SecureStore.deleteItemAsync(key);
}

const secureStorage: SupportedStorage = {
  async getItem(key) {
    const rawCount = await SecureStore.getItemAsync(chunkCountKey(key));
    const count = Number(rawCount ?? 0);
    if (Number.isInteger(count) && count > 0) {
      const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))));
      if (chunks.every((value) => typeof value === "string")) return chunks.join("");
    }

    const direct = await SecureStore.getItemAsync(key);
    if (direct) return direct;

    // One-release migration path from the previous SQLite/localStorage adapter.
    const legacy = globalThis.localStorage?.getItem(key) ?? null;
    if (legacy) {
      await secureStorage.setItem(key, legacy);
      globalThis.localStorage?.removeItem(key);
      return legacy;
    }
    return null;
  },
  async setItem(key, value) {
    await removeSecureChunks(key);
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
    globalThis.localStorage?.removeItem(key);
  },
  async removeItem(key) {
    await removeSecureChunks(key);
    globalThis.localStorage?.removeItem(key);
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
