import {
  computeQuoteTotals,
  formatAed,
  formatQuoteNumber,
  serviceWindowExpiry,
  toMoneyString,
} from "@hco/core";
import { DEFAULT_QUOTE_VALIDITY_DAYS } from "@hco/core/quotes/index";
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
  intakesFor,
  simulateEnquiry,
  simulateFormAnswers,
  simulateLead,
  simulatePerson,
  simulateTreatmentKey,
  simulateUaeMobile,
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

/** Source names as the live mock writes them into activity text. */
const SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  email: "email",
  manual: "manual",
  csv: "CSV",
};

/** Disqualify reasons as the live mock writes them into activity text. */
const DISQUALIFY_LABEL: Record<DisqualifyReason, string> = {
  spam: "spam",
  wrong_number: "wrong number",
  not_interested: "not interested",
  out_of_area: "not eligible",
  duplicate: "duplicate",
  other: "other reason",
};

/**
 * Replaces a seeded lead's random enquiry with a fixed one, so a hero's chat fits their profile. The form's
 * preferred intake follows the new text when it names one. Uses no randomness, so the seed stays stable.
 */
function pinEnquiry(lead: Lead, treatmentKey: string, message: string) {
  lead.message = message;
  const intake = lead.formFields["Preferred intake"];
  if (intake === undefined) return;
  const said = message.toLowerCase();
  const named = intakesFor(treatmentKey).find((i) => said.includes(i.split(" ")[0]?.toLowerCase() ?? i));
  if (named) lead.formFields["Preferred intake"] = named;
}

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

type RepKey = "hamza" | "mahnoor" | "usman" | "manager";

/** Leads that arrived minutes ago, so Leads opens with a live speed-to-lead countdown. */
const FRESH_LEADS: Array<{ source: LeadSource; minutesAgo: number; rep: "hamza" | "mahnoor" | "usman" }> = [
  { source: "instagram", minutesAgo: 6, rep: "hamza" },
  { source: "tiktok", minutesAgo: 24, rep: "mahnoor" },
  { source: "facebook", minutesAgo: 41, rep: "usman" },
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
  /** The student wrote last and is waiting for a reply (shows under "Waiting for your reply" on Today). */
  waiting?: boolean;
  /** Pins the lead's enquiry so the hero chats fit the student's profile (random from COPY otherwise). */
  enquiry?: string;
}

