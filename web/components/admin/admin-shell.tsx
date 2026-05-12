"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Dumbbell,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/programs", label: "Programs", icon: Activity },
  { href: "/users", label: "Users", icon: UsersRound },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="bg-background">
      <AdminSidebar />

      <SidebarInset className="min-h-screen min-w-0 overflow-x-hidden text-foreground">
        <header className="sticky top-0 z-20 border-b border-border bg-background/88 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="h-5 w-px bg-border" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark">
                  Workout Admin
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  Exercises, programs, assignments, and users
                </p>
              </div>
            </div>
            <div className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground sm:block">
              Owner access
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="ERA Admin"
              className="h-12 gap-3 rounded-lg px-3"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="font-display text-xl leading-none text-era-white">
                  ERA
                </span>
                <span className="text-xs text-muted-foreground">Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="gap-2 p-0">
          <SidebarGroupLabel className="h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-10 gap-3 rounded-lg px-3 text-sidebar-foreground/82 data-active:text-sidebar-accent-foreground [&_svg]:size-4.5"
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border px-3 py-4">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Owner access"
              className="h-10 gap-3 rounded-lg px-3 text-sidebar-foreground/82"
            >
              <ShieldCheck />
              <span>Owner access</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 text-xs leading-5 text-muted-foreground group-data-[collapsible=icon]:hidden">
          Owner dashboard for managing ERA workout content.
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
