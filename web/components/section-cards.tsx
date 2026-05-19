import Link from "next/link";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ChartDecreaseIcon,
  ChartIncreaseIcon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type SectionCardData = {
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
  caption?: string;
  hint?: string;
  href?: string;
  hrefLabel?: string;
};

export function SectionCards({ cards }: { cards: SectionCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => {
        const trendIcon =
          card.trend?.direction === "down" ? ChartDecreaseIcon : ChartIncreaseIcon;
        return (
          <Card key={card.label} className="@container/card">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
              {card.trend ? (
                <CardAction>
                  <Badge variant="outline">
                    <HugeiconsIcon icon={trendIcon} size={14} strokeWidth={1.8} />
                    {card.trend.label}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              {card.caption ? (
                <div className="line-clamp-1 flex gap-2 font-medium">
                  {card.caption}
                </div>
              ) : null}
              {card.hint ? (
                <div className="text-muted-foreground">{card.hint}</div>
              ) : null}
              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-era-gold-dark transition-colors hover:text-primary"
                >
                  {card.hrefLabel ?? "Open"}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={12}
                    strokeWidth={2}
                  />
                </Link>
              ) : null}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
