interface DiffBlockProps {
  diffText: string;
}

/** Renders a unified diff with +/- lines colorized. Falls back to plain text for non-unified payloads (JSON patches, etc). */
export function DiffBlock({ diffText }: DiffBlockProps) {
  const lines = diffText.split("\n");

  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-relaxed">
      {lines.map((line, index) => {
        let className = "text-slate-300";
        if (line.startsWith("+") && !line.startsWith("+++")) className = "text-emerald-400";
        else if (line.startsWith("-") && !line.startsWith("---")) className = "text-red-400";
        else if (line.startsWith("@@")) className = "text-sky-400";

        return (
          <div key={index} className={className}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
