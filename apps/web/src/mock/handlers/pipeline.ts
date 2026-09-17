import {
  canManageTeamRules,
  formatPhone,
  planStageMove,
  sumMoney,
  toMoneyString,
  validateStageOrder,
} from "@hco/core";
import { placeInOrder } from "@hco/core/pipeline/board";
import { api, newId, type Deal, type Stage } from "@hco/shared";
import type { DealCard, DealDetail } from "@hco/shared/api/pipeline";
import type { MockContext } from "../define";
import { handle, type MockHandler } from "../define";
import { assertVisible, findOr404, matchesQuery, rows, visibleToActor } from "../scope";
import { addActivity, notify } from "../services";
import { contactName, stageById, toDealCard, userById, userName } from "../views";

/** Pipeline, stages and deals of the showcase backend. */

function defaultPipeline(ctx: MockContext) {
  const pipeline = rows(ctx, "pipelines").find((p) => p.isDefault) ?? rows(ctx, "pipelines")[0];
  if (!pipeline) throw ctx.error("NOT_FOUND", "This workspace has no pipeline yet.");
  return pipeline;
}

function stagesOf(ctx: MockContext, pipelineId: string): Stage[] {
  return rows(ctx, "stages")
    .filter((s) => s.pipelineId === pipelineId)
    .sort((a, b) => a.position - b.position);
}

function dealsInStage(ctx: MockContext, stageId: string): Deal[] {
  return rows(ctx, "deals")
    .filter((d) => d.stageId === stageId)
    .sort((a, b) => a.position - b.position);
}

/** Rewrite positions 0..n-1 of a column in the given order. */
function renumber(ctx: MockContext, orderedIds: string[]) {
  const byId = new Map(rows(ctx, "deals").map((d) => [d.id, d]));
  orderedIds.forEach((id, position) => {
    const deal = byId.get(id);
    if (deal && deal.position !== position) deal.position = position;
  });
}

function toCard(ctx: MockContext, deal: Deal): DealCard {
  return { ...toDealCard(ctx, deal), lostReason: deal.lostReason };
}

function toDealDetail(ctx: MockContext, deal: Deal): DealDetail {
  const stage = stageById(ctx, deal.stageId);
  const contact = findOr404(ctx, "contacts", deal.contactId, "contact");
  const company = deal.companyId
    ? (rows(ctx, "companies").find((c) => c.id === deal.companyId) ?? null)
    : null;
  const lead = deal.leadId ? (rows(ctx, "leads").find((l) => l.id === deal.leadId) ?? null) : null;
  const conversations = rows(ctx, "conversations")
    .filter((c) => c.contactId === contact.id)
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  const conversation = conversations.find((c) => c.channel === "whatsapp") ?? conversations[0] ?? null;
  return {
    deal,
    card: toCard(ctx, deal),
    stage,
    stages: stagesOf(ctx, deal.pipelineId),
    contact,
    company,
    assignee: userById(ctx, deal.assigneeId),
    lead,
    conversationId: conversation?.id ?? null,
  };
}

function findDeal(ctx: MockContext, dealId: string): Deal {
  const deal = findOr404(ctx, "deals", dealId, "deal");
  assertVisible(ctx, deal, "deal");
  return deal;
}

function assertAssignable(ctx: MockContext, userId: string | null | undefined) {
  if (!userId) return;
  const user = rows(ctx, "users").find((u) => u.id === userId && u.isActive);
  if (!user) throw ctx.error("VALIDATION", "Choose an active teammate to assign.");
}

function notifyDealAssigned(ctx: MockContext, deal: Deal) {
  if (!deal.assigneeId || deal.assigneeId === ctx.user.id) return;
  notify(ctx, {
    userId: deal.assigneeId,
    type: "deal_assigned",
    title: `${ctx.user.name} assigned you a deal`,
    body: deal.title,
    href: `/deals/${deal.id}`,
  });
}

