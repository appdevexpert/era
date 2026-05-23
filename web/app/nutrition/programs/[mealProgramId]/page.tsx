import Link from "next/link";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { Badge } from "@/components/ui/badge";
import { MealProgramBuilder } from "@/components/nutrition/meal-program-builder";
import { getMealProgramDetail } from "@/lib/admin/data";
import { translation } from "@/lib/admin/format";

type Props = {
  params: Promise<{ mealProgramId: string }>;
};

export default async function MealProgramDetailPage({ params }: Props) {
  const { mealProgramId } = await params;
  const detailState = await getMealProgramDetail(mealProgramId);
  const { program, phases, phaseDays, phaseDayItems, library } = detailState.data;

  return (
    <>
      <header className="flex flex-col gap-3">
        <Link
          href="/nutrition/programs"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark transition-colors hover:text-primary"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.8} />
          Meal Programs
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
              {program
                ? translation(program.title_translations, "en", "Program")
                : "Program"}
            </h2>
            {program ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{program.duration_days} days</Badge>
                <Badge variant="outline">
                  {phases.length} {phases.length === 1 ? "phase" : "phases"}
                </Badge>
                <Badge variant="outline">
                  {phaseDays.length} weekday slots
                </Badge>
                <Badge variant="outline">
                  {phaseDayItems.length} meals
                </Badge>
                <Badge variant="outline">
                  {library.length} library meals available
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <ConfigWarning message={detailState.configError} />
      <MealProgramBuilder detail={detailState.data} />
    </>
  );
}
