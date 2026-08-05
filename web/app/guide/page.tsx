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
      "A short walkthrough for adding exercises, filling out a launch program, and getting the content live on the mobile app.",
    langLabel: "Language",
    tipLabel: "Tip:",
    buildOrder: {
      card: "Build order",
      steps: [
        {
          title: "Add exercises to the library first",
          detail:
            "Programs reference exercises. Populate the library before you open the builder.",
        },
        {
          title: "Open one of the four launch programs",
          detail:
            "Programs are seeded and appear on /programs as a gender → level grid (Male / Female × Beginner / Advanced). You don't usually create new programs — you open the card and fill it out. Intermediate users share the Beginner program.",
        },
        {
          title: "Fill weeks → days → sections → exercises → sets",
          detail:
            "Inside the builder, work top-down. A week holds days, a day holds sections, a section holds assigned exercises, an exercise holds planned sets.",
        },
        {
          title: "Content goes live automatically",
          detail:
            "There is no draft/active toggle in the admin. Launch programs are already active — the mobile app picks up whatever weeks/days/exercises/sets you've saved. Missing sets simply mean the app has nothing to show for that day yet.",
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
          Fill <strong>English name</strong> and <strong>Norwegian name</strong>{" "}
          — both languages are required since the app is bilingual.
        </>,
        <>
          Choose <strong>Modality</strong> (strength / cardio / mobility / core)
          and <strong>Category</strong> (compound / isolation / core / cardio /
          warmup / cooldown).
        </>,
        <>
          Optional: <strong>Primary muscles</strong> (comma-separated free text
          — drives the muscle tags users see) and the{" "}
          <strong>English</strong> / <strong>Norwegian description</strong>,
          which the app shows as the form detail when a user taps the exercise.
        </>,
        <>
          Under <strong>Demo clips</strong>, upload the{" "}
          <strong>male</strong> and <strong>female</strong> animation. MP4 only.
          These play on the workout log screen and in the exercise info sheet.{" "}
          <strong>Loop the clip continuously</strong> is on by default; turn it
          off and the app plays it once, then shows a tap-to-play button.
        </>,
        <>
          Leave <strong>Active exercise</strong> ticked so it shows up in the
          library picker.
        </>,
        <>
          Click <strong>Create exercise</strong>. It&apos;s now selectable when
          you assign exercises to a day.
        </>,
      ],
      tip: (
        <>
          Rest time is not set here — it belongs to the set, inside the program
          builder, because the same exercise can take a different rest in
          different programs. Use the <strong>Inactive</strong> status filter on
          the Exercises page to find retired exercises. Unchecking{" "}
          <strong>Active exercise</strong> hides it from new assignments but
          keeps existing program data intact.
        </>
      ),
    },
    createProgram: {
      title: "Opening (or creating) a program",
      hrefLabel: "Go to Programs",
      steps: [
        <>
          Go to <NavCrumb>Programs</NavCrumb>. You&apos;ll see two gender
          entry cards — <strong>Male Programs</strong> and{" "}
          <strong>Female Programs</strong>. Click one.
        </>,
        <>
          You now see the launch programs for that gender —{" "}
          <strong>Beginner</strong> and <strong>Advanced</strong> — and any{" "}
          <strong>Cycle 2 alternatives</strong> (currently just Bro Split for
          male). Click <strong>Open builder</strong> on the card you want to
          fill.
        </>,
        <>
          You almost never need <strong>+ Create program</strong>. Use it only
          for a brand-new Cycle 2 alternative or a one-off plan. The form asks
          for English + Norwegian title, an internal title, duration weeks
          (default 12), days per week (default 6),{" "}
          <strong>Gender</strong>, <strong>Experience level</strong>, and{" "}
          <strong>Program kind</strong> (Standard or Bro Split).
        </>,
        <>
          Gender, level, and program kind are <strong>locked</strong> on the
          launch programs — changing them silently re-routes existing users, so
          the admin rejects the edit.
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
          <strong>Add weeks</strong> from the left rail. Each week takes a{" "}
          <strong>Week number</strong> and a <strong>Phase</strong> tag
          (Hypertrophy / Strength / Peak). No deload flag — deloading is
          expressed by lowering the sets/weights on that week.
        </>,
        <>
          Click a week → its days appear as cards on the right.{" "}
          <strong>+ Add day</strong> fills the next tile.
        </>,
        <>
          Day form: <strong>Day number</strong>,{" "}
          <strong>Weekday (1–7)</strong>, <strong>Workout kind</strong> (push /
          pull / legs / shoulders / cardio / rest / custom),{" "}
          <strong>Estimated minutes</strong>, <strong>Title EN + NB</strong>,{" "}
          <strong>Subtitle EN + NB</strong>, <strong>Target muscles</strong>{" "}
          (comma-separated).
        </>,
        <>
          Open a day card → <strong>Open editor</strong>. A side sheet slides
          in. If sections are empty, click{" "}
          <strong>Add default sections</strong> — otherwise use{" "}
          <strong>Add section</strong> with a{" "}
          <em>section kind</em> and EN + NB titles.
        </>,
        <>
          Under Exercises, click <strong>Assign exercise</strong> → pick the
          target <strong>Section</strong>, the{" "}
          <strong>Exercise</strong> from the library, and an optional{" "}
          <strong>Initial weight (kg)</strong>.
        </>,
        <>
          Each exercise card shows a one-line summary of its sets — click it to
          open the set grid. Every set is a row you edit in place: kind, kg,
          reps, rest. <strong>Reps</strong> takes one number or a range, so type{" "}
          <strong>10</strong> or <strong>10-12</strong>. Use{" "}
          <strong>Add set</strong> to append a copy of the last row and{" "}
          <strong>Copy set 1 to all</strong> for &ldquo;4 identical working
          sets&rdquo;. Nothing is written until you press{" "}
          <strong>Save sets</strong>.
        </>,
        <>
          Assigning, editing, removing an exercise and saving its sets each show
          an <strong>Apply to Mon in all 12 weeks</strong> checkbox, ticked by
          default. Leave it on and one edit lands on that weekday in every week —
          you never repeat the same change twelve times. Untick it to change only
          the week you are looking at. The confirmation afterwards names the real
          number, so if three weeks don&apos;t have that exercise you are told
          rather than left assuming.
        </>,
        <>
          Close the sheet when the day looks right — set changes save on{" "}
          <strong>Save sets</strong>, everything else saves as you submit its
          dialog.
        </>,
      ],
      tip: (
        <>
          The program list doesn&apos;t show status dots — the four launch programs
          are already live for the mobile app. The badges at the top of the
          builder (
          <Badge variant="outline">weeks</Badge>,{" "}
          <Badge variant="outline">days</Badge>,{" "}
          <Badge variant="outline">exercises</Badge>,{" "}
          <Badge variant="outline">planned sets</Badge>) are your progress
          meter — aim to have all four non-zero before shipping.
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
          term: "Launch programs",
          body: "Four cohort programs: Male Beginner, Male Advanced, Female Beginner, Female Advanced. Beginner also serves Intermediate users (ensure_my_program_assignment RPC maps intermediate → beginner). Bro Split is a male-only Cycle 2 alternative.",
        },
        {
          term: "Program kinds",
          body: "standard = the main cohort program · bro_split = Cycle 2 alternative (currently only male). Gender + level + kind are locked on the seeded launch programs.",
        },
        {
          term: "Section kinds",
          body: "warmup, main_exercises, core_finisher, treadmill_walk, cooldown, custom. Use 'Add default sections' to scaffold a typical day.",
        },
        {
          term: "Set kinds",
          body: "working, top_set and backoff on strength exercises; core on core exercises; cardio on cardio ones. The Kind list is filtered by the exercise's Modality, so only the valid options ever appear. Top set is the planned max for the day; back-off is a lighter follow-up at higher reps. Warm-up, drop set and AMRAP were dropped from the picker.",
        },
        {
          term: "Soft delete",
          body: "Unticking 'Active exercise' keeps it in existing programs but hides it from new assignments. Use this instead of hard delete when possible.",
        },
      ],
    },
  },
  nb: {
    eyebrow: "Admin-guide",
    title: "Hvordan bygge et treningsprogram",
    intro:
      "En kort gjennomgang for å legge til øvelser, fylle ut et lanseringsprogram og få innholdet live i mobilappen.",
    langLabel: "Språk",
    tipLabel: "Tips:",
    buildOrder: {
      card: "Byggerekkefølge",
      steps: [
        {
          title: "Legg til øvelser i biblioteket først",
          detail:
            "Programmer refererer til øvelser. Fyll biblioteket før du åpner byggeren.",
        },
        {
          title: "Åpne ett av de fire lanseringsprogrammene",
          detail:
            "Programmene er forhåndsopprettet og vises på /programs som et kjønn → nivå-rutenett (Menn / Kvinner × Nybegynner / Avansert). Vanligvis oppretter du ikke nye programmer — du åpner kortet og fyller det ut. Intermediate-brukere deler Nybegynner-programmet.",
        },
        {
          title: "Fyll uker → dager → seksjoner → øvelser → sett",
          detail:
            "Inne i byggeren jobber du ovenfra og ned. En uke inneholder dager, en dag inneholder seksjoner, en seksjon inneholder tildelte øvelser, en øvelse inneholder planlagte sett.",
        },
        {
          title: "Innholdet går live automatisk",
          detail:
            "Det finnes ingen utkast/aktiv-veksle i admin. Lanseringsprogrammene er allerede aktive — mobilappen henter det du har lagret av uker/dager/øvelser/sett. Manglende sett betyr bare at appen ikke har noe å vise for den dagen ennå.",
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
          Fyll inn <strong>Engelsk navn</strong> og{" "}
          <strong>Norsk navn</strong> — begge språk er påkrevd siden appen er
          tospråklig.
        </>,
        <>
          Velg <strong>Modalitet</strong> (styrke / kondisjon / mobilitet /
          kjerne) og <strong>Kategori</strong> (sammensatt / isolasjon /
          kjerne / kondisjon / oppvarming / nedtrapping).
        </>,
        <>
          Valgfritt: <strong>Primære muskler</strong> (kommaseparert fritekst —
          styrer muskeletikettene brukerne ser) og{" "}
          <strong>Engelsk</strong> / <strong>Norsk beskrivelse</strong>, som
          appen viser som teknikkforklaring når brukeren trykker på øvelsen.
        </>,
        <>
          Under <strong>Demo clips</strong>, last opp animasjonen for{" "}
          <strong>mann</strong> og <strong>kvinne</strong>. Kun MP4. Disse
          spilles på loggeskjermen og i øvelsesinfoen.{" "}
          <strong>Loop the clip continuously</strong> er på som standard; slår
          du den av, spiller appen den én gang og viser deretter en
          trykk-for-å-spille-knapp.
        </>,
        <>
          La <strong>Aktiv øvelse</strong> være huket av så den vises i
          bibliotekvelgeren.
        </>,
        <>
          Klikk <strong>Opprett øvelse</strong>. Den er nå valgbar når du
          tildeler øvelser til en dag.
        </>,
      ],
      tip: (
        <>
          Hviletid settes ikke her — den hører til settet, inne i
          programbyggeren, fordi samme øvelse kan ha ulik hvile i ulike
          program. Bruk statusfilteret <strong>Inaktiv</strong> på
          Øvelser-siden for å finne pensjonerte øvelser. Å fjerne haken for{" "}
          <strong>Aktiv øvelse</strong> skjuler den fra nye tildelinger, men
          beholder eksisterende programdata.
        </>
      ),
    },
    createProgram: {
      title: "Åpne (eller opprette) et program",
      hrefLabel: "Gå til Programmer",
      steps: [
        <>
          Gå til <NavCrumb>Programmer</NavCrumb>. Du ser to kjønnskort —{" "}
          <strong>Menn Programmer</strong> og{" "}
          <strong>Kvinner Programmer</strong>. Klikk på ett.
        </>,
        <>
          Nå ser du lanseringsprogrammene for det kjønnet —{" "}
          <strong>Nybegynner</strong> og <strong>Avansert</strong> — og
          eventuelle <strong>Cycle 2-alternativer</strong> (foreløpig kun Bro
          Split for menn). Klikk <strong>Åpne bygger</strong> på kortet du vil
          fylle ut.
        </>,
        <>
          Du trenger nesten aldri <strong>+ Opprett program</strong>. Bruk det
          kun for et nytt Cycle 2-alternativ eller en engangsplan. Skjemaet ber
          om engelsk + norsk tittel, en intern tittel, varighet i uker
          (standard 12), dager per uke (standard 6),{" "}
          <strong>Kjønn</strong>, <strong>Erfaringsnivå</strong> og{" "}
          <strong>Programtype</strong> (Standard eller Bro Split).
        </>,
        <>
          Kjønn, nivå og programtype er <strong>låst</strong> på
          lanseringsprogrammene — endring omdirigerer stille eksisterende
          brukere, så admin avviser endringen.
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
          <strong>Legg til uker</strong> fra venstre kolonne. Hver uke tar et{" "}
          <strong>Ukenummer</strong> og en <strong>Fase</strong>-etikett
          (Hypertrofi / Styrke / Topp). Ingen deload-flagg — deloading uttrykkes
          ved å senke sett/vekter i den aktuelle uken.
        </>,
        <>
          Klikk på en uke → dagene vises som kort til høyre.{" "}
          <strong>+ Legg til dag</strong> fyller neste flis.
        </>,
        <>
          Dagsskjema: <strong>Dagsnummer</strong>,{" "}
          <strong>Ukedag (1–7)</strong>, <strong>Økttype</strong> (push /
          pull / bein / skuldre / kondisjon / hvile / tilpasset),{" "}
          <strong>Estimerte minutter</strong>,{" "}
          <strong>Tittel EN + NB</strong>,{" "}
          <strong>Undertittel EN + NB</strong>,{" "}
          <strong>Målmuskler</strong> (kommaseparert).
        </>,
        <>
          Åpne et dagskort → <strong>Åpne editor</strong>. Et sidepanel glir
          inn. Hvis seksjonene er tomme, klikk{" "}
          <strong>Legg til standardseksjoner</strong> — ellers bruk{" "}
          <strong>Legg til seksjon</strong> med en{" "}
          <em>seksjonstype</em> og EN + NB-titler.
        </>,
        <>
          Under Øvelser, klikk <strong>Tildel øvelse</strong> → velg{" "}
          <strong>Seksjon</strong>, <strong>Øvelse</strong> fra biblioteket, og
          en valgfri <strong>Startvekt (kg)</strong>.
        </>,
        <>
          Hvert øvelseskort viser settene oppsummert på én linje — klikk på den
          for å åpne settabellen. Hvert sett er en rad du redigerer direkte:
          type, kg, reps og hvile. <strong>Reps</strong> tar ett tall eller et
          intervall, så skriv <strong>10</strong> eller{" "}
          <strong>10-12</strong>. Bruk <strong>Add set</strong> for å legge til
          en kopi av forrige rad, og <strong>Copy set 1 to all</strong> for «4
          like arbeidssett». Ingenting lagres før du trykker{" "}
          <strong>Save sets</strong>.
        </>,
        <>
          Å tildele, redigere og fjerne en øvelse — og å lagre settene — viser
          alle en avkrysningsboks:{" "}
          <strong>Apply to Mon in all 12 weeks</strong>, haket av som standard.
          La den stå på, og én endring treffer den samme ukedagen i alle uker —
          du gjentar aldri samme endring tolv ganger. Fjern haken for å endre
          bare den uken du står i. Bekreftelsen etterpå oppgir det faktiske
          antallet, så hvis tre uker ikke har den øvelsen, får du vite det i
          stedet for å anta.
        </>,
        <>
          Lukk panelet når dagen ser riktig ut — settendringer lagres med{" "}
          <strong>Save sets</strong>, alt annet lagres når du sender inn
          dialogen.
        </>,
      ],
      tip: (
        <>
          Programlisten viser ikke statusprikker — de fire
          lanseringsprogrammene er allerede live i mobilappen. Emblemene øverst
          i byggeren (
          <Badge variant="outline">uker</Badge>,{" "}
          <Badge variant="outline">dager</Badge>,{" "}
          <Badge variant="outline">øvelser</Badge>,{" "}
          <Badge variant="outline">planlagte sett</Badge>) er
          fremdriftsmåleren din — sikt på at alle fire er større enn null før
          du sender.
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
          term: "Lanseringsprogrammer",
          body: "Fire kohortprogrammer: Menn Nybegynner, Menn Avansert, Kvinner Nybegynner, Kvinner Avansert. Nybegynner betjener også Intermediate-brukere (ensure_my_program_assignment RPC mapper intermediate → nybegynner). Bro Split er et menns-Cycle 2-alternativ.",
        },
        {
          term: "Programtyper",
          body: "standard = hovedkohortprogrammet · bro_split = Cycle 2-alternativ (foreløpig kun menn). Kjønn + nivå + type er låst på de forhåndsopprettede lanseringsprogrammene.",
        },
        {
          term: "Seksjontyper",
          body: "oppvarming, hovedøvelser, kjerne-finisher, tredemølle-gange, nedtrapping, tilpasset. Bruk «Legg til standardseksjoner» for å stillasere en typisk dag.",
        },
        {
          term: "Sett-typer",
          body: "working, top_set og backoff på styrkeøvelser; core på kjerneøvelser; cardio på kondisjonsøvelser. Kind-listen filtreres etter øvelsens Modality, så bare de gyldige valgene vises. Toppsett er dagens planlagte maks; backoff er en lettere oppfølging med høyere reps. Oppvarming, drop-sett og AMRAP er fjernet fra velgeren.",
        },
        {
          term: "Myk sletting",
          body: "Å fjerne haken for «Aktiv øvelse» beholder den i eksisterende programmer, men skjuler den fra nye tildelinger. Bruk dette i stedet for hard sletting når mulig.",
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
