import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { Change, ChangeDetail, Channel, Monitor, PagedResponse, Workspace } from "@/types";

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/workspaces"),
  });
}

export function useMonitors(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["monitors", workspaceId],
    queryFn: () => api.get<Monitor[]>(`/workspaces/${workspaceId}/monitors`),
    enabled: Boolean(workspaceId),
  });
}

export function useMonitor(workspaceId: string | undefined, monitorId: string | undefined) {
  return useQuery({
    queryKey: ["monitors", workspaceId, monitorId],
    queryFn: () => api.get<Monitor>(`/workspaces/${workspaceId}/monitors/${monitorId}`),
    enabled: Boolean(workspaceId && monitorId),
  });
}

export function useCreateMonitor(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Monitor>) => api.post<Monitor>(`/workspaces/${workspaceId}/monitors`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors", workspaceId] }),
  });
}

export function useRunMonitorNow(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (monitorId: string) => api.post<Monitor>(`/workspaces/${workspaceId}/monitors/${monitorId}/run-now`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors", workspaceId] }),
  });
}

export function useChanges(workspaceId: string | undefined, monitorId?: string) {
  const query = monitorId ? `?monitor_id=${monitorId}` : "";
  return useQuery({
    queryKey: ["changes", workspaceId, monitorId],
    queryFn: () => api.get<PagedResponse<Change>>(`/workspaces/${workspaceId}/changes${query}`),
    enabled: Boolean(workspaceId),
  });
}

export function useChange(workspaceId: string | undefined, changeId: string | undefined) {
  return useQuery({
    queryKey: ["changes", workspaceId, "detail", changeId],
    queryFn: () => api.get<ChangeDetail>(`/workspaces/${workspaceId}/changes/${changeId}`),
    enabled: Boolean(workspaceId && changeId),
  });
}

export function useAcknowledgeChange(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changeId: string) =>
      api.post<Change>(`/workspaces/${workspaceId}/changes/${changeId}/acknowledge`, { acknowledged: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] }),
  });
}

export function useChannels(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get<Channel[]>(`/workspaces/${workspaceId}/channels`),
    enabled: Boolean(workspaceId),
  });
}

export function useUpdateMonitor(workspaceId: string | undefined, monitorId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Monitor>) =>
      api.patch<Monitor>(`/workspaces/${workspaceId}/monitors/${monitorId}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors", workspaceId] }),
  });
}

export function useDeleteMonitor(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (monitorId: string) => api.delete<void>(`/workspaces/${workspaceId}/monitors/${monitorId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors", workspaceId] }),
  });
}

export function useSetMonitorPaused(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ monitorId, paused }: { monitorId: string; paused: boolean }) =>
      api.post<Monitor>(`/workspaces/${workspaceId}/monitors/${monitorId}/${paused ? "pause" : "resume"}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors", workspaceId] }),
  });
}
