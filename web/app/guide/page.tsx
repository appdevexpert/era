"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  Dumbbell01Icon,
  Idea01Icon,
  Layers01Icon,
  WorkoutRunIcon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Lang = "en" | "nb";

type FlowStepContent = { title: string; detail: string };

type ReferenceContent = { term: string; body: ReactNode };

type Translation = {
  eyebrow: string;
  title: string;
  intro: string;
  langLabel: string;
  tipLabel: string;
  buildOrder: { card: string; steps: FlowStepContent[] };
  addExercise: {
    title: string;
    hrefLabel: string;
    steps: ReactNode[];
    tip: ReactNode;
  };
  createProgram: {
    title: string;
    hrefLabel: string;
    steps: ReactNode[];
  };
  builder: {
    title: string;
    intro: ReactNode;
    steps: ReactNode[];
    tip: ReactNode;
  };
  quickReference: { title: string; items: ReferenceContent[] };
};

const TRANSLATIONS: Record<Lang, Translation> = {
  en: {
    eyebrow: "Admin Guide",
    title: "How to build a workout program",
    intro:
      "A short walkthrough for adding exercises, building a 12-week program, and getting the content live on the mobile app.",
    langLabel: "Language",
    tipLabel: "Tip:",
    buildOrder: {
      card: "Build order",
      steps: [
        {
          title: "Add exercises to the library first",
          detail:
            "A program references exercises, so the library must be populated before you build a program.",
        },
        {
          title: "Create the program shell",
          detail:
            "Give it a title and status (draft / active). Programs start as draft so they're not visible to users yet.",
        },
        {
          title: "Add weeks, days, sections, exercises, sets",
          detail:
            "Open the builder for the program and work top-down: a week holds days, a day holds sections, a section holds assigned exercises, an exercise holds planned sets.",
        },
        {
          title: "Flip the program to active",
          detail:
            "When the content is ready, edit the program and change status from draft to active. The mobile app picks up active programs.",
        },
      ],
    },
    addExercise: {
      title: "Adding an exercise",
      hrefLabel: "Go to Exercises",
      steps: [
        <>
          Open <NavCrumb>Exercises</NavCrumb> from the sidebar.
        </>,
        <>
          Click <strong>+ Add exercise</strong> top-right. A dialog opens.
        </>,
        <>
          Fill <strong>Name (EN)</strong> and <strong>Name (NB)</strong> — both
          languages are required since the app is bilingual.
        </>,
        <>
          Choose <strong>Modality</strong> (strength / cardio / mobility / core)
          and <strong>Category</strong> (compound / isolation / cardio / warmup
          / cooldown).
        </>,
        <>
          Add primary muscles (chest, shoulders…). Comma-separated. These drive
          the muscle tags users see.
        </>,
        <>Optional: coaching cues, default rest seconds, video URL, thumbnail.</>,
        <>
          Click <strong>Save</strong>. The exercise is now selectable inside
          program days.
        </>,
      ],
      tip: (
        <>
          Use the <strong>Inactive</strong> tab on the Exercises page to find
          retired exercises. Toggling an exercise to inactive hides it from new
          assignments but keeps existing program data intact.
        </>
      ),
    },
    createProgram: {
      title: "Creating a 12-week program",
      hrefLabel: "Go to Programs",
      steps: [
        <>
          Go to <NavCrumb>Programs</NavCrumb> and click{" "}
          <strong>+ Create program</strong>.
        </>,
        <>
          Fill in title <strong>(EN)</strong> and <strong>(NB)</strong>,
          duration (12 weeks), days/week, optional goal description. Status
          stays <Badge variant="secondary">draft</Badge> until you flip it.
        </>,
        <>
          Save. The program appears in the table — click the row title or use
          the kebab menu → <strong>Open builder</strong>.
        </>,
      ],
    },
    builder: {
      title: "Inside the program builder",
      intro: (
        <>
          Hierarchy:{" "}
          <strong>Program → Week → Day → Section → Exercise → Set</strong>.
          Work top-down.
        </>
      ),
      steps: [
        <>
          <strong>Add weeks</strong> in the left rail. Each week has a phase tag
          (Hypertrophy / Strength / Peak) and an optional Deload flag.
        </>,
        <>
          Click a week → its days appear as cards on the right.{" "}
          <strong>+ Add day</strong> fills the empty tile.
        </>,
        <>
          On the day form: weekday, workout kind (push / pull / legs / etc.),
          estimated minutes, title EN + NB, target muscles.
        </>,
        <>
          Open a day card → <strong>Open editor</strong>. A side sheet slides
          in. If sections are empty, click{" "}
          <strong>Add default sections</strong> (warmup, main, cooldown) — or
          add your own.
        </>,
        <>
          Inside a section, click <strong>Assign exercise</strong> → pick from
          the library you populated earlier. Set an optional initial weight.
        </>,
        <>
          Per exercise, add planned sets. Use <strong>Bulk sets</strong> to
          create 3–4 identical sets in one shot (e.g. 4 working sets at 8 reps
          and 75 kg). Or <strong>Set</strong> to add one at a time.
        </>,
        <>
          Repeat for every day in every week. When the structure looks right,
          close the sheet and edit the program metadata to flip{" "}
          <Badge variant="secondary">draft</Badge> →{" "}
          <Badge variant="default">active</Badge>.
        </>,
      ],
      tip: (
        <>
          Status dots on the program list:{" "}
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={12}
              strokeWidth={2}
              className="text-era-success"
            />
            active
          </span>{" "}
          is live for users, draft is hidden, archived is read-only.
        </>
      ),
    },
    quickReference: {
      title: "Quick reference",
      items: [
        {
          term: "Bilingual content",
          body: "Every user-visible field has EN and NB inputs. Both must be filled. The mobile app picks based on the user's app language.",
        },
        {
          term: "Program statuses",
          body: "draft = invisible to users · active = live in the app · archived = read-only history.",
        },
        {
          term: "Section kinds",
          body: "warmup, main_exercises, core_finisher, treadmill_walk, cooldown, custom. Use 'Add default sections' to scaffold a typical day.",
        },
        {
          term: "Set kinds",
          body: "warmup, working, top_set, backoff, drop_set, amrap, core, cardio. Pick the one that matches what the user should feel.",
        },
        {
          term: "Soft delete",
          body: "Toggling an exercise inactive keeps it in existing programs but hides it from new assignments. Use this instead of hard delete when possible.",
        },
      ],
    },
  },
  nb: {
    eyebrow: "Admin-guide",
    title: "Hvordan bygge et treningsprogram",
    intro:
      "En kort gjennomgang for å legge til øvelser, bygge et 12-ukers program og få innholdet live i mobilappen.",
    langLabel: "Språk",
    tipLabel: "Tips:",
    buildOrder: {
      card: "Byggerekkefølge",
      steps: [
        {
          title: "Legg til øvelser i biblioteket først",
          detail:
            "Et program refererer til øvelser, så biblioteket må fylles før du bygger et program.",
        },
        {
          title: "Opprett programskallet",
          detail:
            "Gi det en tittel og status (utkast / aktiv). Programmer starter som utkast, så de er ikke synlige for brukere ennå.",
        },
        {
          title: "Legg til uker, dager, seksjoner, øvelser og sett",
          detail:
            "Åpne byggeren for programmet og jobb ovenfra og ned: en uke inneholder dager, en dag inneholder seksjoner, en seksjon inneholder tildelte øvelser, en øvelse inneholder planlagte sett.",
        },
        {
          title: "Sett programmet til aktiv",
          detail:
            "Når innholdet er klart, rediger programmet og endre status fra utkast til aktiv. Mobilappen henter aktive programmer.",
        },
      ],
    },
    addExercise: {
      title: "Legge til en øvelse",
      hrefLabel: "Gå til Øvelser",
      steps: [
        <>
          Åpne <NavCrumb>Øvelser</NavCrumb> fra sidemenyen.
        </>,
        <>
          Klikk <strong>+ Legg til øvelse</strong> øverst til høyre. En dialog
          åpnes.
        </>,
        <>
          Fyll inn <strong>Navn (EN)</strong> og <strong>Navn (NB)</strong> —
          begge språk er påkrevd siden appen er tospråklig.
        </>,
        <>
          Velg <strong>Modalitet</strong> (styrke / kondisjon / mobilitet /
          kjerne) og <strong>Kategori</strong> (sammensatt / isolasjon /
          kondisjon / oppvarming / nedtrapping).
        </>,
        <>
          Legg til primære muskler (bryst, skuldre …). Kommaseparert. Disse
          styrer muskeletikettene brukerne ser.
        </>,
        <>
          Valgfritt: trenerhint, standard hvilesekunder, video-URL,
          miniatyrbilde.
        </>,
        <>
          Klikk <strong>Lagre</strong>. Øvelsen kan nå velges inni programdager.
        </>,
      ],
      tip: (
        <>
          Bruk fanen <strong>Inaktiv</strong> på Øvelser-siden for å finne
          pensjonerte øvelser. Å sette en øvelse til inaktiv skjuler den fra nye
          tildelinger, men beholder eksisterende programdata.
        </>
      ),
    },
    createProgram: {
      title: "Opprette et 12-ukers program",
      hrefLabel: "Gå til Programmer",
      steps: [
        <>
          Gå til <NavCrumb>Programmer</NavCrumb> og klikk{" "}
          <strong>+ Opprett program</strong>.
        </>,
        <>
          Fyll inn tittel <strong>(EN)</strong> og <strong>(NB)</strong>,
          varighet (12 uker), dager/uke og valgfri målbeskrivelse. Statusen
          forblir <Badge variant="secondary">utkast</Badge> til du endrer den.
        </>,
        <>
          Lagre. Programmet vises i tabellen — klikk radens tittel eller bruk
          kebab-menyen → <strong>Åpne bygger</strong>.
        </>,
      ],
    },
    builder: {
      title: "Inni programbyggeren",
      intro: (
        <>
          Hierarki:{" "}
          <strong>Program → Uke → Dag → Seksjon → Øvelse → Sett</strong>. Jobb
          ovenfra og ned.
        </>
      ),
      steps: [
        <>
          <strong>Legg til uker</strong> i venstre kolonne. Hver uke har en
          fasemerkelapp (Hypertrofi / Styrke / Topp) og et valgfritt
          Deload-flagg.
        </>,
        <>
          Klikk på en uke → dagene vises som kort til høyre.{" "}
          <strong>+ Legg til dag</strong> fyller den tomme flisen.
        </>,
        <>
          I dagsskjemaet: ukedag, økttype (push / pull / bein osv.), estimerte
          minutter, tittel EN + NB, målmuskler.
        </>,
        <>
          Åpne et dagskort → <strong>Åpne editor</strong>. Et sidepanel glir
          inn. Hvis seksjonene er tomme, klikk{" "}
          <strong>Legg til standardseksjoner</strong> (oppvarming, hoved,
          nedtrapping) — eller legg til dine egne.
        </>,
        <>
          Inni en seksjon, klikk <strong>Tildel øvelse</strong> → velg fra
          biblioteket du fylte tidligere. Sett en valgfri startvekt.
        </>,
        <>
          Per øvelse, legg til planlagte sett. Bruk{" "}
          <strong>Masse-sett</strong> for å lage 3–4 identiske sett på én gang
          (f.eks. 4 arbeidssett på 8 reps og 75 kg). Eller <strong>Sett</strong>{" "}
          for å legge til ett om gangen.
        </>,
        <>
          Gjenta for hver dag i hver uke. Når strukturen ser riktig ut, lukk
          panelet og rediger programmetadataene for å bytte{" "}
          <Badge variant="secondary">utkast</Badge> →{" "}
          <Badge variant="default">aktiv</Badge>.
        </>,
      ],
      tip: (
        <>
          Statusprikker i programlisten:{" "}
          <span className="inline-flex items-center gap-1">
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              size={12}
              strokeWidth={2}
              className="text-era-success"
            />
            aktiv
          </span>{" "}
          er live for brukere, utkast er skjult, arkivert er kun lesbar.
        </>
      ),
    },
    quickReference: {
      title: "Hurtigreferanse",
      items: [
        {
          term: "Tospråklig innhold",
          body: "Hvert brukersynlig felt har EN- og NB-input. Begge må fylles. Mobilappen velger basert på brukerens appspråk.",
        },
        {
          term: "Programstatuser",
          body: "utkast = usynlig for brukere · aktiv = live i appen · arkivert = kun lesbar historikk.",
        },
        {
          term: "Seksjontyper",
          body: "oppvarming, hovedøvelser, kjerne-finisher, tredemølle-gange, nedtrapping, tilpasset. Bruk «Legg til standardseksjoner» for å stillasere en typisk dag.",
        },
        {
          term: "Sett-typer",
          body: "oppvarming, arbeid, toppsett, backoff, drop-sett, amrap, kjerne, kondisjon. Velg den som passer det brukeren skal føle.",
        },
        {
          term: "Myk sletting",
          body: "Å sette en øvelse til inaktiv beholder den i eksisterende programmer, men skjuler den fra nye tildelinger. Bruk dette i stedet for hard sletting når mulig.",
        },
      ],
    },
  },
};

