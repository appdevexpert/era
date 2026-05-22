import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";

const POSITIVE = "#3DCA7A";

interface SuccessBannerProps {
  text: string;
}

const SuccessBanner = ({ text }: SuccessBannerProps) => (
  <View style={styles.banner}>
    <Text style={styles.text}>{text}</Text>
  </View>
);

export default SuccessBanner;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(61,202,122,0.08)",
    borderWidth: 1,
    borderColor: "rgba(61,202,122,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: POSITIVE,
    lineHeight: 14.4,
  },
});
