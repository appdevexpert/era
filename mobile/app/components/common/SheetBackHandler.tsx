import { useBottomSheet } from "@gorhom/bottom-sheet";
import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

type SheetBackHandlerProps = {
  /**
   * Set false while the sheet must not be dismissed — mirror whatever guards
   * `enablePanDownToClose` / the backdrop's `pressBehavior`, so back agrees
   * with the sheet's other dismiss affordances instead of contradicting them.
   */
  enabled?: boolean;
  /**
   * Explicit dismiss callback — usually `() => sheetRef.current?.dismiss()`.
   * Prefer this over the built-in `useBottomSheet().close` on modals that
   * override `handleComponent`/`backgroundComponent`, where the internal
   * close-animation-then-unmount contract can miss and leave the sheet
   * mounted while navigation runs.
   */
  onBack?: () => void;
};

/**
 * Closes the bottom sheet it lives in when Android's back button/gesture fires.
 *
 * `@gorhom/bottom-sheet` ships no hardware-back handling of its own (v5.2.13 —
 * grep it, there is not one `BackHandler` in the package), so back used to run
 * straight past an open sheet: it popped the screen underneath, or quit the app
 * outright from a root screen, leaving the sheet visible over whatever came next.
 *
 * Render it as a child of `BottomSheetModal` — NOT next to it. `BottomSheetModal`
 * returns null until presented and unmounts its children on dismiss, so mounting
 * is exactly the "sheet is open" signal and the listener cleans itself up. Placed
 * outside, it would swallow every back press for the life of the screen.
 *
 * Stacked sheets need no coordination either: `BackHandler` runs subscribers in
 * reverse registration order and stops at the first `true`, so the sheet opened
 * last is the one that closes.
 */
const SheetBackHandler = ({ enabled = true, onBack }: SheetBackHandlerProps) => {
  const { close } = useBottomSheet();
  const dismiss = onBack ?? close;

  useEffect(() => {
    // iOS has no hardware back, and its swipe-back gesture is owned by the
    // navigator, which a presented sheet already covers.
    if (Platform.OS !== "android" || !enabled) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      dismiss();
      return true; // handled — do not let it fall through to navigation
    });

    return () => subscription.remove();
  }, [dismiss, enabled]);

  return null;
};

export default SheetBackHandler;
