import { useEffect } from "react";
import { FontDisplay, useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS, FONTS } from "../constants/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: FONTS.family,
      fontDefinitions: [
        {
          path: require("../../assets/fonts/Sora-Regular.ttf"),
          weight: 400,
          display: FontDisplay.SWAP,
        },
        {
          path: require("../../assets/fonts/Sora-Medium.ttf"),
          weight: 500,
          display: FontDisplay.SWAP,
        },
        {
          path: require("../../assets/fonts/Sora-SemiBold.ttf"),
          weight: 600,
          display: FontDisplay.SWAP,
        },
        {
          path: require("../../assets/fonts/Sora-Bold.ttf"),
          weight: 700,
          display: FontDisplay.SWAP,
        },
      ],
    },
  ]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.ink,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: FONTS.family,
            fontWeight: "600",
            fontSize: 16,
          },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Sign In",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="home"
          options={{
            title: "Portal Mahasiswa",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="test-role"
          options={{
            title: "Verifikasi Role Akun",
          }}
        />
        <Stack.Screen
          name="asyncstorage"
          options={{
            title: "AsyncStorage",
          }}
        />
        <Stack.Screen
          name="mmkv"
          options={{
            title: "MMKV Storage",
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
