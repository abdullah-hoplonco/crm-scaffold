import {
  computeQuoteTotals,
  formatPhone,
  formatQuoteNumber,
  serviceWindowExpiry,
  toMoneyString,
} from "@hco/core";
import {
  emptyTables,
  newId,
  type Activity,
  type ActivityType,
  type Company,
  type Contact,
  type Conversation,
  type Deal,
  type DisqualifyReason,
  type Lead,
  type LeadSource,
  type LeadStatus,
  type Message,
  type Stage,
  type Tables,
  type Task,
  type User,
} from "@hco/shared";
import {
  CLINIC,
  COMPANIES,
  ENQUIRIES,
  PATIENTS,
  PIPELINE_NAME,
  STAFF,
  STAGES,
  TREATMENTS,
  WHATSAPP_TEMPLATES,
  type Treatment,
} from "./catalog";
import { createRng } from "./rng";
import {
  campaignFor,
  simulateEnquiry,
  simulateLead,
  simulatePerson,
  simulateTreatmentKey,
  type SimulatorLeadSource,
} from "./simulator";

export interface BuildOptions {
  /** Reference "now"; every date in the story is relative to it. */
  now?: Date;
  seed?: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`demo-data: missing ${what}`);
  return value;
}

/** Lead volume per source over the last 30 days (converted leads included). */
const LEAD_TARGETS: Record<LeadSource, number> = {
  instagram: 40,
  tiktok: 46,
  facebook: 14,
  whatsapp: 22,
  manual: 7,
  csv: 5,
  email: 0,
};

type RepKey = "priya" | "yousef" | "maria" | "manager";

/** Leads that arrived minutes ago, so Leads opens with a live speed-to-lead countdown. */
const FRESH_LEADS: Array<{ source: LeadSource; minutesAgo: number; rep: "priya" | "yousef" | "maria" }> = [
  { source: "instagram", minutesAgo: 6, rep: "priya" },
  { source: "tiktok", minutesAgo: 24, rep: "yousef" },
  { source: "facebook", minutesAgo: 41, rep: "maria" },
];

interface DealPlan {
  patient?: number;
  company?: number;
  treatment: string;
  stage: string;
  source: LeadSource;
  fromLead: boolean;
  /** Days since the last activity (open deals) or since closing (won/lost). */
  days: number;
  assignee: RepKey;
  title?: string;
  valueAed?: string;
  lostReason?: "price" | "competitor";
  quote?: "draft" | "sent" | "accepted";
  /** The patient wrote last and is waiting for a reply (shows under "Waiting for your reply" on Today). */
  waiting?: boolean;
}

const DEAL_PLAN: DealPlan[] = [
  {
    patient: 0,
    treatment: "laser",
    stage: "enquiry",
    source: "instagram",
    fromLead: true,
    days: 0.15,
    assignee: "priya",
    waiting: true,
  },
  {
    patient: 1,
    treatment: "hydrafacial",
    stage: "enquiry",
    source: "instagram",
    fromLead: true,
    days: 0.5,
    assignee: "yousef",
    waiting: true,
  },
  {
    patient: 10,
    treatment: "invisalign",
    stage: "enquiry",
    source: "facebook",
    fromLead: true,
    days: 4,
    assignee: "maria",
    waiting: true,
  },
  {
    patient: 13,
    treatment: "implant",
    stage: "enquiry",
    source: "whatsapp",
    fromLead: true,
    days: 5,
    assignee: "priya",
    waiting: true,
  },
  {
    company: 3,
    treatment: "botox",
    stage: "enquiry",
    source: "manual",
    fromLead: false,
    days: 1.5,
    assignee: "manager",
    title: "Desert Pearl — staff skin day, 20 guests",
    valueAed: "18000",
  },
  {
    patient: 19,
    treatment: "profhilo",
    stage: "enquiry",
    source: "instagram",
    fromLead: true,
    days: 0.8,
    assignee: "maria",
    waiting: true,
  },
  {
    patient: 2,
    treatment: "implant",
    stage: "booked",
    source: "whatsapp",
    fromLead: true,
    days: 0.3,
    assignee: "yousef",
  },
  {
    patient: 6,
    treatment: "fillers",
    stage: "booked",
    source: "instagram",
    fromLead: true,
    days: 1.2,
    assignee: "priya",
  },
  {
    patient: 16,
    treatment: "whitening",
    stage: "booked",
    source: "manual",
    fromLead: false,
    days: 2,
    assignee: "maria",
  },
  {
    company: 0,
    treatment: "whitening",
    stage: "booked",
    source: "email",
    fromLead: false,
    days: 6,
    assignee: "manager",
    title: "Gulf Horizon — staff dental screening, 60 employees",
    valueAed: "15000",
  },
  {
    patient: 22,
    treatment: "botox",
    stage: "booked",
    source: "facebook",
    fromLead: true,
    days: 0.6,
    assignee: "yousef",
  },
  {
    patient: 7,
    treatment: "invisalign",
    stage: "consulted",
    source: "instagram",
    fromLead: true,
    days: 0.4,
    assignee: "priya",
    quote: "draft",
  },
  {
    patient: 4,
    treatment: "veneers",
    stage: "consulted",
    source: "whatsapp",
    fromLead: true,
    days: 2.5,
    assignee: "maria",
  },
  {
    patient: 20,
    treatment: "prp",
    stage: "consulted",
    source: "manual",
    fromLead: false,
    days: 7,
    assignee: "yousef",
    waiting: true,
  },
  {
    company: 4,
    treatment: "profhilo",
    stage: "consulted",
    source: "email",
    fromLead: false,
    days: 1,
    assignee: "manager",
    title: "Crescent Fintech — executive skin health, 12 managers",
    valueAed: "21600",
  },
  {
    patient: 8,
    treatment: "implant",
    stage: "plan",
    source: "facebook",
    fromLead: true,
    days: 1,
    assignee: "yousef",
    quote: "sent",
  },
  {
    patient: 23,
    treatment: "veneers",
    stage: "plan",
    source: "instagram",
    fromLead: true,
    days: 0.7,
    assignee: "maria",
    quote: "sent",
  },
  {
    patient: 11,
    treatment: "laser",
    stage: "plan",
    source: "manual",
    fromLead: false,
    days: 3.5,
    assignee: "priya",
  },
  {
    company: 1,
    treatment: "whitening",
    stage: "plan",
    source: "manual",
    fromLead: false,
    days: 2,
    assignee: "manager",
    title: "Palm Crest — hotel staff whitening day, 30 staff",
    valueAed: "27000",
  },
  {
    patient: 3,
    treatment: "hydrafacial",
    stage: "won",
    source: "instagram",
    fromLead: true,
    days: 1,
    assignee: "priya",
    quote: "accepted",
  },
  {
    patient: 9,
    treatment: "botox",
    stage: "won",
    source: "instagram",
    fromLead: true,
    days: 8,
    assignee: "yousef",
  },
  {
    patient: 5,
    treatment: "whitening",
    stage: "won",
    source: "facebook",
    fromLead: true,
    days: 12,
    assignee: "maria",
  },
  {
    patient: 14,
    treatment: "invisalign",
    stage: "won",
    source: "whatsapp",
    fromLead: true,
    days: 18,
    assignee: "priya",
  },
  {
    patient: 17,
    treatment: "implant",
    stage: "lost",
    source: "manual",
    fromLead: false,
    days: 6,
    assignee: "yousef",
    lostReason: "price",
  },
  {
    patient: 21,
    treatment: "veneers",
    stage: "lost",
    source: "manual",
    fromLead: false,
    days: 15,
    assignee: "maria",
    lostReason: "competitor",
  },
];

