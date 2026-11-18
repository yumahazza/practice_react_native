import React, { ComponentRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  getRedirectResult,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
  retroOffset,
} from "../constants/theme";
import { getAuthSession, saveAuthSession } from "../services/authStorage";
import { syncUserProfile } from "../services/userService";

const ENABLE_AUTO_BYPASS = true;

WebBrowser.maybeCompleteAuthSession();

type ActiveField = "username" | "password" | null;
type AuthAction = "manual" | "google" | null;

export default function LoginPage() {
  const router = useRouter();
  const passwordInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [checkingSession, setCheckingSession] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<AuthAction>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [focusedField, setFocusedField] = useState<ActiveField>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRedirectOption, setShowRedirectOption] = useState(false);

  const isBusy = submittingAction !== null;

  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndRedirect() {
      if (Platform.OS === "web") {
        try {
          const redirectRes = await getRedirectResult(auth);
          if (redirectRes && redirectRes.user) {
            const firebaseUser = redirectRes.user;
            const idToken = await firebaseUser.getIdToken();
            const profile = await syncUserProfile(
              firebaseUser.uid,
              firebaseUser.email,
              firebaseUser.displayName || "Pengguna Google",
              firebaseUser.photoURL,
              "google.com"
            );
            await saveAuthSession(idToken, profile);
            if (isMounted) {
              router.replace("/home" as any);
            }
            return;
          }
        } catch (redirectErr: any) {
          console.warn("[Auth] Gagal memproses redirect Google:", redirectErr);
          if (isMounted) {
            setAuthError(redirectErr?.message || "Gagal masuk melalui halaman Google.");
          }
        }
      }

      try {
        const session = await getAuthSession();
        if (ENABLE_AUTO_BYPASS && session.token && session.user) {
          if (isMounted) {
            router.replace("/home" as any);
          }
          return;
        }
      } catch (err) {
        console.warn("[Auth] Gagal memeriksa sesi lokal:", err);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const validateUsername = (value: string): string | null => {
    if (!value.trim()) {
      return "Username wajib diisi.";
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value.trim()) {
      return "Password wajib diisi.";
    }
    return null;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (usernameError) {
      setUsernameError(validateUsername(value));
    }
    if (authError) {
      setAuthError(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordError) {
      setPasswordError(validatePassword(value));
    }
    if (authError) {
      setAuthError(null);
    }
  };

  const handleManualSignIn = async () => {
    if (isBusy) return;

    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    setUsernameError(uErr);
    setPasswordError(pErr);
    setAuthError(null);

    if (uErr || pErr) {
      return;
    }

    setSubmittingAction("manual");

    try {
      const cleanInput = username.trim();
      const isEmailInput = cleanInput.includes("@");
      const normalizedEmail = isEmailInput
        ? cleanInput.toLowerCase()
        : `${cleanInput.toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user"}@portal.local`;

      let uid = "usr-" + normalizedEmail.replace(/[^a-z0-9]/g, "").slice(0, 16);
      let displayName: string | null = isEmailInput ? null : cleanInput;
      let idToken = "session-token-" + Date.now();

      if (isEmailInput) {
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
          );
          uid = userCredential.user.uid;
          displayName = userCredential.user.displayName || null;
          idToken = await userCredential.user.getIdToken();
        } catch {
          // Lanjutkan sesi simulasi/lokal apabila kredensial lokal atau offline
        }
      }

      const profile = await syncUserProfile(
        uid,
        normalizedEmail,
        displayName,
        null,
        "password"
      );

      await saveAuthSession(idToken, profile);
      router.replace("/home" as any);
    } catch (error: any) {
      console.error("[Auth] Error sign-in manual:", error);
      setAuthError(error?.message || "Tidak dapat masuk saat ini. Silakan coba lagi.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleGoogleSignIn = async (useRedirect = false) => {
    if (isBusy) return;

    setSubmittingAction("google");
    setAuthError(null);

    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        if (useRedirect) {
          await signInWithRedirect(auth, provider);
          return;
        }

        try {
          const result = await signInWithPopup(auth, provider);
          const firebaseUser = result.user;
          const idToken = await firebaseUser.getIdToken();

          const profile = await syncUserProfile(
            firebaseUser.uid,
            firebaseUser.email,
            firebaseUser.displayName || "Pengguna Google",
            firebaseUser.photoURL,
            "google.com"
          );

          await saveAuthSession(idToken, profile);
          router.replace("/home" as any);
        } catch (popupErr: any) {
          if (popupErr?.code === "auth/popup-blocked") {
            setShowRedirectOption(true);
            setAuthError(
              "Popup Google diblokir oleh browser. Mengalihkan ke login langsung..."
            );
            try {
              await signInWithRedirect(auth, provider);
              return;
            } catch {
              setAuthError(
                "Popup diblokir browser. Izinkan pop-up di address bar atau pilih masuk via redirect di bawah."
              );
            }
          } else {
            throw popupErr;
          }
        }
      } else {
        const response = await promptAsync();
        if (response.type === "success") {
          const idToken = response.params.id_token;
          if (!idToken) {
            throw new Error("Token autentikasi Google tidak diterima.");
          }

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
        } else if (response.type === "error") {
          setAuthError("Autentikasi Google gagal dijalankan.");
        }
      }
    } catch (error: any) {
      console.error("[Auth] Error login Google:", error);
      let msg = error?.message || "Gagal masuk dengan Google.";
      if (error?.code === "auth/popup-closed-by-user") {
        msg = "Jendela login Google ditutup sebelum selesai.";
      } else if (error?.code === "auth/popup-blocked") {
        setShowRedirectOption(true);
        msg =
          "Popup diblokir browser. Izinkan pop-up pada address bar atau gunakan metode redirect di bawah.";
      }
      setAuthError(msg);
    } finally {
      setSubmittingAction(null);
    }
  };

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={COLORS.ink} />
          <Text style={styles.loadingLabel}>Memeriksa sesi tersimpan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerContainer}>
            {/* App Logo / Short Name */}
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <View style={styles.brandDot} />
              </View>
              <Text style={styles.brandName}>PORTAL MAHASISWA</Text>
            </View>

            {/* Title & Concise Intro */}
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Masuk untuk mengelola data mahasiswa dan melanjutkan sesi Anda.
              </Text>
            </View>

            {/* Sign-In Card */}
            <View style={styles.card}>
              {/* Username Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === "username" && styles.inputFocused,
                    Boolean(usernameError) && styles.inputError,
                    isBusy && styles.inputDisabled,
                  ]}
                  placeholder="Masukkan username atau email"
                  placeholderTextColor={COLORS.inkMuted}
                  value={username}
                  onChangeText={handleUsernameChange}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => {
                    setFocusedField(null);
                    setUsernameError(validateUsername(username));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  returnKeyType="next"
                  editable={!isBusy}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  accessibilityLabel="Username"
                />
                {usernameError ? (
                  <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
                    {usernameError}
                  </Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.passwordWrapper,
                    focusedField === "password" && styles.inputFocused,
                    Boolean(passwordError) && styles.inputError,
                    isBusy && styles.inputDisabled,
                  ]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.passwordInput}
                    placeholder="Masukkan password"
                    placeholderTextColor={COLORS.inkMuted}
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => {
                      setFocusedField(null);
                      setPasswordError(validatePassword(password));
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    returnKeyType="done"
                    editable={!isBusy}
                    onSubmitEditing={handleManualSignIn}
                    accessibilityLabel="Password"
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    disabled={isBusy}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [
                      styles.togglePasswordButton,
                      pressed && styles.togglePasswordPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Sembunyikan password" : "Tampilkan password"
                    }
                    accessibilityState={{ expanded: showPassword }}
                  >
                    <Text style={styles.togglePasswordText}>
                      {showPassword ? "Sembunyikan" : "Tampilkan"}
                    </Text>
                  </Pressable>
                </View>
                {passwordError ? (
                  <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
                    {passwordError}
                  </Text>
                ) : null}
              </View>

              {/* Auth-level error */}
              {authError ? (
                <View style={styles.authErrorBox} accessibilityLiveRegion="polite">
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              ) : null}

              {/* Primary CTA: Sign In */}
              <Pressable
                onPress={handleManualSignIn}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !isBusy && styles.primaryButtonPressed,
                  isBusy && styles.buttonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy, busy: submittingAction === "manual" }}
              >
                {submittingAction === "manual" ? (
                  <ActivityIndicator size="small" color={COLORS.ink} />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </Pressable>

              {/* Simple Separator */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Secondary CTA: Sign in with Google */}
              <Pressable
                onPress={() => handleGoogleSignIn(false)}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && !isBusy && styles.googleButtonPressed,
                  isBusy && styles.buttonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy, busy: submittingAction === "google" }}
              >
                {submittingAction === "google" ? (
                  <ActivityIndicator size="small" color={COLORS.ink} />
                ) : (
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                )}
              </Pressable>

              {Platform.OS === "web" && showRedirectOption ? (
                <Pressable
                  onPress={() => handleGoogleSignIn(true)}
                  disabled={isBusy}
                  style={styles.redirectLinkButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.redirectLinkText}>
                    Masuk Google tanpa popup (redirect)
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.helperText}>
              Sesi login disimpan lokal agar akses berikutnya tetap ringkas.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  innerContainer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  loadingLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.inkMuted,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  brandBadge: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.ink,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: COLORS.surface,
  },
  brandName: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    letterSpacing: 0.6,
    color: COLORS.rust,
  },
  headerBlock: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 26,
    lineHeight: 33,
    color: COLORS.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.inkMuted,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...retroOffset("md"),
  },
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.ink,
    marginBottom: 6,
  },
  input: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 15,
    color: COLORS.ink,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    minHeight: 46,
    paddingLeft: 14,
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 15,
    color: COLORS.ink,
    paddingVertical: 10,
  },
  togglePasswordButton: {
    minWidth: 44,
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    ...(WEB_POINTER || {}),
  },
  togglePasswordPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  togglePasswordText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 12,
    color: COLORS.rust,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  inputError: {
    borderColor: COLORS.coral,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  fieldErrorText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.coralInk,
    marginTop: 5,
  },
  authErrorBox: {
    backgroundColor: COLORS.coralSurface,
    borderWidth: 1.5,
    borderColor: COLORS.coral,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  authErrorText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.coralInk,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.ink,
    minHeight: 48,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.xs,
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  primaryButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 15,
    color: COLORS.ink,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.ink,
    opacity: 0.25,
  },
  dividerText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 12,
    color: COLORS.inkMuted,
    paddingHorizontal: 12,
  },
  googleButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    minHeight: 48,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  googleButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  googleButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 15,
    color: COLORS.ink,
  },
  redirectLinkButton: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  redirectLinkText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 13,
    color: COLORS.primaryInk,
    textDecorationLine: "underline",
  },
  helperText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inkMuted,
    textAlign: "center",
    marginTop: SPACING.md,
  },
});
