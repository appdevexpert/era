"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HugeiconsIcon } from "@hugeicons/react";
import { Crown02Icon } from "@hugeicons/core-free-icons";

import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const SECTION_LABELS: Array<{ match: string; label: string }> = [
  { match: "/exercises", label: "Exercises" },
  { match: "/programs", label: "Programs" },
  { match: "/users", label: "Users" },
  { match: "/activity", label: "Activity" },
  { match: "/guide", label: "Guide" },
];

function currentSection(pathname: string): string {
  for (const item of SECTION_LABELS) {
    if (pathname.startsWith(item.match)) return item.label;
  }
  return "Dashboard";
}

export function SiteHeader() {
  const pathname = usePathname();
  const section = currentSection(pathname);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 h-4 data-vertical:self-auto"
        />
        <p className="text-base font-medium text-foreground">{section}</p>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            href="/programs"
            className="hidden h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-era-gold-dark/60 hover:text-foreground sm:inline-flex"
          >
            <HugeiconsIcon icon={Crown02Icon} size={14} strokeWidth={1.8} />
            Owner access
          </Link>
        </div>
      </div>
    </header>
  );
}
