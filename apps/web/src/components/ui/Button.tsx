import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-surface hover:bg-ink/85",
  secondary: "border border-line bg-surface text-ink hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

/** 44×44 icon-only button. `label` is required so it always has an accessible name. */
export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors duration-150 hover:border-ink-3",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
