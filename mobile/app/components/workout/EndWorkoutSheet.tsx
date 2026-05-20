import { FONTS } from "@/app/constants/fonts";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface EndWorkoutSheetRef {
  show: () => void;
  hide: () => void;
}

interface EndWorkoutSheetProps {
  onEnd?: () => void;
  onKeepGoing?: () => void;
}

const EndWorkoutSheet = forwardRef<EndWorkoutSheetRef, EndWorkoutSheetProps>(
  function EndWorkoutSheet({ onEnd, onKeepGoing }, ref) {
    const { t } = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      show: () => sheetRef.current?.present(),
      hide: () => sheetRef.current?.dismiss(),
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

    const handleEnd = () => {
      sheetRef.current?.dismiss();
      onEnd?.();
    };

    const handleKeepGoing = () => {
      sheetRef.current?.dismiss();
      onKeepGoing?.();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.upper}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t("workout.ui.endWorkoutTitle")}</Text>
            </View>
            <View style={styles.bodySection}>
              <Text style={styles.body}>{t("workout.ui.endWorkoutBody")}</Text>
              <Text style={styles.subtext}>{t("workout.ui.endWorkoutSubtext")}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.buttonBase} onPress={handleEnd}>
              <GlassView
                pointerEvents="none"
                glassEffectStyle="clear"
                colorScheme="light"
                style={styles.glassFill}
              />
              <View pointerEvents="none" style={[styles.glassFill, styles.endTint]} />
              <Text style={styles.buttonLabel}>{t("workout.ui.endWorkout")}</Text>
            </Pressable>
            <Pressable style={styles.buttonBase} onPress={handleKeepGoing}>
              <GlassView
                pointerEvents="none"
                glassEffectStyle="clear"
                colorScheme="light"
                style={styles.glassFill}
              />
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(252, 243, 192, 0.6)",
                  "rgba(247, 224, 111, 0.6)",
                  "rgba(201, 168, 76, 0.6)",
                ]}
                locations={[0, 0.1964, 0.8354]}
                start={{ x: 1, y: 0.5 }}
                end={{ x: 0, y: 0.5 }}
                style={styles.glassFill}
              />
              <Text style={styles.buttonLabel}>{t("workout.ui.keepGoing")}</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

EndWorkoutSheet.displayName = "EndWorkoutSheet";

export default EndWorkoutSheet;

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
    gap: 36,
    paddingBottom: 42,
  },
  upper: {
    gap: 24,
  },
  titleSection: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
    gap: 12,
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
    gap: 8,
  },
  body: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  subtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
  },
  buttonBase: {
    flex: 1,
    borderRadius: 138.122,
    paddingVertical: 16,
    paddingHorizontal: 20.626,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 138.122,
  },
  endTint: {
    backgroundColor: "rgba(230,119,119,0.36)",
  },
  buttonLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: "#F0F0F0",
    textAlign: "center",
    letterSpacing: 0.36,
  },
});
