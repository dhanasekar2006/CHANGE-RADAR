import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-card bg-surface p-5 shadow-soft sm:p-6", className)} {...props} />;
}
