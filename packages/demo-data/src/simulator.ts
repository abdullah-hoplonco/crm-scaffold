import { formatPhone } from "@hco/core";
import type { LeadSource } from "@hco/shared";
import { TREATMENTS, type Treatment } from "./catalog";
import type { Rng } from "./rng";

/**
 * The Simulator's content: realistic leads and WhatsApp messages for a Dubai clinic. Pure functions of
 * an Rng, so a seed always produces the same people; callers pass the phones already in use.
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

/** Dubai's mix of residents. Surnames are gender-neutral within each community. */
const COMMUNITIES: readonly Community[] = [
  {
    weight: 16,
    female: ["Mahra", "Shamma", "Maitha", "Sheikha", "Moza", "Alia", "Meera", "Hind", "Reem", "Amna"],
    male: ["Rashid", "Saeed", "Humaid", "Obaid", "Khalifa", "Majid", "Sultan"],
    last: [
      "Al Mazrouei",
      "Al Hammadi",
      "Al Muhairi",
      "Al Kaabi",
      "Al Remeithi",
      "Al Marzooqi",
      "Al Hosani",
      "Al Mheiri",
      "Al Ali",
      "Al Shehhi",
    ],
  },
  {
    weight: 12,
    female: ["Lara", "Yara", "Dima", "Nadine", "Joelle", "Hala", "Rasha", "Maya"],
    male: ["Karim", "Tarek", "Rami", "Fadi", "Ziad"],
    last: ["Saab", "Nasser", "Aoun", "Sleiman", "Hamdan", "Qassem", "Khalil", "Rizk"],
  },
  {
    weight: 8,
    female: ["Nourhan", "Heba", "Salma", "Mona", "Dina", "Menna"],
    male: ["Mohamed", "Mostafa", "Amr", "Sherif"],
    last: ["Abdelaziz", "El Masry", "Soliman", "Gamal", "Shawky", "Hegazy"],
  },
  {
    weight: 18,
    female: [
      "Ananya",
      "Deepika",
      "Sneha",
      "Kavya",
      "Aditi",
      "Pooja",
      "Divya",
      "Lakshmi",
      "Riya",
      "Shruti",
      "Nandini",
      "Swati",
    ],
    male: ["Rohit", "Arjun", "Nikhil", "Varun", "Karthik"],
    last: ["Menon", "Iyer", "Kapoor", "Shah", "Reddy", "Mehta", "Joshi", "Kulkarni", "D'Souza", "Thomas"],
  },
  {
    weight: 8,
    female: ["Ayesha", "Hira", "Zara", "Sana", "Fariha", "Mahnoor"],
    male: ["Bilal", "Usman", "Hamza", "Faisal"],
    last: ["Qureshi", "Chaudhry", "Malik", "Akhtar", "Hussain", "Raza"],
  },
  {
    weight: 10,
    female: ["Maricel", "Camille", "Angelica", "Kristine", "Bea", "Jasmine", "Patricia"],
    male: ["Jerome", "Paolo", "Mark Anthony"],
    last: ["Reyes", "Dela Cruz", "Bautista", "Mendoza", "Aquino", "Ramos", "Castillo"],
  },
  {
    weight: 10,
    female: ["Emma", "Charlotte", "Hannah", "Lucy", "Olivia", "Georgia", "Amelia"],
    male: ["Tom", "Daniel", "James", "Ollie"],
    last: ["Clarke", "Hughes", "Walker", "Fletcher", "Harris", "Murphy", "Bennett"],
  },
  {
    weight: 7,
    female: ["Anastasia", "Ekaterina", "Daria", "Alina", "Polina", "Ksenia"],
    male: [],
    last: ["Ivanova", "Sokolova", "Kuznetsova", "Morozova", "Orlova", "Lebedeva"],
  },
  {
    weight: 5,
    female: ["Parisa", "Niloufar", "Mahsa", "Yasaman"],
    male: ["Arash", "Dariush"],
    last: ["Rahimi", "Karimi", "Hosseini", "Moradi", "Farahani"],
  },
  {
    weight: 6,
    female: ["Amara", "Chioma", "Wanjiku", "Tolu", "Zawadi"],
    male: ["Kwame", "Tunde"],
    last: ["Okafor", "Mwangi", "Adeyemi", "Otieno", "Mensah"],
  },
];

/** Share of enquiries from women, per treatment. */
const FEMALE_SHARE: Record<string, number> = {
  laser: 0.85,
  botox: 0.75,
  fillers: 0.95,
  hydrafacial: 0.9,
  profhilo: 0.85,
  invisalign: 0.6,
  implant: 0.45,
  whitening: 0.55,
  veneers: 0.55,
  prp: 0.3,
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
  const wantsFemale = rng.chance(FEMALE_SHARE[treatmentKey ?? ""] ?? 0.6);
  const candidates = COMMUNITIES.filter((c) => (wantsFemale ? c.female.length : c.male.length) > 0);
  const community = weightedPick(rng, candidates);
  const firstName = rng.pick(wantsFemale ? community.female : community.male);
  const lastName = rng.pick(community.last);
  return { firstName, lastName, name: `${firstName} ${lastName}` };
}

