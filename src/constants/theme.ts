import { Platform, ViewStyle } from "react-native";

export const COLORS = {
  // Core retro palette
  ink: "#000F08",
  purple: "#22153C",
  primary: "#0E5047",
  red: "#D72E2E",
  mustard: "#E3D473",

  // Supporting retro tones
  background: "#F8F1DE",
  orange: "#E8873A",

  // Derived functional interaction & high-contrast states
  surface: "#F8F1DE",
  inputSurface: "#FFFDF7",
  surfacePressed: "#EDE3C8",
  primaryPressed: "#0A3D36",
  purplePressed: "#322154",
  orangeSurface: "#FCE8D5",
  mustardSurface: "#E3D473",
  primarySurface: "#E2EFEA",
  redSurface: "#FDECE8",

  // Readable accessible text tokens
  inkMuted: "#3E4A45",
  redInk: "#A61D1D",
  onPrimary: "#F8F1DE",
  onPurple: "#F8F1DE",
  onRed: "#FFFFFF",
  onHeaderMuted: "rgba(248, 241, 222, 0.72)",
  headerBorderSubtle: "rgba(248, 241, 222, 0.38)",
  hairline: "rgba(0, 15, 8, 0.16)",
  scrim: "rgba(0, 15, 8, 0.58)",
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

export function retroOffset(
  size: "sm" | "md" = "md",
  color: string = COLORS.ink
): ViewStyle {
  const px = size === "sm" ? 2 : 3;

  if (Platform.OS === "web") {
    return {
      boxShadow: `${px}px ${px}px 0px ${color}`,
    } as ViewStyle;
  }

  if (Platform.OS === "ios") {
    return {
      shadowColor: color,
      shadowOffset: { width: px, height: px },
      shadowOpacity: 1,
      shadowRadius: 0,
    };
  }

  return {
    borderBottomWidth: 2 + px,
    borderRightWidth: 2 + px,
  };
}
