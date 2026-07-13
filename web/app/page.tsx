import Link from "next/link";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Crown02Icon,
  UserCircleIcon,
  UserIcon,
  WorkoutRunIcon,
} from "@hugeicons/core-free-icons";

import { ConfigWarning } from "@/components/admin/config-warning";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards, type SectionCardData } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDashboardActivity,
  getDashboardStats,
  getRecentUsers,
  type RecentUser,
} from "@/lib/admin/data";
import { relativeTimeText } from "@/lib/admin/format";

export default async function DashboardPage() {
  const [statsState, activityState, recentUsersState] = await Promise.all([
    getDashboardStats(),
    getDashboardActivity(90),
    getRecentUsers(7, 20),
  ]);
  const stats = statsState.data;
  const configError =
    statsState.configError ??
    activityState.configError ??
    recentUsersState.configError;

  const cards: SectionCardData[] = [
    {
      label: "Total users",
      value: stats.totalUsers,
      caption: `${stats.activeUsers} active in last 30 days`,
      hint:
        stats.activeUsers > 0
          ? "Engaged with the app recently"
          : "No recent workout sessions",
      href: "/users",
      hrefLabel: "Manage users",
    },
    {
      label: "Exercise library",
      value: stats.totalExercises,
      caption: "Bilingual entries (EN + NB)",
      hint: "Used inside program day sections",
      href: "/exercises",
      hrefLabel: "Open library",
    },
    {
      label: "Active programs",
      value: stats.activePrograms,
      caption:
        stats.draftPrograms > 0
          ? `${stats.draftPrograms} draft${stats.draftPrograms === 1 ? "" : "s"} in progress`
          : "No drafts in progress",
      hint: "Live and assignable to users",
      href: "/programs",
      hrefLabel: "Manage programs",
    },
    {
      label: "All programs",
      value: stats.totalPrograms,
      caption: `${stats.activePrograms} active · ${stats.draftPrograms} draft`,
      hint: "Includes archived programs",
      href: "/programs",
    },
  ];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark">
            Owner Dashboard
          </p>
          <h2 className="mt-1 font-display text-3xl leading-tight text-foreground md:text-4xl">
            ERA admin
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Programs, exercises, assignments, and the users connected to the app.
          </p>
        </div>
        <Link
          href="/programs"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-era-gold-light"
        >
          <HugeiconsIcon icon={WorkoutRunIcon} size={16} strokeWidth={1.8} />
          Manage programs
        </Link>
      </header>

      <ConfigWarning message={configError} />

      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <SectionCards cards={cards} />
        {/* <ChartAreaInteractive data={activityState.data} /> */}
        <NewUsers users={recentUsersState.data} />
      </div>
    </>
  );
}

function NewUsers({ users }: { users: RecentUser[] }) {
  return (
    <Card className="@container/card">
      <CardHeader className="grid grid-cols-[1fr_auto] items-center">
        <div>
          <CardTitle className="font-sans">New users</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Accounts created in the last 7 days.
          </p>
        </div>
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-xs font-medium text-era-gold-dark transition-colors hover:text-primary"
        >
          View all users
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        {users.length ? (
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 text-xs uppercase tracking-[0.12em]">
                  User
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">
                  Email
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">
                  Role
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">
                  Assignments
                </TableHead>
                <TableHead className="pr-4 text-right text-xs uppercase tracking-[0.12em]">
                  Joined
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const display = user.full_name || user.email || "Unknown user";
                const initial = (user.full_name || user.email || "?")
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                const isStaff = user.role === "owner" || user.role === "admin";
                return (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell className="py-3 pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-era-gold-dark/15 text-xs font-medium text-primary">
                          {user.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar_url}
                              alt={display}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            initial
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {display}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground">
                      {user.email ?? "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant={isStaff ? "default" : "secondary"}
                        className="gap-1 capitalize"
                      >
                        <HugeiconsIcon
                          icon={isStaff ? Crown02Icon : UserIcon}
                          size={12}
                          strokeWidth={2}
                        />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 tabular-nums text-muted-foreground">
                      {user.active_assignment_count}
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right text-muted-foreground">
                      {relativeTimeText(user.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 px-6 pb-4 text-sm text-muted-foreground">
            <HugeiconsIcon icon={UserCircleIcon} size={18} strokeWidth={1.8} />
            No new users in the last 7 days.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