const DEAL_PLAN: DealPlan[] = [
  // New enquiry
  {
    patient: 0,
    treatment: "uk",
    stage: "enquiry",
    source: "instagram",
    fromLead: true,
    days: 0.15,
    assignee: "hamza",
    waiting: true,
    enquiry: "Is the January intake still open? I want MSc Data Science, BS CS with CGPA 3.2",
  },
  {
    patient: 1,
    treatment: "usa",
    stage: "enquiry",
    source: "instagram",
    fromLead: true,
    days: 0.5,
    assignee: "mahnoor",
    waiting: true,
    enquiry: "A-levels ke baad US undergrad ke liye scholarships milti hain? SAT abhi nahi diya",
  },
  {
    patient: 10,
    treatment: "canada",
    stage: "enquiry",
    source: "facebook",
    fromLead: true,
    days: 4,
    assignee: "usman",
    waiting: true,
    enquiry:
      "Canada mein college diploma ka total kharcha kitna hai, GIC included? A-levels is saal complete honge",
  },
  {
    patient: 13,
    treatment: "australia",
    stage: "enquiry",
    source: "whatsapp",
    fromLead: true,
    days: 5,
    assignee: "hamza",
    waiting: true,
  },
  {
    company: 3,
    treatment: "ielts",
    stage: "enquiry",
    source: "manual",
    fromLead: false,
    days: 1.5,
    assignee: "manager",
    title: "Ravi Crescent — on-campus IELTS batch, 12 A-level students",
    valueAed: "240000",
  },
  {
    patient: 19,
    treatment: "pte",
    stage: "enquiry",
    source: "instagram",
    fromLead: true,
    days: 0.8,
    assignee: "usman",
    waiting: true,
  },
  // Counselling done
  {
    patient: 2,
    treatment: "canada",
    stage: "counselled",
    source: "whatsapp",
    fromLead: true,
    days: 0.3,
    assignee: "mahnoor",
  },
  {
    patient: 6,
    treatment: "ielts",
    stage: "counselled",
    source: "instagram",
    fromLead: true,
    days: 1.2,
    assignee: "hamza",
  },
  {
    patient: 7,
    treatment: "germany",
    stage: "counselled",
    source: "instagram",
    fromLead: true,
    days: 0.4,
    assignee: "hamza",
    quote: "draft",
  },
  // Documents collected
  {
    patient: 23,
    treatment: "uk",
    stage: "documents",
    source: "instagram",
    fromLead: true,
    days: 0.7,
    assignee: "usman",
    quote: "sent",
  },
  {
    patient: 8,
    treatment: "usa",
    stage: "documents",
    source: "facebook",
    fromLead: true,
    days: 1,
    assignee: "mahnoor",
    quote: "sent",
  },
  {
    company: 0,
    treatment: "uk",
    stage: "documents",
    source: "email",
    fromLead: false,
    days: 6,
    assignee: "manager",
    title: "Indus Loom — MS sponsorship, 2 engineers (UK)",
    valueAed: "250000",
  },
  // Applied to university
  {
    patient: 20,
    treatment: "uk",
    stage: "applied",
    source: "manual",
    fromLead: false,
    days: 7,
    assignee: "mahnoor",
    waiting: true,
  },
  {
    patient: 4,
    treatment: "australia",
    stage: "applied",
    source: "whatsapp",
    fromLead: true,
    days: 2.5,
    assignee: "usman",
  },
  {
    company: 4,
    treatment: "germany",
    stage: "applied",
    source: "email",
    fromLead: false,
    days: 1,
    assignee: "manager",
    title: "Clifton Codeworks — MS in Germany, 2 developers",
    valueAed: "225000",
  },
  // Offer received
  {
    patient: 11,
    treatment: "canada",
    stage: "offer",
    source: "manual",
    fromLead: false,
    days: 3.5,
    assignee: "hamza",
  },
  {
    company: 1,
    treatment: "malaysia",
    stage: "offer",
    source: "manual",
    fromLead: false,
    days: 2,
    assignee: "manager",
    title: "Sportsline — MBA sponsorship, 2 managers (Malaysia)",
    valueAed: "120000",
  },
  // Visa filed
  {
    patient: 16,
    treatment: "ireland",
    stage: "visa_filed",
    source: "manual",
    fromLead: false,
    days: 2,
    assignee: "usman",
  },
  {
    patient: 22,
    treatment: "germany",
    stage: "visa_filed",
    source: "facebook",
    fromLead: true,
    days: 0.6,
    assignee: "mahnoor",
  },
  // Visa approved
  {
    patient: 3,
    treatment: "uk",
    stage: "won",
    source: "instagram",
    fromLead: true,
    days: 1,
    assignee: "hamza",
    quote: "accepted",
    enquiry: "Is the January intake still open? I want an MSc in Public Health after MBBS",
  },
  {
    patient: 9,
    treatment: "canada",
    stage: "won",
    source: "instagram",
    fromLead: true,
    days: 8,
    assignee: "mahnoor",
  },
  {
    patient: 5,
    treatment: "malaysia",
    stage: "won",
    source: "facebook",
    fromLead: true,
    days: 12,
    assignee: "usman",
    enquiry: "Is Malaysia a good option on a low budget? FSc done, want BS CS",
  },
  {
    patient: 14,
    treatment: "australia",
    stage: "won",
    source: "whatsapp",
    fromLead: true,
    days: 18,
    assignee: "hamza",
  },
  // Lost
  {
    patient: 17,
    treatment: "usa",
    stage: "lost",
    source: "manual",
    fromLead: false,
    days: 6,
    assignee: "mahnoor",
    lostReason: "price",
  },
  {
    patient: 21,
    treatment: "uk",
    stage: "lost",
    source: "manual",
    fromLead: false,
    days: 15,
    assignee: "usman",
    lostReason: "competitor",
  },
];

