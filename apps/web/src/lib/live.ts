import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { subscribeLive } from "./api/client";

/**
 * Keeps every screen current: any live event refetches visible data (batched), and events addressed
 * to the signed-in user show a toast. Mounted once in the signed-in layout.
 */
export function useLiveUpdates(userId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return subscribeLive((event) => {
      if (timer.current === null) {
        timer.current = window.setTimeout(() => {
          timer.current = null;
          void queryClient.invalidateQueries();
        }, 80);
      }
      if (event.toast && event.notifyUserIds.includes(userId)) {
        const href = event.toast.href;
        toast(event.toast.title, {
          description: event.toast.body ?? undefined,
          action: href ? { label: "Open", onClick: () => void navigate({ to: href }) } : undefined,
        });
      }
    });
  }, [queryClient, navigate, userId]);
}
