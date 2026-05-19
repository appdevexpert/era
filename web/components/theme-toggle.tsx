"use client";

import { useTheme } from "next-themes";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Moon01Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Toggle theme">
            <HugeiconsIcon
              icon={Sun01Icon}
              size={16}
              strokeWidth={1.8}
              className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
            />
            <HugeiconsIcon
              icon={Moon01Icon}
              size={16}
              strokeWidth={1.8}
              className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          data-active={theme === "light" ? "true" : undefined}
        >
          <HugeiconsIcon icon={Sun01Icon} size={16} strokeWidth={1.8} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          data-active={theme === "dark" ? "true" : undefined}
        >
          <HugeiconsIcon icon={Moon01Icon} size={16} strokeWidth={1.8} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          data-active={theme === "system" ? "true" : undefined}
        >
          <HugeiconsIcon icon={ComputerIcon} size={16} strokeWidth={1.8} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
