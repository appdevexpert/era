import AddPhotoBottomSheet, {
  type AddPhotoBottomSheetRef,
} from "@/app/components/common/AddPhotoBottomSheet";
import GlassFill from "@/app/components/common/GlassFill";
import PhotoPreviewBottomSheet, {
  type PhotoPreviewBottomSheetRef,
} from "@/app/components/common/PhotoPreviewBottomSheet";
import ScreenFades from "@/app/components/common/ScreenFades";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { TablerPlus } from "@/assets/icons";
import { DemoMedia } from "@/assets/images";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useRef } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TransformPhoto {
  id: string;
  date: string;
}

// Mock dataset — replace with real `session_media` query later.
const PHOTOS: TransformPhoto[] = [
  { id: "1",  date: "May 21" },
  { id: "2",  date: "May 20" },
  { id: "3",  date: "May 18" },
  { id: "4",  date: "May 17" },
  { id: "5",  date: "May 12" },
  { id: "6",  date: "May 10" },
  { id: "7",  date: "May 08" },
  { id: "8",  date: "May 06" },
  { id: "9",  date: "May 06" },
  { id: "10", date: "May 17" },
  { id: "11", date: "May 12" },
  { id: "12", date: "May 10" },
  { id: "13", date: "May 06" },
  { id: "14", date: "May 12" },
  { id: "15", date: "May 17" },
  { id: "16", date: "May 10" },
  { id: "17", date: "May 17" },
  { id: "18", date: "May 17" },
  { id: "19", date: "May 12" },
  { id: "20", date: "May 10" },
];

const GRID_GAP = 20;
const GRID_PADDING = 24;
const GRID_COLUMNS = 3;

const AddNewTile = ({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
    <View style={styles.addNewThumb}>
      {/* Glass blur substrate */}
      <GlassFill effect="clear" scheme="dark" style={styles.addNewGlass} />
      {/* Diagonal gold glow — approximates Figma's bottom-anchored ellipse blob */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0)", "rgba(201,168,76,0.45)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.addNewGlass]}
      />
      <View style={styles.addNewIcon}>
        <TablerPlus width={20} height={20} color="#F0F0F0" />
      </View>
    </View>
    <Text style={styles.addNewLabel}>Add New</Text>
  </Pressable>
);

const PhotoTile = ({
  photo,
  onPress,
}: {
  photo: TransformPhoto;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
  >
    <View style={styles.photoThumb}>
      <Image
        source={DemoMedia}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
    </View>
    <Text style={styles.photoDate}>{photo.date}</Text>
  </Pressable>
);

const TransformationGalleryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const addPhotoSheetRef = useRef<AddPhotoBottomSheetRef>(null);
  const photoPreviewSheetRef = useRef<PhotoPreviewBottomSheetRef>(null);

  const openPhoto = (photo: TransformPhoto) =>
    photoPreviewSheetRef.current?.show({
      source: DemoMedia,
      dateLabel: photo.date,
    });

  // First cell of row 0 is the "Add New" tile, followed by the photos.
  const rows = useMemo(() => {
    const cells: ({ kind: "add" } | { kind: "photo"; photo: TransformPhoto })[] = [
      { kind: "add" },
      ...PHOTOS.map((photo) => ({ kind: "photo" as const, photo })),
    ];
    const out: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += GRID_COLUMNS) {
      out.push(cells.slice(i, i + GRID_COLUMNS));
    }
    return out;
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((cell, colIdx) =>
                cell.kind === "add" ? (
                  <AddNewTile key={`add-${colIdx}`} onPress={() => addPhotoSheetRef.current?.show()} />
                ) : (
                  <PhotoTile
                    key={cell.photo.id}
                    photo={cell.photo}
                    onPress={() => openPhoto(cell.photo)}
                  />
                ),
              )}
              {/* Fill empty cells in the final row so spacing stays consistent */}
              {row.length < GRID_COLUMNS
                ? Array.from({ length: GRID_COLUMNS - row.length }).map((_, i) => (
                    <View key={`spacer-${i}`} style={styles.tile} />
                  ))
                : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <ScreenFades hideTop />

      <AddPhotoBottomSheet
        ref={addPhotoSheetRef}
        onPhotoSelected={(photo) =>
          photoPreviewSheetRef.current?.show({
            source: { uri: photo.uri },
            dateLabel: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
            }),
          })
        }
      />
      <PhotoPreviewBottomSheet ref={photoPreviewSheetRef} />
    </View>
  );
};

export default TransformationGalleryScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    gap: 24,
  },

  // Grid
  grid: { gap: 24 },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  tile: {
    flex: 1,
    gap: 8,
  },

  // Add New tile
  addNewThumb: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1,
    borderColor: COLORS.primary.dark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  addNewGlass: {
    borderRadius: 16,
  },
  addNewIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  addNewLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "500",
  },

  // Photo tile
  photoThumb: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: COLORS.alpha.surface08,
    overflow: "hidden",
  },
  photoDate: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
