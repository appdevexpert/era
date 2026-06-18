"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PencilEdit01Icon,
  WrenchIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { translation } from "@/lib/admin/format";
import {
  GENDER_LABELS,
  LEVEL_LABELS,
  type UserGender,
} from "@/lib/admin/constants";
import type { ProgramRow } from "@/lib/admin/types";

// Beginner + Advanced only. Intermediate users share the Beginner program;
// see ensure_my_program_assignment RPC.
type VisibleLevel = "beginner" | "advanced";
const VISIBLE_LEVELS: VisibleLevel[] = ["beginner", "advanced"];

const PROGRAM_LABELS: Record<UserGender, Record<"beginner" | "advanced", string>> = {
  male:   { beginner: "Male Beginner",   advanced: "Male Advanced" },
  female: { beginner: "Female Beginner", advanced: "Female Golden Era" },
};

const GENDER_BLURB: Record<UserGender, string> = {
  male:   "Push / Pull / Legs split. Two programs: Beginner (also serves Intermediate users) and Advanced.",
  female: "Glutes + Strength + Physique. Two programs: Beginner (also serves Intermediate users) and Advanced.",
};

function ProgramCard({
  program,
  gender,
  level,
}: {
  program: ProgramRow | undefined;
  gender: UserGender;
  level: "beginner" | "advanced";
}) {
  const fallbackTitle = PROGRAM_LABELS[gender][level];

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
      </div>
    );
  }

  const titleEn = translation(program.title_translations, "en", program.title);
  const titleNb = translation(program.title_translations, "nb", program.title);
  const intermediateNote = level === "beginner"
    ? "Used by Beginner & Intermediate users"
    : null;

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {GENDER_LABELS[gender]} · {LEVEL_LABELS[level]}
        </p>
        <h3 className="mt-1 font-display text-lg text-foreground">{titleEn}</h3>
        <p className="text-sm text-muted-foreground">{titleNb}</p>
        {intermediateNote ? (
          <p className="mt-1 text-xs text-era-gold-dark">{intermediateNote}</p>
        ) : null}
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

function GenderEntryCard({
  gender,
  programs,
}: {
  gender: UserGender;
  programs: ProgramRow[];
}) {
  const count = programs.filter((p) => p.gender === gender).length;

  return (
    <Link
      href={`/programs?gender=${gender}`}
      className="group grid gap-3 rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Gender
          </p>
          <h3 className="mt-1 font-display text-2xl text-foreground">
            {GENDER_LABELS[gender]} Programs
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {GENDER_BLURB[gender]}
          </p>
        </div>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={20}
          strokeWidth={1.8}
          className="mt-1 text-muted-foreground transition-colors group-hover:text-primary"
        />
      </div>
      <p className="text-xs uppercase tracking-[0.14em] text-era-gold-dark">
        {count} {count === 1 ? "program" : "programs"}
      </p>
    </Link>
  );
}

/**
 * Two-step navigation:
 *   No gender query param → 2 gender entry cards.
 *   ?gender=male / ?gender=female → 2 program cards for that gender (Beg + Adv).
 */
export function ProgramGrid({
  programs,
  gender,
}: {
  programs: ProgramRow[];
  gender?: UserGender;
}) {
  if (!gender) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <GenderEntryCard gender="male" programs={programs} />
        <GenderEntryCard gender="female" programs={programs} />
      </div>
    );
  }

  const byLevel = new Map<string, ProgramRow>();
  for (const program of programs) {
    if (
      program.gender === gender &&
      program.level &&
      (program.kind ?? "standard") === "standard"
    ) {
      byLevel.set(program.level, program);
    }
  }

  // Cycle 2 alternative — currently only Bro Split for male users.
  const cycle2Programs = programs.filter(
    (program) => program.gender === gender && program.kind === "bro_split",
  );

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-foreground">
          {GENDER_LABELS[gender]} Programs
        </h2>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/programs" />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.8} />
          All genders
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {VISIBLE_LEVELS.map((level) => (
          <ProgramCard
            key={`${gender}:${level}`}
            program={byLevel.get(level)}
            gender={gender}
            level={level}
          />
        ))}
      </div>

      {cycle2Programs.length > 0 ? (
        <div className="grid gap-3 pt-2">
          <h3 className="font-display text-base text-muted-foreground">
            Cycle 2 alternatives
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {cycle2Programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                gender={gender}
                level="advanced"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
