import clsx from "clsx";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { ProductArt } from "@/components/ui/ProductArt";
import { artKind } from "@/lib/productArt";
import { PriceTag } from "@/components/ui/PriceTag";
import { formatINR } from "@/lib/format";
import type { Deal, ProductSearchItem } from "@/types/prices";

function Thumb({
  name,
  category,
  src,
  className,
}: {
  name: string;
  category?: string | null;
  src: string | null;
  className: string;
}) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={clsx("bg-surface-2 object-cover", className)}
    />
  ) : (
    <ProductArt kind={artKind(name, category)} className={className} />
  );
}

export function ProductCard({ item }: { item: ProductSearchItem }) {
  return (
    <Link
      to={`/prices/p/${item.id}`}
      className="flex items-center gap-4 rounded-card bg-surface p-4 shadow-soft transition-shadow duration-150 hover:shadow-md"
    >
      <Thumb
        name={item.name}
        category={item.category}
        src={item.image_url}
        className="h-16 w-16 shrink-0 rounded-row"
      />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-ink">{item.name}</p>
        <p className="text-[13px] text-ink-2">
          {item.category ? `${item.category} · ` : ""}
          {item.store_count} {item.store_count === 1 ? "store" : "stores"}
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          {item.best_price === null ? (
            "No price yet"
          ) : (
            <>
              from{" "}
              <span className="text-base font-extrabold tabular-nums text-ink">
                {formatINR(item.best_price)}
              </span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

/** Large image card for the "biggest price drops" rail. */
export function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link
      to={`/prices/p/${deal.product_id}`}
      className="block w-64 shrink-0 snap-start rounded-card bg-surface p-3 shadow-soft transition-shadow duration-150 hover:shadow-md"
    >
      <div className="relative">
        <Thumb
          name={deal.name}
          src={deal.image_url}
          className="aspect-square w-full rounded-[20px]"
        />
        <span className="absolute left-3 top-3">
          <Badge tone="dark">−{Math.round(deal.drop_pct)}%</Badge>
        </span>
      </div>
      <div className="space-y-1 px-2 pb-2 pt-3">
        <p className="truncate text-[15px] font-bold text-ink">{deal.name}</p>
        <p className="text-[13px] capitalize text-ink-2">at {deal.store}</p>
        <PriceTag price={deal.price} oldPrice={deal.avg_30d} />
      </div>
    </Link>
  );
}
