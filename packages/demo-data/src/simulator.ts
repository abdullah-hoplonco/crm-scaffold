import { formatPhone } from "@hco/core";
import type { LeadSource } from "@hco/shared";
import { TREATMENTS, type Treatment } from "./catalog";
import type { Rng } from "./rng";

/**
 * The Simulator's content: realistic leads and WhatsApp messages for a Lahore study-abroad consultancy.
 * Pure functions of an Rng, so a seed always produces the same people; callers pass the phones already
 * in use.
 */

export type SimulatorLeadSource = Exclude<LeadSource, "manual" | "csv">;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

interface Community {
  weight: number;
  female: readonly string[];
  male: readonly string[];
  last: readonly string[];
}

/** Pakistan's mix of students and parents. Surnames are gender-neutral within each community. */
const COMMUNITIES: readonly Community[] = [
  {
    weight: 42,
    female: [
      "Hira",
      "Iqra",
      "Areeba",
      "Maham",
      "Anum",
      "Sidra",
      "Aiman",
      "Laiba",
      "Rimsha",
      "Zoya",
      "Minahil",
      "Esha",
      "Momina",
      "Fatima",
    ],
    male: [
      "Ali",
      "Ahmed",
      "Hassan",
      "Bilal",
      "Saad",
      "Umer",
      "Talha",
      "Haris",
      "Zain",
      "Abdullah",
      "Shahzaib",
      "Fahad",
      "Danish",
      "Waleed",
      "Moiz",
    ],
    last: [
      "Butt",
      "Chaudhry",
      "Cheema",
      "Gondal",
      "Warraich",
      "Bajwa",
      "Awan",
      "Rana",
      "Sheikh",
      "Mughal",
      "Arain",
      "Virk",
      "Tarar",
      "Aslam",
      "Nadeem",
      "Javed",
    ],
  },
  {
    weight: 18,
    female: ["Mehwish", "Rida", "Hafsa", "Alishba", "Sehrish", "Areesha"],
    male: ["Faraz", "Owais", "Shayan", "Arsalan", "Taha", "Rehan", "Hamid"],
    last: ["Ansari", "Zaidi", "Rizvi", "Naqvi", "Jafri", "Hashmi", "Farooqui", "Siddiqi"],
  },
  {
    weight: 12,
    female: ["Palwasha", "Zarmina", "Laila", "Shandana", "Wagma"],
    male: ["Asfandyar", "Wali", "Junaid", "Ibrahim", "Irfan"],
    last: ["Khan", "Yousafzai", "Afridi", "Khattak", "Marwat", "Durrani", "Bangash"],
  },
  {
    weight: 6,
    female: ["Sanam", "Nimra", "Marvi", "Sundus"],
    male: ["Sarmad", "Imdad", "Ayaz"],
    last: ["Memon", "Soomro", "Jatoi", "Abro", "Channa"],
  },
  {
    weight: 7,
    female: ["Saima", "Uzma", "Nadia", "Shazia"],
    male: ["Adil", "Tanveer", "Shoaib"],
    last: ["Kiani", "Raja", "Mir", "Dar", "Abbasi"],
  },
  {
    weight: 4,
    female: ["Sharon", "Rebecca", "Esther", "Sonia"],
    male: ["Samuel", "Daniel", "Emmanuel"],
    last: ["Masih", "Gill", "Bhatti", "Joseph"],
  },
  {
    weight: 3,
    female: ["Shireen", "Gulnar", "Zeba"],
    male: ["Karim", "Aman", "Salman"],
    last: ["Hunzai", "Baig", "Shigri"],
  },
  {
    weight: 3,
    female: ["Hani", "Sadia", "Gul Bano"],
    male: ["Jalal", "Shahdad", "Baran"],
    last: ["Baloch", "Rind", "Buledi"],
  },
];

/** Share of enquiries from women, per service. */
const FEMALE_SHARE: Record<string, number> = {
  uk: 0.45,
  canada: 0.4,
  australia: 0.4,
  usa: 0.45,
  germany: 0.3,
  ireland: 0.45,
  malaysia: 0.35,
  ielts: 0.55,
  pte: 0.45,
  sop: 0.5,
};

function weightedPick<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1] as T;
}

export interface SimulatedPerson {
  firstName: string;
  lastName: string;
  name: string;
}

