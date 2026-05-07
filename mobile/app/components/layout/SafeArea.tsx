import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const SafeAreaLayout = ({ children }: { children: React.ReactNode }) => {
  return <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>{children}</SafeAreaView>;
};

export default SafeAreaLayout;

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
} as const;
