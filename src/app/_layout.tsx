import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Firebase Auth",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="home"
        options={{
          title: "Portal Mahasiswa",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="asyncstorage"
        options={{
          title: "AsyncStorage Test",
        }}
      />
      <Stack.Screen
        name="mmkv"
        options={{
          title: "MMKV Test",
        }}
      />
    </Stack>
  );
}