export const pipelineHandlers: MockHandler[] = [
  handle(api.pipeline.getDefault, (ctx) => {
    const pipeline = defaultPipeline(ctx);
    return { pipeline, stages: stagesOf(ctx, pipeline.id) };
  }),

  handle(api.pipeline.saveStages, (ctx, { params, body }) => {
    if (!canManageTeamRules(ctx.actor)) {
      throw ctx.error("FORBIDDEN", "Only an owner or manager can change the pipeline stages.");
    }
    const pipeline = findOr404(ctx, "pipelines", params.pipelineId, "pipeline");
    const current = stagesOf(ctx, pipeline.id);
    const currentById = new Map(current.map((s) => [s.id, s]));
    ctx.unwrap(validateStageOrder(body.stages));

    for (const edit of body.stages) {
      if (!edit.id) continue;
      const existing = currentById.get(edit.id);
      if (!existing) throw ctx.error("NOT_FOUND", "One of these stages was deleted. Reload and try again.");
      if (existing.type !== edit.type) {
        throw ctx.error("STAGE_RULES", `"${existing.name}" can't change between open, won and lost.`);
      }
    }

    const keptIds = new Set(body.stages.flatMap((s) => (s.id ? [s.id] : [])));
    const removed = current.filter((s) => !keptIds.has(s.id));
    for (const stage of removed) {
      const count = dealsInStage(ctx, stage.id).length;
      if (count > 0) {
        throw ctx.error(
          "STAGE_NOT_EMPTY",
          `"${stage.name}" still has ${count} ${count === 1 ? "deal" : "deals"}. Move them to another stage first.`,
        );
      }
    }
    const removedIds = new Set(removed.map((s) => s.id));
    ctx.db.stages = ctx.db.stages.filter((s) => !removedIds.has(s.id));

    body.stages.forEach((edit, position) => {
      const existing = edit.id ? ctx.db.stages.find((s) => s.id === edit.id) : undefined;
      if (existing) {
        if (
          existing.name !== edit.name ||
          existing.probability !== edit.probability ||
          existing.position !== position
        ) {
          existing.name = edit.name;
          existing.probability = edit.probability;
          existing.position = position;
          existing.updatedAt = ctx.nowIso;
        }
        return;
      }
      ctx.db.stages.push({
        id: newId(),
        workspaceId: ctx.workspace.id,
        createdAt: ctx.nowIso,
        updatedAt: ctx.nowIso,
        pipelineId: pipeline.id,
        name: edit.name,
        position,
        type: edit.type,
        probability: edit.probability,
      });
    });
    pipeline.updatedAt = ctx.nowIso;
    ctx.emit({ type: "workspace.updated", id: pipeline.id });
    return { pipeline, stages: stagesOf(ctx, pipeline.id) };
  }),

  handle(api.pipeline.board, (ctx, { query }) => {
    const pipeline = defaultPipeline(ctx);
    const contacts = new Map(rows(ctx, "contacts").map((c) => [c.id, c]));
    const companies = new Map(rows(ctx, "companies").map((c) => [c.id, c]));
    const deals = visibleToActor(ctx, rows(ctx, "deals"))
      .filter((d) => d.pipelineId === pipeline.id)
      .filter((d) => !query.assigneeId || d.assigneeId === query.assigneeId)
      .filter((d) => !query.source || d.source === query.source)
      .filter((d) => {
        const contact = contacts.get(d.contactId);
        return matchesQuery(
          query.q,
          d.title,
          contact ? contactName(contact) : null,
          contact?.phones.map((p) => `${p.e164} ${formatPhone(p.e164)}`).join(" "),
          contact?.emails.join(" "),
          d.companyId ? companies.get(d.companyId)?.name : null,
        );
      });
    const columns = stagesOf(ctx, pipeline.id).map((stage) => {
      const cards = deals
        .filter((d) => d.stageId === stage.id)
        .sort((a, b) => a.position - b.position || b.lastActivityAt.localeCompare(a.lastActivityAt))
        .map((d) => toCard(ctx, d));
      return {
        stage,
        deals: cards,
        count: cards.length,
        totalValueAed: sumMoney(cards.map((c) => c.valueAed)),
      };
    });
    return { pipeline, columns };
  }),

  handle(api.pipeline.list, (ctx, { query }) => {
    const stages = new Map(rows(ctx, "stages").map((s) => [s.id, s]));
    const companyContactIds = query.companyId
      ? new Set(
          rows(ctx, "contacts")
            .filter((c) => c.companyId === query.companyId)
            .map((c) => c.id),
        )
      : null;
    const rank = { open: 0, won: 1, lost: 2 } as const;
    const items = visibleToActor(ctx, rows(ctx, "deals"))
      .filter((d) => !query.contactId || d.contactId === query.contactId)
      .filter(
        (d) =>
          !query.companyId ||
          d.companyId === query.companyId ||
          (companyContactIds?.has(d.contactId) ?? false),
      )
      .filter((d) => query.status === "all" || stages.get(d.stageId)?.type === query.status)
      .map((d) => toCard(ctx, d))
      .sort(
        (a, b) =>
          rank[a.stageType] - rank[b.stageType] ||
          (b.closedAt ?? b.lastActivityAt).localeCompare(a.closedAt ?? a.lastActivityAt),
      );
    return { items };
  }),

  handle(api.pipeline.get, (ctx, { params }) => toDealDetail(ctx, findDeal(ctx, params.dealId))),

  handle(api.pipeline.create, (ctx, { body }) => {
    const pipeline = defaultPipeline(ctx);
    const stages = stagesOf(ctx, pipeline.id);
    const contact = findOr404(ctx, "contacts", body.contactId, "contact");
    const companyId = body.companyId === undefined ? contact.companyId : body.companyId;
    if (companyId) findOr404(ctx, "companies", companyId, "company");
    const stage = body.stageId
      ? stages.find((s) => s.id === body.stageId)
      : stages.find((s) => s.type === "open");
    if (!stage) throw ctx.error("NOT_FOUND", "That stage doesn't exist. Reload and try again.");
    if (stage.type !== "open") {
      throw ctx.error(
        "VALIDATION",
        "New deals start in an open stage. Create it, then mark it as won or lost.",
      );
    }
    const assigneeId = body.assigneeId === undefined ? ctx.user.id : body.assigneeId;
    assertAssignable(ctx, assigneeId);
    const deal: Deal = {
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      title: body.title,
      contactId: contact.id,
      companyId: companyId ?? null,
      pipelineId: pipeline.id,
      stageId: stage.id,
      position: 0,
      valueAed: toMoneyString(body.valueAed),
      expectedCloseDate: body.expectedCloseDate ?? null,
      assigneeId,
      source: body.source,
      isSimulated: false,
      leadId: null,
      lostReason: null,
      lostNote: null,
      closedAt: null,
      lastActivityAt: ctx.nowIso,
      deletedAt: null,
    };
    ctx.db.deals.push(deal);
    // New deals go to the top of their column, where the person who created them will look.
    renumber(ctx, [deal.id, ...dealsInStage(ctx, stage.id).flatMap((d) => (d.id === deal.id ? [] : [d.id]))]);
    ctx.db.stageTransitions.push({
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      dealId: deal.id,
      fromStageId: null,
      toStageId: stage.id,
      byUserId: ctx.user.id,
      at: ctx.nowIso,
    });
    addActivity(ctx, {
      type: "system",
      dealId: deal.id,
      contactId: contact.id,
      body: "Deal created",
      metadata: { kind: "deal_created", stageId: stage.id, stageName: stage.name, valueAed: deal.valueAed },
    });
    ctx.emit({ type: "deal.created", id: deal.id });
    notifyDealAssigned(ctx, deal);
    return toDealDetail(ctx, deal);
  }),

  handle(api.pipeline.update, (ctx, { params, body }) => {
    const deal = findDeal(ctx, params.dealId);
    const previousAssignee = deal.assigneeId;
    if (body.title !== undefined) deal.title = body.title;
    if (body.valueAed !== undefined) deal.valueAed = toMoneyString(body.valueAed);
    if (body.expectedCloseDate !== undefined) deal.expectedCloseDate = body.expectedCloseDate;
    if (body.companyId !== undefined) {
      if (body.companyId) findOr404(ctx, "companies", body.companyId, "company");
      deal.companyId = body.companyId;
    }
    if (body.assigneeId !== undefined && body.assigneeId !== previousAssignee) {
      assertAssignable(ctx, body.assigneeId);
      deal.assigneeId = body.assigneeId;
      addActivity(ctx, {
        type: "system",
        dealId: deal.id,
        contactId: deal.contactId,
        body: body.assigneeId
          ? `Assigned to ${userName(ctx, body.assigneeId) ?? "a teammate"}`
          : "Unassigned",
        metadata: { kind: "assigned", assigneeId: body.assigneeId, previousAssigneeId: previousAssignee },
      });
      notifyDealAssigned(ctx, deal);
    }
    deal.updatedAt = ctx.nowIso;
    ctx.emit({ type: "deal.updated", id: deal.id });
    return toDealDetail(ctx, deal);
  }),

  handle(api.pipeline.move, (ctx, { params, body }) => {
    const deal = findDeal(ctx, params.dealId);
    const from = stageById(ctx, deal.stageId);
    const to = stagesOf(ctx, deal.pipelineId).find((s) => s.id === body.toStageId);
    if (!to) throw ctx.error("NOT_FOUND", "That stage doesn't exist any more. Reload the board.");

    const plan = ctx.unwrap(
      planStageMove({ from, to, actorRole: ctx.user.role, lostReason: body.lostReason, now: ctx.nowIso }),
    );
    const placement = { beforeId: body.beforeDealId, afterId: body.afterDealId, index: body.index };
    const targetOrder = placeInOrder(
      dealsInStage(ctx, to.id).map((d) => d.id),
      deal.id,
      placement,
    );

    if (from.id === to.id) {
      renumber(ctx, targetOrder);
      deal.updatedAt = ctx.nowIso;
      ctx.emit({ type: "deal.moved", id: deal.id });
      return toDealDetail(ctx, deal);
    }

    deal.stageId = to.id;
    deal.closedAt = plan.closedAt;
    deal.lostReason = plan.lostReason;
    deal.lostNote = to.type === "lost" ? body.lostNote || null : null;
    deal.updatedAt = ctx.nowIso;
    renumber(
      ctx,
      dealsInStage(ctx, from.id).flatMap((d) => (d.id === deal.id ? [] : [d.id])),
    );
    renumber(ctx, targetOrder);

    ctx.db.stageTransitions.push({
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      dealId: deal.id,
      fromStageId: from.id,
      toStageId: to.id,
      byUserId: ctx.user.id,
      at: ctx.nowIso,
    });
    if (plan.isReopen) {
      addActivity(ctx, {
        type: "system",
        dealId: deal.id,
        contactId: deal.contactId,
        body: `Reopened by ${ctx.user.name}`,
        metadata: { kind: "deal_reopened", fromStageId: from.id, fromStageName: from.name },
      });
    }
    addActivity(ctx, {
      type: "stage_change",
      dealId: deal.id,
      contactId: deal.contactId,
      body: `Moved from ${from.name} to ${to.name}`,
      metadata: {
        fromStageId: from.id,
        toStageId: to.id,
        fromStageName: from.name,
        toStageName: to.name,
        toStageType: to.type,
        ...(to.type === "lost" ? { lostReason: deal.lostReason, lostNote: deal.lostNote } : {}),
      },
    });
    ctx.emit({ type: "deal.moved", id: deal.id });
    return toDealDetail(ctx, deal);
  }),
];
