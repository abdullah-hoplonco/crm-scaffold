import { canManageTeamRules, nextAssignee, normalizePhone } from "@hco/core";
import {
  createRng,
  pickMixedSource,
  simulateFollowUp,
  simulateLead,
  simulateUnknownWhatsapp,
  simulateWhatsappMessageId,
  treatmentFromText,
  type PatientPhase,
  type Rng,
} from "@hco/demo-data";
import { api, type Contact, type Tables } from "@hco/shared";
import type { SimulationResult } from "@hco/shared/api/demo";
import { freshTablesKeepingUser } from "../db";
import { handle, type MockContext, type MockHandler } from "../define";
import { findOr404, rows } from "../scope";
import { ingestLead, ingestWhatsappMessage } from "../services";
import { contactName, openDealsOfContact, userName } from "../views";

/**
 * The Simulator. Everything it produces enters through `ingestLead` / `ingestWhatsappMessage`, the same
 * path real channel adapters use, so assignment, tasks, notifications and live updates behave for real.
 */

function assertCanRunDemo(ctx: MockContext) {
  if (!canManageTeamRules(ctx.actor)) {
    throw ctx.error("FORBIDDEN", "Only owners and managers can use the demo panel.");
  }
}

/** A different story on every click; the generators themselves stay deterministic for a seed. */
function freshRng(): Rng {
  return createRng((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
}

/** Every phone already known to the workspace, so simulated people never collide with real ones. */
function usedPhones(ctx: MockContext): Set<string> {
  const used = new Set<string>();
  for (const c of rows(ctx, "contacts")) for (const p of c.phones) used.add(p.e164);
  for (const l of rows(ctx, "leads")) if (l.phoneE164) used.add(l.phoneE164);
  for (const c of rows(ctx, "conversations")) if (c.participantPhoneE164) used.add(c.participantPhoneE164);
  return used;
}

function routedPhone(ctx: MockContext, phone: string | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw ctx.error(
      "INVALID_PHONE",
      "Enter a valid mobile number, for example 050 123 4567 or +971 50 123 4567.",
    );
  }
  return normalized;
}

function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** What an inbound WhatsApp message turned into: a new lead, a repeat on an open lead, or a contact's message. */
function whatsappResult(
  ctx: MockContext,
  ingested: ReturnType<typeof ingestWhatsappMessage>,
  fallbackName: string,
  text: string,
): SimulationResult {
  const { conversation, lead } = ingested;
  return {
    outcome: lead ? "created" : conversation.leadId ? "repeat" : "message",
    source: "whatsapp",
    leadId: lead?.id ?? conversation.leadId,
    conversationId: conversation.id,
    name: lead?.name ?? conversation.participantName ?? fallbackName,
    assigneeId: conversation.assigneeId,
    assigneeName: userName(ctx, conversation.assigneeId),
    text,
  };
}

/** Where a contact is with the clinic, from their most relevant deal. */
function patientPhase(
  ctx: MockContext,
  contact: Contact,
): { phase: PatientPhase; treatmentKey: string | null } {
  const stages = rows(ctx, "stages");
  const openStages = stages.filter((s) => s.type === "open").sort((a, b) => a.position - b.position);
  const openDeal = openDealsOfContact(ctx, contact.id)[0];
  if (openDeal) {
    const index = openStages.findIndex((s) => s.id === openDeal.stageId);
    const phase: PatientPhase = index <= 0 ? "enquiry" : index === 1 ? "booked" : "consulted";
    return { phase, treatmentKey: treatmentFromText(openDeal.title)?.key ?? null };
  }
  const wonStageIds = new Set(stages.filter((s) => s.type === "won").map((s) => s.id));
  const wonDeal = rows(ctx, "deals").find((d) => d.contactId === contact.id && wonStageIds.has(d.stageId));
  if (wonDeal) return { phase: "customer", treatmentKey: treatmentFromText(wonDeal.title)?.key ?? null };
  return { phase: "none", treatmentKey: null };
}

/**
 * Fresh demo tables that keep the current workspace and user ids, so every open window (the rep
 * windows included) stays signed in as the same person after a reset.
 */
function freshTablesKeepingIds(ctx: MockContext): { tables: Tables; userId: string | null } {
  const fresh = freshTablesKeepingUser(ctx.state, ctx.state.sessionUserId);
  const idMap = new Map<string, string>();
  for (const user of fresh.tables.users) {
    const existing = ctx.db.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (!existing) continue;
    idMap.set(user.id, existing.id);
    const freshWorkspace = fresh.tables.workspaces.find((w) => w.id === user.workspaceId);
    if (freshWorkspace && !idMap.has(freshWorkspace.id)) idMap.set(freshWorkspace.id, existing.workspaceId);
  }
  const tables = JSON.parse(JSON.stringify(fresh.tables), (_key, value: unknown) =>
    typeof value === "string" ? (idMap.get(value) ?? value) : value,
  ) as Tables;
  // Someone signed in to another workspace (e.g. one made in onboarding) continues as the demo owner.
  const owner = tables.users.find((u) => u.role === "owner");
  const userId = fresh.userId ? (idMap.get(fresh.userId) ?? fresh.userId) : (owner?.id ?? null);
  return { tables, userId };
}

export const demoHandlers: MockHandler[] = [
  handle(api.demo.simulateLead, (ctx, { body }) => {
    assertCanRunDemo(ctx);
    const rng = freshRng();
    const used = usedPhones(ctx);
    const routed = routedPhone(ctx, body.phone);
    const results: SimulationResult[] = [];

    for (let i = 0; i < body.count; i++) {
      const source = body.source === "mixed" ? pickMixedSource(rng) : body.source;
      const phoneE164 = i === 0 ? routed : null;

      if (source === "whatsapp") {
        const sim = simulateUnknownWhatsapp(rng, { usedPhones: used, now: ctx.now, phoneE164 });
        const ingested = ingestWhatsappMessage(ctx, {
          externalId: sim.externalId,
          from: sim.phoneE164,
          fromName: sim.person.name,
          whatsappUserId: sim.whatsappUserId,
          body: sim.body,
          isSimulated: true,
        });
        results.push(whatsappResult(ctx, ingested, sim.person.name, sim.body));
        continue;
      }

      const sim = simulateLead(rng, { source, usedPhones: used, now: ctx.now, phoneE164 });
      const { lead, created } = ingestLead(ctx, {
        source,
        adapter: sim.adapter,
        externalId: sim.externalId,
        name: sim.person.name,
        phone: sim.phoneE164,
        email: sim.email,
        whatsappUserId: sim.whatsappUserId,
        message: sim.message,
        formFields: sim.formFields,
        campaignName: sim.campaignName,
        isSimulated: true,
        rawPayload: sim.rawPayload,
      });
      results.push({
        outcome: created ? "created" : "repeat",
        source,
        leadId: lead.id,
        conversationId: null,
        name: lead.name,
        assigneeId: lead.assigneeId,
        assigneeName: userName(ctx, lead.assigneeId),
        text: sim.message,
      });
    }

    const leadIds = [...new Set(results.flatMap((r) => (r.leadId ? [r.leadId] : [])))];
    return { leadIds, results };
  }),

  handle(api.demo.simulateMessage, (ctx, { body }) => {
    assertCanRunDemo(ctx);
    const rng = freshRng();

    if (body.from === "unknown_number") {
      const routed = routedPhone(ctx, body.phone);
      const sim = simulateUnknownWhatsapp(rng, {
        usedPhones: usedPhones(ctx),
        now: ctx.now,
        phoneE164: routed,
      });
      const text = body.body || sim.body;
      const ingested = ingestWhatsappMessage(ctx, {
        externalId: sim.externalId,
        from: sim.phoneE164,
        fromName: sim.person.name,
        whatsappUserId: sim.whatsappUserId,
        body: text,
        isSimulated: true,
      });
      return {
        conversationId: ingested.conversation.id,
        messageId: ingested.message.id,
        leadId: ingested.lead?.id ?? null,
        result: whatsappResult(ctx, ingested, sim.person.name, text),
      };
    }

    const whatsappByContact = new Map(
      rows(ctx, "conversations")
        .filter((c) => c.channel === "whatsapp" && c.contactId)
        .map((c) => [c.contactId, c] as const),
    );
    let contact: Contact | undefined;
    if (body.contactId) {
      contact = findOr404(ctx, "contacts", body.contactId, "contact");
    } else {
      const candidates = rows(ctx, "contacts").filter((c) => whatsappByContact.has(c.id));
      // Prefer patients with a deal in progress: their follow-ups make the best story.
      const inProgress = candidates.filter((c) => openDealsOfContact(ctx, c.id).length > 0);
      contact = pickRandom(inProgress.length ? inProgress : candidates);
    }
    if (!contact) {
      throw ctx.error(
        "NOT_FOUND",
        "No patient has a WhatsApp conversation yet. Try a message from an unknown number instead.",
      );
    }
    const existing = whatsappByContact.get(contact.id);
    const phone = existing?.participantPhoneE164 ?? contact.primaryPhoneE164;
    if (!phone && !contact.whatsappUserId) {
      throw ctx.error("VALIDATION", `${contactName(contact)} has no WhatsApp number. Pick another contact.`);
    }
    const { phase, treatmentKey } = patientPhase(ctx, contact);
    const text = body.body || simulateFollowUp(rng, { phase, treatmentKey });
    const ingested = ingestWhatsappMessage(ctx, {
      externalId: simulateWhatsappMessageId(rng),
      from: phone,
      fromName: contactName(contact),
      whatsappUserId: contact.whatsappUserId,
      body: text,
      isSimulated: true,
    });
    return {
      conversationId: ingested.conversation.id,
      messageId: ingested.message.id,
      leadId: ingested.lead?.id ?? null,
      result: whatsappResult(ctx, ingested, contactName(contact), text),
    };
  }),

  handle(api.demo.reset, (ctx) => {
    assertCanRunDemo(ctx);
    const actorId = ctx.user.id;
    const { tables, userId } = freshTablesKeepingIds(ctx);
    // Emit while the current session still resolves, so the event carries a workspace.
    ctx.emit({
      type: "workspace.reset",
      id: null,
      notifyUserIds: tables.users.filter((u) => u.id !== actorId).map((u) => u.id),
      toast: {
        title: "Demo data was reset",
        body: "The clinic's story is back at its starting point.",
        href: null,
      },
    });
    Object.assign(ctx.db, tables);
    ctx.state.sessionUserId = userId;
    // The new story is anchored to now; without this a later load would shift it forward again.
    ctx.state.anchoredAt = ctx.nowIso;
    return { ok: true as const };
  }),

  handle(api.demo.status, (ctx) => {
    assertCanRunDemo(ctx);
    const users = rows(ctx, "users");
    const rule = rows(ctx, "assignmentRules")[0];
    const activeIds = new Set(users.filter((u) => u.isActive).map((u) => u.id));
    const nextId = rule ? nextAssignee(rule, activeIds) : null;
    const leads = rows(ctx, "leads");
    const conversations = rows(ctx, "conversations");
    return {
      assignment: {
        strategy: rule?.strategy ?? "manual",
        nextAssigneeId: nextId,
        nextAssigneeName: userName(ctx, nextId),
      },
      reps: users
        .filter((u) => u.isActive && u.role === "rep")
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          jobTitle: u.jobTitle,
          newLeads: leads.filter((l) => l.assigneeId === u.id && l.status === "new").length,
          unreadConversations: conversations.filter((c) => c.assigneeId === u.id && c.unreadCount > 0).length,
        })),
    };
  }),
];
