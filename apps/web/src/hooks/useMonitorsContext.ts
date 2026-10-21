import { useOutletContext } from "react-router-dom";

export interface MonitorsContext {
  workspaceId: string;
}

/** The workspace resolved by MonitorsGate, available to every monitor route. */
export function useMonitorsContext(): MonitorsContext {
  return useOutletContext<MonitorsContext>();
}
