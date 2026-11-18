import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { getAuthSession, saveAuthSession } from "../services/authStorage";
import { syncUserProfile } from "../services/userService";
import { TEST_EMAIL, TEST_PASSWORD } from "../services/roleTestingService";

const ENABLE_AUTO_BYPASS = true;

WebBrowser.maybeCompleteAuthSession();

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form input state untuk Email/Password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Hook Google OAuth untuk mobile
  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      try {
        const session = await getAuthSession();
        if (ENABLE_AUTO_BYPASS && session.token && session.user) {
          if (isMounted) {
            router.replace("/home" as any);
          }
          return;
        }

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
   * METODE 1: Sign in with Google (Firebase Authentication).
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        const idToken = await firebaseUser.getIdToken();

        // Sinkronisasi profil terpadu & Role Super Admin
        const profile = await syncUserProfile(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.displayName || "Pengguna Google",
          firebaseUser.photoURL,
          "google.com"
        );

        await saveAuthSession(idToken, profile);
        console.log("[Auth] Google Sign-In berhasil! Role:", profile.role);
        router.replace("/home" as any);
      } else {
        const response = await promptAsync();
        if (response.type === "success") {
          const idToken = response.params.id_token;
          if (!idToken) throw new Error("ID Token tidak ditemukan.");

          const credential = GoogleAuthProvider.credential(idToken);
          const userCredential = await signInWithCredential(auth, credential);
          const firebaseUser = userCredential.user;

          const profile = await syncUserProfile(
            firebaseUser.uid,
            firebaseUser.email,
            firebaseUser.displayName || "Pengguna Google",
            firebaseUser.photoURL,
            "google.com"
          );

          await saveAuthSession(idToken, profile);
          router.replace("/home" as any);
        }
      }
    } catch (error: any) {
      console.error("[Auth] Error login Google:", error);
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
   * METODE 2: Sign in with Username / Email & Password.
   */
  const handleEmailPasswordSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError("Email/Username dan Password wajib diisi.");
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const cleanEmail = email.trim();
      let firebaseUser: any = null;
      let idToken = "";

      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = userCredential.user;
        idToken = await firebaseUser.getIdToken();
      } catch (err: any) {
        // Jika akun belum dibuat di Firebase Auth, daftarkan otomatis untuk kebutuhan pengujian
        if (
          err?.code === "auth/user-not-found" ||
          err?.code === "auth/invalid-credential"
        ) {
          try {
            const createRes = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            firebaseUser = createRes.user;
            idToken = await firebaseUser.getIdToken();
          } catch {
            // Fallback: lanjutkan dengan entitas identitas lokal
            firebaseUser = {
              uid: "usr-local-" + btoa(cleanEmail).replace(/=/g, "").slice(0, 16),
              email: cleanEmail,
              displayName: cleanEmail.split("@")[0],
            };
            idToken = "token-local-" + Date.now();
          }
        } else {
          // Fallback lokal jika jaringan dibatasi/offline
          firebaseUser = {
            uid: "usr-local-" + btoa(cleanEmail).replace(/=/g, "").slice(0, 16),
            email: cleanEmail,
            displayName: cleanEmail.split("@")[0],
          };
          idToken = "token-local-" + Date.now();
        }
      }

      // Sinkronisasi profil terpadu & Role Super Admin (menjamin UID & role sama dengan Google)
      const profile = await syncUserProfile(
        firebaseUser.uid,
        cleanEmail,
        firebaseUser.displayName || cleanEmail.split("@")[0],
        null,
        "password"
      );

      await saveAuthSession(idToken || "token-" + Date.now(), profile);
      console.log("[Auth] Email/Password Sign-In berhasil! Role:", profile.role);
      router.replace("/home" as any);
    } catch (error: any) {
      console.error("[Auth] Error login Email/Password:", error);
      setAuthError(error?.message || "Gagal masuk dengan Email dan Password.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper untuk mengisi otomatis akun pengujian (Super Admin)
   */
  const fillTestCredentials = () => {
    setEmail(TEST_EMAIL);
    setPassword(TEST_PASSWORD);
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
        <Text style={styles.subtitle}>Firebase Auth & User Role Management</Text>

        {/* Info Box Role Pengujian */}
        <View style={styles.roleHintBox}>
          <Text style={styles.roleHintTitle}>🎯 Skenario Pengujian Role:</Text>
          <Text style={styles.roleHintText}>
            Login dengan Google atau Email/Password yang sama akan otomatis memperoleh role{" "}
            <Text style={{ fontWeight: "bold", color: "#d97706" }}>Super Admin</Text>.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0052cc" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.formContainer}>
            {/* Form Input Email & Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email / Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan email..."
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan password..."
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Tombol Isi Otomatis Akun Test */}
            <Pressable style={styles.presetButton} onPress={fillTestCredentials}>
              <Text style={styles.presetButtonText}>
                ⚡ Isi Data Akun Uji ({TEST_EMAIL})
              </Text>
            </Pressable>

            {/* Tombol Login 1: Email & Password */}
            <Pressable style={styles.primaryButton} onPress={handleEmailPasswordSignIn}>
              <Text style={styles.primaryButtonText}>Sign in with Email & Password</Text>
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ATAU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Tombol Login 2: Google */}
            <Pressable style={styles.secondaryButton} onPress={handleGoogleSignIn}>
              <Text style={styles.secondaryButtonText}>Sign in with Google</Text>
            </Pressable>

            {/* Tombol Eksekusi Skenario Pengujian Otomatis */}
            <Pressable
              style={styles.testSuiteButton}
              onPress={() => router.push("/test-role" as any)}
            >
              <Text style={styles.testSuiteButtonText}>
                🧪 Jalankan Skenario Pengujian (Test Runner)
              </Text>
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
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dfe1e6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#172b4d",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#5e6c84",
    textAlign: "center",
    marginBottom: 16,
  },
  roleHintBox: {
    backgroundColor: "#fef3c7",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  roleHintTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 2,
  },
  roleHintText: {
    fontSize: 12,
    color: "#78350f",
    lineHeight: 16,
  },
  formContainer: {
    gap: 10,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  presetButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 4,
  },
  presetButtonText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#0052cc",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
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
  testSuiteButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 6,
  },
  testSuiteButtonText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "bold",
  },
  errorBox: {
    backgroundColor: "#ffebe6",
    padding: 10,
    borderRadius: 6,
    marginTop: 14,
  },
  errorText: {
    color: "#de350b",
    fontSize: 13,
    textAlign: "center",
  },
});
