import { Platform } from "react-native";

const systemFont = Platform.select({
  ios: "System",
  android: "Roboto",
  default: undefined,
});

export const FONTS = {
  light: systemFont,
  regular: systemFont,
  medium: systemFont,
  semiBold: systemFont,
  bold: systemFont,
  extraBold: systemFont,
  display: Platform.select({
    ios: "PlayfairDisplay",
    default: "Italiana-Regular",
  }),
};
