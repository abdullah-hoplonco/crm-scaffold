import type { Emirate, Jurisdiction, LeadSource, Role } from "@hco/shared";

/** The demo workspace: a fictional Dubai aesthetic and dental clinic. Any resemblance to a real business is unintended. */
export const CLINIC = {
  name: "Noor Al Marsa Aesthetic & Dental Clinic",
  shortName: "Noor Al Marsa Clinic",
  trn: "100458392700003",
  addressLine: "Marina Plaza, Level 3, Dubai Marina, Dubai",
  emirate: "dubai" as Emirate,
  emailDomain: "noormarsa.ae",
  whatsappDisplay: "+971 4 555 0142",
};

export const STAFF: Array<{ key: string; name: string; role: Role; jobTitle: string; email: string }> = [
  { key: "owner", name: "Dr. Hessa Al Suwaidi", role: "owner", jobTitle: "Medical director", email: "hessa" },
  {
    key: "manager",
    name: "Omar Farouk",
    role: "manager",
    jobTitle: "Patient relations manager",
    email: "omar",
  },
  { key: "priya", name: "Priya Nair", role: "rep", jobTitle: "Patient coordinator", email: "priya" },
  { key: "yousef", name: "Yousef Darwish", role: "rep", jobTitle: "Patient coordinator", email: "yousef" },
  { key: "maria", name: "Maria Santos", role: "rep", jobTitle: "Patient coordinator", email: "maria" },
];

export const PIPELINE_NAME = "Patient treatments";

export const STAGES: Array<{
  key: string;
  name: string;
  type: "open" | "won" | "lost";
  probability: number;
}> = [
  { key: "enquiry", name: "New enquiry", type: "open", probability: 10 },
  { key: "booked", name: "Consultation booked", type: "open", probability: 30 },
  { key: "consulted", name: "Consultation done", type: "open", probability: 50 },
  { key: "plan", name: "Treatment plan sent", type: "open", probability: 70 },
  { key: "won", name: "Treatment booked", type: "won", probability: 100 },
  { key: "lost", name: "Lost", type: "lost", probability: 0 },
];

export interface Treatment {
  key: string;
  /** Short name used in chats and deal titles. */
  short: string;
  lineItems: Array<{ description: string; qty: string; unitPriceAed: string }>;
}

export const TREATMENTS: Treatment[] = [
  {
    key: "laser",
    short: "laser hair removal",
    lineItems: [
      { description: "Laser hair removal — full body, 6 sessions", qty: "1", unitPriceAed: "4800" },
    ],
  },
  {
    key: "invisalign",
    short: "Invisalign",
    lineItems: [
      { description: "Invisalign Comprehensive clear aligners", qty: "1", unitPriceAed: "16500" },
      { description: "3D iTero scan and treatment planning", qty: "1", unitPriceAed: "1200" },
      { description: "Vivera retainers, upper and lower", qty: "1", unitPriceAed: "800" },
    ],
  },
  {
    key: "implant",
    short: "dental implants",
    lineItems: [
      { description: "Dental implant with crown — single tooth", qty: "2", unitPriceAed: "7500" },
      { description: "CBCT 3D scan", qty: "1", unitPriceAed: "650" },
    ],
  },
  {
    key: "botox",
    short: "Botox",
    lineItems: [{ description: "Botox — forehead and crow's feet", qty: "1", unitPriceAed: "1800" }],
  },
  {
    key: "fillers",
    short: "lip fillers",
    lineItems: [{ description: "Dermal filler — lips, 1 ml", qty: "1", unitPriceAed: "2200" }],
  },
  {
    key: "hydrafacial",
    short: "HydraFacial",
    lineItems: [{ description: "HydraFacial Platinum — 6-session course", qty: "1", unitPriceAed: "3600" }],
  },
  {
    key: "whitening",
    short: "teeth whitening",
    lineItems: [{ description: "In-clinic teeth whitening (Philips Zoom)", qty: "1", unitPriceAed: "1500" }],
  },
  {
    key: "veneers",
    short: "porcelain veneers",
    lineItems: [
      { description: "E.max porcelain veneers", qty: "8", unitPriceAed: "2900" },
      { description: "Digital smile design and mock-up", qty: "1", unitPriceAed: "900" },
    ],
  },
  {
    key: "prp",
    short: "PRP hair restoration",
    lineItems: [{ description: "PRP hair restoration — 4 sessions", qty: "4", unitPriceAed: "1300" }],
  },
  {
    key: "profhilo",
    short: "Profhilo skin booster",
    lineItems: [{ description: "Profhilo skin booster — 2 sessions", qty: "2", unitPriceAed: "1700" }],
  },
];

