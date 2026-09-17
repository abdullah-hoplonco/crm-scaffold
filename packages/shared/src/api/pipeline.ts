import { z } from "zod";
import {
  Company,
  Contact,
  DateOnly,
  Deal,
  Lead,
  MoneyAed,
  Pipeline,
  Stage,
  Timestamp,
  User,
} from "../entities";
import { LeadSource, LostReason, StageType } from "../enums";
import { defineRoute } from "./define";

export const PipelineWithStages = z.object({ pipeline: Pipeline, stages: z.array(Stage) });
export type PipelineWithStages = z.infer<typeof PipelineWithStages>;

/** A Deal as shown on a kanban card or in a list. */
export const DealCard = z.object({
  id: z.string(),
  title: z.string(),
  valueAed: MoneyAed,
  stageId: z.string(),
  stageName: z.string(),
  stageType: StageType,
  position: z.number(),
  contactId: z.string(),
  contactName: z.string(),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  source: LeadSource,
  isStale: z.boolean(),
  lastActivityAt: Timestamp,
  expectedCloseDate: DateOnly.nullable(),
  closedAt: Timestamp.nullable(),
  openTasksCount: z.number().int(),
  hasUnreadMessages: z.boolean(),
  /** Why a lost deal was lost, when known. */
  lostReason: LostReason.nullable().optional(),
});
export type DealCard = z.infer<typeof DealCard>;

export const BoardColumn = z.object({
  stage: Stage,
  deals: z.array(DealCard),
  count: z.number().int(),
  totalValueAed: MoneyAed,
});
export type BoardColumn = z.infer<typeof BoardColumn>;

export const DealDetail = z.object({
  deal: Deal,
  card: DealCard,
  stage: Stage,
  stages: z.array(Stage),
  contact: Contact,
  company: Company.nullable(),
  assignee: User.nullable(),
  lead: Lead.nullable(),
  /** Conversation with the deal's contact, if any, for "Open chat". */
  conversationId: z.string().nullable(),
});
export type DealDetail = z.infer<typeof DealDetail>;

export const DealInput = z.object({
  title: z.string().trim().min(1, "Enter a deal title"),
  contactId: z.string().min(1, "Choose a contact"),
  companyId: z.string().nullable().optional(),
  stageId: z.string().optional(),
  valueAed: MoneyAed,
  expectedCloseDate: DateOnly.nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  source: LeadSource.default("manual"),
});
export type DealInput = z.input<typeof DealInput>;

export const StageEdit = z.object({
  /** Omit for a new stage. */
  id: z.string().optional(),
  name: z.string().trim().min(1, "Enter a stage name"),
  probability: z.number().int().min(0).max(100),
  type: StageType,
});
export type StageEdit = z.infer<typeof StageEdit>;

export const pipelineRoutes = {
  getDefault: defineRoute({
    method: "GET",
    path: "/pipelines/default",
    summary: "The workspace pipeline with its stages in order",
    response: PipelineWithStages,
  }),
  saveStages: defineRoute({
    method: "PUT",
    path: "/pipelines/:pipelineId/stages",
    summary:
      "Rename, reorder and add stages. Exactly one won and one lost stage, kept last. Removing a stage with deals fails with 409 STAGE_NOT_EMPTY",
    params: z.object({ pipelineId: z.string() }),
    body: z.object({ stages: z.array(StageEdit).min(3) }),
    response: PipelineWithStages,
  }),
  board: defineRoute({
    method: "GET",
    path: "/deals/board",
    summary: "Kanban columns with deal cards and AED totals",
    query: z.object({
      assigneeId: z.string().optional(),
      q: z.string().optional(),
      source: LeadSource.optional(),
    }),
    response: z.object({ pipeline: Pipeline, columns: z.array(BoardColumn) }),
  }),
  list: defineRoute({
    method: "GET",
    path: "/deals",
    summary: "Deals for a contact or company",
    query: z.object({
      contactId: z.string().optional(),
      companyId: z.string().optional(),
      status: z.enum(["open", "won", "lost", "all"]).default("all"),
    }),
    response: z.object({ items: z.array(DealCard) }),
  }),
  get: defineRoute({
    method: "GET",
    path: "/deals/:dealId",
    summary: "Deal with stage, contact, company, assignee and originating lead",
    params: z.object({ dealId: z.string() }),
    response: DealDetail,
  }),
  create: defineRoute({
    method: "POST",
    path: "/deals",
    summary: "Create a deal in the first open stage unless a stage is given",
    body: DealInput,
    response: DealDetail,
  }),
  update: defineRoute({
    method: "PATCH",
    path: "/deals/:dealId",
    summary: "Edit title, value, close date, company or assignee",
    params: z.object({ dealId: z.string() }),
    body: z.object({
      title: z.string().trim().min(1).optional(),
      valueAed: MoneyAed.optional(),
      expectedCloseDate: DateOnly.nullable().optional(),
      companyId: z.string().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
    }),
    response: DealDetail,
  }),
  move: defineRoute({
    method: "POST",
    path: "/deals/:dealId/move",
    summary:
      "Move a deal to a stage. Lost needs lostReason (422 LOST_REASON_REQUIRED). Reopening won/lost needs owner or manager (403 REOPEN_NOT_ALLOWED)",
    params: z.object({ dealId: z.string() }),
    body: z.object({
      toStageId: z.string(),
      /** Target index inside the destination column. Appends when omitted. */
      index: z.number().int().min(0).optional(),
      /**
       * Place the deal just above this deal of the destination column. Wins over `index`, which is
       * ambiguous when the board is filtered (Mine, search, source).
       */
      beforeDealId: z.string().nullable().optional(),
      /** Place the deal just below this deal of the destination column (used when dropped last). */
      afterDealId: z.string().nullable().optional(),
      lostReason: LostReason.optional(),
      lostNote: z.string().trim().optional(),
    }),
    response: DealDetail,
  }),
};
