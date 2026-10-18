import { EmptyState } from "@/components/QueryState";
import { FlashPrice } from "@/components/FlashPrice";
import { UpdatedAgo } from "@/components/UpdatedAgo";
import type { Listing } from "@/types/prices";

/** One row per store, cheapest first, with the Best badge and a flash on live price moves. */
export function StoreTable({
  listings,
  productId,
}: {
  listings: Listing[];
  productId: string;
}) {
  return listings.length === 0 ? (
    <EmptyState title="No stores tracked for this product yet" />
  ) : (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="bg-slate-900/50 text-left text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Store</th>
            <th className="px-4 py-2 font-medium">Price</th>
            <th className="px-4 py-2 font-medium">Stock</th>
            <th className="px-4 py-2 font-medium">Checked</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {listings.map((listing) => (
            <tr
              key={listing.id}
              className={listing.is_best ? "bg-emerald-500/5" : undefined}
            >
              <td className="px-4 py-3 font-medium capitalize">
                {listing.store}
                {listing.is_best && (
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-normal normal-case text-emerald-300">
                    Best
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-base font-semibold">
                {listing.price === null ? (
                  <span className="text-sm font-normal text-slate-500">
                    Waiting for first check
                  </span>
                ) : (
                  <FlashPrice
                    productId={productId}
                    store={listing.store}
                    price={listing.price}
                  />
                )}
              </td>
              <td className="px-4 py-3">
                {listing.in_stock ? (
                  <span className="text-emerald-400">In stock</span>
                ) : (
                  <span className="text-slate-500">Out of stock</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500">
                <UpdatedAgo checkedAt={listing.last_checked_at} prefix="" />
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
