"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  PencilEdit01Icon,
  WrenchIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { ProgramFormDialog } from "@/components/programs/program-form";
import { translation } from "@/lib/admin/format";
import {
  EXPERIENCE_LEVELS,
  GENDER_LABELS,
  LEVEL_LABELS,
  USER_GENDERS,
  type ExperienceLevel,
  type UserGender,
} from "@/lib/admin/constants";
import type { ProgramRow } from "@/lib/admin/types";

const FEMALE_PROGRAM_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Female Beginner",
  intermediate: "Female Intermediate",
  advanced: "Female Golden Era",
};

const MALE_PROGRAM_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Male Beginner",
  intermediate: "Male Intermediate",
  advanced: "Male Advanced",
};

function getCardLabel(gender: UserGender, level: ExperienceLevel) {
  return gender === "female"
    ? FEMALE_PROGRAM_LABELS[level]
    : MALE_PROGRAM_LABELS[level];
}

function ProgramCard({
  program,
  gender,
  level,
}: {
  program: ProgramRow | undefined;
  gender: UserGender;
  level: ExperienceLevel;
}) {
  const fallbackTitle = getCardLabel(gender, level);

  if (!program) {
    return (
      <div className="grid gap-3 rounded-xl border border-dashed border-border bg-card/50 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {GENDER_LABELS[gender]} · {LEVEL_LABELS[level]}
          </p>
          <h3 className="mt-1 font-display text-lg text-muted-foreground">
            {fallbackTitle}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">Not created yet.</p>
        </div>
        <ProgramFormDialog
          program={null}
          trigger={
            <Button variant="outline" size="sm" className="justify-self-start">
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
              Create program
            </Button>
          }
        />
      </div>
    );
  }

  const titleEn = translation(program.title_translations, "en", program.title);
  const titleNb = translation(program.title_translations, "nb", program.title);

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {GENDER_LABELS[gender]} · {LEVEL_LABELS[level]}
        </p>
        <h3 className="mt-1 font-display text-lg text-foreground">{titleEn}</h3>
        <p className="text-sm text-muted-foreground">{titleNb}</p>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <span className="tabular-nums text-foreground">
            {program.weekCount ?? 0}
          </span>{" "}
          weeks
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="tabular-nums text-foreground">
            {program.dayCount ?? 0}
          </span>{" "}
          days
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="default"
          nativeButton={false}
          render={<Link href={`/programs/${program.id}`} />}
        >
          <HugeiconsIcon icon={WrenchIcon} size={14} strokeWidth={1.8} />
          Open builder
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/programs?edit=${program.id}`} />}
        >
          <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.8} />
          Edit
        </Button>
      </div>
    </div>
  );
}

export function ProgramGrid({ programs }: { programs: ProgramRow[] }) {
  const byCombo = new Map<string, ProgramRow>();
  for (const program of programs) {
    if (program.gender && program.level) {
      byCombo.set(`${program.gender}:${program.level}`, program);
    }
  }

  return (
    <div className="grid gap-8">
      {USER_GENDERS.map((gender) => (
        <section key={gender} className="grid gap-3">
          <h2 className="font-display text-xl text-foreground">
            {GENDER_LABELS[gender]} Programs
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <ProgramCard
                key={`${gender}:${level}`}
                program={byCombo.get(`${gender}:${level}`)}
                gender={gender}
                level={level}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