export function simulatePerson(rng: Rng, treatmentKey?: string): SimulatedPerson {
  const wantsFemale = rng.chance(FEMALE_SHARE[treatmentKey ?? ""] ?? 0.45);
  const candidates = COMMUNITIES.filter((c) => (wantsFemale ? c.female.length : c.male.length) > 0);
  const community = weightedPick(rng, candidates);
  const firstName = rng.pick(wantsFemale ? community.female : community.male);
  const lastName = rng.pick(community.last);
  return { firstName, lastName, name: `${firstName} ${lastName}` };
}

/** Pakistani mobile network prefixes (Jazz, Zong, Ufone, Telenor). */
const MOBILE_PREFIXES = [
  "300",
  "301",
  "302",
  "303",
  "305",
  "306",
  "308",
  "310",
  "311",
  "312",
  "313",
  "315",
  "321",
  "322",
  "331",
  "333",
  "334",
  "336",
  "340",
  "341",
  "345",
  "346",
  "347",
] as const;

/**
 * A Pakistani mobile (+92 3XX XXXXXXX) that isn't in `used`. Adds it to `used` when it is a Set.
 * The name is kept from the UAE build.
 */
export function simulateUaeMobile(rng: Rng, used: ReadonlySet<string>): string {
  for (;;) {
    const phone = `+92${rng.pick(MOBILE_PREFIXES)}${rng.digits(7)}`;
    if (!used.has(phone)) {
      if (used instanceof Set) used.add(phone);
      return phone;
    }
  }
}

function emailFor(rng: Rng, person: SimulatedPerson): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, "");
  const domain = rng.pick(["gmail.com", "gmail.com", "gmail.com", "hotmail.com", "outlook.com", "yahoo.com"]);
  const style = rng.int(0, 2);
  const local =
    style === 0
      ? `${slug(person.firstName)}.${slug(person.lastName)}`
      : style === 1
        ? `${slug(person.firstName)}${slug(person.lastName).slice(0, 1)}${rng.int(10, 99)}`
        : `${slug(person.firstName).slice(0, 1)}${slug(person.lastName)}`;
  return `${local}@${domain}`;
}

// ---------------------------------------------------------------------------
// What people ask
// ---------------------------------------------------------------------------

interface TreatmentCopy {
  /** Form-field style questions from Meta lead ads. */
  form: readonly string[];
  /** Short, low-intent TikTok answers. */
  tiktok: readonly string[];
  /** First WhatsApp message. */
  whatsapp: readonly string[];
  /** Campaign names per ad platform. */
  campaign: string;
  /** Intakes offered on the lead form; test prep has none. */
  intakes: readonly string[];
}

