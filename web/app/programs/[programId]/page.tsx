import Link from "next/link";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { Badge } from "@/components/ui/badge";
import { ProgramBuilder } from "@/components/programs/program-builder";
import { getProgramDetail } from "@/lib/admin/data";
import { translation } from "@/lib/admin/format";

type ProgramDetailPageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramDetailPage({
  params,
}: ProgramDetailPageProps) {
  const { programId } = await params;
  const detailState = await getProgramDetail(programId);
  const { program, weeks, days, dayExercises, sets } = detailState.data;

  return (
    <>
      <header className="flex flex-col gap-3">
        <Link
          href="/programs"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark transition-colors hover:text-primary"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.8} />
          Programs
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
              {program ? translation(program.title_translations, "en", program.title) : "Program"}
            </h2>
            {program ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {weeks.length} {weeks.length === 1 ? "week" : "weeks"}
                </Badge>
                <Badge variant="outline">
                  {days.length} {days.length === 1 ? "day" : "days"}
                </Badge>
                <Badge variant="outline">
                  {dayExercises.length} {dayExercises.length === 1 ? "exercise" : "exercises"}
                </Badge>
                <Badge variant="outline">
                  {sets.length} planned {sets.length === 1 ? "set" : "sets"}
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <ConfigWarning message={detailState.configError} />
      <ProgramBuilder detail={detailState.data} />
    </>
  );
}
