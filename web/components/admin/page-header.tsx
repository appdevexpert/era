import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-era-gold-dark">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 font-display text-3xl leading-tight text-era-white md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
