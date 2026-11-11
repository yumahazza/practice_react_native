import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile, AuthSession } from "../types";

export const TOKEN_KEY = "@firebase_login_token";
export const USER_KEY = "@firebase_login_user";

const ALL_KEYS = [
  TOKEN_KEY,
  USER_KEY,
  "@firebase_google_id_token",
  "@firebase_google_user_data",
  "@layout-simple/firebase_id_token",
  "@layout-simple/firebase_user",
  "access_token",
  "user_data",
  "user_token",
  "auth_session",
];

// Inisialisasi MMKV opsional (aman di Web dan Expo Go)
let mmkvStorage: {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  delete: (key: string) => void;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMMKV } = require("react-native-mmkv");
  mmkvStorage = createMMKV();
} catch (_) {
  // Fallback ke AsyncStorage
}

/**
 * Menyimpan token dan data profil login ke Local Storage.
 * Sesuai Ketentuan 2.
 */
export async function saveAuthSession(token: string, user: UserProfile): Promise<void> {
  const userJson = JSON.stringify(user);

  try {
    // 1. Simpan ke AsyncStorage
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, userJson);

    // 2. Simpan ke localStorage Web langsung jika di browser
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, userJson);
    }

    // 3. Simpan ke MMKV jika tersedia
    if (mmkvStorage) {
      try {
        mmkvStorage.set(TOKEN_KEY, token);
        mmkvStorage.set(USER_KEY, userJson);
      } catch (_) {}
    }

    console.log("[AuthStorage] Token berhasil disimpan ke Local Storage:", token);
    console.log("[AuthStorage] User:", user.displayName || user.email);
  } catch (error) {
    console.error("[AuthStorage] Gagal menyimpan sesi:", error);
  }
}

/**
 * Mengambil data sesi login dari Local Storage.
 * Sesuai Ketentuan 3 untuk memeriksa apakah ada token aktif.
 */
export async function getAuthSession(): Promise<AuthSession> {
  try {
    let token: string | null = null;
    let userJson: string | null = null;

    // 1. Cek langsung dari window.localStorage jika di browser
    if (typeof window !== "undefined" && window.localStorage) {
      token = window.localStorage.getItem(TOKEN_KEY);
      userJson = window.localStorage.getItem(USER_KEY);
    }

    // 2. Cek dari MMKV jika belum ditemukan
    if ((!token || !userJson) && mmkvStorage) {
      try {
        token = token || mmkvStorage.getString(TOKEN_KEY) || null;
        userJson = userJson || mmkvStorage.getString(USER_KEY) || null;
      } catch (_) {}
    }

    // 3. Cek dari AsyncStorage jika belum ditemukan
    if (!token || !userJson) {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      token = token || storedToken;
      userJson = userJson || storedUser;
    }

    if (!token || !userJson) {
      return { token: null, user: null };
    }

    let user: UserProfile | null = null;
    try {
      user = JSON.parse(userJson);
    } catch (_) {
      user = null;
    }

    if (!user) {
      return { token: null, user: null };
    }

    return { token, user };
  } catch (error) {
    console.error("[AuthStorage] Gagal membaca sesi:", error);
    return { token: null, user: null };
  }
}

/**
 * Menghapus token dan data login saat Logout.
 */
export async function clearAuthSession(): Promise<void> {
  try {
    // 1. Bersihkan dari window.localStorage Web secara menyeluruh
    if (typeof window !== "undefined" && window.localStorage) {
      ALL_KEYS.forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch (_) {}
      });
      // Bersihkan juga sisa key firebase auth
      try {
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith("@firebase") || k.startsWith("firebase:authUser") || k.includes("token"))) {
            window.localStorage.removeItem(k);
          }
        }
      } catch (_) {}
    }

    // 2. Bersihkan dari AsyncStorage
    await AsyncStorage.multiRemove(ALL_KEYS);

    // 3. Bersihkan dari MMKV jika ada
    if (mmkvStorage) {
      ALL_KEYS.forEach((key) => {
        try {
          mmkvStorage.delete(key);
        } catch (_) {}
      });
    }

    console.log("[AuthStorage] Sesi login telah dibersihkan secara total.");
  } catch (error) {
    console.error("[AuthStorage] Gagal menghapus sesi:", error);
  }
}
