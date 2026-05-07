export const COLORS = {
  neutral: {
    black: "#000000",
    black2: "#0A0A0A",
    black3: "#111111",
    charcoal: "#1E1E1E",
    slate: "#354052",
    white: "#F0F0F0",
    whiteSoft: "#F7F7F7",
  },
  primary: {
    dark: "#C9A84C",
    base: "#F7E06F",
    light: "#FCF3C0",
  },
  semantic: {
    danger: "#E67777",
    success: "#3DCA7A",
  },
  alpha: {
    transparent: "rgba(0, 0, 0, 0)",
    blackScrim: "rgba(0, 0, 0, 0.3)",
    white04: "rgba(240, 240, 240, 0.04)",
    white08: "rgba(240, 240, 240, 0.08)",
    white12: "rgba(240, 240, 240, 0.12)",
    white50: "rgba(240, 240, 240, 0.5)",
    white72: "rgba(240, 240, 240, 0.72)",
    white78: "rgba(240, 240, 240, 0.78)",
    white80: "rgba(240, 240, 240, 0.8)",
    primary16: "rgba(201, 168, 76, 0.16)",
    primary18: "rgba(201, 168, 76, 0.18)",
    primary20: "rgba(201, 168, 76, 0.2)",
    primary60: "rgba(201, 168, 76, 0.6)",
    primaryBase20: "rgba(247, 224, 111, 0.2)",
    primaryBase60: "rgba(247, 224, 111, 0.6)",
    primaryLight20: "rgba(252, 243, 192, 0.2)",
    primaryLight60: "rgba(252, 243, 192, 0.6)",
    surface06: "rgba(255, 255, 255, 0.06)",
    surface08: "rgba(255, 255, 255, 0.08)",
  },
} as const;

export const GRADIENTS = {
  primary: [COLORS.primary.light, COLORS.primary.base, COLORS.primary.dark] as const,
  primary60: [COLORS.alpha.primaryLight60, COLORS.alpha.primaryBase60, COLORS.alpha.primary60] as const,
  primary20: [COLORS.alpha.primaryLight20, COLORS.alpha.primaryBase20, COLORS.alpha.primary20] as const,
  wordmark: ["#DAA520", "#DA9620"] as const,
} as const;
