import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { MealProgramFormDialog } from "@/components/nutrition/meal-program-form";
import { MealProgramTable } from "@/components/nutrition/meal-program-table";
import { getMealProgram, getMealPrograms } from "@/lib/admin/data";

type MealProgramsPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function MealProgramsPage({
  searchParams,
}: MealProgramsPageProps) {
  const { edit } = await searchParams;
  const [programsState, selectedProgramState] = await Promise.all([
    getMealPrograms(),
    getMealProgram(edit),
  ]);

  const configError =
    programsState.configError ?? selectedProgramState.configError;

  return (
    <>
      <PageHeader
        eyebrow="Nutrition · Meal Programs"
        title="Meal Programs"
        description="Create the 12-week meal plans used by the mobile nutrition tab. Each program is broken into 3 phases (Hypertrophy / Strength / Peak), and each phase has 7 weekday plans that repeat through the phase."
        action={
          <MealProgramFormDialog
            program={null}
            trigger={
              <Button>
                <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
                Create program
              </Button>
            }
          />
        }
      />

      <ConfigWarning message={configError} />

      <MealProgramTable programs={programsState.data} />

      {selectedProgramState.data ? (
        <MealProgramFormDialog
          key={edit}
          program={selectedProgramState.data}
          defaultOpen
        />
      ) : null}
    </>
  );
}
