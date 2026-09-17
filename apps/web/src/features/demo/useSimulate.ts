import { api, type LeadSource } from "@hco/shared";
import type { SimulationResult } from "@hco/shared/api/demo";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { logSimulations } from "./demo-session";

export type DemoActionKey =
  "instagram" | "facebook" | "tiktok" | "existingPatient" | "unknownNumber" | "burst";

type DemoAction =
  | { kind: "lead"; source: "instagram" | "facebook" | "tiktok" | "mixed"; count: number }
  | { kind: "message"; from: "existing_contact" | "unknown_number" };

export const DEMO_ACTIONS: Record<DemoActionKey, DemoAction> = {
  instagram: { kind: "lead", source: "instagram", count: 1 },
  facebook: { kind: "lead", source: "facebook", count: 1 },
  tiktok: { kind: "lead", source: "tiktok", count: 1 },
  existingPatient: { kind: "message", from: "existing_contact" },
  unknownNumber: { kind: "message", from: "unknown_number" },
  burst: { kind: "lead", source: "mixed", count: 10 },
};

/** Runs Simulator actions, logs what they created and confirms with a toast that links to it. */
export function useSimulate({
  phone,
  onInvalidPhone,
}: {
  phone: string;
  onInvalidPhone: (message: string) => void;
}) {
  const { t } = useTranslation("demo");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const [pending, setPending] = useState<DemoActionKey | null>(null);
  const simulateLead = useApiMutation(api.demo.simulateLead);
  const simulateMessage = useApiMutation(api.demo.simulateMessage);

  const sourceLabel = (source: LeadSource) => tc(`sources.${source}`);

  const openAction = (result: SimulationResult) => {
    const href =
      result.leadId && result.outcome !== "message"
        ? { to: "/leads/$leadId" as const, params: { leadId: result.leadId } }
        : result.conversationId
          ? { to: "/inbox/$conversationId" as const, params: { conversationId: result.conversationId } }
          : null;
    return href ? { label: t("toast.open"), onClick: () => void navigate(href) } : undefined;
  };

  const confirm = (key: DemoActionKey, results: SimulationResult[]) => {
    const [first] = results;
    if (!first) return;
    if (results.length > 1) {
      const counts = new Map<LeadSource, number>();
      for (const r of results) counts.set(r.source, (counts.get(r.source) ?? 0) + 1);
      const breakdown = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([source, n]) => `${n} ${sourceLabel(source)}`)
        .join(", ");
      toast.success(t("toast.burst", { count: results.length }), { description: breakdown });
      return;
    }
    if (first.outcome === "repeat") {
      toast(t("toast.repeat"), {
        description: t("toast.repeatBody", { name: first.name }),
        action: openAction(first),
      });
      return;
    }
    if (first.outcome === "message" || key === "existingPatient") {
      toast.success(t("toast.messageReceived"), {
        description: first.assigneeName
          ? t("toast.messageReceivedBody", { name: first.name, assignee: first.assigneeName })
          : t("toast.messageReceivedUnassigned", { name: first.name }),
        action: openAction(first),
      });
      return;
    }
    toast.success(t("toast.leadCreated", { source: sourceLabel(first.source) }), {
      description: first.assigneeName
        ? t("toast.leadCreatedBody", { name: first.name, assignee: first.assigneeName })
        : t("toast.leadCreatedUnassigned", { name: first.name }),
      action: openAction(first),
    });
  };

  const fail = (error: unknown) => {
    if (isApiError(error, "INVALID_PHONE")) onInvalidPhone(errorMessage(error));
    toast.error(errorMessage(error));
  };

  const run = async (key: DemoActionKey) => {
    if (pending) return;
    const action = DEMO_ACTIONS[key];
    const routedPhone = phone.trim() || undefined;
    setPending(key);
    try {
      if (action.kind === "lead") {
        const response = await simulateLead.mutateAsync({
          body: { source: action.source, count: action.count, phone: routedPhone },
        });
        const results = response.results ?? [];
        logSimulations(results);
        confirm(key, results);
      } else {
        const response = await simulateMessage.mutateAsync({
          body: { from: action.from, phone: action.from === "unknown_number" ? routedPhone : undefined },
        });
        const results = response.result ? [response.result] : [];
        logSimulations(results);
        confirm(key, results);
      }
    } catch (error) {
      fail(error);
    } finally {
      setPending(null);
    }
  };

  return { run, pending };
}
