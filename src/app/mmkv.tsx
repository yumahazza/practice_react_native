import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createMMKV } from "react-native-mmkv";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
  retroOffset,
} from "../constants/theme";

const storage = createMMKV();
const TOKEN_KEY = "access_token";

export default function MMKVPage() {
  const [token, setToken] = useState("join-token-123");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const saveToken = () => {
    storage.set(TOKEN_KEY, token);
    console.log("[MMKV] SUCCESS SAVE", TOKEN_KEY, token);
  };

  const getToken = () => {
    const storedToken = storage.getString(TOKEN_KEY) ?? null;
    setSavedToken(storedToken);
    console.log("[MMKV] SUCCESS GET", TOKEN_KEY, storedToken);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>MMKV Token</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused]}
        />
        <Pressable
          onPress={saveToken}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Save access token</Text>
        </Pressable>
        <Pressable
          onPress={getToken}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Get access token</Text>
        </Pressable>
        <Text style={styles.result}>Value: {savedToken ?? "Belum diambil"}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 20,
    color: COLORS.ink,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  input: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 15,
    color: COLORS.ink,
    backgroundColor: COLORS.inputSurface,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    marginTop: 12,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  primaryButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.onPrimary,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: COLORS.inputSurface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    marginTop: 10,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  secondaryButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  secondaryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.ink,
    textAlign: "center",
  },
  result: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    color: COLORS.inkMuted,
    marginTop: SPACING.md,
    textAlign: "center",
  },
});
