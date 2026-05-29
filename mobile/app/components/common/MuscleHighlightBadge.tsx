import { COLORS } from "@/app/constants/colors";
import {
  MuscleBackBase,
  MuscleBackHighlight,
  MuscleBicepsHighlight,
  MuscleCalvesHighlight,
  MuscleChestHighlight,
  MuscleForearmsHighlight,
  MuscleFrontBase,
  MuscleGlutesHighlight,
  MuscleHamstringsHighlight,
  MuscleNeckHighlight,
  MuscleQuadsHighlight,
  MuscleShouldersHighlight,
  MuscleTrapsHighlight,
  MuscleTricepsHighlight,
} from "@/assets/icons";
import type { FC } from "react";
import { StyleSheet, View } from "react-native";
import type { SvgProps } from "react-native-svg";

// Body silhouette renders at its natural 64×111 viewBox. Each muscle places
// the body at a different vertical offset inside the 44×44 circle so the
// relevant muscle ends up in the visible window. Offsets are read straight
// from each Figma node's inset (top_pct × 44).
const BADGE_SIZE = 44;
const BODY_WIDTH = 64;
const BODY_HEIGHT = 111;
const BODY_LEFT = -10;        // shared across all badges (-22.71% of 44)
const DEFAULT_BODY_TOP = 4.6; // upper-body framing (Figma 5097:7786)

export type MuscleHighlightKey =
  | "shoulder"
  | "chest"
  | "tricep"
  | "bicep"
  | "forearm"
  | "back"
  | "traps"
  | "neck"
  | "quads"
  | "glutes"
  | "hamstring"
  | "calves";

type BodyView = "front" | "back";

interface MuscleSpec {
  view: BodyView;
  Highlight: FC<SvgProps>;
  /** Vertical offset of the 64×111 body inside the 44×44 circle. Negative
   * shifts the body up so a lower-body muscle lands in the visible window. */
  bodyTop?: number;
}

const SPECS: Record<MuscleHighlightKey, MuscleSpec> = {
  // Upper body — Figma 5097:7786 etc. all share the +4.6 framing.
  shoulder: { view: "front", Highlight: MuscleShouldersHighlight },
  chest: { view: "front", Highlight: MuscleChestHighlight },
  bicep: { view: "front", Highlight: MuscleBicepsHighlight },
  forearm: { view: "front", Highlight: MuscleForearmsHighlight },
  neck: { view: "front", Highlight: MuscleNeckHighlight },
  tricep: { view: "back", Highlight: MuscleTricepsHighlight },
  back: { view: "back", Highlight: MuscleBackHighlight },
  traps: { view: "back", Highlight: MuscleTrapsHighlight },
  // Lower body — each Figma node has its own top offset.
  quads: { view: "front", Highlight: MuscleQuadsHighlight, bodyTop: -38.0 },
  glutes: { view: "back", Highlight: MuscleGlutesHighlight, bodyTop: -27.8 },
  hamstring: { view: "back", Highlight: MuscleHamstringsHighlight, bodyTop: -41.8 },
  calves: { view: "back", Highlight: MuscleCalvesHighlight, bodyTop: -61.8 },
};

interface MuscleHighlightBadgeProps {
  muscle: MuscleHighlightKey;
}

const MuscleHighlightBadge = ({ muscle }: MuscleHighlightBadgeProps) => {
  const spec = SPECS[muscle];
  const Base = spec.view === "front" ? MuscleFrontBase : MuscleBackBase;
  const Highlight = spec.Highlight;
  const bodyTop = spec.bodyTop ?? DEFAULT_BODY_TOP;

  return (
    <View style={styles.badge}>
      <View style={[styles.bodyWrap, { top: bodyTop }]}>
        <Base width={BODY_WIDTH} height={BODY_HEIGHT} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Highlight width={BODY_WIDTH} height={BODY_HEIGHT} />
        </View>
      </View>
    </View>
  );
};

export default MuscleHighlightBadge;

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: COLORS.alpha.white08,
    overflow: "hidden",
  },
  bodyWrap: {
    position: "absolute",
    left: BODY_LEFT,
    width: BODY_WIDTH,
    height: BODY_HEIGHT,
  },
});
