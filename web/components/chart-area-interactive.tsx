"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ChartActivityPoint = {
  date: string;
  programs: number;
  exercises: number;
  users: number;
};

const chartConfig = {
  programs: {
    label: "Programs",
    color: "var(--primary)",
  },
  exercises: {
    label: "Exercises",
    color: "var(--era-gold-dark)",
  },
  users: {
    label: "Users",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({ data }: { data: ChartActivityPoint[] }) {
  const isMobile = useIsMobile();
  const [userPickedRange, setUserPickedRange] = React.useState<string | null>(null);
  const timeRange = userPickedRange ?? (isMobile ? "7d" : "90d");

  const filteredData = React.useMemo(() => {
    if (!data.length) return data;
    const last = new Date(data[data.length - 1].date);
    let days = 90;
    if (timeRange === "30d") days = 30;
    else if (timeRange === "7d") days = 7;
    const startDate = new Date(last);
    startDate.setDate(startDate.getDate() - (days - 1));
    return data.filter((item) => new Date(item.date) >= startDate);
  }, [data, timeRange]);

  const total = React.useMemo(
    () =>
      filteredData.reduce(
        (acc, p) => acc + p.programs + p.exercises + p.users,
        0,
      ),
    [filteredData],
  );

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Content activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            New programs, exercises, and users created — last{" "}
            {timeRange === "7d"
              ? "7 days"
              : timeRange === "30d"
              ? "30 days"
              : "3 months"}
            {total ? ` · ${total} total` : ""}
          </span>
          <span className="@[540px]/card:hidden">
            {timeRange === "7d"
              ? "Last 7 days"
              : timeRange === "30d"
              ? "Last 30 days"
              : "Last 3 months"}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setUserPickedRange(value[0] ?? "90d");
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setUserPickedRange(value);
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillPrograms" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-programs)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-programs)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillExercises" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-exercises)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-exercises)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="users"
              type="natural"
              fill="url(#fillUsers)"
              stroke="var(--color-users)"
              stackId="a"
            />
            <Area
              dataKey="exercises"
              type="natural"
              fill="url(#fillExercises)"
              stroke="var(--color-exercises)"
              stackId="a"
            />
            <Area
              dataKey="programs"
              type="natural"
              fill="url(#fillPrograms)"
              stroke="var(--color-programs)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