const COPY: Record<string, TreatmentCopy> = {
  uk: {
    form: [
      "Is the January intake still open? I want MSc Data Science, CGPA 3.2",
      "Mera IELTS 6.5 hai (writing 6). Kya UK ke liye enough hai?",
      "I had a UK visa refusal last year. Can you check my case before I reapply?",
      "Which UK universities accept a 14-year bachelor's? I did BCom from Punjab University",
    ],
    tiktok: ["fees kitni hai?", "bina IELTS UK ho sakta hai?", "visa guarantee hai?"],
    whatsapp: [
      "AoA, saw your UK January intake ad on Instagram. Mujhe details chahiye, BS CS kiya hai",
      "Hi, can my spouse come with me on a UK study visa? I have 3 years of job experience",
    ],
    campaign: "UK January intake — apply now",
    intakes: ["January 2027", "September 2027"],
  },
  canada: {
    form: [
      "What is the total cost for Canada including GIC? FSc 78%",
      "Can I apply for a Canadian diploma after a 3-year gap?",
    ],
    tiktok: ["canada kitne ka hai", "gic kitna hai", "spouse bhi ja sakta?"],
    whatsapp: [
      "Assalam o Alaikum, Canada study permit ke liye free counselling book karni hai",
      "Hi, my Canada study permit was refused in March. Can you review my file?",
    ],
    campaign: "Free counselling — Canada study permit",
    intakes: ["January 2027", "May 2027", "September 2027"],
  },
  australia: {
    form: [
      "Pharm-D ke baad Australia mein master's ke options kya hain?",
      "How much bank statement do I need for an Australia student visa?",
    ],
    tiktok: ["australia fees?", "part time job milti hai?"],
    whatsapp: [
      "AoA, Australia February intake ke liye abhi apply ho sakta hai?",
      "Hi, I have PTE 58. Is that enough for a master's in Australia?",
    ],
    campaign: "Australia February intake",
    intakes: ["February 2027", "July 2027"],
  },
  usa: {
    form: [
      "I want an MS in the USA for Fall 2027. Is the GRE required?",
      "Beta A-levels kar raha hai, US undergrad ke liye scholarships milti hain?",
    ],
    tiktok: ["usa visa kaise lagta hai", "f1 interview tips?"],
    whatsapp: [
      "Hi, my F-1 visa was refused under 214(b). Can you prepare me for a second interview?",
      "AoA, US universities ki application fee waiver ke baare mein info chahiye",
    ],
    campaign: "USA Fall 2027 — F-1 guidance",
    intakes: ["Spring 2027", "Fall 2027"],
  },
  germany: {
    form: [
      "Germany mein tuition free hai? BS Mechanical, CGPA 2.9",
      "How long does the APS certificate take right now?",
    ],
    tiktok: ["germany free hai?", "blocked account kitna hai", "german language zaroori hai?"],
    whatsapp: [
      "AoA, Germany ke liye blocked account aur APS mein help karte hain?",
      "Hi, I want to apply for the summer semester in Germany. Is it too late?",
    ],
    campaign: "Study in Germany tuition-free",
    intakes: ["Summer semester 2027", "Winter semester 2027"],
  },
  ireland: {
    form: [
      "Ireland mein 2 saal ka stay back milta hai? MSc Business Analytics ke liye",
      "Which Irish universities accept a 16-year bachelor's with CGPA 2.8?",
    ],
    tiktok: ["ireland ka kharcha?"],
    whatsapp: [
      "Hi, is Ireland easier than the UK for a study visa? I have IELTS 6.0",
      "AoA, Ireland September intake ke liye documents kya chahiye?",
    ],
    campaign: "Study in Ireland — 2-year stay back",
    intakes: ["January 2027", "September 2027"],
  },
  malaysia: {
    form: [
      "Is Malaysia a good option on a low budget? A-levels done, want BS CS",
      "Can I apply to Malaysia without IELTS?",
    ],
    tiktok: ["malaysia sasta hai?", "ielts ke baghair?"],
    whatsapp: [
      "AoA, beti ke liye Malaysia mein BS ke options batayein. Budget 25 lakh total",
      "Hi, how long does the EMGS approval take these days?",
    ],
    campaign: "Malaysia — study abroad on a budget",
    intakes: ["January 2027", "March 2027", "September 2027"],
  },
  ielts: {
    form: [
      "When does the next IELTS batch start? Weekend classes?",
      "I need 7 in writing. Do you have a crash course?",
    ],
    tiktok: ["ielts fee?", "online classes hain?", "7 bands guarantee?"],
    whatsapp: [
      "AoA, IELTS ki evening class available hai? Office ke baad hi time milta hai",
      "Hi, can I take a free IELTS mock test before joining?",
    ],
    campaign: "IELTS in 8 weeks — new batch",
    intakes: [],
  },
  pte: {
    form: [
      "PTE ka course kitne weeks ka hai aur fee kya hai?",
      "I need PTE 65 for Australia. How fast can I get there?",
    ],
    tiktok: ["pte ya ielts?", "pte fee"],
    whatsapp: ["Hi, is PTE accepted for the UK? Which one is easier, PTE or IELTS?"],
    campaign: "PTE Academic — fast results",
    intakes: [],
  },
  sop: {
    form: [
      "Can you review my SOP for a UK master's? Deadline in 10 days",
      "HEC aur IBCC attestation mein kitna time lagta hai?",
    ],
    tiktok: ["sop likh dete ho?"],
    whatsapp: [
      "AoA, MOFA attestation ke liye appointment mil rahi hai? Degree aur transcript dono",
      "Hi, my SOP was rejected by two universities. Can you rewrite it?",
    ],
    campaign: "SOP that gets offers",
    intakes: [],
  },
};

const LEAD_TREATMENT_WEIGHTS: Record<SimulatorLeadSource, Record<string, number>> = {
  instagram: { uk: 5, australia: 3, canada: 3, usa: 2, ireland: 2, germany: 2 },
  facebook: { canada: 4, uk: 3, usa: 2, australia: 2, malaysia: 2, ielts: 1, sop: 1 },
  tiktok: { germany: 5, uk: 3, canada: 3, ielts: 3, pte: 2, malaysia: 2 },
  whatsapp: { uk: 3, canada: 3, australia: 2, usa: 2, ielts: 2, germany: 1, sop: 1 },
  email: { uk: 2, usa: 2, canada: 1, sop: 1 },
};