const NOTES = [
  "Prefers appointments after 6 pm on weekdays.",
  "Asked about 0% instalments over 12 months on UAE bank cards.",
  "Referred by a friend who had the same treatment with us last year.",
  "Wants a female doctor. Booked with Dr. Hessa.",
  "Travelling to Riyadh next week, follow up after the 25th.",
  "Compared our price with a clinic in JLT. Value the free follow-up visits.",
  "Has insurance with partial dental cover. Checking what applies.",
];

const BOOKING_SLOTS = [
  {
    ask: "Yes please. Do you have anything on Thursday evening?",
    offer: "Thursday at 6:30 pm is free. Shall I book it for you?",
    when: "Thursday at 6:30 pm",
  },
  {
    ask: "Yes please. Saturday morning would be best for me",
    offer: "Saturday at 11 am is available with Dr. Hessa. Shall I book it?",
    when: "Saturday at 11 am",
  },
  {
    ask: "Sure. Can I come after work, around 7?",
    offer: "We have 7:15 pm on Tuesday. Would that work for you?",
    when: "Tuesday at 7:15 pm",
  },
];

const CONFIRMATIONS = ["Perfect, please book it", "Yes that works, thank you", "Great, see you then"];

const NUDGES = ["Hello? Any update on the price?", "Hi, just following up on my message above"];

/** Last message from a patient who is still waiting for a reply, by stage. */
const WAITING_QUESTIONS: Record<string, string> = {
  booked: "Can I move my consultation to Saturday morning?",
  consulted: "Can you send me the price for the 4 sessions again? I want to discuss it with my family first.",
  plan: "Is the 0% instalment plan available on Emirates NBD cards?",
};

const CALLS = [
  "Called to confirm the consultation. Confirmed for Thursday 6:30 pm.",
  "Called, no answer. Sent a WhatsApp instead.",
  "Discussed the treatment plan and payment options for 15 minutes.",
  "Quick call to answer questions about downtime and aftercare.",
];

