import clsx from "clsx";

/** Renders a unified diff. Added and removed lines keep their +/- marker, so color is never the only cue. */
export function DiffBlock({ diffText }: { diffText: string }) {
  const lines = diffText.split("\n");

  return (
    <pre
      tabIndex={0}
      aria-label="Diff"
      className="max-h-[32rem] overflow-auto rounded-card bg-surface p-4 text-[13px] leading-6 shadow-soft"
    >
      {lines.map((line, index) => {
        const added = line.startsWith("+") && !line.startsWith("+++");
        const removed = line.startsWith("-") && !line.startsWith("---");
        const hunk = line.startsWith("@@");
        return (
          <div
            key={index}
            className={clsx(
              "-mx-4 px-4",
              added && "bg-good-soft text-good",
              removed && "bg-warn-soft text-warn",
              hunk && "bg-accent-soft text-accent-strong",
              !added && !removed && !hunk && "text-ink-2",
            )}
          >
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