export const PATIENTS: Array<{ first: string; last: string; email?: string; job?: string }> = [
  { first: "Fatima", last: "Al Mansoori", job: "Senior associate" },
  { first: "Mariam", last: "Al Falasi" },
  { first: "Khalid", last: "Al Nuaimi", job: "Operations director" },
  { first: "Aisha", last: "Al Zaabi" },
  { first: "Noura", last: "Al Ketbi", job: "Architect" },
  { first: "Hamdan", last: "Al Shamsi" },
  { first: "Layla", last: "Haddad", job: "Marketing manager" },
  { first: "Rania", last: "Khoury", job: "Dentist's assistant" },
  { first: "Ahmed", last: "Abdelrahman", job: "Civil engineer" },
  { first: "Yasmin", last: "El Sayed" },
  { first: "Rahul", last: "Menon", job: "Software engineer" },
  { first: "Anjali", last: "Sharma" },
  { first: "Sana", last: "Sheikh", job: "Cabin crew" },
  { first: "Farhan", last: "Siddiqui", job: "Accountant" },
  { first: "Joanna", last: "Reyes", job: "Nurse" },
  { first: "Mark", last: "Villanueva" },
  { first: "Sarah", last: "Thompson", job: "Teacher" },
  { first: "James", last: "O'Connor", job: "Project manager" },
  { first: "Charlotte", last: "Dubois" },
  { first: "Olga", last: "Petrova", job: "Real estate agent" },
  { first: "Dmitri", last: "Volkov" },
  { first: "Grace", last: "Otieno", job: "Pharmacist" },
  { first: "Mei Lin", last: "Chen" },
  { first: "Shirin", last: "Tehrani", job: "Interior designer" },
  { first: "Hind", last: "Al Blooshi" },
];

export interface CompanySeed {
  name: string;
  emirate: Emirate;
  jurisdiction: Jurisdiction;
  freeZoneName: string | null;
  industry: string;
  website: string;
  address: string;
  licensePrefix: string;
  contact: { first: string; last: string; job: string };
}

