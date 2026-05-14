import { Plus } from "lucide-react";

import { getAdminPageGate } from "@/components/admin/admin-page-gate";
import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ExerciseFormDialog } from "@/components/exercises/exercise-form";
import { ExerciseTable } from "@/components/exercises/exercise-table";
import { getExercise, getExercises } from "@/lib/admin/data";

type ExercisesPageProps = {
  searchParams: Promise<{ edit?: string; page?: string; search?: string }>;
};

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const gate = await getAdminPageGate();
  if (gate) return gate;

  const { edit, page, search } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const searchTerm = search?.trim() ?? "";
  const [exercisesState, selectedExerciseState] = await Promise.all([
    getExercises(currentPage, 20, searchTerm),
    getExercise(edit),
  ]);

  const configError =
    exercisesState.configError ?? selectedExerciseState.configError;

  return (
    <>
      <PageHeader
        eyebrow="Exercise Library"
        title="Exercises"
        description="Create the reusable exercise library used by daily workout plans. Store both English and Norwegian names on the same exercise row."
        action={
          <ExerciseFormDialog
            exercise={null}
            trigger={
              <Button>
                <Plus />
                Add exercise
              </Button>
            }
          />
        }
      />

      <ConfigWarning message={configError} />

      <ExerciseTable
        exercises={exercisesState.data}
        page={exercisesState.page}
        totalPages={exercisesState.totalPages}
        totalCount={exercisesState.totalCount}
        search={searchTerm}
      />

      {selectedExerciseState.data ? (
        <ExerciseFormDialog exercise={selectedExerciseState.data} defaultOpen />
      ) : null}
    </>
  );
}
