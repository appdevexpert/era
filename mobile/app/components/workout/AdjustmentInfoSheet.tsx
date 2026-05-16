import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

export interface AdjustmentInfoSheetRef {
  show: (title: string, message: string) => void;
}

const AdjustmentInfoSheet = forwardRef<AdjustmentInfoSheetRef>(
  function AdjustmentInfoSheet(_props, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    useImperativeHandle(ref, () => ({
      show: (t: string, m: string) => {
        setTitle(t);
        setMessage(m);
        sheetRef.current?.present();
      },
    }));

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.bodySection}>
            <Text style={styles.body}>{message}</Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

AdjustmentInfoSheet.displayName = "AdjustmentInfoSheet";

export default AdjustmentInfoSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    gap: 24,
    paddingBottom: 60,
  },
  titleSection: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 26.4,
  },
  bodySection: {
    paddingHorizontal: 20,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 21.6,
  },
});