const NOTES = [
  "Prefers a call after 5 pm; busy with classes or work during the day.",
  "Father is the sponsor (runs a pharmacy in Gujranwala). Bank statement will be in his name.",
  "Referred by a friend who got her UK visa through SBC last year.",
  "IELTS 6.5 overall, writing 6.0. Advised a retake for 7.0 to widen the university options.",
  "CGPA 3.1/4.0 with a two-year gap after graduation. Needs an experience letter to explain it.",
  "Previous UK refusal in 2024 (funds not held for 28 days). Must be declared on the new application.",
  "Compared our fee with an agent in Johar Town. Values the visa file review and the mock interview.",
  "HEC degree attestation still pending. Booked the next available slot.",
];

const BOOKING_SLOTS = [
  {
    ask: "Yes please. Kya Thursday shaam ko ho sakta hai?",
    offer: "Thursday at 5:30 pm is free with Ayesha, our head of counselling. Shall I book it?",
    when: "Thursday at 5:30 pm",
    where: "at our Gulberg office, 2nd Floor, 88-B Main Boulevard",
  },
  {
    ask: "Yes please. Saturday morning would be best, weekdays are busy for me",
    offer: "Saturday at 11 am is available. Shall I book it for you?",
    when: "Saturday at 11 am",
    where: "at our Gulberg office, 2nd Floor, 88-B Main Boulevard",
  },
  {
    ask: "Sure. Can we do it on a video call? I'm not based in Lahore",
    offer: "Of course. Tuesday at 4 pm on a WhatsApp video call, would that work?",
    when: "Tuesday at 4 pm",
    where: "on a WhatsApp video call. I'll send the link 10 minutes before",
  },
];

const CONFIRMATIONS = [
  "Perfect, please book it",
  "Ji theek hai, book kar dein. Thank you",
  "Great, see you then",
];

const NUDGES = ["Hello? Any update on the fee?", "AoA, just following up on my message above"];

/** Last message from a student who is still waiting for a reply, by stage. */
const WAITING_QUESTIONS: Record<string, string> = {
  counselled: "Can I bring my father to the next session? He will be my sponsor.",
  documents: "Does the bank statement need to be in my name or my father's? Abhi abbu ke naam pe hai.",
  applied:
    "Any update from the universities? It's been two weeks and my friends have got their offers already.",
  offer: "The offer letter asks for a deposit. Should I pay it before the visa file or after?",
  visa_filed: "Kya visa ka koi update aaya? Biometrics were done last Tuesday.",
};

const CALLS = [
  "Called to confirm the counselling session. Student confirmed and will bring the sponsor's documents.",
  "Called, no answer. Sent a WhatsApp instead.",
  "Went through the university shortlist and total cost for 20 minutes with the student and a parent.",
  "Quick call to explain the bank statement and funds requirements.",
];

/** Notes and calls on deals with corporate clients. */
const CORPORATE_NOTES = [
  "HR wants one invoice for all nominees, with sales tax shown separately.",
  "Nominees sign a two-year service bond. The company pays our fee; embassy fees are on the employees.",
  "Decision sits with the CEO. HR expects approval after the next board meeting.",
];

const CORPORATE_CALLS = [
  "Call with HR to agree the nominee list and the intake.",
  "Called, no answer. Sent an email instead.",
  "Walked HR through the timeline from applications to visa, 25 minutes.",
];

/** Notes and calls on test-prep batches that colleges buy for their students. */
const COLLEGE_NOTES = [
  "Principal wants classes after school hours, three days a week.",
  "The college pays the fee; mock test fees are included.",
];

const COLLEGE_CALLS = ["Call with the head of A-levels to agree batch size and timings."];

