import { LEAD_VIEWS } from "@hco/core/leads/views";
import { LeadSource } from "@hco/shared";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LeadsPage } from "@/features/leads/LeadsPage";

export const Route = createFileRoute("/_app/leads/")({
  validateSearch: z.object({
    /** Saved view; "new" when absent. */
    view: z.enum(LEAD_VIEWS).optional().catch(undefined),
    source: LeadSource.optional().catch(undefined),
    /** "mine", "unassigned", "all" or a user id; defaults by role. */
    assignee: z.string().optional().catch(undefined),
  }),
  component: LeadsPage,
});
