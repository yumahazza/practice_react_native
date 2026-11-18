import { Platform, ViewStyle } from "react-native";

export const COLORS = {
  // Core palette
  ink: "#222A2A",
  primary: "#4FBBBC",
  coral: "#EC4624",
  orange: "#F39120",
  background: "#E2DAC2",

  // Supporting retro tones
  surface: "#FFF8E7",
  rust: "#8A3F2B",

  // Derived functional interaction & high-contrast readable states
  primaryPressed: "#3DA4A5",
  surfacePressed: "#EFE6D0",
  inkMuted: "#4B5553",
  coralInk: "#A93118",
  coralSurface: "#FBE5DE",
  orangeSurface: "#FCECD5",
  primarySurface: "#D4ECE9",
  primaryInk: "#155758",
  scrim: "rgba(34, 42, 42, 0.55)",
} as const;

export const FONTS = {
  display: "Bungee",
  body: "Nunito Sans",
} as const;

export const FONT_WEIGHTS = {
  regular: "400" as const,
  semiBold: "600" as const,
  bold: "700" as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
} as const;

export const WEB_POINTER =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : undefined;

export function retroOffset(size: "sm" | "md" = "md"): ViewStyle {
  const px = size === "sm" ? 2 : 3;

  if (Platform.OS === "web") {
    return {
      boxShadow: `${px}px ${px}px 0px ${COLORS.ink}`,
    } as ViewStyle;
  }

  if (Platform.OS === "ios") {
    return {
      shadowColor: COLORS.ink,
      shadowOffset: { width: px, height: px },
      shadowOpacity: 1,
      shadowRadius: 0,
    };
  }

  // On Android, render a crisp stepped edge rather than blurred grey elevation.
  return {
    borderBottomWidth: 2 + px,
    borderRightWidth: 2 + px,
  };
}
