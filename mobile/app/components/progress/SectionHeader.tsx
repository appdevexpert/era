import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader = ({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) => (
  <View style={styles.row}>
    <View style={styles.textCol}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {actionLabel ? (
      <Pressable
        onPress={onAction}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.pillText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

export default SectionHeader;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  textCol: { flex: 1 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  pressed: { opacity: 0.85 },
  pillText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "#F0F0F0",
  },
});
