import type { Stage } from "@hco/shared";
import { useCallback, useMemo, useState } from "react";

const KEY = "hco-crm:pipeline:expanded-closed-stages";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Won and lost columns start collapsed so the open stages get the width; the ones a person opens stay
 * open for them (a per-browser convenience, nothing depends on it).
 */
export function useCollapsedStages(stages: Stage[]) {
  const [expanded, setExpanded] = useState<string[]>(read);

  const collapsed = useMemo(
    () => new Set(stages.filter((s) => s.type !== "open" && !expanded.includes(s.id)).map((s) => s.id)),
    [stages, expanded],
  );

  const toggle = useCallback((stageId: string) => {
    setExpanded((current) => {
      const next = current.includes(stageId) ? current.filter((id) => id !== stageId) : [...current, stageId];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage blocked: the choice lasts until the page reloads.
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
