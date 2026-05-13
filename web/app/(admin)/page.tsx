import Link from "next/link";
import {
  Activity,
  Dumbbell,
  FileStack,
} from "lucide-react";

import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getPrograms } from "@/lib/admin/data";
import { dateText, translation } from "@/lib/admin/format";

export default async function DashboardPage() {
  const [statsState, programsState] = await Promise.all([
    getDashboardStats(),
    getPrograms(),
  ]);
  const stats = statsState.data;
  const recentPrograms = programsState.data.slice(0, 4);
  const configError = statsState.configError ?? programsState.configError;

  return (
    <>
      <PageHeader
        eyebrow="Owner Dashboard"
        title="ERA admin"
        description="Manage workout programs, exercise content, and the users connected to the app."
        action={
          <Link
            href="/programs"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-era-gold-light"
          >
            Manage programs
          </Link>
        }
      />

      <ConfigWarning message={configError} />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Users"
          value={stats.totalUsers}
          description="Registered users"
          icon={Activity}
          href="/users"
        />
        <StatCard
          title="Exercises"
          value={stats.totalExercises}
          description="Exercise library entries"
          icon={Dumbbell}
          href="/exercises"
        />
        <StatCard
          title="Programs"
          value={stats.totalPrograms}
          description="All workout programs"
          icon={FileStack}
          href="/programs"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg border-border">
          <CardHeader>
            <CardTitle className="font-sans">Recent programs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentPrograms.length ? (
              recentPrograms.map((program) => (
                <Link
                  key={program.id}
                  href={`/programs/${program.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-era-black-2 p-3 transition-colors hover:border-era-gold-60"
                >
                  <div>
                    <p className="font-medium text-era-white">
                      {translation(program.title_translations, "en", program.title)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {program.weekCount ?? 0} weeks, {program.dayCount ?? 0} days
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-era-gold-dark">
                    {program.status}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No programs created yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border">
          <CardHeader>
            <CardTitle className="font-sans">Build order</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm text-muted-foreground">
              <li>1. Add exercises with English and Norwegian names.</li>
              <li>2. Create the 12-week program shell.</li>
              <li>3. Add weeks, days, sections, exercises, and sets.</li>
              <li>4. Assign the active program to users when ready.</li>
            </ol>
            <p className="mt-5 text-xs text-muted-foreground">
              Last refreshed {dateText(new Date().toISOString())}
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
