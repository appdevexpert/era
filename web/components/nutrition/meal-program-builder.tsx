"use client";

import { useMemo, useState } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addMealProgramPhaseDayItem,
  removeMealProgramPhaseDayItem,
} from "@/lib/admin/actions";
import { numberText, translation } from "@/lib/admin/format";
import type {
  MealLibraryRow,
  MealProgramDetail,
  MealProgramPhaseRow,
} from "@/lib/admin/types";
import { useFormAction } from "@/lib/admin/use-form-action";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatPhase(key: string) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatCategory(category: string) {
  return category
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function MealProgramBuilder({ detail }: { detail: MealProgramDetail }) {
  const { program, phases, phaseDays, phaseDayItems, library } = detail;

  const [activePhaseId, setActivePhaseId] = useState(phases[0]?.id ?? "");
  const [activeDow, setActiveDow] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activePhase = useMemo(
    () => phases.find((p) => p.id === activePhaseId),
    [activePhaseId, phases],
  );

  const activePhaseDay = useMemo(
    () =>
      phaseDays.find(
        (d) =>
          d.meal_program_phase_id === activePhaseId &&
          d.day_of_week === activeDow,
      ),
    [activeDow, activePhaseId, phaseDays],
  );

  const items = useMemo(() => {
    if (!activePhaseDay) return [];
    return phaseDayItems
      .filter((i) => i.meal_program_phase_day_id === activePhaseDay.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [activePhaseDay, phaseDayItems]);

  if (!program) {
    return (
      <p className="text-sm text-muted-foreground">
        Program not found.
      </p>
    );
  }

  if (!phases.length) {
    return (
      <p className="text-sm text-muted-foreground">
        This program has no phases yet. Recreate the program to scaffold the
        phase/weekday structure.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Phase tabs */}
      <Tabs value={activePhaseId} onValueChange={setActivePhaseId}>
        <TabsList>
          {phases.map((phase) => (
            <TabsTrigger key={phase.id} value={phase.id}>
              {formatPhase(phase.phase_key)}
              <Badge
                variant="secondary"
                className="ml-1 h-4 px-1.5 text-[10px] tabular-nums"
              >
                {phase.week_count}w
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activePhase ? (
        <PhaseSummary phase={activePhase} />
      ) : null}

      {/* Weekday tabs */}
      <Tabs
        value={String(activeDow)}
        onValueChange={(v) => setActiveDow(Number(v))}
      >
        <TabsList>
          {DAY_LABELS.map((label, idx) => {
            const dow = idx + 1;
            const dayId = phaseDays.find(
              (d) =>
                d.meal_program_phase_id === activePhaseId &&
                d.day_of_week === dow,
            )?.id;
            const count = dayId
              ? phaseDayItems.filter(
                  (i) => i.meal_program_phase_day_id === dayId,
                ).length
              : 0;
            return (
              <TabsTrigger key={dow} value={String(dow)}>
                {label}
                {count > 0 ? (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1.5 text-[10px] tabular-nums"
                  >
                    {count}
                  </Badge>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Items list for the active phase day */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {activePhase ? formatPhase(activePhase.phase_key) : ""}
            {" · "}
            {DAY_LABELS[activeDow - 1]}
          </p>
          <Button
            size="sm"
            disabled={!activePhaseDay || !library.length}
            onClick={() => setPickerOpen(true)}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
            Add meal
          </Button>
        </div>

        {items.length ? (
          <ul className="grid gap-2">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                programId={program.id}
                itemId={item.id}
                name={translation(
                  item.meal_library?.name_translations,
                  "en",
                  "Unknown meal",
                )}
                category={item.meal_library?.category ?? ""}
                kcal={item.meal_library?.kcal ?? 0}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No meals scheduled for this day yet. Click <strong>Add meal</strong>{" "}
            to pick from the library.
          </p>
        )}
      </div>

      {/* Empty-library hint */}
      {!library.length ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
          Your meal library is empty. Add meals in{" "}
          <a className="text-primary hover:underline" href="/nutrition/library">
            Meal Library
          </a>{" "}
          before assigning them here.
        </p>
      ) : null}

      {activePhaseDay ? (
        <MealPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          library={library}
          programId={program.id}
          phaseDayId={activePhaseDay.id}
        />
      ) : null}
    </div>
  );
}

function PhaseSummary({ phase }: { phase: MealProgramPhaseRow }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="border-border bg-transparent">
        Weeks: {phase.week_count}
      </Badge>
      {phase.kcal_target ? (
        <Badge variant="outline" className="border-border bg-transparent">
          {phase.kcal_target} kcal target
        </Badge>
      ) : null}
      {phase.protein_g_target ? (
        <Badge variant="outline" className="border-border bg-transparent">
          {phase.protein_g_target}g protein
        </Badge>
      ) : null}
    </div>
  );
}

function ItemRow({
  programId,
  itemId,
  name,
  category,
  kcal,
}: {
  programId: string;
  itemId: string;
  name: string;
  category: string;
  kcal: number;
}) {
  const { handleSubmit, pending } = useFormAction(
    removeMealProgramPhaseDayItem,
    { success: "Meal removed" },
  );

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Badge
          variant="outline"
          className="border-border bg-transparent text-muted-foreground"
        >
          {category ? formatCategory(category) : "—"}
        </Badge>
        <span className="truncate font-medium text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {numberText(kcal)} kcal
        </span>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="id" value={itemId} />
          <input type="hidden" name="program_id" value={programId} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label="Remove meal"
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.8} />
          </Button>
        </form>
      </div>
    </li>
  );
}

function MealPickerDialog({
  open,
  onClose,
  library,
  programId,
  phaseDayId,
}: {
  open: boolean;
  onClose: () => void;
  library: MealLibraryRow[];
  programId: string;
  phaseDayId: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return library;
    return library.filter((meal) => {
      const en = translation(meal.name_translations, "en").toLowerCase();
      const nb = translation(meal.name_translations, "nb").toLowerCase();
      return (
        en.includes(term) ||
        nb.includes(term) ||
        meal.slug.includes(term) ||
        meal.category.includes(term)
      );
    });
  }, [library, search]);

  // Group filtered meals by category for easy scanning.
  const grouped = useMemo(() => {
    const map = new Map<string, MealLibraryRow[]>();
    filtered.forEach((meal) => {
      const arr = map.get(meal.category) ?? [];
      arr.push(meal);
      map.set(meal.category, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-sans">Pick a meal</DialogTitle>
          <DialogDescription>
            Choose a meal from the library. It will be added to the end of this
            phase day&apos;s list.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            autoFocus
            placeholder="Search by name, slug, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {grouped.length ? (
          <div className="grid gap-4">
            {grouped.map(([category, meals]) => (
              <section key={category}>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {formatCategory(category)}
                </p>
                <ul className="grid gap-1.5">
                  {meals.map((meal) => (
                    <PickerRow
                      key={meal.id}
                      meal={meal}
                      programId={programId}
                      phaseDayId={phaseDayId}
                      onPicked={onClose}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No meals match{search ? ` "${search}"` : ""}.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerRow({
  meal,
  programId,
  phaseDayId,
  onPicked,
}: {
  meal: MealLibraryRow;
  programId: string;
  phaseDayId: string;
  onPicked: () => void;
}) {
  const { handleSubmit, pending } = useFormAction(
    async (fd) => {
      await addMealProgramPhaseDayItem(fd);
      onPicked();
    },
    { success: `Added "${translation(meal.name_translations, "en", meal.slug)}"` },
  );

  return (
    <li>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="phase_day_id" value={phaseDayId} />
        <input type="hidden" name="library_id" value={meal.id} />
        <input type="hidden" name="program_id" value={programId} />
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
        >
          <span className="truncate font-medium text-foreground">
            {translation(meal.name_translations, "en", meal.slug)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {numberText(meal.kcal)} kcal · {numberText(meal.protein_g)}P ·{" "}
            {numberText(meal.carbs_g)}C · {numberText(meal.fats_g)}F
          </span>
        </button>
      </form>
    </li>
  );
}