export function buildDemoDataset(options: BuildOptions = {}): Tables {
  const now = options.now ?? new Date();
  const rng = createRng(options.seed ?? 20260917);
  const t = emptyTables();
  const iso = (ms: number) => new Date(ms).toISOString();
  const ago = (ms: number) => iso(now.getTime() - ms);
  const nowMs = now.getTime();

  // -- Workspace -------------------------------------------------------------
  const workspaceCreated = ago(160 * DAY);
  const ws = {
    id: newId(),
    name: CLINIC.name,
    currency: "AED" as const,
    vatRate: "5.00",
    trn: CLINIC.trn,
    timezone: "Asia/Dubai",
    staleAfterDays: 3,
    addressLine: CLINIC.addressLine,
    emirate: CLINIC.emirate,
    createdAt: workspaceCreated,
    updatedAt: workspaceCreated,
  };
  t.workspaces.push(ws);
  const row = (createdAt: string, updatedAt: string = createdAt) => ({
    id: newId(),
    workspaceId: ws.id,
    createdAt,
    updatedAt,
  });

  // -- Users -----------------------------------------------------------------
  const users = new Map<string, User>();
  for (const s of STAFF) {
    const u: User = {
      ...row(workspaceCreated),
      email: `${s.email}@${CLINIC.emailDomain}`,
      name: s.name,
      role: s.role,
      jobTitle: s.jobTitle,
      isActive: true,
    };
    users.set(s.key, u);
    t.users.push(u);
  }
  const user = (key: string) => must(users.get(key), `user ${key}`);
  const repKeys = ["priya", "yousef", "maria"] as const;
  const firstName = (u: User) => u.name.replace(/^Dr\.\s+/, "").split(" ")[0] ?? u.name;

  // -- Pipeline --------------------------------------------------------------
  const pipeline = { ...row(workspaceCreated), name: PIPELINE_NAME, isDefault: true };
  t.pipelines.push(pipeline);
  const stages = new Map<string, Stage>();
  STAGES.forEach((s, position) => {
    const stage: Stage = {
      ...row(workspaceCreated),
      pipelineId: pipeline.id,
      name: s.name,
      position,
      type: s.type,
      probability: s.probability,
    };
    stages.set(s.key, stage);
    t.stages.push(stage);
  });
  const stage = (key: string) => must(stages.get(key), `stage ${key}`);
  const stageOrder = STAGES.map((s) => s.key);

  // -- Channel connections and templates ---------------------------------------
  const simulatorConn = {
    ...row(workspaceCreated),
    userId: null,
    type: "simulator" as const,
    status: "connected" as const,
    displayName: "Demo simulator",
    externalAccountId: "simulator",
    config: { note: "Generates realistic leads and WhatsApp messages. Replies never leave the CRM." },
    lastSyncedAt: ago(2 * MIN),
  };
  const gmailConn = {
    ...row(ago(90 * DAY)),
    userId: user("manager").id,
    type: "gmail" as const,
    status: "connected" as const,
    displayName: user("manager").email,
    externalAccountId: user("manager").email,
    config: { syncEveryMinutes: 1 },
    lastSyncedAt: ago(1 * MIN),
  };
  t.channelConnections.push(
    simulatorConn,
    {
      ...row(ago(120 * DAY)),
      userId: null,
      type: "whatsapp_cloud",
      status: "connected",
      displayName: `${CLINIC.whatsappDisplay} · ${CLINIC.shortName}`,
      externalAccountId: "demo-phone-number-id",
      config: {
        displayPhone: CLINIC.whatsappDisplay,
        verifiedName: CLINIC.shortName,
        qualityRating: "GREEN",
      },
      lastSyncedAt: ago(3 * MIN),
    },
    {
      ...row(ago(110 * DAY)),
      userId: null,
      type: "meta_leadads",
      status: "connected",
      displayName: `${CLINIC.shortName} — Facebook & Instagram`,
      externalAccountId: "demo-page-id",
      config: { pageName: CLINIC.shortName, forms: 5 },
      lastSyncedAt: ago(4 * MIN),
    },
    {
      ...row(ago(20 * DAY)),
      userId: null,
      type: "tiktok_leads",
      status: "pending",
      displayName: `${CLINIC.shortName} — TikTok`,
      externalAccountId: null,
      config: { note: "Waiting for TikTok developer approval" },
      lastSyncedAt: null,
    },
    gmailConn,
  );
  const templates = WHATSAPP_TEMPLATES.map((tpl) => ({
    ...row(ago(100 * DAY)),
    name: tpl.name,
    language: "en",
    category: tpl.category,
    status: "approved" as const,
    body: tpl.body,
    variableHints: tpl.variableHints,
  }));
  t.whatsappTemplates.push(...templates);
  const firstTouchTemplate = must(templates[0], "first-touch template");

  // -- Helpers -----------------------------------------------------------------
  const usedPhones = new Set<string>();
  const uaeMobile = () => {
    for (;;) {
      const phone = `+9715${rng.pick(["0", "2", "4", "5", "6", "8"])}${rng.digits(7)}`;
      if (!usedPhones.has(phone)) {
        usedPhones.add(phone);
        return phone;
      }
    }
  };
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, ".");
  const treatment = (key: string): Treatment =>
    must(
      TREATMENTS.find((x) => x.key === key),
      `treatment ${key}`,
    );
  const enquiryFor = (key: string) =>
    rng.pick(ENQUIRIES[key] ?? ["I'd like to know more about your treatments."]);

  const addActivity = (
    type: ActivityType,
    occurredAt: string,
    links: { leadId?: string | null; contactId?: string | null; dealId?: string | null },
    body: string | null,
    userId: string | null,
    metadata: Record<string, unknown> = {},
  ): Activity => {
    const a: Activity = {
      ...row(occurredAt),
      type,
      leadId: links.leadId ?? null,
      contactId: links.contactId ?? null,
      dealId: links.dealId ?? null,
      body,
      metadata,
      userId,
      occurredAt,
    };
    t.activities.push(a);
    return a;
  };

  const addTask = (
    task: Omit<Task, "id" | "workspaceId" | "createdAt" | "updatedAt" | "deletedAt">,
    createdAt: string,
  ) => {
    const created: Task = { ...row(createdAt, task.completedAt ?? createdAt), ...task, deletedAt: null };
    t.tasks.push(created);
    return created;
  };

  const leadAdapter = (source: LeadSource) =>
    source === "instagram" || source === "facebook"
      ? "meta-leadads"
      : source === "tiktok"
        ? "tiktok-leads"
        : source === "whatsapp"
          ? "whatsapp-cloud"
          : source === "csv"
            ? "csv-import"
            : source;
  const leadExternalId = (source: LeadSource) =>
    source === "instagram" || source === "facebook"
      ? `${rng.int(1, 9)}${rng.digits(15)}`
      : source === "tiktok"
        ? `7${rng.digits(18)}`
        : source === "whatsapp"
          ? `wamid.HBgM${rng.digits(12)}FQIAEhgU${rng.digits(8)}`
          : newId();

  const makeLead = (input: {
    name: string;
    phone: string | null;
    email: string | null;
    source: LeadSource;
    receivedAt: string;
    treatmentKey: string;
    status: LeadStatus;
    assigneeId: string | null;
    companyName?: string | null;
  }): Lead => {
    const tr = treatment(input.treatmentKey);
    const simSource = input.source === "manual" || input.source === "csv" ? null : input.source;
    const message = simSource
      ? simulateEnquiry(rng, simSource, input.treatmentKey)
      : enquiryFor(input.treatmentKey);
    const formFields: Record<string, string> =
      input.source === "instagram" || input.source === "facebook" || input.source === "tiktok"
        ? {
            "Full name": input.name,
            "Phone number": formatPhone(input.phone),
            ...(input.email ? { Email: input.email } : {}),
            "Treatment of interest": tr.short.charAt(0).toUpperCase() + tr.short.slice(1),
            "Best time to call": rng.pick(["Morning", "Afternoon", "Evenings after 6 pm", "Weekends"]),
          }
        : {};
    const receivedMs = new Date(input.receivedAt).getTime();
    const lead: Lead = {
      ...row(input.receivedAt),
      source: input.source,
      isSimulated: true,
      adapter: leadAdapter(input.source),
      externalId: leadExternalId(input.source),
      rawPayload: null,
      name: input.name,
      phoneE164: input.phone,
      email: input.email,
      whatsappUserId: input.source === "whatsapp" ? `AE.${rng.digits(16)}` : null,
      companyName: input.companyName ?? null,
      message,
      formFields,
      campaignName: simSource ? campaignFor(simSource, input.treatmentKey) : null,
      status: input.status,
      disqualifyReason: null,
      disqualifyNote: null,
      assigneeId: input.assigneeId,
      matchedContactId: null,
      convertedContactId: null,
      convertedDealId: null,
      firstContactedAt:
        input.status === "new" ? null : iso(Math.min(nowMs, receivedMs + rng.int(4, 90) * MIN)),
      receivedAt: input.receivedAt,
      deletedAt: null,
    };
    t.leads.push(lead);
    return lead;
  };

  // -- Companies -------------------------------------------------------------------
  const companies: Company[] = COMPANIES.map((c, i) => {
    const created = ago((150 - i * 6) * DAY);
    const company: Company = {
      ...row(created),
      name: c.name,
      tradeLicenseNo: `${c.licensePrefix}-${rng.digits(6)}`,
      trn: `100${rng.digits(12)}`,
      emirate: c.emirate,
      jurisdiction: c.jurisdiction,
      freeZoneName: c.freeZoneName,
      website: c.website,
      address: c.address,
      industry: c.industry,
      assigneeId: user("manager").id,
      deletedAt: null,
    };
    t.companies.push(company);
    return company;
  });

  // -- Contacts ----------------------------------------------------------------------
  const makeContact = (input: {
    first: string;
    last: string;
    job: string | null;
    email: string;
    companyId: string | null;
    source: LeadSource;
    assigneeId: string | null;
    createdAt: string;
  }): Contact => {
    const phone = uaeMobile();
    const contact: Contact = {
      ...row(input.createdAt),
      firstName: input.first,
      lastName: input.last,
      phones: [{ e164: phone, label: "mobile", isWhatsapp: true }],
      primaryPhoneE164: phone,
      emails: [input.email],
      whatsappUserId: null,
      jobTitle: input.job,
      companyId: input.companyId,
      source: input.source,
      notes: null,
      assigneeId: input.assigneeId,
      deletedAt: null,
    };
    t.contacts.push(contact);
    return contact;
  };

  const patientContacts: Contact[] = PATIENTS.map((p, i) =>
    makeContact({
      first: p.first,
      last: p.last,
      job: p.job ?? null,
      email: `${slug(p.first)}.${slug(p.last)}@${rng.pick(["gmail.com", "outlook.com", "icloud.com", "yahoo.com"])}`,
      companyId: null,
      source: "manual",
      assigneeId: user(rng.pick(repKeys)).id,
      createdAt: ago((60 - i) * DAY),
    }),
  );
  const companyContacts: Contact[] = COMPANIES.map((c, i) =>
    makeContact({
      first: c.contact.first,
      last: c.contact.last,
      job: c.contact.job,
      email: `${slug(c.contact.first)}.${slug(c.contact.last)}@${c.website}`,
      companyId: must(companies[i], "company").id,
      source: rng.pick(["manual", "email"] as const),
      assigneeId: user("manager").id,
      createdAt: ago((140 - i * 6) * DAY),
    }),
  );
  const contactName = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(" ");

  // -- Deals, leads, transitions, conversations ----------------------------------------
  const conversationFor = new Map<string, Conversation>();
  const leadsBySourceConverted: Record<string, number> = {};
  let quoteSeq = 0;
  const quoteYear = now.getUTCFullYear();

  const addConversation = (input: {
    channel: "whatsapp" | "email";
    contact?: Contact | null;
    lead?: Lead | null;
    assigneeId: string | null;
    createdAt: string;
  }): Conversation => {
    const phone = input.contact?.primaryPhoneE164 ?? input.lead?.phoneE164 ?? null;
    const conv: Conversation = {
      ...row(input.createdAt),
      channel: input.channel,
      channelConnectionId: input.channel === "email" ? gmailConn.id : simulatorConn.id,
      participantPhoneE164: input.channel === "whatsapp" ? phone : null,
      participantEmail: input.channel === "email" ? (input.contact?.emails[0] ?? null) : null,
      participantWhatsappUserId: input.lead?.whatsappUserId ?? null,
      participantName: input.contact ? contactName(input.contact) : (input.lead?.name ?? null),
      contactId: input.contact?.id ?? null,
      leadId: input.contact ? null : (input.lead?.id ?? null),
      assigneeId: input.assigneeId,
      lastInboundAt: null,
      lastOutboundAt: null,
      lastMessageAt: null,
      lastMessagePreview: null,
      unreadCount: 0,
      serviceWindowExpiresAt: null,
      isSimulated: true,
    };
    t.conversations.push(conv);
    return conv;
  };

  const addMessages = (
    conv: Conversation,
    script: Array<{
      dir: "in" | "out";
      body: string;
      kind?: "text" | "template" | "document";
      subject?: string;
      quoteId?: string;
      templateVariables?: string[];
    }>,
    startMs: number,
    endMs: number,
    links: { leadId: string | null; contactId: string | null; dealId: string | null },
    senderId: string | null,
  ) => {
    const n = script.length;
    script.forEach((line, i) => {
      const ms = n === 1 ? endMs : Math.round(startMs + ((endMs - startMs) * i) / (n - 1));
      const occurredAt = iso(Math.min(ms, nowMs - MIN));
      const isLast = i === n - 1;
      const kind = line.kind ?? "text";
      const message: Message = {
        ...row(occurredAt),
        conversationId: conv.id,
        direction: line.dir,
        channel: conv.channel,
        kind,
        externalId:
          conv.channel === "whatsapp"
            ? `wamid.SIM${rng.digits(20)}`
            : `<${newId()}@mail.${CLINIC.emailDomain}>`,
        body: line.body,
        subject: line.subject ?? null,
        media:
          kind === "document"
            ? [
                {
                  kind: "document",
                  url: `demo://quotes/${line.quoteId ?? "quote"}.pdf`,
                  mimeType: "application/pdf",
                  fileName: `${line.body}.pdf`,
                  sizeBytes: rng.int(60_000, 140_000),
                  caption: "Your treatment plan and quotation",
                },
              ]
            : [],
        template:
          kind === "template"
            ? {
                templateId: firstTouchTemplate.id,
                name: firstTouchTemplate.name,
                language: "en",
                variables: line.templateVariables ?? [],
              }
            : null,
        quoteId: line.quoteId ?? null,
        status: line.dir === "in" ? "read" : isLast ? rng.pick(["delivered", "read"] as const) : "read",
        error: null,
        sentByUserId: line.dir === "out" ? senderId : null,
        occurredAt,
      };
      t.messages.push(message);
      const activityType: ActivityType =
        conv.channel === "email"
          ? line.dir === "in"
            ? "email_in"
            : "email_out"
          : line.dir === "in"
            ? "message_in"
            : "message_out";
      addActivity(
        activityType,
        occurredAt,
        links,
        line.subject ? `${line.subject}\n\n${line.body}` : line.body,
        line.dir === "out" ? senderId : null,
        { conversationId: conv.id, messageId: message.id, channel: conv.channel },
      );
      conv.lastMessageAt = occurredAt;
      conv.lastMessagePreview = kind === "document" ? `📄 ${line.body}.pdf` : line.body;
      conv.updatedAt = occurredAt;
      if (line.dir === "in") {
        conv.lastInboundAt = occurredAt;
        conv.serviceWindowExpiresAt = conv.channel === "whatsapp" ? serviceWindowExpiry(occurredAt) : null;
      } else {
        conv.lastOutboundAt = occurredAt;
      }
    });
    const last = script[n - 1];
    conv.unreadCount = last?.dir === "in" ? rng.int(1, 3) : 0;
  };

  type ChatLine = {
    dir: "in" | "out";
    body: string;
    kind?: "text" | "template" | "document";
    templateVariables?: string[];
  };
  const firstTouch = (first: string, treatmentShort: string, repFirst: string): ChatLine => ({
    dir: "out",
    kind: "template",
    body: firstTouchTemplate.body
      .replace("{{1}}", first)
      .replace("{{2}}", treatmentShort)
      .replace("{{3}}", repFirst),
    templateVariables: [first, treatmentShort, repFirst],
  });

  /** A WhatsApp thread that matches how far the deal got. Ad leads start with the first-touch template. */
  const chatScript = (input: {
    first: string;
    tr: Treatment;
    repFirst: string;
    stageKey: string;
    source: LeadSource;
    enquiry: string;
    waiting: boolean;
    idleDays: number;
    lostReason?: "price" | "competitor";
  }): ChatLine[] => {
    const { first, tr, repFirst, stageKey } = input;
    const fromAd = input.source === "instagram" || input.source === "facebook" || input.source === "tiktok";
    const lines: ChatLine[] = fromAd
      ? [firstTouch(first, tr.short, repFirst), { dir: "in", body: `Hi ${repFirst}. ${input.enquiry}` }]
      : [{ dir: "in", body: input.enquiry }];
    const invite: ChatLine = {
      dir: "out",
      body: fromAd
        ? `Happy to help, ${first}. Our doctor can see you for a free consultation this week and answer everything in person. Shall I book one for you?`
        : `Hi ${first}, this is ${repFirst} from ${CLINIC.shortName}. Thank you for asking about ${tr.short}. Would you like a free consultation with our doctor this week?`,
    };
    if (stageKey === "enquiry") {
      if (!input.waiting) lines.push(invite);
      else if (input.idleDays >= 3) lines.push({ dir: "in", body: rng.pick(NUDGES) });
      return lines;
    }
    const slot = rng.pick(BOOKING_SLOTS);
    lines.push(
      invite,
      { dir: "in", body: slot.ask },
      { dir: "out", body: slot.offer },
      { dir: "in", body: rng.pick(CONFIRMATIONS) },
      {
        dir: "out",
        body: `Done, you're booked for ${slot.when} at our Dubai Marina clinic. Parking is free in Marina Plaza, level B2.`,
      },
    );
    const depth = stageOrder.indexOf(stageKey);
    if (depth >= 2 && stageKey !== "lost") {
      lines.push(
        {
          dir: "out",
          body: `Hi ${first}, thank you for coming in today. Dr. Hessa has prepared your ${tr.short} plan and I'll send it over shortly.`,
        },
        { dir: "in", body: "Thank you! Is there an instalment option?" },
        { dir: "out", body: "Yes, 0% instalments over 6 or 12 months on most UAE bank credit cards." },
      );
    }
    if (stageKey === "won") {
      lines.push(
        { dir: "in", body: "I'd like to go ahead. Can we start next week?" },
        { dir: "out", body: "Wonderful! Your first session is booked for Monday at 10 am. See you then." },
      );
    }
    if (stageKey === "lost") {
      lines.push(
        {
          dir: "in",
          body:
            input.lostReason === "competitor"
              ? "Thanks, but I've decided to go with a clinic closer to home. They offered a package."
              : "Thank you, but it's above my budget for now. Maybe later in the year.",
        },
        {
          dir: "out",
          body: "Understood, thank you for letting us know. If anything changes, we're always happy to help.",
        },
      );
    }
    if (input.waiting && stageKey !== "enquiry") {
      const question = WAITING_QUESTIONS[stageKey];
      if (question) lines.push({ dir: "in", body: question });
    }
    return lines;
  };

  DEAL_PLAN.forEach((plan, index) => {
    const tr = treatment(plan.treatment);
    const assignee = user(plan.assignee);
    const contact =
      plan.company !== undefined
        ? must(companyContacts[plan.company], "company contact")
        : must(patientContacts[must(plan.patient, "patient index")], "patient contact");
    const company = plan.company !== undefined ? must(companies[plan.company], "company") : null;
    const target = stage(plan.stage);
    const depth = stageOrder.indexOf(plan.stage);
    const isClosed = target.type !== "open";
    const lastMs = nowMs - plan.days * DAY - rng.int(0, 50) * MIN;
    const pathKeys =
      plan.stage === "lost"
        ? ["enquiry", "booked", "lost"]
        : stageOrder.slice(0, Math.max(1, depth + 1)).filter((k) => k !== "lost");
    // Converted leads stay inside the dashboard's 30-day window.
    const spanDays = Math.min(1.5 + pathKeys.length * rng.int(2, 4), plan.fromLead ? 27 - plan.days : 60);
    const createdMs = lastMs - spanDays * DAY;
    const createdAt = iso(createdMs);
    const value = plan.valueAed
      ? toMoneyString(plan.valueAed)
      : computeQuoteTotals(tr.lineItems, "5.00").subtotalAed;
    const patientFirst = contact.firstName;
    const title =
      plan.title ?? `${tr.short.charAt(0).toUpperCase()}${tr.short.slice(1)} — ${contactName(contact)}`;

    contact.assigneeId = assignee.id;
    if (plan.fromLead) contact.source = plan.source;

    let lead: Lead | null = null;
    if (plan.fromLead) {
      const receivedAt = iso(createdMs - rng.int(2, 30) * HOUR);
      lead = makeLead({
        name: contactName(contact),
        phone: contact.primaryPhoneE164,
        email: contact.emails[0] ?? null,
        source: plan.source,
        receivedAt,
        treatmentKey: plan.treatment,
        status: "converted",
        assigneeId: assignee.id,
      });
      lead.firstContactedAt = iso(new Date(receivedAt).getTime() + rng.int(3, 12) * MIN);
      leadsBySourceConverted[plan.source] = (leadsBySourceConverted[plan.source] ?? 0) + 1;
      contact.createdAt = createdAt;
      contact.updatedAt = createdAt;
    }

    const deal: Deal = {
      ...row(createdAt, iso(lastMs)),
      title,
      contactId: contact.id,
      companyId: company?.id ?? null,
      pipelineId: pipeline.id,
      stageId: target.id,
      position: index,
      valueAed: value,
      expectedCloseDate: isClosed ? null : new Date(nowMs + rng.int(3, 35) * DAY).toISOString().slice(0, 10),
      assigneeId: assignee.id,
      source: plan.source,
      isSimulated: true,
      leadId: lead?.id ?? null,
      lostReason: plan.lostReason ?? null,
      lostNote:
        plan.lostReason === "competitor"
          ? "Chose a clinic in Al Barsha that offered a package discount."
          : null,
      closedAt: isClosed ? iso(lastMs) : null,
      lastActivityAt: iso(lastMs),
      deletedAt: null,
    };
    t.deals.push(deal);
    const links = { leadId: lead?.id ?? null, contactId: contact.id, dealId: deal.id };

    if (lead) {
      lead.convertedContactId = contact.id;
      lead.convertedDealId = deal.id;
      lead.updatedAt = createdAt;
      addActivity("system", createdAt, links, `Converted from ${plan.source} lead`, assignee.id, {
        kind: "lead_converted",
        source: plan.source,
      });
    } else {
      addActivity("system", createdAt, links, "Deal created", assignee.id, { kind: "deal_created" });
    }

    // Stage transitions spread between creation and the last activity.
    pathKeys.forEach((key, i) => {
      const at =
        i === 0 ? createdMs : createdMs + ((lastMs - createdMs) * i) / Math.max(1, pathKeys.length - 1);
      const toStage = stage(key);
      const fromStage = i === 0 ? null : stage(must(pathKeys[i - 1], "previous stage"));
      t.stageTransitions.push({
        ...row(iso(at)),
        dealId: deal.id,
        fromStageId: fromStage?.id ?? null,
        toStageId: toStage.id,
        byUserId: assignee.id,
        at: iso(at),
      });
      if (fromStage) {
        addActivity(
          "stage_change",
          iso(at),
          links,
          `Moved from ${fromStage.name} to ${toStage.name}`,
          assignee.id,
          {
            fromStageId: fromStage.id,
            toStageId: toStage.id,
            ...(toStage.type === "lost" ? { lostReason: plan.lostReason } : {}),
          },
        );
      }
    });

    if (rng.chance(0.6)) {
      addActivity("note", iso(createdMs + (lastMs - createdMs) * 0.4), links, rng.pick(NOTES), assignee.id);
    }
    if (depth >= 1 && rng.chance(0.7)) {
      addActivity("call", iso(createdMs + (lastMs - createdMs) * 0.55), links, rng.pick(CALLS), assignee.id, {
        durationMinutes: rng.int(2, 18),
      });
    }

    // Conversations: WhatsApp with patients, email with corporate contacts.
    if (company) {
      const conv = addConversation({ channel: "email", contact, assigneeId: user("manager").id, createdAt });
      const subject = title.replace(/^[^—]+— /, "");
      addMessages(
        conv,
        [
          {
            dir: "in",
            subject,
            body: `Dear Omar,\n\nWe'd like a proposal for ${subject.toLowerCase()} at our offices. Could you share options and dates for next month?\n\nBest regards,\n${contactName(contact)}`,
          },
          {
            dir: "out",
            subject: `Re: ${subject}`,
            body: `Dear ${patientFirst},\n\nThank you for thinking of ${CLINIC.shortName}. I've attached our corporate package and suggested dates. Happy to arrange a call this week.\n\nKind regards,\nOmar Farouk`,
          },
          ...(plan.days < 3
            ? [
                {
                  dir: "in" as const,
                  subject: `Re: ${subject}`,
                  body: "Thanks Omar, the dates work. Can you confirm the price per head includes the report for each employee?",
                },
              ]
            : []),
        ],
        createdMs + HOUR,
        lastMs,
        links,
        user("manager").id,
      );
      conversationFor.set(contact.id, conv);
    } else {
      const conv = addConversation({ channel: "whatsapp", contact, assigneeId: assignee.id, createdAt });
      const script = chatScript({
        first: patientFirst,
        tr,
        repFirst: firstName(assignee),
        stageKey: plan.stage,
        source: plan.source,
        enquiry: lead?.message ?? enquiryFor(tr.key),
        waiting: plan.waiting ?? false,
        idleDays: plan.days,
        lostReason: plan.lostReason,
      });
      const chatStartMs = lead?.firstContactedAt
        ? new Date(plan.source === "whatsapp" ? lead.receivedAt : lead.firstContactedAt).getTime()
        : createdMs;
      addMessages(conv, script, chatStartMs, lastMs, links, assignee.id);
      conversationFor.set(contact.id, conv);
    }

    // Quotes.
    if (plan.quote) {
      quoteSeq += 1;
      const totals = computeQuoteTotals(tr.lineItems, "5.00");
      const quoteCreated = iso(lastMs - (plan.quote === "draft" ? 2 * HOUR : 20 * HOUR));
      const quote = {
        ...row(quoteCreated, iso(lastMs)),
        dealId: deal.id,
        number: formatQuoteNumber(quoteYear, quoteSeq),
        lineItems: tr.lineItems.map((li) => ({ id: newId(), ...li })),
        subtotalAed: totals.subtotalAed,
        vatRate: "5.00",
        vatAmountAed: totals.vatAmountAed,
        totalAed: totals.totalAed,
        validUntil: new Date(new Date(quoteCreated).getTime() + 14 * DAY).toISOString().slice(0, 10),
        notes: "Price includes all follow-up visits within 3 months. Valid for 14 days.",
        status: plan.quote,
        sentAt: plan.quote === "draft" ? null : iso(lastMs - 18 * HOUR),
        sentVia: plan.quote === "draft" ? null : ("whatsapp" as const),
        pdfUrl: null,
        createdByUserId: assignee.id,
      };
      t.quotes.push(quote);
      deal.valueAed = totals.subtotalAed;
      if (quote.sentAt) {
        addActivity(
          "quote_sent",
          quote.sentAt,
          links,
          `Quote ${quote.number} sent on WhatsApp — ${totals.totalAed} AED incl. VAT`,
          assignee.id,
          {
            quoteId: quote.id,
            via: "whatsapp",
          },
        );
        const conv = conversationFor.get(contact.id);
        if (conv) {
          t.messages.push({
            ...row(quote.sentAt),
            conversationId: conv.id,
            direction: "out",
            channel: "whatsapp",
            kind: "document",
            externalId: `wamid.SIM${rng.digits(20)}`,
            body: quote.number,
            subject: null,
            media: [
              {
                kind: "document",
                url: `demo://quotes/${quote.id}.pdf`,
                mimeType: "application/pdf",
                fileName: `${quote.number}.pdf`,
                sizeBytes: rng.int(60_000, 140_000),
                caption: "Your treatment plan and quotation",
              },
            ],
            template: null,
            quoteId: quote.id,
            status: "read",
            error: null,
            sentByUserId: assignee.id,
            occurredAt: quote.sentAt,
          });
        }
      }
    }
  });

  // -- Unconverted leads ------------------------------------------------------------------
  const reps = repKeys.map((k) => user(k));
  let rr = 0;
  const treatmentKeys = TREATMENTS.map((x) => x.key);
  const treatmentOfLead = new Map<string, string>();
  const freshLeadIds = new Set<string>();
  // Varied names: no repeated full names and each first name at most twice.
  const usedNames = new Set(t.contacts.map(contactName));
  const firstNameCount = new Map<string, number>();
  const uniquePerson = (treatmentKey: string) => {
    for (let attempt = 0; ; attempt++) {
      const person = simulatePerson(rng, treatmentKey);
      const firstUses = firstNameCount.get(person.firstName) ?? 0;
      if ((!usedNames.has(person.name) && firstUses < 2) || attempt > 12) {
        usedNames.add(person.name);
        firstNameCount.set(person.firstName, firstUses + 1);
        return person;
      }
    }
  };
  for (const source of Object.keys(LEAD_TARGETS) as LeadSource[]) {
    const remaining = LEAD_TARGETS[source] - (leadsBySourceConverted[source] ?? 0);
    const fresh = FRESH_LEADS.filter((f) => f.source === source);
    for (let i = 0; i < remaining; i++) {
      const pinned = fresh[i];
      // Skew towards recent days.
      const ageDays = pinned ? pinned.minutesAgo / (24 * 60) : Math.pow(rng.next(), 1.8) * 30;
      const receivedMs = pinned
        ? nowMs - pinned.minutesAgo * MIN
        : nowMs - ageDays * DAY - rng.int(0, 59) * MIN;
      let status: LeadStatus;
      let reason: DisqualifyReason | null = null;
      const roll = rng.next();
      if (pinned) status = "new";
      else if (ageDays < 1) status = roll < 0.25 ? "new" : "contacted";
      else if (source === "tiktok")
        status = roll < 0.6 ? "disqualified" : roll < 0.9 ? "contacted" : "qualified";
      else if (ageDays < 7) status = roll < 0.5 ? "contacted" : roll < 0.7 ? "qualified" : "disqualified";
      else status = roll < 0.55 ? "disqualified" : roll < 0.85 ? "contacted" : "qualified";
      if (status === "disqualified") {
        reason =
          source === "tiktok"
            ? rng.pick(["not_interested", "spam", "wrong_number", "not_interested"] as const)
            : rng.pick(["not_interested", "out_of_area", "duplicate", "other"] as const);
      }
      const assignee = pinned
        ? user(pinned.rep)
        : ageDays < 0.1 && rng.chance(0.3)
          ? null
          : must(reps[rr++ % reps.length], "rep");
      const simSource: SimulatorLeadSource | null = source === "manual" || source === "csv" ? null : source;
      const treatmentKey = simSource ? simulateTreatmentKey(rng, simSource) : rng.pick(treatmentKeys);
      const person = uniquePerson(treatmentKey);
      const lead = makeLead({
        name: person.name,
        phone: uaeMobile(),
        email: null,
        source,
        receivedAt: iso(receivedMs),
        treatmentKey,
        status,
        assigneeId: assignee?.id ?? null,
      });
      if (simSource) {
        // Form answers, enquiry and ids exactly as the Simulator produces them for this person.
        const sim = simulateLead(rng, {
          source: simSource,
          usedPhones,
          now: new Date(receivedMs),
          phoneE164: lead.phoneE164,
          treatmentKey,
          person,
        });
        lead.email = sim.email;
        lead.message = sim.message;
        lead.formFields = sim.formFields;
        lead.campaignName = sim.campaignName;
        lead.externalId = sim.externalId;
        lead.rawPayload = sim.rawPayload;
      } else if (rng.chance(0.5)) {
        lead.email = `${slug(person.firstName)}.${slug(person.lastName)}@${rng.pick(["gmail.com", "hotmail.com", "icloud.com"])}`;
      }
      treatmentOfLead.set(lead.id, treatmentKey);
      if (pinned) freshLeadIds.add(lead.id);
      lead.disqualifyReason = reason;
      if (status !== "new") {
        lead.updatedAt = lead.firstContactedAt ?? lead.updatedAt;
      }
      if (assignee) {
        addActivity("system", lead.receivedAt, { leadId: lead.id }, `Assigned to ${assignee.name}`, null, {
          kind: "assigned",
          assigneeId: assignee.id,
          strategy: "round_robin",
        });
      }
      if (lead.firstContactedAt && assignee) {
        addActivity("call", lead.firstContactedAt, { leadId: lead.id }, rng.pick(CALLS), assignee.id, {
          durationMinutes: rng.int(1, 9),
        });
      }
      if (status === "disqualified" && assignee) {
        addActivity(
          "system",
          lead.updatedAt,
          { leadId: lead.id },
          `Disqualified: ${reason?.replace(/_/g, " ")}`,
          assignee.id,
          {
            kind: "lead_status",
            status,
            reason,
          },
        );
      }
    }
  }

  // A returning patient: new Instagram lead that matches an existing contact.
  const returning = must(patientContacts[6], "returning patient");
  const returningLead = makeLead({
    name: contactName(returning),
    phone: returning.primaryPhoneE164,
    email: returning.emails[0] ?? null,
    source: "instagram",
    receivedAt: ago(3 * HOUR),
    treatmentKey: "botox",
    status: "new",
    assigneeId: returning.assigneeId,
  });
  returningLead.matchedContactId = returning.id;

  // WhatsApp conversations for recent leads: some unanswered, some waiting on a template reply.
  // Fresh ad leads have no conversation yet: nobody has replied to them.
  const recentLeads = t.leads
    .filter((l) => l.status === "new" || l.status === "contacted")
    .filter((l) => l.phoneE164 && l.matchedContactId === null && l.convertedContactId === null)
    .filter((l) => !freshLeadIds.has(l.id) || l.source === "whatsapp")
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 7);
  recentLeads.forEach((lead, i) => {
    const receivedMs = new Date(lead.receivedAt).getTime();
    const conv = addConversation({
      channel: "whatsapp",
      lead,
      assigneeId: lead.assigneeId,
      createdAt: lead.receivedAt,
    });
    const assignee = t.users.find((u) => u.id === lead.assigneeId) ?? null;
    const links = { leadId: lead.id, contactId: null, dealId: null };
    if (lead.source === "whatsapp" || i % 3 === 0) {
      addMessages(
        conv,
        [{ dir: "in", body: lead.message ?? "Hello, I'd like more information." }],
        receivedMs,
        receivedMs,
        links,
        null,
      );
    } else {
      const first = lead.name.split(" ")[0] ?? lead.name;
      const repFirst = assignee ? firstName(assignee) : "the team";
      const tr = treatment(treatmentOfLead.get(lead.id) ?? rng.pick(treatmentKeys));
      const sentMs = receivedMs + 6 * MIN;
      if (lead.status === "new") {
        lead.status = "contacted";
        lead.updatedAt = iso(sentMs);
      }
      if (!lead.firstContactedAt || lead.firstContactedAt > iso(sentMs)) lead.firstContactedAt = iso(sentMs);
      addMessages(
        conv,
        [
          {
            dir: "out",
            kind: "template",
            body: firstTouchTemplate.body
              .replace("{{1}}", first)
              .replace("{{2}}", tr.short)
              .replace("{{3}}", repFirst),
            templateVariables: [first, tr.short, repFirst],
          },
        ],
        sentMs,
        sentMs,
        links,
        assignee?.id ?? null,
      );
    }
  });

  // -- Contacts' last-touch bookkeeping ------------------------------------------------------
  for (const contact of t.contacts) {
    const latest = t.activities
      .filter((a) => a.contactId === contact.id)
      .reduce<string | null>((max, a) => (max === null || a.occurredAt > max ? a.occurredAt : max), null);
    if (latest && latest > contact.updatedAt) contact.updatedAt = latest;
  }

  // -- Tasks ---------------------------------------------------------------------------------
  for (const lead of t.leads.filter((l) => l.status === "new" && l.assigneeId)) {
    const due = new Date(new Date(lead.receivedAt).getTime() + 15 * MIN).toISOString();
    addTask(
      {
        title: `Contact ${lead.name} within 15 minutes`,
        dueAt: due,
        assigneeId: must(lead.assigneeId ?? undefined, "lead assignee"),
        leadId: lead.id,
        contactId: lead.matchedContactId,
        dealId: null,
        status: "open",
        completedAt: null,
        origin: "auto_lead",
      },
      lead.receivedAt,
    );
  }
  const dealByTitle = (fragment: string) =>
    must(
      t.deals.find((d) => d.title.includes(fragment)),
      `deal ${fragment}`,
    );
  // 09:00 today in Asia/Dubai (UTC+4 all year).
  const today9 = new Date(`${new Date(nowMs + 4 * HOUR).toISOString().slice(0, 10)}T05:00:00.000Z`);
  const manualTasks: Array<{ title: string; deal: Deal; dueMs: number }> = [
    {
      title: "Send the Invisalign treatment plan",
      deal: dealByTitle("Invisalign — Rania"),
      dueMs: today9.getTime() + 8 * HOUR,
    },
    {
      title: "Confirm implant consultation time",
      deal: dealByTitle("Dental implants — Khalid"),
      dueMs: today9.getTime() + DAY + 2 * HOUR,
    },
    {
      title: "Follow up on the veneers quote",
      deal: dealByTitle("Porcelain veneers — Shirin"),
      dueMs: today9.getTime() - DAY,
    },
    {
      title: "Confirm screening dates with Gulf Horizon HR",
      deal: dealByTitle("Gulf Horizon"),
      dueMs: today9.getTime() + 3 * DAY,
    },
    {
      title: "Share corporate price list with Palm Crest",
      deal: dealByTitle("Palm Crest"),
      dueMs: today9.getTime() + 4 * HOUR,
    },
  ];
  for (const mt of manualTasks) {
    addTask(
      {
        title: mt.title,
        dueAt: iso(mt.dueMs),
        assigneeId: must(mt.deal.assigneeId ?? undefined, "deal assignee"),
        leadId: null,
        contactId: mt.deal.contactId,
        dealId: mt.deal.id,
        status: "open",
        completedAt: null,
        origin: "manual",
      },
      ago(2 * DAY),
    );
  }
  for (const deal of t.deals) {
    const st = t.stages.find((s) => s.id === deal.stageId);
    if (st?.type !== "open") continue;
    const idleDays = (nowMs - new Date(deal.lastActivityAt).getTime()) / DAY;
    if (idleDays < ws.staleAfterDays) continue;
    addTask(
      {
        title: `Follow up: no activity for ${Math.floor(idleDays)} days`,
        dueAt: iso(today9.getTime()),
        assigneeId: must(deal.assigneeId ?? undefined, "deal assignee"),
        leadId: null,
        contactId: deal.contactId,
        dealId: deal.id,
        status: "open",
        completedAt: null,
        origin: "auto_stale",
      },
      iso(today9.getTime() - 3 * HOUR),
    );
  }
  // A few completed tasks for rep activity stats.
  for (const deal of t.deals.slice(0, 12)) {
    if (!deal.assigneeId || !rng.chance(0.6)) continue;
    const completedMs = nowMs - rng.int(1, 6) * DAY - rng.int(0, 8) * HOUR;
    const task = addTask(
      {
        title: rng.pick([
          "Send consultation reminder",
          "Share aftercare instructions",
          "Call to confirm booking",
        ]),
        dueAt: iso(completedMs + 2 * HOUR),
        assigneeId: deal.assigneeId,
        leadId: deal.leadId,
        contactId: deal.contactId,
        dealId: deal.id,
        status: "done",
        completedAt: iso(completedMs),
        origin: "manual",
      },
      iso(completedMs - DAY),
    );
    addActivity(
      "task_done",
      iso(completedMs),
      { contactId: deal.contactId, dealId: deal.id },
      task.title,
      deal.assigneeId,
      {
        taskId: task.id,
      },
    );
  }

  // -- Notifications -------------------------------------------------------------------------
  const notify = (
    userId: string,
    type: Tables["notifications"][number]["type"],
    title: string,
    body: string | null,
    href: string | null,
    createdAt: string,
    read: boolean,
  ) => {
    t.notifications.push({
      ...row(createdAt),
      userId,
      type,
      title,
      body,
      href,
      readAt: read ? createdAt : null,
    });
  };
  for (const lead of t.leads.filter(
    (l) => l.assigneeId && nowMs - new Date(l.receivedAt).getTime() < 2 * DAY,
  )) {
    const isRecent = nowMs - new Date(lead.receivedAt).getTime() < 8 * HOUR;
    notify(
      must(lead.assigneeId ?? undefined, "assignee"),
      "lead_assigned",
      `New ${lead.source === "whatsapp" ? "WhatsApp" : lead.source.charAt(0).toUpperCase() + lead.source.slice(1)} lead: ${lead.name}`,
      lead.message,
      `/leads/${lead.id}`,
      lead.receivedAt,
      !isRecent,
    );
  }
  for (const conv of t.conversations.filter((c) => c.unreadCount > 0 && c.assigneeId && c.lastMessageAt)) {
    notify(
      must(conv.assigneeId ?? undefined, "assignee"),
      "message_received",
      `${conv.participantName ?? "New message"}`,
      conv.lastMessagePreview,
      `/inbox/${conv.id}`,
      must(conv.lastMessageAt ?? undefined, "last message"),
      false,
    );
  }
  for (const task of t.tasks.filter((x) => x.origin === "auto_stale")) {
    const deal = t.deals.find((d) => d.id === task.dealId);
    if (deal)
      notify(
        task.assigneeId,
        "deal_stale",
        `Deal going cold: ${deal.title}`,
        task.title,
        `/deals/${deal.id}`,
        task.createdAt,
        false,
      );
  }

  // Quote numbers follow creation order.
  [...t.quotes]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((q, i) => {
      const next = formatQuoteNumber(quoteYear, i + 1);
      for (const a of t.activities) {
        if (a.type === "quote_sent" && a.metadata["quoteId"] === q.id && a.body)
          a.body = a.body.replace(q.number, next);
      }
      for (const m of t.messages) {
        if (m.quoteId === q.id) {
          m.body = next;
          for (const media of m.media) media.fileName = `${next}.pdf`;
        }
      }
      q.number = next;
    });

  // -- Counters, assignment -------------------------------------------------------------------
  t.quoteCounters.push({ workspaceId: ws.id, year: quoteYear, lastNumber: quoteSeq });
  t.assignmentRules.push({
    ...row(workspaceCreated, ago(1 * HOUR)),
    strategy: "round_robin",
    eligibleUserIds: reps.map((r) => r.id),
    // Maria was last, so the first simulated lead goes to Priya, as the demo panel's script says.
    lastAssignedUserId: user("maria").id,
  });

  // Order deals inside each column by recency.
  for (const st of t.stages) {
    t.deals
      .filter((d) => d.stageId === st.id)
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .forEach((d, i) => {
        d.position = i;
      });
  }

  return t;
}
