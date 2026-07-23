"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Activity01Icon,
  BookOpen01Icon,
  Comment01Icon,
  DashboardSquare01Icon,
  Dumbbell01Icon,
  Logout03Icon,
  MoreVerticalIcon,
  UserGroupIcon,
  WorkoutRunIcon,
} from "@hugeicons/core-free-icons";

import { signOut } from "@/lib/auth/actions";
import type { CurrentAdminUser } from "@/lib/auth/current-user";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import eraLogo from "@/assets/images/ERA.png";

type NavItem = {
  href: string;
  label: string;
  icon: IconSvgElement;
  /** Only render for admins allowed to see the activity log. */
  ownerOnly?: boolean;
};

const MANAGE_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/exercises", label: "Exercises", icon: Dumbbell01Icon },
  { href: "/programs", label: "Programs", icon: WorkoutRunIcon },
  { href: "/users", label: "Users", icon: UserGroupIcon },
  { href: "/copy", label: "Copy", icon: Comment01Icon },
  { href: "/activity", label: "Activity", icon: Activity01Icon, ownerOnly: true },
  { href: "/guide", label: "Guide", icon: BookOpen01Icon },
];

const NAV_BUTTON_CLASS =
  "h-10 gap-3 [&_svg]:!size-5 hover:!bg-foreground/5 data-active:!bg-accent data-active:!text-primary";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: CurrentAdminUser | null;
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" className="flex flex-col items-start gap-0.5 px-2 py-2">
              <Image
                src={eraLogo}
                alt="ERA"
                priority
                className="h-6 w-auto object-contain"
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-era-gold-dark">
                Admin
              </span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {MANAGE_NAV.filter(
                (item) => !item.ownerOnly || user?.canViewActivity,
              ).map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className={NAV_BUTTON_CLASS}
                      render={<Link href={item.href} />}
                    >
                      <HugeiconsIcon icon={item.icon} size={22} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUserProfile user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavUserProfile({ user }: { user: CurrentAdminUser | null }) {
  const displayName = user?.full_name || user?.email || "Signed out";
  const initial = (user?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();
  const role = user?.role ?? "guest";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-era-gold-dark/15 text-sm font-medium text-primary">
              {initial}
            </span>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-foreground">
                {displayName}
              </span>
              <span className="truncate text-xs capitalize text-muted-foreground">
                {role}
              </span>
            </div>
            <HugeiconsIcon
              icon={MoreVerticalIcon}
              size={16}
              strokeWidth={1.8}
              className="ml-auto text-muted-foreground"
            />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent
        side="top"
        align="end"
        className="w-(--anchor-width) min-w-56 rounded-lg"
        sideOffset={4}
      >
        <div className="px-2 py-2">
          <div className="flex items-center gap-2">
            <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-era-gold-dark/15 text-sm font-medium text-primary">
              {initial}
            </span>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-foreground">
                {displayName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <Badge variant="secondary" className="capitalize">
            {role}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        <form action={signOut}>
          <DropdownMenuItem
            variant="destructive"
            render={
              <button type="submit" className="w-full">
                <HugeiconsIcon icon={Logout03Icon} size={16} strokeWidth={1.8} />
                Log out
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
