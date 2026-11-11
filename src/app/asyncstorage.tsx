import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const TOKEN_KEY = "access_token";

export default function AsyncStoragePage() {
  const [token, setToken] = useState("join-token-123");
  const [savedToken, setSavedToken] = useState<string | null>(null);

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
    <View style={styles.container}>
      <Text style={styles.title}>AsyncStorage Login</Text>
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
  button: { backgroundColor: "#1677ff", borderRadius: 8, marginTop: 12, padding: 14 },
  buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  result: { marginTop: 20, textAlign: "center" },
});
