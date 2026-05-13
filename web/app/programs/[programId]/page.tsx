import Link from "next/link";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
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
  const program = detailState.data.program;

  return (
    <>
      <PageHeader
        eyebrow="Program Builder"
        title={program ? translation(program.title_translations, "en", program.title) : "Program"}
        description="Build the 12-week structure: weeks, days, sections, assigned exercises, and planned sets."
        action={
          <Link
            href="/programs"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to programs
          </Link>
        }
      />

      <ConfigWarning message={detailState.configError} />
      <ProgramBuilder detail={detailState.data} />
    </>
  );
}
