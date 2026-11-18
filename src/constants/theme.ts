import { Platform } from "react-native";

export const COLORS = {
  // Core requested palette
  background: "#E2DAC2",
  ink: "#222A2A",
  primary: "#4FBBBC",
  coral: "#EC4624",
  orange: "#F39120",

  // Functional tonal neutrals & accessible states derived strictly from the core palette
  surface: "#ECE6D4",
  surfaceInput: "#F4EFE2",
  surfacePressed: "#D6CEB5",
  primaryPressed: "#3EA5A6",
  inkMuted: "#4E5856",
  border: "#C7BEA3",
  borderStrong: "#222A2A",

  // Accessible semantic feedback surfaces & text (WCAG AA >= 4.5:1)
  coralSurface: "#F8E3DC",
  coralInk: "#9E2B14",
  orangeSurface: "#F8EBD2",
  orangeInk: "#854905",
  primarySurface: "#D4ECE7",
  primaryInk: "#175758",
} as const;

export const FONTS = {
  family: "Sora",
} as const;

export const FONT_WEIGHTS = {
  regular: "400" as const,
  medium: "500" as const,
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
  sm: 6,
  md: 8,
} as const;

export const WEB_POINTER =
  Platform.OS === "web" ? ({ cursor: "pointer" } as const) : undefined;
