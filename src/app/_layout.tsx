import { useEffect } from "react";
import { FontDisplay, useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS, FONTS, FONT_WEIGHTS } from "../constants/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: FONTS.display,
      fontDefinitions: [
        {
          path: require("../../assets/fonts/Bungee-Regular.ttf"),
          weight: 400,
          display: FontDisplay.SWAP,
        },
      ],
    },
    {
      fontFamily: FONTS.body,
      fontDefinitions: [
        {
          path: require("../../assets/fonts/NunitoSans-Regular.ttf"),
          weight: 400,
          display: FontDisplay.SWAP,
        },
        {
          path: require("../../assets/fonts/NunitoSans-SemiBold.ttf"),
          weight: 600,
          display: FontDisplay.SWAP,
        },
        {
          path: require("../../assets/fonts/NunitoSans-Bold.ttf"),
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
            fontFamily: FONTS.display,
            fontWeight: FONT_WEIGHTS.regular,
            fontSize: 15,
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
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="test-role"
          options={{
            title: "Verifikasi Role",
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