/** A UAE mobile (+971 50/52/54/55/56/58) that isn't in `used`. Adds it to `used` when it is a Set. */
export function simulateUaeMobile(rng: Rng, used: ReadonlySet<string>): string {
  for (;;) {
    const phone = `+9715${rng.pick(["0", "2", "4", "5", "6", "8"])}${rng.digits(7)}`;
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
  const domain = rng.pick([
    "gmail.com",
    "gmail.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "yahoo.com",
  ]);
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
}

const COPY: Record<string, TreatmentCopy> = {
  laser: {
    form: [
      "Is the 30% off full body laser still on? I'd like to book a patch test",
      "How many sessions do I need for underarms and full legs?",
      "Do you have evening appointments for laser? I finish work at 6",
    ],
    tiktok: ["price for full body?", "laser offer still valid?", "how much underarms"],
    whatsapp: [
      "Hi, saw your laser hair removal offer on Instagram. How much is full body?",
      "Good evening, can I book laser after work? I finish at 6",
    ],
    campaign: "Laser hair removal — 30% off full body",
  },
  hydrafacial: {
    form: [
      "HydraFacial for my wedding in 5 weeks, which package do you recommend?",
      "Is HydraFacial okay for sensitive skin? I get redness easily",
    ],
    tiktok: ["hydrafacial price", "do u have offer this month"],
    whatsapp: ["Hi, how much is one HydraFacial session? Can I come this weekend?"],
    campaign: "Summer glow HydraFacial",
  },
  invisalign: {
    form: [
      "I have crowding on my lower teeth. Can I get a free Invisalign scan this week?",
      "What's the total price for Invisalign including retainers?",
    ],
    tiktok: ["invisalign cost?", "is the scan free"],
    whatsapp: [
      "Hello, my dentist said I need braces. Is Invisalign possible for adults?",
      "Hi, I'd like the free 3D scan for Invisalign. Do you have Saturday slots?",
    ],
    campaign: "Free Invisalign 3D scan",
  },
  implant: {
    form: [
      "Need a price for 2 implants on my lower molars. Do you accept Daman insurance?",
      "Lost a front tooth last year. How long does an implant take start to finish?",
    ],
    tiktok: ["implant price per tooth"],
    whatsapp: [
      "Hello, how much is one dental implant with the crown?",
      "Hi, do you offer instalments for implants? I need 2 at the bottom",
    ],
    campaign: "Dental implants consultation",
  },
  botox: {
    form: [
      "First time Botox, can I get a consultation on Saturday morning?",
      "Price for forehead and crow's feet? I want it to look natural",
    ],
    tiktok: ["botox price?", "how much for forehead", "is it safe"],
    whatsapp: ["Hi, is Dr. Hessa available for Botox this week? Forehead lines only"],
    campaign: "Botox myths busted",
  },
  fillers: {
    form: ["Lip filler 1 ml price? Natural look only", "Do you use Juvederm or Restylane for lips?"],
    tiktok: ["lips price", "how much 1ml", "do you have offers"],
    whatsapp: ["Hi! How much is lip filler? I saw the before and after video"],
    campaign: "Lip filler before & after",
  },
  whitening: {
    form: ["Teeth whitening before my wedding next month, how long does it last?"],
    tiktok: ["whitening price"],
    whatsapp: ["Hello, how much is Zoom whitening? Is it one session?"],
    campaign: "Wedding-ready smile",
  },
  veneers: {
    form: [
      "Interested in veneers for my top 8 teeth. Can I see before and after photos?",
      "What's the difference between composite and porcelain veneers in price?",
    ],
    tiktok: ["veneers price per tooth", "hollywood smile cost"],
    whatsapp: ["Hi, my friend did her veneers with you last year. Can I book a smile consultation?"],
    campaign: "Smile makeover stories",
  },
  prp: {
    form: ["PRP for hair loss, how many sessions and what's the price?"],
    tiktok: ["prp hair price"],
    whatsapp: ["Hello, I'm losing hair at the front. Does PRP work? How much for 4 sessions?"],
    campaign: "PRP hair restoration",
  },
  profhilo: {
    form: ["Profhilo for neck and face, what is the downtime?"],
    tiktok: ["profhilo price"],
    whatsapp: ["Hi, how much is Profhilo? Is there any downtime? I have an event on Friday"],
    campaign: "Skin booster season",
  },
};

const LEAD_TREATMENT_WEIGHTS: Record<SimulatorLeadSource, Record<string, number>> = {
  instagram: { laser: 5, hydrafacial: 4, fillers: 3, botox: 3, veneers: 3, profhilo: 2, invisalign: 2 },
  facebook: { invisalign: 4, implant: 4, whitening: 2, veneers: 2, prp: 2, laser: 1 },
  tiktok: { fillers: 5, botox: 4, laser: 3, hydrafacial: 2, veneers: 2, whitening: 1 },
  whatsapp: { implant: 3, invisalign: 3, veneers: 2, whitening: 2, botox: 2, laser: 2, prp: 1 },
  email: { implant: 2, invisalign: 2, veneers: 1, whitening: 1 },
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

/** A treatment people typically ask about on this source (Instagram skews aesthetic, Facebook dental). */
export function simulateTreatmentKey(rng: Rng, source: SimulatorLeadSource): string {
  return pickTreatment(rng, source).key;
}

/** What someone writes about a treatment on this source: a form question, a TikTok one-liner or a WhatsApp opener. */
export function simulateEnquiry(rng: Rng, source: SimulatorLeadSource, treatmentKey: string): string {
  const copy = COPY[treatmentKey] ?? (COPY["laser"] as TreatmentCopy);
  if (source === "tiktok") return rng.pick(copy.tiktok);
  if (source === "whatsapp") return rng.pick(copy.whatsapp);
  return rng.pick(copy.form);
}

/** Ad campaign name for a treatment, e.g. "Free Invisalign 3D scan (Facebook)"; null for non-ad sources. */
export function campaignFor(source: SimulatorLeadSource, treatmentKey: string): string | null {
  const suffix = CAMPAIGN_SUFFIX[source];
  const copy = COPY[treatmentKey];
  return suffix && copy ? `${copy.campaign} ${suffix}` : null;
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
    /** Pin the treatment or person (the seed does); random otherwise. */
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
    ? {
        "Full name": person.name,
        "Phone number": formatPhone(phoneE164),
        ...(email ? { Email: email } : {}),
        "Treatment of interest": capitalise(treatment.short),
        ...(source === "tiktok"
          ? {}
          : { "Best time to call": rng.pick(["Morning", "Afternoon", "Evenings after 6 pm", "Weekends"]) }),
      }
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
          field_data: Object.entries(formFields).map(([name, value]) => ({ name, values: [value] })),
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
    whatsappUserId: source === "whatsapp" ? `AE.${rng.digits(16)}` : null,
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

/** A first WhatsApp message from someone the clinic has never spoken to. */
export function simulateUnknownWhatsapp(
  rng: Rng,
  options: { usedPhones: ReadonlySet<string>; now: Date; phoneE164?: string | null },
): SimulatedWhatsappMessage {
  const lead = simulateLead(rng, { ...options, source: "whatsapp" });
  return {
    externalId: lead.externalId,
    person: lead.person,
    phoneE164: lead.phoneE164,
    whatsappUserId: lead.whatsappUserId ?? `AE.${rng.digits(16)}`,
    body: lead.message,
    treatmentKey: lead.treatmentKey,
  };
}

/** Where a patient is with the clinic, which decides what they write about next. */
export type PatientPhase = "enquiry" | "booked" | "consulted" | "customer" | "none";

const FOLLOW_UPS: Record<PatientPhase, readonly string[]> = {
  enquiry: [
    "Hi again, any update on the price for {treatment}?",
    "Do you have anything available this Saturday morning?",
    "Is the consultation free or is there a charge?",
    "Sorry I missed your call. Can you call me after 6 pm?",
  ],
  booked: [
    "Can I move my consultation to Saturday morning?",
    "Is parking free at Marina Plaza?",
    "Running 10 minutes late, stuck on Sheikh Zayed Road. Sorry!",
    "Do I need to bring anything to the consultation?",
    "Which floor is the clinic on?",
  ],
  consulted: [
    "Sent you the photos of my teeth",
    "I spoke to my family. Can we do the 12-month instalment plan?",
    "Can you send me the treatment plan again? I can't find it",
    "If I start next week, when would the {treatment} be finished?",
    "Does the price include the follow-up visits?",
  ],
  customer: [
    "Thank you so much, I'm really happy with the result!",
    "Is it normal to have a little redness the day after?",
    "Can I book my next session for the same time next month?",
    "My sister wants the same treatment. Can she get the same price?",
  ],
  none: [
    "Hi, is the clinic open on Friday afternoon?",
    "Do you have any offers this month?",
    "Can I get an appointment this week?",
  ],
};

/** A realistic follow-up from an existing patient, e.g. "Can I move my consultation to Saturday morning?". */
export function simulateFollowUp(
  rng: Rng,
  options: { phase: PatientPhase; treatmentKey?: string | null },
): string {
  const treatment = TREATMENTS.find((t) => t.key === options.treatmentKey);
  const lines = FOLLOW_UPS[options.phase].filter((line) => treatment || !line.includes("{treatment}"));
  return rng.pick(lines).replace("{treatment}", treatment?.short ?? "the treatment");
}

/** Guess the treatment from free text such as a deal title ("Porcelain veneers — Shirin Tehrani"). */
export function treatmentFromText(text: string | null | undefined): Treatment | null {
  if (!text) return null;
  const hay = text.toLowerCase();
  return TREATMENTS.find((t) => hay.includes(t.short.toLowerCase())) ?? null;
}

/** Message id in the WhatsApp Cloud API style for a simulated inbound message. */
export function simulateWhatsappMessageId(rng: Rng): string {
  return `wamid.HBgM${rng.digits(12)}FQIAEhgU${rng.digits(8)}`;
}
