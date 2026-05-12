import { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { numberText } from "@/lib/admin/format";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-lg border-border bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="font-sans text-sm text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-md bg-era-gold-16 p-2 text-era-gold">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-era-white">
          {numberText(value)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
