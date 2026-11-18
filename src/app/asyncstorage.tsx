import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
} from "../constants/theme";

const TOKEN_KEY = "access_token";

export default function AsyncStoragePage() {
  const [token, setToken] = useState("join-token-123");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const saveToken = async () => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log("[AsyncStorage] SUCCESS SAVE", TOKEN_KEY, token);
  };

  const getToken = async () => {
    const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
    setSavedToken(storedToken);
    console.log("[AsyncStorage] SUCCESS GET", TOKEN_KEY, storedToken);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>AsyncStorage Token</Text>
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
          <Text style={styles.buttonText}>Save access token</Text>
        </Pressable>
        <Pressable
          onPress={getToken}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Get access token</Text>
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
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 22,
    color: COLORS.ink,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  input: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 15,
    color: COLORS.ink,
    backgroundColor: COLORS.surfaceInput,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    marginTop: 12,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  primaryButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.sm,
    marginTop: 10,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  secondaryButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  buttonText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
    textAlign: "center",
  },
  result: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    color: COLORS.inkMuted,
    marginTop: SPACING.md,
    textAlign: "center",
  },
});
