import SheetBackHandler from "@/app/components/common/SheetBackHandler";
import { FONTS } from "@/app/constants/fonts";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

export interface AdjustmentInfoBottomSheetRef {
  show: (title: string, message: string) => void;
}

const AdjustmentInfoBottomSheet = forwardRef<AdjustmentInfoBottomSheetRef>(
  function AdjustmentInfoBottomSheet(_props, ref) {
    const insets = useSafeAreaInsets();
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

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <SheetBackHandler />
        <BottomSheetView
          style={[
            // Edge-to-edge puts the sheet's bottom edge BEHIND the system nav
            // bar, so the last row needs the inset on top of its designed
            // padding. Math.max keeps the design on devices that report none.
            styles.content,
            { paddingBottom: Math.max(60, insets.bottom + 16) },
          ]}
        >
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

AdjustmentInfoBottomSheet.displayName = "AdjustmentInfoBottomSheet";

export default AdjustmentInfoBottomSheet;

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
