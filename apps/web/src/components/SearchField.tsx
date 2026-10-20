import { Search } from "lucide-react";
import type { FormEvent } from "react";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function SearchField({ value, onChange, onSubmit, autoFocus }: SearchFieldProps) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit?.();
  }

  return (
    <form role="search" onSubmit={submit} className="relative">
      <Search size={20} strokeWidth={1.75} aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="search"
        autoFocus={autoFocus}
        placeholder="Search a product or paste a store link"
        aria-label="Search products or paste a store link"
        className="h-14 w-full rounded-full border border-line bg-surface pl-14 pr-5 text-[15px] text-ink shadow-soft outline-none placeholder:text-ink-3 focus:border-accent"
      />
    </form>
  );
}
