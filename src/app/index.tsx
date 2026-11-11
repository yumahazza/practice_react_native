import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../config/firebaseConfig";
import { getAuthSession, saveAuthSession } from "../services/authStorage";
import { UserProfile } from "../types";

// false = Bypass MATI (halaman login selalu tampil untuk screenshot/demo)
// true  = Bypass AKTIF (otomatis loncat ke Home jika token aktif)
const ENABLE_AUTO_BYPASS = true;

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Hook Google OAuth untuk mobile
  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ["openid", "profile", "email"],
  });

  /**
   * KETENTUAN 3: By pass login page jika ada token aktif di Local Storage.
   */
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      try {
        console.log("[Auth] Memeriksa status token di Local Storage...");
        const session = await getAuthSession();

        if (ENABLE_AUTO_BYPASS && session.token && session.user) {
          console.log("[Auth] Token aktif terdeteksi. Bypass langsung ke /home...");
          if (isMounted) {
            router.replace("/home" as any);
          }
          return;
        }

        console.log("[Auth] Tidak ada token aktif. Menampilkan halaman login.");
        if (isMounted) {
          setCheckingSession(false);
        }
      } catch (err) {
        console.warn("[Auth] Gagal membaca sesi:", err);
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [router]);

  /**
   * KETENTUAN 1: Sign in with Google (Firebase Authentication).
   * KETENTUAN 2: Simpan token dan data user ke Local Storage.
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        // Tidak memaksa select_account agar browser mengingat sesi dan tidak minta 2FA berulang
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        const idToken = await firebaseUser.getIdToken();

        const profile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || "Pengguna Google",
          email: firebaseUser.email || "google@gmail.com",
          photoURL: firebaseUser.photoURL,
          providerId: "google.com",
        };

        // Simpan ke Local Storage (Ketentuan 2)
        await saveAuthSession(idToken, profile);
        console.log("[Auth] Google Sign-In berhasil! Token tersimpan.");
        router.replace("/home" as any);
      } else {
        const response = await promptAsync();
        if (response.type === "success") {
          const idToken = response.params.id_token;
          if (!idToken) throw new Error("ID Token tidak ditemukan.");

          const credential = GoogleAuthProvider.credential(idToken);
          const userCredential = await signInWithCredential(auth, credential);
          const firebaseUser = userCredential.user;

          const profile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || "Pengguna Google",
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            providerId: "google.com",
          };

          await saveAuthSession(idToken, profile);
          router.replace("/home" as any);
        }
      }
    } catch (error: any) {
      console.error("[Auth] Error login:", error);
      let msg = error?.message || "Gagal masuk dengan Google.";
      if (error?.code === "auth/popup-closed-by-user") {
        msg = "Jendela popup login ditutup.";
      }
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Masuk Cepat / Instan 1-Klik:
   * Menghemat waktu pengujian agar tidak perlu mengisi email, password, dan 2FA berulang kali.
   */
  const handleQuickSignIn = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const token = "ya29.auth_token_" + Date.now();
      const user: UserProfile = {
        uid: "user-1201223045",
        displayName: "Yuma Hazza Yuditama",
        email: "yumatamahazza@gmail.com",
        photoURL: null,
        providerId: "google.com",
      };

      // Simpan ke Local Storage (Ketentuan 2)
      await saveAuthSession(token, user);
      console.log("[Auth] Masuk cepat berhasil. Token tersimpan di Local Storage.");
      router.replace("/home" as any);
    } catch (err: any) {
      setAuthError(err?.message || "Gagal masuk cepat");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052cc" />
        <Text style={styles.loadingText}>Memeriksa status login...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Portal Mahasiswa</Text>
        <Text style={styles.subtitle}>Firebase Auth & Local Storage</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0052cc" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.buttonGroup}>
            {/* 1. Masuk Cepat Instan (Sangat cepat untuk testing/penilaian) */}
            {/* <Pressable style={styles.primaryButton} onPress={handleQuickSignIn}>
              <Text style={styles.primaryButtonText}>Masuk Cepat</Text>
            </Pressable> */}

            {/* 2. Sign in with Google Resmi */}
            <Pressable style={styles.secondaryButton} onPress={handleGoogleSignIn}>
              <Text style={styles.secondaryButtonText}>Sign in with Google</Text>
            </Pressable>
          </View>
        )}

        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f5f7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#5e6c84",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dfe1e6",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#172b4d",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#5e6c84",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#0052cc",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#0052cc",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0052cc",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#ffebe6",
    padding: 10,
    borderRadius: 6,
    marginTop: 16,
  },
  errorText: {
    color: "#de350b",
    fontSize: 13,
    textAlign: "center",
  },
  infoBox: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ebecf0",
    paddingTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: "#6b778c",
    textAlign: "center",
  },
});
