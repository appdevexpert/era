import { FONTS } from "@/app/constants/fonts";
import {
  PtsCamera,
  PtsDumbbell,
  PtsFire,
  PtsFlame,
  PtsRanking,
  PtsRunning,
  PtsWalking,
  SettingWeigher,
} from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentType, forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { type SvgProps } from "react-native-svg";
import PointsRewardCard from "./PointsRewardCard";

export interface PointsOptimizeBottomSheetRef {
  show: () => void;
  hide: () => void;
}

interface PointsRow {
  id: string;
  Icon: ComponentType<SvgProps>;
  iconSize: number;
  pointsLabel: string;
  description: string;
  warm?: boolean;
}

const ROWS: PointsRow[] = [
  { id: "session",     Icon: PtsDumbbell, iconSize: 26, pointsLabel: "+50 Points",            description: "Complete a Workout Session" },
  { id: "log-set",     Icon: PtsDumbbell, iconSize: 26, pointsLabel: "+15 Points per set",    description: "Log each exercise set" },
  { id: "pr",          Icon: PtsRanking,  iconSize: 26, pointsLabel: "+100 Points",           description: "Set a Personal Record" },
  { id: "cardio",      Icon: PtsFlame,    iconSize: 30, pointsLabel: "+150 Points",           description: "Complete 4x4 cardio interval" },
  { id: "walking",     Icon: PtsWalking,  iconSize: 32, pointsLabel: "+1 Point per 100 steps", description: "Log a Walking Session" },
  { id: "running",     Icon: PtsRunning,  iconSize: 28, pointsLabel: "+4 Points per minute",  description: "Log a Running Session" },
  { id: "body-weight", Icon: SettingWeigher, iconSize: 26, pointsLabel: "+10 Points",         description: "Log Body Weight" },
  { id: "photo",       Icon: PtsCamera,   iconSize: 28, pointsLabel: "+25 Points",            description: "Upload Progress Photo" },
  { id: "streak",      Icon: PtsFire,     iconSize: 35, pointsLabel: "+200 Bonus Points",     description: "7-day Streak Maintained", warm: true },
];

const PointsOptimizeBottomSheet = forwardRef<PointsOptimizeBottomSheetRef, object>(
  function PointsOptimizeBottomSheet(_props, ref) {
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

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["80%"]}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableContentPanningGesture={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t("workout.ui.howToOptimiseSheet.title")}</Text>
        </View>
        <View style={styles.scrollWrap}>
          <BottomSheetScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            {ROWS.map((row) => (
              <PointsRewardCard
                key={row.id}
                Icon={row.Icon}
                iconSize={row.iconSize}
                pointsLabel={row.pointsLabel}
                description={row.description}
                warm={row.warm}
              />
            ))}
          </BottomSheetScrollView>
          {/* Bottom fade — content dissolves into the sheet background */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(17,17,17,0)", "rgba(17,17,17,1)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.bottomFade}
          />
        </View>
      </BottomSheetModal>
    );
  },
);

PointsOptimizeBottomSheet.displayName = "PointsOptimizeBottomSheet";

export default PointsOptimizeBottomSheet;

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
  scrollWrap: {
    flex: 1,
    position: "relative",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 19,
    paddingTop: 12,
    paddingBottom: 60,
    gap: 12,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});
