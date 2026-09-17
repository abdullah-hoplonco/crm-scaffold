import { formatPhone, normalizePhone, toMoneyString, transitionLead } from "@hco/core";
import { leadInView, type LeadView } from "@hco/core/leads/views";
import { api, newId, type Company, type Contact, type Deal, type Lead } from "@hco/shared";
import type { LeadViewCounts } from "@hco/shared/api/leads";
import { handle, type MockContext, type MockHandler } from "../define";
import { assertVisible, findOr404, matchesQuery, rows, visibleToActor } from "../scope";
import { addActivity, createTask, ingestLead, markLeadTouched, notify, onLeadAssigned } from "../services";
import { contactName, toDealCard, toLeadListItem, userById } from "../views";

const COUNTED_VIEWS: LeadView[] = ["new", "open", "converted", "disqualified", "all"];

const SOURCE_LABEL: Record<Lead["source"], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  email: "email",
  manual: "manual",
  csv: "CSV",
};

const STATUS_ACTIVITY: Record<"contacted" | "qualified" | "disqualified", string> = {
  contacted: "Marked as contacted",
  qualified: "Qualified",
  disqualified: "Disqualified",
};

const DISQUALIFY_LABEL: Record<NonNullable<Lead["disqualifyReason"]>, string> = {
  spam: "spam",
  wrong_number: "wrong number",
  not_interested: "not interested",
  out_of_area: "out of area",
  duplicate: "duplicate",
  other: "other reason",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An active teammate in this workspace, or a 422 naming the problem. */
function activeTeammate(ctx: MockContext, userId: string) {
  const user = rows(ctx, "users").find((u) => u.id === userId);
  if (!user || !user.isActive) {
    throw ctx.error("VALIDATION", "That teammate isn't active in this workspace. Pick someone else.");
  }
  return user;
}

function phoneOrError(ctx: MockContext, raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const e164 = normalizePhone(raw);
  if (!e164) {
    throw ctx.error(
      "INVALID_PHONE",
      "That phone number doesn't look right. Use a UAE mobile like 050 123 4567, or add the country code.",
    );
  }
  return e164;
}

function openTasksOf(ctx: MockContext, leadId: string) {
  return rows(ctx, "tasks").filter((t) => t.leadId === leadId && t.status === "open");
}

function toDetail(ctx: MockContext, lead: Lead) {
  const convertedDeal = lead.convertedDealId
    ? rows(ctx, "deals").find((d) => d.id === lead.convertedDealId)
    : undefined;
  return {
    lead: toLeadListItem(ctx, lead),
    assignee: userById(ctx, lead.assigneeId),
    matchedContact: lead.matchedContactId
      ? (rows(ctx, "contacts").find((c) => c.id === lead.matchedContactId) ?? null)
      : null,
    tasks: rows(ctx, "tasks")
      .filter((t) => t.leadId === lead.id)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    convertedContact: lead.convertedContactId
      ? (rows(ctx, "contacts").find((c) => c.id === lead.convertedContactId) ?? null)
      : null,
    convertedDeal: convertedDeal ? toDealCard(ctx, convertedDeal) : null,
  };
}

/** Assign a lead after it exists: activity, tasks follow the new assignee, the lead's chat follows too. */
function reassignLead(ctx: MockContext, lead: Lead, assigneeId: string | null) {
  const previous = lead.assigneeId;
  if (previous === assigneeId) return;
  const assignee = assigneeId ? activeTeammate(ctx, assigneeId) : null;
  lead.assigneeId = assigneeId;
  lead.updatedAt = ctx.nowIso;

  if (assignee) {
    const open = openTasksOf(ctx, lead.id);
    for (const task of open) {
      task.assigneeId = assignee.id;
      task.updatedAt = ctx.nowIso;
      ctx.emit({ type: "task.updated", id: task.id });
    }
    // A new lead that nobody owned yet gets its speed-to-lead task now, counted from the hand-over.
    if (lead.status === "new" && !open.some((t) => t.origin === "auto_lead")) {
      createTask(ctx, {
        title: `Contact ${lead.name} within 15 minutes`,
        dueAt: new Date(ctx.now.getTime() + 15 * 60_000).toISOString(),
        assigneeId: assignee.id,
        origin: "auto_lead",
        leadId: lead.id,
        contactId: lead.matchedContactId,
      });
    }
  }

  for (const conv of rows(ctx, "conversations").filter((c) => c.leadId === lead.id)) {
    if (conv.assigneeId === previous) {
      conv.assigneeId = assigneeId;
      conv.updatedAt = ctx.nowIso;
      ctx.emit({ type: "conversation.updated", id: conv.id });
    }
  }

  const by = ctx.user;
  addActivity(ctx, {
    type: "system",
    leadId: lead.id,
    contactId: lead.matchedContactId,
    body: assignee
      ? assignee.id === by.id
        ? `${by.name} took this lead`
        : `Assigned to ${assignee.name} by ${by.name}`
      : `Unassigned by ${by.name}`,
    metadata: { kind: "assigned", assigneeId, previousAssigneeId: previous, strategy: "manual" },
  });
  if (assignee && assignee.id !== by.id) {
    notify(ctx, {
      userId: assignee.id,
      type: "lead_assigned",
      title: `${by.name} assigned you a lead: ${lead.name}`,
      body: lead.message,
      href: `/leads/${lead.id}`,
    });
  }
  ctx.emit({ type: "lead.updated", id: lead.id });
}

export const leadHandlers: MockHandler[] = [
  handle(api.leads.list, (ctx, { query }) => {
    const scoped = visibleToActor(ctx, rows(ctx, "leads"))
      .filter((l) => !query.source || l.source === query.source)
      .filter((l) =>
        !query.assigneeId
          ? true
          : query.assigneeId === "unassigned"
            ? l.assigneeId === null
            : l.assigneeId === query.assigneeId,
      )
      .filter((l) =>
        matchesQuery(
          query.q,
          l.name,
          l.email,
          l.phoneE164 ? `${l.phoneE164} ${formatPhone(l.phoneE164)}` : null,
          l.companyName,
          l.campaignName,
          l.message,
        ),
      );
    const counts = Object.fromEntries(
      COUNTED_VIEWS.map((view) => [view, scoped.filter((l) => leadInView(l.status, view)).length]),
    ) as LeadViewCounts;
    const filtered = scoped
      .filter((l) => !query.status || leadInView(l.status, query.status))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    return {
      total: filtered.length,
      items: filtered.slice(query.offset, query.offset + query.limit).map((l) => toLeadListItem(ctx, l)),
      counts,
    };
  }),

  handle(api.leads.get, (ctx, { params }) => {
    const lead = findOr404(ctx, "leads", params.leadId, "lead");
    assertVisible(ctx, lead, "lead");
    return toDetail(ctx, lead);
  }),

  handle(api.leads.create, (ctx, { body }) => {
    const phoneE164 = phoneOrError(ctx, body.phone);
    const email = body.email?.trim() || null;
    if (email && !EMAIL.test(email)) throw ctx.error("VALIDATION", "Enter a valid email, e.g. name@example.com.");
    if (!phoneE164 && !email) {
      throw ctx.error("VALIDATION", "Add a phone number or an email so the team can reach this person.");
    }
    const chosen = body.assigneeId;
    if (chosen) activeTeammate(ctx, chosen);

    // A hand-picked assignee skips round-robin for this lead only; the rule itself is left as it was.
    const rule = rows(ctx, "assignmentRules")[0];
    const savedRule = rule ? { ...rule } : null;
    if (rule && chosen !== undefined) rule.strategy = "manual";
    const { lead, created } = ingestLead(ctx, {
      source: "manual",
      adapter: "manual",
      externalId: newId(),
      name: body.name,
      phone: phoneE164,
      email,
      companyName: body.companyName?.trim() || null,
      message: body.message?.trim() || null,
      formFields: {},
      campaignName: null,
      isSimulated: false,
    });
    if (rule && savedRule) Object.assign(rule, savedRule);

    if (created && chosen !== undefined && lead.assigneeId !== chosen) {
      if (lead.assigneeId === null && chosen !== null) {
        lead.assigneeId = chosen;
        onLeadAssigned(ctx, lead, "manual");
      } else {
        reassignLead(ctx, lead, chosen);
      }
    }
    if (created) {
      addActivity(ctx, {
        type: "system",
        leadId: lead.id,
        contactId: lead.matchedContactId,
        body: `Added by ${ctx.user.name}`,
        metadata: { kind: "lead_created", source: "manual" },
      });
    }
    return { ...toLeadListItem(ctx, lead), created };
  }),

  handle(api.leads.assign, (ctx, { params, body }) => {
    const lead = findOr404(ctx, "leads", params.leadId, "lead");
    assertVisible(ctx, lead, "lead");
    reassignLead(ctx, lead, body.assigneeId);
    return toLeadListItem(ctx, lead);
  }),

  handle(api.leads.setStatus, (ctx, { params, body }) => {
    const lead = findOr404(ctx, "leads", params.leadId, "lead");
    assertVisible(ctx, lead, "lead");
    const next = ctx.unwrap(transitionLead(lead.status, body.status, { reason: body.reason }));
    if (next === lead.status) return toLeadListItem(ctx, lead);
    const from = lead.status;

    if (next === "disqualified") {
      lead.status = "disqualified";
      lead.disqualifyReason = body.reason ?? null;
      lead.disqualifyNote = body.note?.trim() || null;
      for (const task of openTasksOf(ctx, lead.id)) {
        task.deletedAt = ctx.nowIso;
        task.updatedAt = ctx.nowIso;
        ctx.emit({ type: "task.updated", id: task.id });
      }
    } else {
      // Contacting or qualifying someone counts as the first touch: the reply-within-15-minutes task is done.
      markLeadTouched(ctx, lead);
      lead.status = next;
      lead.firstContactedAt ??= ctx.nowIso;
    }
    lead.updatedAt = ctx.nowIso;

    const note = body.note?.trim();
    const headline =
      next === "disqualified" && body.reason
        ? `${STATUS_ACTIVITY.disqualified} (${DISQUALIFY_LABEL[body.reason]})`
        : STATUS_ACTIVITY[body.status];
    addActivity(ctx, {
      type: "system",
      leadId: lead.id,
      contactId: lead.matchedContactId,
      body: note ? `${headline}: ${note}` : headline,
      metadata: { kind: "lead_status", from, to: next, reason: body.reason ?? null },
    });
    ctx.emit({ type: "lead.updated", id: lead.id });
    return toLeadListItem(ctx, lead);
  }),

  handle(api.leads.convert, (ctx, { params, body }) => {
    const lead = findOr404(ctx, "leads", params.leadId, "lead");
    assertVisible(ctx, lead, "lead");
    ctx.unwrap(transitionLead(lead.status, "converted"));
    const ownerId = lead.assigneeId ?? ctx.user.id;

    // -- Contact ----------------------------------------------------------------
    let contact: Contact;
    if (body.contact.mode === "existing") {
      contact = findOr404(ctx, "contacts", body.contact.contactId, "contact");
    } else {
      const input = body.contact;
      const phoneE164 = phoneOrError(ctx, input.phone);
      if (phoneE164) {
        const owner = rows(ctx, "contacts").find((c) => c.phones.some((p) => p.e164 === phoneE164));
        if (owner) {
          throw ctx.error(
            "DUPLICATE_PHONE",
            `${contactName(owner)} already uses ${formatPhone(phoneE164)}. Choose "Existing contact" to link this lead to them.`,
          );
        }
      }
      const email = input.email?.trim() || null;
      if (email && !EMAIL.test(email)) throw ctx.error("VALIDATION", "Enter a valid email, e.g. name@example.com.");
      contact = {
        id: newId(),
        workspaceId: ctx.workspace.id,
        createdAt: ctx.nowIso,
        updatedAt: ctx.nowIso,
        firstName: input.firstName,
        lastName: input.lastName?.trim() || null,
        phones: phoneE164 ? [{ e164: phoneE164, label: "mobile", isWhatsapp: true }] : [],
        primaryPhoneE164: phoneE164,
        emails: email ? [email] : [],
        whatsappUserId: !phoneE164 || phoneE164 === lead.phoneE164 ? lead.whatsappUserId : null,
        jobTitle: input.jobTitle?.trim() || null,
        companyId: null,
        source: lead.source,
        notes: null,
        assigneeId: ownerId,
        deletedAt: null,
      };
      ctx.db.contacts.push(contact);
    }

    // -- Company ----------------------------------------------------------------
    let company: Company | null = null;
    if (body.company?.mode === "existing") {
      company = findOr404(ctx, "companies", body.company.companyId, "company");
    } else if (body.company?.mode === "new") {
      company = {
        id: newId(),
        workspaceId: ctx.workspace.id,
        createdAt: ctx.nowIso,
        updatedAt: ctx.nowIso,
        name: body.company.name,
        tradeLicenseNo: null,
        trn: null,
        emirate: body.company.emirate ?? null,
        jurisdiction: body.company.jurisdiction ?? null,
        freeZoneName: null,
        website: null,
        address: null,
        industry: null,
        assigneeId: ownerId,
        deletedAt: null,
      };
      ctx.db.companies.push(company);
      ctx.emit({ type: "company.updated", id: company.id });
    }
    if (company && !contact.companyId) {
      contact.companyId = company.id;
      contact.updatedAt = ctx.nowIso;
    }
    ctx.emit({ type: "contact.updated", id: contact.id });

    // -- Deal -------------------------------------------------------------------
    const pipeline = rows(ctx, "pipelines").find((p) => p.isDefault) ?? rows(ctx, "pipelines")[0];
    if (!pipeline) throw ctx.error("NOT_FOUND", "This workspace has no pipeline yet. Set one up in Settings.");
    const stages = rows(ctx, "stages")
      .filter((s) => s.pipelineId === pipeline.id)
      .sort((a, b) => a.position - b.position);
    const stage = body.deal.stageId
      ? stages.find((s) => s.id === body.deal.stageId)
      : stages.find((s) => s.type === "open");
    if (!stage) throw ctx.error("NOT_FOUND", "That stage doesn't exist any more. Pick another one.");
    if (stage.type !== "open") {
      throw ctx.error("INVALID_TRANSITION", "A new deal starts in an open stage. Move it to won or lost later.");
    }
    const columnPositions = rows(ctx, "deals")
      .filter((d) => d.stageId === stage.id)
      .map((d) => d.position);
    const deal: Deal = {
      id: newId(),
      workspaceId: ctx.workspace.id,
      createdAt: ctx.nowIso,
      updatedAt: ctx.nowIso,
      title: body.deal.title,
      contactId: contact.id,
      companyId: company?.id ?? contact.companyId,
      pipelineId: pipeline.id,
      stageId: stage.id,
      position: columnPositions.length ? Math.max(...columnPositions) + 1 : 0,
      valueAed: toMoneyString(body.deal.valueAed),
      expectedCloseDate: body.deal.expectedCloseDate ?? null,
      assigneeId: ownerId,
      source: lead.source,
      isSimulated: lead.isSimulated,
      leadId: lead.id,
      lostReason: null,
      lostNote: null,
      closedAt: null,
      lastActivityAt: ctx.nowIso,
      deletedAt: null,
    };
    ctx.db.deals.push(deal);
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
    ctx.emit({ type: "deal.created", id: deal.id });

    // -- Lead, conversation, tasks ------------------------------------------------
    lead.status = "converted";
    lead.convertedContactId = contact.id;
    lead.convertedDealId = deal.id;
    lead.firstContactedAt ??= ctx.nowIso;
    lead.updatedAt = ctx.nowIso;

    for (const conv of rows(ctx, "conversations").filter((c) => c.leadId === lead.id)) {
      conv.contactId = contact.id;
      conv.leadId = null;
      conv.participantName = contactName(contact);
      conv.updatedAt = ctx.nowIso;
      ctx.emit({ type: "conversation.updated", id: conv.id });
    }
    for (const task of openTasksOf(ctx, lead.id)) {
      task.dealId = deal.id;
      task.contactId = contact.id;
      task.updatedAt = ctx.nowIso;
      ctx.emit({ type: "task.updated", id: task.id });
    }

    addActivity(ctx, {
      type: "system",
      leadId: lead.id,
      contactId: contact.id,
      dealId: deal.id,
      body: `Converted from ${SOURCE_LABEL[lead.source]} lead by ${ctx.user.name}`,
      metadata: { kind: "lead_converted", source: lead.source, stageId: stage.id },
    });
    ctx.emit({ type: "lead.updated", id: lead.id });
    return { contactId: contact.id, companyId: deal.companyId, dealId: deal.id };
  }),
];