export const COMPANIES: CompanySeed[] = [
  {
    name: "Gulf Horizon Logistics LLC",
    emirate: "dubai",
    jurisdiction: "free_zone",
    freeZoneName: "JAFZA",
    industry: "Logistics",
    website: "gulfhorizon-logistics.ae",
    address: "LOB 14, Jebel Ali Free Zone",
    licensePrefix: "JAFZA",
    contact: { first: "Priyanka", last: "Iyer", job: "HR manager" },
  },
  {
    name: "Palm Crest Hospitality LLC",
    emirate: "dubai",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Hospitality",
    website: "palmcrest-hospitality.ae",
    address: "Al Sufouh Road, Dubai",
    licensePrefix: "DED",
    contact: { first: "Stefan", last: "Novak", job: "Director of people" },
  },
  {
    name: "Al Waha Real Estate Brokers LLC",
    emirate: "dubai",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Real estate",
    website: "alwaha-realestate.ae",
    address: "Business Bay, Dubai",
    licensePrefix: "DED",
    contact: { first: "Hind", last: "Al Marri", job: "Office manager" },
  },
  {
    name: "Desert Pearl Events FZ-LLC",
    emirate: "dubai",
    jurisdiction: "free_zone",
    freeZoneName: "DMCC",
    industry: "Events",
    website: "desertpearl-events.ae",
    address: "Jumeirah Lakes Towers, Cluster X",
    licensePrefix: "DMCC",
    contact: { first: "Karim", last: "Mansour", job: "Managing partner" },
  },
  {
    name: "Crescent Fintech Ltd",
    emirate: "dubai",
    jurisdiction: "free_zone",
    freeZoneName: "DIFC",
    industry: "Financial services",
    website: "crescent-fintech.ae",
    address: "Gate Village 4, DIFC",
    licensePrefix: "DIFC",
    contact: { first: "Emma", last: "Clarke", job: "Head of HR" },
  },
  {
    name: "Blue Dhow Marine Services LLC",
    emirate: "sharjah",
    jurisdiction: "free_zone",
    freeZoneName: "Hamriyah Free Zone",
    industry: "Marine services",
    website: "bluedhow-marine.ae",
    address: "Hamriyah Free Zone, Sharjah",
    licensePrefix: "HFZA",
    contact: { first: "Suresh", last: "Pillai", job: "Admin manager" },
  },
  {
    name: "Saffron & Oud Perfumes Trading LLC",
    emirate: "dubai",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Retail",
    website: "saffronoud.ae",
    address: "Perfume Souk, Deira, Dubai",
    licensePrefix: "DED",
    contact: { first: "Abdullah", last: "Al Hammadi", job: "Owner" },
  },
  {
    name: "Falcon Wing Aviation Academy LLC",
    emirate: "abu_dhabi",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Education",
    website: "falconwing-academy.ae",
    address: "Khalifa City A, Abu Dhabi",
    licensePrefix: "ADDED",
    contact: { first: "Reem", last: "Al Dhaheri", job: "HR director" },
  },
  {
    name: "Oasis Bright Schools Group",
    emirate: "sharjah",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Education",
    website: "oasisbright-schools.ae",
    address: "Al Nahda, Sharjah",
    licensePrefix: "SEDD",
    contact: { first: "Nadia", last: "Saleh", job: "Staff wellbeing lead" },
  },
  {
    name: "Marina Pulse Fitness Club LLC",
    emirate: "dubai",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Fitness",
    website: "marinapulse.ae",
    address: "Dubai Marina Walk, Dubai",
    licensePrefix: "DED",
    contact: { first: "Jake", last: "Morrison", job: "General manager" },
  },
  {
    name: "Coastline Interiors LLC",
    emirate: "dubai",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Interior fit-out",
    website: "coastline-interiors.ae",
    address: "Al Quoz Industrial Area 3, Dubai",
    licensePrefix: "DED",
    contact: { first: "Ali", last: "Raza", job: "Operations manager" },
  },
  {
    name: "Ajman Steelworks Fabrication LLC",
    emirate: "ajman",
    jurisdiction: "free_zone",
    freeZoneName: "Ajman Free Zone",
    industry: "Manufacturing",
    website: "ajmansteelworks.ae",
    address: "Ajman Free Zone, Ajman",
    licensePrefix: "AFZ",
    contact: { first: "Venkat", last: "Rao", job: "HR officer" },
  },
  {
    name: "Hajar Mountain Stone Trading LLC",
    emirate: "ras_al_khaimah",
    jurisdiction: "free_zone",
    freeZoneName: "RAKEZ",
    industry: "Building materials",
    website: "hajarstone.ae",
    address: "Al Hamra Industrial Zone, Ras Al Khaimah",
    licensePrefix: "RAKEZ",
    contact: { first: "Salem", last: "Al Shehhi", job: "General manager" },
  },
  {
    name: "Lagoon Catch Seafood Trading LLC",
    emirate: "umm_al_quwain",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Food trading",
    website: "lagooncatch.ae",
    address: "Old Harbour, Umm Al Quwain",
    licensePrefix: "UAQ-DED",
    contact: { first: "Joseph", last: "Mathew", job: "Admin manager" },
  },
  {
    name: "Harbour View Chandlers LLC",
    emirate: "fujairah",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Marine supply",
    website: "harbourview-chandlers.ae",
    address: "Port Road, Fujairah",
    licensePrefix: "FUJ-DED",
    contact: { first: "Tariq", last: "Al Yamahi", job: "Procurement manager" },
  },
];

