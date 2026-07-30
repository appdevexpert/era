import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ExerciseFormDialog } from "@/components/exercises/exercise-form";
import { ExerciseTable } from "@/components/exercises/exercise-table";
import { getExercise, getExercises } from "@/lib/admin/data";

type ExercisesPageProps = {
  searchParams: Promise<{
    edit?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export default async function ExercisesPage({ searchParams }: ExercisesPageProps) {
  const { edit, page, pageSize, search, status } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const rawPageSize = Number(pageSize) || 10;
  const currentPageSize = ALLOWED_PAGE_SIZES.includes(rawPageSize) ? rawPageSize : 10;
  const searchTerm = search?.trim() ?? "";
  const statusFilter =
    status === "active" || status === "inactive" ? status : "all";
  const [exercisesState, selectedExerciseState] = await Promise.all([
    getExercises(currentPage, currentPageSize, searchTerm, statusFilter),
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
                <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
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
        pageSize={exercisesState.pageSize}
        totalPages={exercisesState.totalPages}
        totalCount={exercisesState.totalCount}
        search={searchTerm}
        statusFilter={statusFilter}
      />

      {selectedExerciseState.data ? (
        <ExerciseFormDialog
          key={edit}
          exercise={selectedExerciseState.data}
          defaultOpen
        />
      ) : null}
    </>
  );
}