function pickTreatment(rng: Rng, source: SimulatorLeadSource): Treatment {
  const weights = Object.entries(LEAD_TREATMENT_WEIGHTS[source]).map(([key, weight]) => ({ key, weight }));
  const { key } = weightedPick(rng, weights);
  return TREATMENTS.find((t) => t.key === key) ?? (TREATMENTS[0] as Treatment);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export interface SimulatedLead {
  source: SimulatorLeadSource;
  /** Adapter the lead enters through, e.g. "meta-leadads". */
  adapter: string;
  externalId: string;
  person: SimulatedPerson;
  phoneE164: string;
  email: string | null;
  whatsappUserId: string | null;
  treatmentKey: string;
  message: string;
  formFields: Record<string, string>;
  campaignName: string | null;
  rawPayload: Record<string, unknown>;
}

const ADAPTER: Record<SimulatorLeadSource, string> = {
  instagram: "meta-leadads",
  facebook: "meta-leadads",
  tiktok: "tiktok-leads",
  whatsapp: "whatsapp-cloud",
  email: "gmail",
};

const CAMPAIGN_SUFFIX: Partial<Record<SimulatorLeadSource, string>> = {
  instagram: "(Instagram)",
  facebook: "(Facebook)",
  tiktok: "(TikTok instant form)",
};

/** Relative volume per source for a mixed burst (TikTok brings volume, Instagram quality). */
const MIXED_SOURCES = [
  { source: "instagram" as const, weight: 4 },
  { source: "tiktok" as const, weight: 4 },
  { source: "facebook" as const, weight: 2 },
  { source: "whatsapp" as const, weight: 2 },
];

export function pickMixedSource(rng: Rng): SimulatorLeadSource {
  return weightedPick(rng, MIXED_SOURCES).source;
}

/** A service people typically ask about on this source (Instagram skews UK, Facebook Canada, TikTok Germany). */
export function simulateTreatmentKey(rng: Rng, source: SimulatorLeadSource): string {
  return pickTreatment(rng, source).key;
}

/** What someone writes about a service on this source: a form question, a TikTok one-liner or a WhatsApp opener. */
export function simulateEnquiry(rng: Rng, source: SimulatorLeadSource, treatmentKey: string): string {
  const copy = COPY[treatmentKey] ?? (COPY["uk"] as TreatmentCopy);
  if (source === "tiktok") return rng.pick(copy.tiktok);
  if (source === "whatsapp") return rng.pick(copy.whatsapp);
  return rng.pick(copy.form);
}

/** Ad campaign name for a service, e.g. "Free counselling — Canada study permit (Facebook)"; null for non-ad sources. */
export function campaignFor(source: SimulatorLeadSource, treatmentKey: string): string | null {
  const suffix = CAMPAIGN_SUFFIX[source];
  const copy = COPY[treatmentKey];
  return suffix && copy ? `${copy.campaign} ${suffix}` : null;
}

/**
 * The answers on a lead form for a service: the service first (the CRM reads it as the lead's interest),
 * then the intake (the one the message names, if it names one). TikTok instant forms are shorter.
 */
/** The intakes a lead form offers for a service (empty for test prep and paperwork). */
export function intakesFor(treatmentKey: string): readonly string[] {
  return COPY[treatmentKey]?.intakes ?? [];
}

export function simulateFormAnswers(
  rng: Rng,
  input: {
    source: SimulatorLeadSource;
    name: string;
    phoneE164: string | null;
    email: string | null;
    treatmentKey: string;
    message?: string | null;
  },
): Record<string, string> {
  const treatment = TREATMENTS.find((t) => t.key === input.treatmentKey);
  const intakes = COPY[input.treatmentKey]?.intakes ?? [];
  const said = (input.message ?? "").toLowerCase();
  const named = intakes.find((intake) => said.includes(intake.split(" ")[0]?.toLowerCase() ?? intake));
  return {
    "Full name": input.name,
    "Phone number": formatPhone(input.phoneE164),
    ...(input.email ? { Email: input.email } : {}),
    "Service of interest": capitalise(treatment?.short ?? input.treatmentKey),
    ...(intakes.length ? { "Preferred intake": named ?? rng.pick(intakes) } : {}),
    ...(input.source === "tiktok"
      ? {}
      : { "Best time to call": rng.pick(["Morning", "Afternoon", "Evenings after 5 pm", "Saturday"]) }),
  };
}

/**
 * A lead as a channel would deliver it: Meta lead ads and TikTok instant forms carry form answers and a
 * campaign; WhatsApp carries the first message; email carries a subject-less enquiry.
 */
export function simulateLead(
  rng: Rng,
  options: {
    source: SimulatorLeadSource;
    usedPhones: ReadonlySet<string>;
    now: Date;
    phoneE164?: string | null;
    /** Pin the service or person (the seed does); random otherwise. */
    treatmentKey?: string;
    person?: SimulatedPerson;
  },
): SimulatedLead {
  const { source, now } = options;
  const treatment = TREATMENTS.find((t) => t.key === options.treatmentKey) ?? pickTreatment(rng, source);
  const person = options.person ?? simulatePerson(rng, treatment.key);
  const phoneE164 = options.phoneE164 ?? simulateUaeMobile(rng, options.usedPhones);
  const email = rng.chance(source === "tiktok" ? 0.2 : source === "email" ? 1 : 0.55)
    ? emailFor(rng, person)
    : null;
  const message = simulateEnquiry(rng, source, treatment.key);
  const isForm = source === "instagram" || source === "facebook" || source === "tiktok";
  const formFields: Record<string, string> = isForm
    ? simulateFormAnswers(rng, {
        source,
        name: person.name,
        phoneE164,
        email,
        treatmentKey: treatment.key,
        message,
      })
    : {};
  const campaignName = campaignFor(source, treatment.key);
  const createdTime = now.toISOString();
  const externalId =
    source === "instagram" || source === "facebook"
      ? `${rng.int(1, 9)}${rng.digits(15)}`
      : source === "tiktok"
        ? `7${rng.digits(18)}`
        : source === "whatsapp"
          ? `wamid.HBgM${rng.digits(12)}FQIAEhgU${rng.digits(8)}`
          : `<${rng.digits(10)}.${rng.digits(6)}@mail.gmail.com>`;
  const rawPayload: Record<string, unknown> = isForm
    ? source === "tiktok"
      ? {
          lead_id: externalId,
          advertiser_id: `7${rng.digits(18)}`,
          form_id: `7${rng.digits(18)}`,
          create_time: Math.floor(now.getTime() / 1000),
          answers: Object.entries(formFields).map(([name, value]) => ({ name, value })),
          simulated: true,
        }
      : {
          leadgen_id: externalId,
          page_id: "demo-page-id",
          form_id: rng.digits(15),
          platform: source === "instagram" ? "ig" : "fb",
          created_time: createdTime,
          field_data: Object.entries(formFields).map(([name, values]) => ({ name, values: [values] })),
          simulated: true,
        }
    : { simulated: true, receivedAt: createdTime };
  return {
    source,
    adapter: ADAPTER[source],
    externalId,
    person,
    phoneE164,
    email,
    whatsappUserId: source === "whatsapp" ? `PK.${rng.digits(16)}` : null,
    treatmentKey: treatment.key,
    message,
    formFields,
    campaignName,
    rawPayload,
  };
}

// ---------------------------------------------------------------------------
// WhatsApp messages
// ---------------------------------------------------------------------------

export interface SimulatedWhatsappMessage {
  externalId: string;
  person: SimulatedPerson;
  phoneE164: string;
  whatsappUserId: string;
  body: string;
  treatmentKey: string;
}

/** A first WhatsApp message from someone the consultancy has never spoken to. */
export function simulateUnknownWhatsapp(
  rng: Rng,
  options: { usedPhones: ReadonlySet<string>; now: Date; phoneE164?: string | null },
): SimulatedWhatsappMessage {
  const lead = simulateLead(rng, { ...options, source: "whatsapp" });
  return {
    externalId: lead.externalId,
    person: lead.person,
    phoneE164: lead.phoneE164,
    whatsappUserId: lead.whatsappUserId ?? `PK.${rng.digits(16)}`,
    body: lead.message,
    treatmentKey: lead.treatmentKey,
  };
}

/**
 * Where a student is with SBC, which decides what they write about next: "booked" is counselling done,
 * "consulted" is anywhere from documents to visa filed, "customer" is visa approved.
 */
export type PatientPhase = "enquiry" | "booked" | "consulted" | "customer" | "none";

/** Test prep and paperwork services; everything else is a study visa. Some follow-ups only fit one. */
const PREP = new Set(["ielts", "pte", "sop"]);

type FollowUp = string | { text: string; only: "visa" | "prep" };

const FOLLOW_UPS: Record<PatientPhase, readonly FollowUp[]> = {
  enquiry: [
    "Hi again, any update on the {treatment} fee?",
    "Kya Saturday ko counselling ho sakti hai? Weekdays mein classes hoti hain",
    "Is the counselling session free or is there a charge?",
    "Sorry I missed your call. Can you call me after 5 pm?",
    { text: "Mera IELTS abhi nahi hua. Kya phir bhi apply ho sakta hai?", only: "visa" },
  ],
  booked: [
    "Can I bring my father to the next session? He is my sponsor.",
    "Which documents should I get attested first?",
    { text: "Does the bank statement need to be in my name or my father's?", only: "visa" },
    { text: "Can I switch to the evening batch? My office timing changed", only: "prep" },
    "Running 15 minutes late, traffic on Main Boulevard. Sorry!",
    "Office ki location share kar dein please",
  ],
  consulted: [
    { text: "Sent you my transcripts and passport scan", only: "visa" },
    { text: "Sent you my mock test result: reading 6.0, writing 5.5", only: "prep" },
    { text: "Any update from the university? My friends have got their offers already", only: "visa" },
    "Can you send me the quotation again? I can't find it",
    { text: "If we submit this week, will I still make the next intake?", only: "visa" },
    "Does the fee include everything or are there extra charges?",
    "Kya fee do instalments mein de sakte hain?",
  ],
  customer: [
    "JazakAllah SBC team, I'm really happy!",
    { text: "When is the pre-departure briefing? I want my parents to come too", only: "visa" },
    { text: "Can you help me find accommodation near campus?", only: "visa" },
    { text: "Got my result: 7 overall! Thank you so much", only: "prep" },
    "My cousin wants to apply for the same intake. Can she get the same fee?",
  ],
  none: [
    "AoA, is the office open on Saturday?",
    "Any scholarship updates this month?",
    "Can I book a counselling session this week?",
  ],
};

/** A realistic follow-up from an existing student, e.g. "Which documents should I get attested first?". */
export function simulateFollowUp(
  rng: Rng,
  options: { phase: PatientPhase; treatmentKey?: string | null },
): string {
  const treatment = TREATMENTS.find((t) => t.key === options.treatmentKey);
  const area = treatment ? (PREP.has(treatment.key) ? "prep" : "visa") : null;
  const lines = FOLLOW_UPS[options.phase]
    .filter((line) => typeof line === "string" || line.only === area)
    .map((line) => (typeof line === "string" ? line : line.text))
    .filter((line) => treatment || !line.includes("{treatment}"));
  return rng.pick(lines).replace("{treatment}", treatment?.short ?? "the service");
}

/** Words that name a service in free text, besides its own short name. */
const SERVICE_WORDS: Record<string, RegExp> = {
  uk: /\b(uk|u\.k\.?|united kingdom|britain|british|england|scotland|cas)\b/,
  canada: /\b(canada|canadian|gic|sds)\b/,
  australia: /\b(australia|australian|subclass 500|coe)\b/,
  usa: /\b(usa|u\.s\.a?\.?|united states|america|american|f-?1|ds-?160|sevis|i-20)\b/,
  germany: /\b(germany|german|aps|uni-assist|blocked account)\b/,
  ireland: /\b(ireland|irish)\b/,
  malaysia: /\b(malaysia|malaysian|emgs)\b/,
  ielts: /\bielts\b/,
  pte: /\bpte\b/,
  sop: /\b(sop|statement of purpose|attestation|hec|ibcc|mofa)\b/,
};

/**
 * Guess the service from free text such as a deal title ("UK study visa — Ali Raza") or a message
 * ("Germany ke liye APS?"). The service named earliest in the text wins.
 */
export function treatmentFromText(text: string | null | undefined): Treatment | null {
  if (!text) return null;
  const hay = text.toLowerCase();
  let best: { treatment: Treatment; at: number } | null = null;
  for (const treatment of TREATMENTS) {
    const byName = hay.indexOf(treatment.short.toLowerCase());
    const byWord = SERVICE_WORDS[treatment.key]?.exec(hay)?.index ?? -1;
    const at = [byName, byWord].filter((i) => i >= 0).reduce((min, i) => Math.min(min, i), Infinity);
    if (at !== Infinity && (!best || at < best.at)) best = { treatment, at };
  }
  return best?.treatment ?? null;
}

/** Message id in the WhatsApp Cloud API style for a simulated inbound message. */
export function simulateWhatsappMessageId(rng: Rng): string {
  return `wamid.HBgM${rng.digits(12)}FQIAEhgU${rng.digits(8)}`;
}