/** Names used for leads that never became contacts. */
export const LEAD_NAMES = [
  "Amna Al Hosani",
  "Reem Saeed",
  "Mohammed Al Marzouqi",
  "Sara Al Awadhi",
  "Hessa Al Mazrouei",
  "Zainab Hussain",
  "Omar Haddad",
  "Nour Barakat",
  "Lina Aziz",
  "Tamer Fawzy",
  "Kavya Reddy",
  "Arjun Pillai",
  "Neha Kapoor",
  "Imran Khan",
  "Ayesha Malik",
  "Bianca Cruz",
  "Kristine Dela Cruz",
  "Paolo Mendoza",
  "Emily Carter",
  "Oliver Bennett",
  "Sophie Laurent",
  "Anastasia Ivanova",
  "Elena Popescu",
  "Chiara Rossi",
  "Leila Rahimi",
  "Hana Yousef",
  "Maha Al Qubaisi",
  "Dana Nassar",
  "Ritika Jain",
  "Vikram Singh",
  "Aaliyah Brown",
  "Nadine Fares",
  "Samira Benali",
  "Yara Mostafa",
  "Mona Ibrahim",
  "Priti Desai",
  "Joy Santiago",
  "Daniela Moreno",
  "Katya Smirnova",
  "Farah Al Jaber",
  "Latifa Al Suwaidi",
  "Rashid Al Nuaimi",
  "Sultan Al Dhaheri",
  "Mahra Al Kaabi",
  "Alia Rahman",
  "Tanvir Ahmed",
  "Shreya Nambiar",
  "Ruth Wanjiru",
  "Chloe Martin",
  "Isabella Garcia",
];

export const ENQUIRIES: Record<string, string[]> = {
  laser: [
    "Is the laser hair removal offer still on? Full body please",
    "How many sessions do I need for underarms and legs?",
    "Do you have a female doctor for laser?",
  ],
  invisalign: [
    "I want to know the price for Invisalign, I have crowding on the lower teeth",
    "Can I get a free scan for Invisalign this week?",
  ],
  implant: ["Need price for 2 implants, lower molars", "Do you accept insurance for dental implants?"],
  botox: ["What's the price for Botox forehead?", "First time Botox, can I get a consultation on Saturday?"],
  fillers: ["Lip filler 1ml price? Natural look only", "Do you use Juvederm or Restylane?"],
  hydrafacial: [
    "HydraFacial package for a bride, wedding in 6 weeks",
    "Is HydraFacial ok for sensitive skin?",
  ],
  whitening: ["Teeth whitening before my wedding, how long does it last?"],
  veneers: ["Interested in veneers for top 8 teeth, can I see before and after photos?"],
  prp: ["PRP for hair loss — how many sessions and price?"],
  profhilo: ["Profhilo for neck and face, what is the downtime?"],
};

export const CAMPAIGNS: Partial<Record<LeadSource, string[]>> = {
  instagram: [
    "Laser hair removal — 30% off (Instagram)",
    "Summer glow HydraFacial (Instagram)",
    "Smile makeover stories (Instagram)",
  ],
  facebook: ["Free Invisalign scan (Facebook)", "Dental implants consultation (Facebook)"],
  tiktok: ["Botox myths busted (TikTok instant form)", "Lip filler before & after (TikTok instant form)"],
  whatsapp: ["Click-to-WhatsApp: Smile makeover"],
};

export const WHATSAPP_TEMPLATES = [
  {
    name: "lead_first_touch",
    category: "utility" as const,
    body: "Hi {{1}}, thank you for your enquiry about {{2}} at Noor Al Marsa Clinic. This is {{3}}, your patient coordinator. When is a good time to call you?",
    variableHints: ["Patient first name", "Treatment", "Your name"],
  },
  {
    name: "appointment_reminder",
    category: "utility" as const,
    body: "Hi {{1}}, this is a reminder of your {{2}} appointment on {{3}} at our Dubai Marina clinic. Reply YES to confirm or call us on 04 555 0142 to reschedule.",
    variableHints: ["Patient first name", "Treatment", "Date and time"],
  },
  {
    name: "treatment_plan_followup",
    category: "utility" as const,
    body: "Hi {{1}}, your treatment plan for {{2}} is ready. Reply to this message and we will share the details and next available dates.",
    variableHints: ["Patient first name", "Treatment"],
  },
];
