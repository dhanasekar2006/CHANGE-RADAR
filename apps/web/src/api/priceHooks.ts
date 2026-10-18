import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pricesApi } from "@/api/prices";
import { REFETCH, priceKeys } from "@/api/priceKeys";
import type { AlertInput, HistoryRange, PriceAlert } from "@/types/prices";

export function useSearch(q: string) {
  return useQuery({
    queryKey: priceKeys.search(q),
    queryFn: () => pricesApi.search(q),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: priceKeys.product(id ?? ""),
    queryFn: () => pricesApi.product(id!),
    enabled: Boolean(id),
    refetchInterval: REFETCH.product,
  });
}

export function useHistory(id: string | undefined, range: HistoryRange) {
  return useQuery({
    queryKey: priceKeys.history(id ?? "", range),
    queryFn: () => pricesApi.history(id!, range),
    enabled: Boolean(id),
    refetchInterval: REFETCH.history,
    placeholderData: keepPreviousData,
  });
}

export function useDeals() {
  return useQuery({
    queryKey: priceKeys.deals,
    queryFn: pricesApi.deals,
    refetchInterval: REFETCH.deals,
  });
}

export function useAlerts(enabled: boolean) {
  return useQuery({
    queryKey: priceKeys.alerts,
    queryFn: pricesApi.alerts,
    enabled,
  });
}

export function useTrackUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pricesApi.track,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: priceKeys.searchAll }),
  });
}

/**
 * Alert mutations update the cached list immediately and roll back if the
 * server rejects the change, then refetch to pick up server-computed fields.
 */
function useOptimisticAlerts<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (alerts: PriceAlert[], vars: TVars) => PriceAlert[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: priceKeys.alerts });
      const previous = queryClient.getQueryData<PriceAlert[]>(priceKeys.alerts);
      queryClient.setQueryData<PriceAlert[]>(priceKeys.alerts, (current) => apply(current ?? [], vars));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(priceKeys.alerts, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: priceKeys.alerts }),
  });
}

export function useCreateAlert(productName: string, currentPrice: number | null) {
  return useOptimisticAlerts<AlertInput>(
    (input) => pricesApi.createAlert(input),
    (alerts, input) => [
      {
        id: `pending-${Date.now()}`,
        product_id: input.product_id,
        product_name: productName,
        image_url: null,
        target_price: input.target_price,
        channels: input.channels,
        triggered_at: null,
        created_at: new Date().toISOString(),
        current_price: currentPrice,
      },
      ...alerts,
    ],
  );
}

export function useUpdateAlert() {
  return useOptimisticAlerts<{ id: string; patch: Partial<AlertInput> }>(
    ({ id, patch }) => pricesApi.updateAlert(id, patch),
    (alerts, { id, patch }) =>
      alerts.map((a) =>
        a.id === id
          ? {
              ...a,
              target_price: patch.target_price ?? a.target_price,
              channels: patch.channels ?? a.channels,
              triggered_at: patch.target_price !== undefined && patch.target_price !== a.target_price ? null : a.triggered_at,
            }
          : a,
      ),
  );
}

export function useDeleteAlert() {
  return useOptimisticAlerts<string>(
    (id) => pricesApi.deleteAlert(id),
    (alerts, id) => alerts.filter((a) => a.id !== id),
  );
}
