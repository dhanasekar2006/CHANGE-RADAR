import clsx from "clsx";

import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductArt } from "@/components/ui/ProductArt";
import type { ArtKind } from "@/lib/productArt";
import { Card } from "@/components/ui/Card";

const TILES: { kind: ArtKind; tone: string; span: string }[] = [
  { kind: "phone", tone: "bg-accent-soft", span: "row-span-2" },
  { kind: "headphones", tone: "bg-good-soft", span: "" },
  { kind: "watch", tone: "bg-warn-soft", span: "" },
  { kind: "laptop", tone: "bg-surface-2", span: "col-span-2" },
];

/** First-visit hero for signed-out visitors. Browsing stays open; "Get started" just dismisses it. */
export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <Card className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
      <div className="space-y-6">
        <h1 className="text-[32px] font-extrabold leading-[38px] text-ink sm:text-[40px] sm:leading-[44px]">
          Track prices. Buy at the right time.
        </h1>
        <p className="max-w-md text-[15px] leading-6 text-ink-2">
          Watch a product across stores and get an alert the moment its price
          reaches the one you want to pay.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onStart}>Get started</Button>
          <ButtonLink to="/login?next=/prices" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </div>
      <div
        aria-hidden
        className="grid h-64 grid-cols-2 grid-rows-[1fr_1fr_0.8fr] gap-3 sm:h-80"
      >
        {TILES.map(({ kind, tone, span }) => (
          <div
            key={kind}
            className={clsx(
              "flex items-center justify-center rounded-card p-3",
              tone,
              span,
            )}
          >
            <ProductArt kind={kind} className="h-full w-full !bg-transparent" />
          </div>
        ))}
      </div>
    </Card>
  );
}
