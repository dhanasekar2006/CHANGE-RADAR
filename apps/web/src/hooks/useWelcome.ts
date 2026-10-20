import { useState } from "react";

import { USE_MOCK } from "@/api/config";
import { useAuthed } from "@/hooks/useAuthed";

const KEY = "vilaiwatch.welcome-seen";

function wasSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Show the welcome hero once to signed-out visitors (never in demo mode). */
export function useWelcome(): { show: boolean; dismiss: () => void } {
  const authed = useAuthed();
  const [seen, setSeen] = useState(wasSeen);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Storage unavailable (private window): the hero just shows again next visit.
    }
    setSeen(true);
  }

  return { show: !authed && !USE_MOCK && !seen, dismiss };
}
