import { Plus } from "lucide-react";

import { getAdminPageGate } from "@/components/admin/admin-page-gate";
import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ProgramFormDialog } from "@/components/programs/program-form";
import { ProgramTable } from "@/components/programs/program-table";
import { getProgram, getPrograms } from "@/lib/admin/data";

type ProgramsPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  const gate = await getAdminPageGate();
  if (gate) return gate;

  const { edit } = await searchParams;
  const [programsState, selectedProgramState] = await Promise.all([
    getPrograms(),
    getProgram(edit),
  ]);

  const configError = programsState.configError ?? selectedProgramState.configError;

  return (
    <>
      <PageHeader
        eyebrow="Program Manager"
        title="Programs"
        description="Create and manage the  12-week training programs used by the mobile workout experience."
        action={
          <ProgramFormDialog
            program={null}
            trigger={
              <Button>
                <Plus />
                Create program
              </Button>
            }
          />
        }
      />

      <ConfigWarning message={configError} />

      <ProgramTable programs={programsState.data} />

      {selectedProgramState.data ? (
        <ProgramFormDialog key={edit} program={selectedProgramState.data} defaultOpen />
      ) : null}
    </>
  );
}