/** Chat wording for test prep and paperwork services. */
const PREP_COPY: Record<string, { session: string; result: string }> = {
  ielts: {
    session: "a free placement test",
    result:
      "Your placement test puts you at 6.0, and the 8-week IELTS course should get you to 7.0. I'll send the batch timings shortly.",
  },
  pte: {
    session: "a free diagnostic test",
    result:
      "Your diagnostic test puts you at PTE 52, and the 6-week course should get you to 65. I'll send the batch timings shortly.",
  },
  sop: {
    session: "a free profile review",
    result: "I'll send the SOP questionnaire and the attestation checklist shortly.",
  },
};

/** Destination wording for the chats, per study-visa service. */
const DESTINATION: Record<string, { country: string; confirmation: string; filed: string }> = {
  uk: {
    country: "the UK",
    confirmation: "request your CAS",
    filed:
      "Your UK Student visa file is submitted and biometrics are booked at the visa application centre in Lahore.",
  },
  canada: {
    country: "Canada",
    confirmation: "open your GIC and start the study permit file",
    filed:
      "Your study permit application is submitted and biometrics are booked at the visa application centre in Lahore.",
  },
  australia: {
    country: "Australia",
    confirmation: "request your CoE",
    filed: "Your Subclass 500 application is lodged and your health check is booked for next week.",
  },
  usa: {
    country: "the USA",
    confirmation: "request your I-20",
    filed:
      "Your DS-160 is done, the SEVIS fee is paid and your F-1 interview is booked at the US Embassy in Islamabad.",
  },
  germany: {
    country: "Germany",
    confirmation: "open your blocked account",
    filed: "Your national visa file is submitted at the German Embassy in Islamabad.",
  },
  ireland: {
    country: "Ireland",
    confirmation: "pay the deposit and start the visa file",
    filed:
      "Your Ireland study visa application is submitted and biometrics are booked at the visa application centre in Lahore.",
  },
  malaysia: {
    country: "Malaysia",
    confirmation: "start your EMGS visa approval",
    filed: "Your EMGS application is submitted. Approval usually takes three to four weeks.",
  },
};

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
    currency: "PKR" as const,
    vatRate: CLINIC.vatRate,
    trn: CLINIC.trn,
    timezone: CLINIC.timezone,
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
  const repKeys = ["hamza", "mahnoor", "usman"] as const;
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
  const uaeMobile = () => simulateUaeMobile(rng, usedPhones);
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
    rng.pick(ENQUIRIES[key] ?? ["AoA, I'd like to know more about studying abroad."]);

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
    const simSource = input.source === "manual" || input.source === "csv" ? null : input.source;
    const message = simSource
      ? simulateEnquiry(rng, simSource, input.treatmentKey)
      : enquiryFor(input.treatmentKey);
    const formFields: Record<string, string> =
      simSource === "instagram" || simSource === "facebook" || simSource === "tiktok"
        ? simulateFormAnswers(rng, {
            source: simSource,
            name: input.name,
            phoneE164: input.phone,
            email: input.email,
            treatmentKey: input.treatmentKey,
            message,
          })
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
      whatsappUserId: input.source === "whatsapp" ? `PK.${rng.digits(16)}` : null,
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
      // SECP registration number (7 digits) and NTN (7 digits and a check digit).
      tradeLicenseNo: `${c.licensePrefix}${rng.digits(7 - c.licensePrefix.length)}`,
      trn: `${rng.int(1, 9)}${rng.digits(7)}`,
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
      email: `${slug(p.first)}.${slug(p.last)}@${rng.pick(["gmail.com", "gmail.com", "outlook.com", "yahoo.com"])}`,
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
                  caption: "Your SBC quotation",
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
    const managerFirst = firstName(user("manager"));
    const destination = DESTINATION[tr.key];
    const fromAd = input.source === "instagram" || input.source === "facebook" || input.source === "tiktok";
    const lines: ChatLine[] = fromAd
      ? [
          firstTouch(first, tr.short, repFirst),
          {
            dir: "in",
            body: `${rng.pick(["Walaikum Assalam", "W.salam", "Hi"])} ${repFirst}. ${input.enquiry}`,
          },
        ]
      : [{ dir: "in", body: input.enquiry }];
    const prep = PREP_COPY[tr.key] ?? PREP_COPY["ielts"];
    const session = destination ? "a free counselling session" : prep?.session;
    const invite: ChatLine = {
      dir: "out",
      body: fromAd
        ? destination
          ? `Happy to help, ${first}. The first counselling session is free: we go through your grades, budget and the right universities in ${destination.country}. Shall I book one for you?`
          : `Happy to help, ${first}. We can do ${session} this week so you know exactly where you stand. Shall I book one for you?`
        : `AoA ${first}, this is ${repFirst} from ${CLINIC.shortName}. Thank you for your ${tr.short} enquiry. Would you like ${session} this week?`,
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
        body: `Done, you're booked for ${slot.when} ${slot.where}. Please keep your transcripts, passport and any IELTS or PTE result handy.`,
      },
    );
    // Counselling done: every deal past the first stage, lost ones included.
    lines.push(
      destination
        ? {
            dir: "out",
            body: `Thank you for your time today, ${first}. ${managerFirst} has shortlisted ${rng.int(3, 5)} universities in ${destination.country} for you and I'll send the document checklist shortly.`,
          }
        : { dir: "out", body: `Thank you for coming in today, ${first}. ${prep?.result ?? ""}` },
      { dir: "in", body: "JazakAllah! Can the fee be paid in two instalments?" },
      {
        dir: "out",
        body: destination
          ? "Yes: half when we open your file and half once your offer letter arrives."
          : "Yes: half at admission and half in week four.",
      },
    );
    const depth = stageOrder.indexOf(stageKey);
    const reached = (key: string) => stageKey !== "lost" && depth >= stageOrder.indexOf(key);
    if (reached("documents")) {
      lines.push(
        {
          dir: "in",
          body: "Sent my transcripts, degree and passport scans. Bank statement next week InshaAllah.",
        },
        {
          dir: "out",
          body: "Received, thank you. Only the bank statement and your sponsor's affidavit are left.",
        },
      );
    }
    if (reached("applied") && destination) {
      lines.push(
        { dir: "in", body: "AoA, have the applications gone in?" },
        {
          dir: "out",
          body: `Yes: your applications are submitted to 3 universities in ${destination.country}. Decisions usually take 2 to 4 weeks.`,
        },
      );
    }
    if (reached("offer") && destination) {
      lines.push(
        {
          dir: "out",
          body: `Mubarak ho, ${first}! Your offer has arrived from your first-choice university.`,
        },
        { dir: "in", body: "Alhamdulillah! What do I need to do now?" },
        {
          dir: "out",
          body: `Next we ${destination.confirmation}. I'll send you the steps today.`,
        },
      );
    }
    if (reached("visa_filed") && destination) {
      lines.push({ dir: "out", body: destination.filed });
    }
    if (stageKey === "won") {
      lines.push(
        { dir: "in", body: "Visa approved! Alhamdulillah, thank you so much SBC team." },
        {
          dir: "out",
          body: `Mubarak ho, ${first}! Your pre-departure briefing is on Saturday at 11 am. We'll go over tickets, accommodation and what to carry.`,
        },
      );
    }
    if (stageKey === "lost") {
      lines.push(
        {
          dir: "in",
          body:
            input.lostReason === "competitor"
              ? "Thanks, but I've decided to go with a consultant in my own city. They quoted a lower fee."
              : "Thank you, but the total cost is too much for my family right now. Maybe next intake.",
        },
        {
          dir: "out",
          body: "Understood, thank you for letting us know. If anything changes, we're always here to help.",
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
        ? ["enquiry", "counselled", "lost"]
        : stageOrder.slice(0, Math.max(1, depth + 1)).filter((k) => k !== "lost");
    // Converted leads stay inside the dashboard's 30-day window.
    const spanDays = Math.min(1.5 + pathKeys.length * rng.int(2, 4), plan.fromLead ? 27 - plan.days : 60);
    const createdMs = lastMs - spanDays * DAY;
    const createdAt = iso(createdMs);
    const value = plan.valueAed
      ? toMoneyString(plan.valueAed)
      : computeQuoteTotals(tr.lineItems, CLINIC.vatRate).subtotalAed;
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
      if (plan.enquiry) pinEnquiry(lead, plan.treatment, plan.enquiry);
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
          ? "Went with a consultant in Faisalabad, closer to home, who quoted a lower fee."
          : plan.lostReason === "price"
            ? "Family could not arrange the bank statement for this intake. May come back next year."
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
      addActivity(
        "system",
        createdAt,
        links,
        `Converted from ${SOURCE_LABEL[plan.source]} lead`,
        assignee.id,
        {
          kind: "lead_converted",
          source: plan.source,
        },
      );
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

    // Test-prep batches a college buys for its students read differently from employer sponsorships.
    const prepBatch = Boolean(company && PREP_COPY[tr.key]);
    if (rng.chance(0.6)) {
      const note = rng.pick(company ? (prepBatch ? COLLEGE_NOTES : CORPORATE_NOTES) : NOTES);
      addActivity("note", iso(createdMs + (lastMs - createdMs) * 0.4), links, note, assignee.id);
    }
    if (depth >= 1 && rng.chance(0.7)) {
      const call = rng.pick(company ? (prepBatch ? COLLEGE_CALLS : CORPORATE_CALLS) : CALLS);
      addActivity("call", iso(createdMs + (lastMs - createdMs) * 0.55), links, call, assignee.id, {
        durationMinutes: rng.int(2, 18),
      });
    }

    // Conversations: WhatsApp with students, email with corporate contacts.
    if (company) {
      const manager = user("manager");
      const managerFirst = firstName(manager);
      const conv = addConversation({ channel: "email", contact, assigneeId: manager.id, createdAt });
      const subject = title.replace(/^[^—]+— /, "");
      addMessages(
        conv,
        [
          {
            dir: "in",
            subject,
            body: `Dear ${managerFirst},\n\nWe would like ${CLINIC.shortName}'s proposal for the following: ${subject}. ${prepBatch ? "Could you share your fee, the batch timings and a start date?" : "Could you share your fee, the timeline and the intakes you would recommend?"}\n\nBest regards,\n${contactName(contact)}`,
          },
          {
            dir: "out",
            subject: `Re: ${subject}`,
            body: `Dear ${patientFirst},\n\nThank you for thinking of ${CLINIC.shortName}. I've attached our ${prepBatch ? "proposal with the batch timings" : "corporate proposal with a suggested timeline"}. Happy to arrange a call this week.\n\nKind regards,\n${manager.name}`,
          },
          ...(plan.days < 3
            ? [
                {
                  dir: "in" as const,
                  subject: `Re: ${subject}`,
                  body: prepBatch
                    ? `Thanks ${managerFirst}, the timings work for us. Can you confirm the fee includes the mock tests and study material for every student in the batch?`
                    : `Thanks ${managerFirst}, the timeline works for us. Can you confirm the fee covers every nominee's admission and visa file, and that embassy fees are separate?`,
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
      const totals = computeQuoteTotals(tr.lineItems, CLINIC.vatRate);
      // Fees are agreed after the counselling session, so a quote goes out right after the fee answer in
      // the chat ("Yes: half when we open your file…"), before the student starts sending documents.
      const chat = conversationFor.get(contact.id);
      const chatTimes = chat
        ? t.messages
            .filter((m) => m.conversationId === chat.id)
            .map((m) => new Date(m.occurredAt).getTime())
            .sort((a, b) => a - b)
        : [];
      const feeAnswer = chat
        ? t.messages.find((m) => m.conversationId === chat.id && m.body?.startsWith("Yes: half"))
        : undefined;
      const feeMs = feeAnswer ? new Date(feeAnswer.occurredAt).getTime() : null;
      const gapMs = feeMs === null ? 0 : (chatTimes.find((ms) => ms > feeMs) ?? lastMs) - feeMs;
      const sentMs =
        plan.quote === "draft"
          ? null
          : feeMs !== null && gapMs > 0
            ? Math.round(feeMs + Math.min(3 * HOUR, gapMs / 2))
            : plan.quote === "accepted"
              ? createdMs + (lastMs - createdMs) * 0.5 + 2 * HOUR
              : lastMs - 18 * HOUR;
      const quoteCreatedMs =
        sentMs === null
          ? lastMs - 2 * HOUR
          : feeMs !== null && gapMs > 0
            ? Math.round(feeMs + Math.min(HOUR, gapMs / 4))
            : sentMs - 2 * HOUR;
      const quoteCreated = iso(quoteCreatedMs);
      const quote = {
        ...row(quoteCreated, iso(lastMs)),
        dealId: deal.id,
        number: formatQuoteNumber(quoteYear, quoteSeq),
        lineItems: tr.lineItems.map((li) => ({ id: newId(), ...li })),
        subtotalAed: totals.subtotalAed,
        vatRate: CLINIC.vatRate,
        vatAmountAed: totals.vatAmountAed,
        totalAed: totals.totalAed,
        validUntil: new Date(new Date(quoteCreated).getTime() + DEFAULT_QUOTE_VALIDITY_DAYS * DAY)
          .toISOString()
          .slice(0, 10),
        notes:
          "Embassy visa fees, university application fees, IHS and tuition deposits are paid by the student directly and are not included in this quotation.",
        status: plan.quote,
        sentAt: sentMs === null ? null : iso(sentMs),
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
          `Quote ${quote.number} sent on WhatsApp — ${formatAed(totals.totalAed)} incl. sales tax`,
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
                caption: "Your SBC quotation",
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
          `Disqualified (${reason ? DISQUALIFY_LABEL[reason] : "no reason given"})`,
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

  // A returning student: did the IELTS placement test with us, now a new Instagram lead for the UK.
  const returning = must(patientContacts[6], "returning student");
  const returningLead = makeLead({
    name: contactName(returning),
    phone: returning.primaryPhoneE164,
    email: returning.emails[0] ?? null,
    source: "instagram",
    receivedAt: ago(3 * HOUR),
    treatmentKey: "uk",
    status: "new",
    assigneeId: returning.assigneeId,
  });
  pinEnquiry(
    returningLead,
    "uk",
    "AoA, I did the IELTS placement test with you. UK master's ke liye bhi guide karein? BS Electrical, final year",
  );
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
        [{ dir: "in", body: lead.message ?? "AoA, I'd like more information about studying abroad." }],
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
  // 09:00 today in Asia/Karachi (UTC+5 all year, no daylight saving).
  const today9 = new Date(`${new Date(nowMs + 5 * HOUR).toISOString().slice(0, 10)}T04:00:00.000Z`);
  const manualTasks: Array<{ title: string; deal: Deal; dueMs: number }> = [
    {
      title: "Send the Germany study visa quotation",
      deal: dealByTitle("Germany study visa — Maryam"),
      dueMs: today9.getTime() + 8 * HOUR,
    },
    {
      title: "Share the GIC and PAL document checklist",
      deal: dealByTitle("Canada study permit — Muhammad Ahmed"),
      dueMs: today9.getTime() + DAY + 2 * HOUR,
    },
    {
      title: "Follow up on the UK study visa quotation",
      deal: dealByTitle("UK study visa — Kinza"),
      dueMs: today9.getTime() - DAY,
    },
    {
      title: "Confirm the nominees' documents with Indus Loom HR",
      deal: dealByTitle("Indus Loom"),
      dueMs: today9.getTime() + 3 * DAY,
    },
    {
      title: "Send offer letters and the visa checklist to Sportsline HR",
      deal: dealByTitle("Sportsline"),
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
    const studentTask = rng.pick([
      "Send counselling session reminder",
      "Share the document checklist",
      "Call to confirm the session",
    ]);
    const task = addTask(
      {
        // Colleges and employers get a proposal, not a counselling reminder.
        title: deal.companyId ? "Send the proposal" : studentTask,
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
    // Usman was last, so the first simulated lead goes to Hamza, as the demo panel's script says.
    lastAssignedUserId: user("usman").id,
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
