// Shown instantly by Next.js while the builder's data loads. A single centered
// loader (not a full skeleton) — the "Open builder" button also spins on click.
export default function ProgramBuilderLoading() {
  return (
    <div className="flex w-full flex-1 items-center justify-center min-h-[calc(100dvh-var(--header-height)-3rem)]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-10 animate-spin text-primary"
        role="status"
        aria-label="Loading"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
