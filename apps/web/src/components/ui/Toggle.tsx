import clsx from "clsx";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={clsx(
          "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-150",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
