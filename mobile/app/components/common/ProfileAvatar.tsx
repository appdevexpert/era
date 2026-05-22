import { COLORS } from "@/app/constants/colors";
import { type HomeStackParamList } from "@/app/navigation/types";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";

interface ProfileAvatarProps {
  /** Letter shown inside the circle — usually the user's first initial. */
  initial: string;
  /** Tap handler — defaults to navigating to the Profile screen. */
  onPress?: () => void;
  /** Optional bottom margin — lets callers align the avatar in their header row. */
  marginBottom?: number;
}

/**
 * 48×48 gold-gradient avatar circle that opens the Profile screen on tap.
 * Used in the home header (ScreenHeader) and the workout greeting row.
 */
const ProfileAvatar = ({ initial, onPress, marginBottom }: ProfileAvatarProps) => {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const handlePress = onPress ?? (() => navigation.navigate("Profile"));

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.avatar, marginBottom !== undefined && { marginBottom }]}
      hitSlop={10}
    >
      <LinearGradient
        colors={[COLORS.primary.dark, COLORS.primary.base]}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.text}>{initial}</Text>
    </Pressable>
  );
};

export default ProfileAvatar;

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
});
