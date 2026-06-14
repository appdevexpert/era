import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ProgramFormDialog } from "@/components/programs/program-form";
import { ProgramGrid } from "@/components/programs/program-grid";
import { ProgramTable } from "@/components/programs/program-table";
import { getProgram, getPrograms } from "@/lib/admin/data";

import type { UserGender } from "@/lib/admin/constants";

type ProgramsPageProps = {
  searchParams: Promise<{ edit?: string; gender?: string }>;
};

function parseGender(value: string | undefined): UserGender | undefined {
  return value === "male" || value === "female" ? value : undefined;
}

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  const params = await searchParams;
  const gender = parseGender(params.gender);
  const [programsState, selectedProgramState] = await Promise.all([
    getPrograms(),
    getProgram(params.edit),
  ]);

  const configError = programsState.configError ?? selectedProgramState.configError;

  // Programs without a (gender, level) classification fall back to the table —
  // legacy rows, Phase 2 alternatives like Bro Split, and any one-off plans.
  const otherPrograms = programsState.data.filter(
    (program) => !program.gender || !program.level,
  );

  return (
    <>
      <PageHeader
        eyebrow="Program Manager"
        title="Programs"
        description="Four launch programs — Male and Female × Beginner / Advanced. Intermediate users share the Beginner program. Pick a gender to manage."
        action={
          <ProgramFormDialog
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

      <ProgramGrid programs={programsState.data} gender={gender} />

      {!gender && otherPrograms.length > 0 ? (
        <section className="mt-10 grid gap-3">
          <div>
            <h2 className="font-display text-xl text-foreground">Other programs</h2>
            <p className="text-sm text-muted-foreground">
              Programs without a gender / level classification — assign one via edit to surface them in the grid above.
            </p>
          </div>
          <ProgramTable programs={otherPrograms} />
        </section>
      ) : null}

      {selectedProgramState.data ? (
        <ProgramFormDialog key={params.edit} program={selectedProgramState.data} defaultOpen />
      ) : null}
    </>
  );
}