export default function GuidePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = TRANSLATIONS[lang];

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark">
            {t.eyebrow}
          </p>
          <ToggleGroup
            multiple={false}
            value={[lang]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "en" || next === "nb") {
                setLang(next);
              }
            }}
            variant="outline"
            aria-label={t.langLabel}
            className="*:data-[slot=toggle-group-item]:px-3!"
          >
            <ToggleGroupItem
              value="en"
              className="data-[state=on]:bg-era-gold-dark! data-[state=on]:text-white! data-[state=on]:border-era-gold-dark! aria-pressed:bg-era-gold-dark! aria-pressed:text-white!"
            >
              EN
            </ToggleGroupItem>
            <ToggleGroupItem
              value="nb"
              className="data-[state=on]:bg-era-gold-dark! data-[state=on]:text-white! data-[state=on]:border-era-gold-dark! aria-pressed:bg-era-gold-dark! aria-pressed:text-white!"
            >
              NB
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
          {t.title}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t.intro}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon icon={Idea01Icon} size={18} strokeWidth={1.8} />
            {t.buildOrder.card}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm">
            {t.buildOrder.steps.map((step, i) => (
              <FlowStep
                key={i}
                n={i + 1}
                title={step.title}
                detail={step.detail}
                last={i === t.buildOrder.steps.length - 1}
              />
            ))}
          </ol>
        </CardContent>
      </Card>

      <SectionBlock
        icon={Dumbbell01Icon}
        title={t.addExercise.title}
        href="/exercises"
        hrefLabel={t.addExercise.hrefLabel}
      >
        <ol className="grid gap-2 text-sm text-foreground">
          {t.addExercise.steps.map((step, i) => (
            <Step key={i}>{step}</Step>
          ))}
        </ol>
        <Note tipLabel={t.tipLabel}>{t.addExercise.tip}</Note>
      </SectionBlock>

      <SectionBlock
        icon={WorkoutRunIcon}
        title={t.createProgram.title}
        href="/programs"
        hrefLabel={t.createProgram.hrefLabel}
      >
        <ol className="grid gap-2 text-sm text-foreground">
          {t.createProgram.steps.map((step, i) => (
            <Step key={i}>{step}</Step>
          ))}
        </ol>
      </SectionBlock>

      <SectionBlock icon={Layers01Icon} title={t.builder.title}>
        <p className="text-sm text-muted-foreground">{t.builder.intro}</p>
        <ol className="grid gap-2 text-sm text-foreground">
          {t.builder.steps.map((step, i) => (
            <Step key={i}>{step}</Step>
          ))}
        </ol>
        <Note tipLabel={t.tipLabel}>{t.builder.tip}</Note>
      </SectionBlock>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon icon={BookOpen01Icon} size={18} strokeWidth={1.8} />
            {t.quickReference.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {t.quickReference.items.map((item, i) => (
            <Reference key={i} term={item.term} body={item.body} />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function FlowStep({
  n,
  title,
  detail,
  last,
}: {
  n: number;
  title: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-era-gold-dark/15 text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{detail}</p>
        {!last ? <Separator className="mt-3" /> : null}
      </div>
    </li>
  );
}

function SectionBlock({
  icon,
  title,
  href,
  hrefLabel,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
          {title}
        </CardTitle>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-era-gold-dark transition-colors hover:text-primary"
          >
            {hrefLabel}
            <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <HugeiconsIcon
        icon={CheckmarkCircle01Icon}
        size={14}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-era-success"
      />
      <span>{children}</span>
    </li>
  );
}

function NavCrumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function Note({
  tipLabel,
  children,
}: {
  tipLabel: string;
  children: React.ReactNode;
}) {
  return (
    <p className="rounded-md border border-era-gold-dark/30 bg-accent/40 p-3 text-xs text-muted-foreground">
      <strong className="text-foreground">{tipLabel}</strong> {children}
    </p>
  );
}

function Reference({ term, body }: { term: string; body: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <p className="font-medium text-foreground">{term}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
