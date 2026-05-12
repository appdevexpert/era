import { Plus } from "lucide-react";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ExerciseFormDialog } from "@/components/exercises/exercise-form";
import { ExerciseTable } from "@/components/exercises/exercise-table";
import { getExercise, getExercises } from "@/lib/admin/data";

type ExercisesPageProps = {
  searchParams: Promise<{ edit?: string; page?: string }>;
};

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const { edit, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const [exercisesState, selectedExerciseState] = await Promise.all([
    getExercises(currentPage),
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
      />

      {selectedExerciseState.data ? (
        <ExerciseFormDialog exercise={selectedExerciseState.data} defaultOpen />
      ) : null}
    </>
  );
}
