import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { MealLibraryFormDialog } from "@/components/nutrition/meal-library-form";
import { MealLibraryTable } from "@/components/nutrition/meal-library-table";
import { getMealLibrary, getMealLibraryItem } from "@/lib/admin/data";

type MealLibraryPageProps = {
  searchParams: Promise<{
    edit?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
  }>;
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export default async function MealLibraryPage({
  searchParams,
}: MealLibraryPageProps) {
  const { edit, page, pageSize, search, status } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const rawPageSize = Number(pageSize) || 10;
  const currentPageSize = ALLOWED_PAGE_SIZES.includes(rawPageSize)
    ? rawPageSize
    : 10;
  const searchTerm = search?.trim() ?? "";
  const statusFilter =
    status === "active" || status === "inactive" ? status : "all";

  const [libraryState, selectedItemState] = await Promise.all([
    getMealLibrary(currentPage, currentPageSize, searchTerm, statusFilter),
    getMealLibraryItem(edit),
  ]);

  const configError =
    libraryState.configError ?? selectedItemState.configError;

  return (
    <>
      <PageHeader
        eyebrow="Nutrition · Meal Library"
        title="Meal Library"
        description="Create the reusable catalog of meals used inside meal programs. Store English and Norwegian names on the same row; the category drives both the in-app icon and the suggestion grouping."
        action={
          <MealLibraryFormDialog
            item={null}
            trigger={
              <Button>
                <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
                Add meal
              </Button>
            }
          />
        }
      />

      <ConfigWarning message={configError} />

      <MealLibraryTable
        items={libraryState.data}
        page={libraryState.page}
        pageSize={libraryState.pageSize}
        totalPages={libraryState.totalPages}
        totalCount={libraryState.totalCount}
        search={searchTerm}
        statusFilter={statusFilter}
      />

      {selectedItemState.data ? (
        <MealLibraryFormDialog
          key={edit}
          item={selectedItemState.data}
          defaultOpen
        />
      ) : null}
    </>
  );
}
