import { Link } from "react-router-dom";

import { formatINR } from "@/lib/format";
import type { Deal, ProductSearchItem } from "@/types/prices";

function Thumb({ name, src }: { name: string; src: string | null }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-slate-800 object-cover" />
  ) : (
    <div aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl font-semibold text-slate-400">
      {name.charAt(0)}
    </div>
  );
}

export function ProductCard({ item }: { item: ProductSearchItem }) {
  return (
    <Link to={`/prices/p/${item.id}`} className="card card-hover flex gap-3.5 p-3.5">
      <Thumb name={item.name} src={item.image_url} />
      <div className="min-w-0">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-xs text-slate-500">
          {item.category ? `${item.category} · ` : ""}
          {item.store_count} {item.store_count === 1 ? "store" : "stores"}
        </p>
        <p className="mt-1 text-sm">
          {item.best_price === null ? (
            <span className="text-slate-500">No price yet</span>
          ) : (
            <>
              <span className="text-slate-500">from </span>
              <span className="font-semibold text-emerald-400">{formatINR(item.best_price)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link to={`/prices/p/${deal.product_id}`} className="card card-hover flex gap-3.5 p-3.5">
      <Thumb name={deal.name} src={deal.image_url} />
      <div className="min-w-0">
        <p className="truncate font-medium">{deal.name}</p>
        <p className="text-xs capitalize text-slate-500">at {deal.store}</p>
        <p className="mt-1 flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-emerald-400">{formatINR(deal.price)}</span>
          <span className="text-xs text-slate-500 line-through">{formatINR(deal.avg_30d)}</span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
            −{deal.drop_pct.toFixed(1)}%
          </span>
        </p>
      </div>
    </Link>
  );
}
