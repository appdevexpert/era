import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";

import { RULER_RANGE } from "@/app/constants/workout";
import { setWeightUnit, type WeightUnit } from "@/app/stores/slice/preferencesSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import {
  formatWeightFromKg,
  kgToDisplay,
  toKg,
  weightUnitLabel,
} from "@/app/utils/workoutFormatters";

/**
 * Single entry point for any component that reads or writes weight in the user's
 * preferred unit. Storage stays kg-canonical — these helpers only translate at
 * the display / input edges.
 */
export const useWeightUnit = () => {
  const dispatch = useAppDispatch();
  const unit = useSelector(
    (state: RootState) => state.preferences.weightUnit,
  );

  const format = useCallback(
    (kg: number | string | null | undefined) => formatWeightFromKg(kg, unit),
    [unit],
  );

  const toDisplay = useCallback(
    (kg: number) => kgToDisplay(kg, unit),
    [unit],
  );

  const fromDisplayToKg = useCallback(
    (value: number) => toKg(value, unit),
    [unit],
  );

  const setUnit = useCallback(
    (next: WeightUnit) => {
      dispatch(setWeightUnit(next));
    },
    [dispatch],
  );

  const range = useMemo(() => RULER_RANGE[unit], [unit]);
  const label = useMemo(() => weightUnitLabel(unit), [unit]);

  return {
    unit,
    label,
    range,
    format,
    toDisplay,
    fromDisplayToKg,
    setUnit,
  };
};
