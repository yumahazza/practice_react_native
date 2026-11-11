import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV();
const TOKEN_KEY = "access_token";

export default function MMKVPage() {
  const [token, setToken] = useState("join-token-123");
  const [savedToken, setSavedToken] = useState<string | null>(null);

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
    <View style={styles.container}>
      <Text style={styles.title}>MMKV Login</Text>
      <TextInput value={token} onChangeText={setToken} style={styles.input} />
      <Pressable onPress={saveToken} style={styles.button}>
        <Text style={styles.buttonText}>Save access token</Text>
      </Pressable>
      <Pressable onPress={getToken} style={styles.button}>
        <Text style={styles.buttonText}>Get access token</Text>
      </Pressable>
      <Text style={styles.result}>Value: {savedToken ?? "Belum diambil"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderColor: "#aaa", borderRadius: 8, borderWidth: 1, padding: 14 },
  button: { backgroundColor: "#8b5cf6", borderRadius: 8, marginTop: 12, padding: 14 },
  buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  result: { marginTop: 20, textAlign: "center" },
});
