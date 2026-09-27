import type { Emirate, Jurisdiction, LeadSource, Role } from "@hco/shared";

/**
 * The demo workspace: SBC, a study-abroad and study-visa consultancy in Lahore. The `trn` is its NTN
 * (displayed 4213785-6) and `emirate` its province; the names are kept from the UAE build.
 */
export const CLINIC = {
  name: "SBC Study Abroad Consultants",
  shortName: "SBC",
  trn: "42137856",
  addressLine: "2nd Floor, 88-B Main Boulevard, Gulberg III, Lahore",
  emirate: "punjab" as Emirate,
  emailDomain: "sbcconsultants.pk",
  whatsappDisplay: "+92 300 0724580",
  landlineDisplay: "042 3578 0142",
  /** Punjab sales tax on services. */
  vatRate: "16.00",
  timezone: "Asia/Karachi",
};

export const STAFF: Array<{ key: string; name: string; role: Role; jobTitle: string; email: string }> = [
  { key: "owner", name: "Kamran Qureshi", role: "owner", jobTitle: "Chief executive", email: "kamran" },
  {
    key: "manager",
    name: "Ayesha Siddiqui",
    role: "manager",
    jobTitle: "Head of counselling",
    email: "ayesha",
  },
  { key: "hamza", name: "Hamza Malik", role: "rep", jobTitle: "Student counsellor", email: "hamza" },
  { key: "mahnoor", name: "Mahnoor Iqbal", role: "rep", jobTitle: "Student counsellor", email: "mahnoor" },
  { key: "usman", name: "Usman Raza", role: "rep", jobTitle: "Student counsellor", email: "usman" },
];

export const PIPELINE_NAME = "Student applications";

export const STAGES: Array<{
  key: string;
  name: string;
  type: "open" | "won" | "lost";
  probability: number;
}> = [
  { key: "enquiry", name: "New enquiry", type: "open", probability: 10 },
  { key: "counselled", name: "Counselling done", type: "open", probability: 25 },
  { key: "documents", name: "Documents collected", type: "open", probability: 40 },
  { key: "applied", name: "Applied to university", type: "open", probability: 55 },
  { key: "offer", name: "Offer received", type: "open", probability: 70 },
  { key: "visa_filed", name: "Visa filed", type: "open", probability: 85 },
  { key: "won", name: "Visa approved", type: "won", probability: 100 },
  { key: "lost", name: "Lost", type: "lost", probability: 0 },
];

/**
 * A service SBC sells. Prices are SBC's own fees in PKR: embassy visa fees, university application
 * fees, IHS and tuition deposits are paid by the student directly and never appear as line items.
 */
export interface Treatment {
  key: string;
  /** Short name used in chats and deal titles. */
  short: string;
  lineItems: Array<{ description: string; qty: string; unitPriceAed: string }>;
}

export const TREATMENTS: Treatment[] = [
  {
    key: "uk",
    short: "UK study visa",
    lineItems: [
      { description: "UK university admission and CAS processing", qty: "1", unitPriceAed: "75000" },
      { description: "UK Student visa file preparation", qty: "1", unitPriceAed: "60000" },
      { description: "Credibility interview preparation", qty: "1", unitPriceAed: "15000" },
    ],
  },
  {
    key: "canada",
    short: "Canada study permit",
    lineItems: [
      { description: "Canada college admission processing", qty: "1", unitPriceAed: "80000" },
      { description: "Study permit file with GIC and PAL guidance", qty: "1", unitPriceAed: "85000" },
    ],
  },
  {
    key: "australia",
    short: "Australia student visa",
    lineItems: [
      { description: "Australia admission and CoE processing", qty: "1", unitPriceAed: "70000" },
      { description: "Subclass 500 visa file preparation", qty: "1", unitPriceAed: "90000" },
      { description: "Genuine Student statement writing", qty: "1", unitPriceAed: "20000" },
    ],
  },
  {
    key: "usa",
    short: "USA F-1 visa",
    lineItems: [
      {
        description: "US university shortlisting and applications (5 universities)",
        qty: "1",
        unitPriceAed: "100000",
      },
      { description: "DS-160 and SEVIS guidance", qty: "1", unitPriceAed: "25000" },
      { description: "F-1 visa interview mock sessions", qty: "3", unitPriceAed: "10000" },
    ],
  },
  {
    key: "germany",
    short: "Germany study visa",
    lineItems: [
      { description: "Uni-assist application support", qty: "1", unitPriceAed: "50000" },
      { description: "APS certificate and blocked account guidance", qty: "1", unitPriceAed: "35000" },
      { description: "National visa appointment and file", qty: "1", unitPriceAed: "45000" },
    ],
  },
  {
    key: "ireland",
    short: "Ireland study visa",
    lineItems: [
      { description: "Ireland admission processing", qty: "1", unitPriceAed: "60000" },
      { description: "Ireland study visa file preparation", qty: "1", unitPriceAed: "55000" },
    ],
  },
  {
    key: "malaysia",
    short: "Malaysia study visa",
    lineItems: [
      { description: "Malaysia admission and EMGS visa processing", qty: "1", unitPriceAed: "65000" },
    ],
  },
  {
    key: "ielts",
    short: "IELTS preparation",
    lineItems: [
      { description: "IELTS Academic preparation course (8 weeks)", qty: "1", unitPriceAed: "35000" },
      { description: "Full-length IELTS mock test", qty: "4", unitPriceAed: "2500" },
    ],
  },
  {
    key: "pte",
    short: "PTE preparation",
    lineItems: [
      { description: "PTE Academic preparation course (6 weeks)", qty: "1", unitPriceAed: "30000" },
    ],
  },
  {
    key: "sop",
    short: "SOP and attestation",
    lineItems: [
      { description: "Statement of purpose writing and review", qty: "1", unitPriceAed: "25000" },
      { description: "HEC, IBCC and MOFA attestation assistance", qty: "1", unitPriceAed: "15000" },
    ],
  },
];

/** Students (and a few overseas-Pakistani parents). `job` is where they are now. */
export const PATIENTS: Array<{ first: string; last: string; email?: string; job?: string }> = [
  { first: "Ali", last: "Raza", job: "BS Computer Science graduate" },
  { first: "Hira", last: "Batool", job: "A-Level student" },
  { first: "Muhammad Ahmed", last: "Khan", job: "Bank officer" },
  { first: "Zainab", last: "Fatima", job: "MBBS graduate" },
  { first: "Hassan", last: "Javed", job: "BBA graduate" },
  { first: "Areeba", last: "Naveed", job: "FSc pre-engineering student" },
  { first: "Saad", last: "Bajwa", job: "BS Electrical Engineering, final year" },
  { first: "Maryam", last: "Tariq", job: "MPhil Chemistry student" },
  { first: "Bilal", last: "Ahmed", job: "Software engineer" },
  { first: "Iqra", last: "Shahid", job: "BS Psychology graduate" },
  { first: "Umer", last: "Farooq", job: "A-Level student" },
  { first: "Sana", last: "Riaz", job: "ACCA part-qualified" },
  { first: "Taimoor", last: "Aslam", job: "Civil engineer" },
  { first: "Rabia", last: "Anwar", job: "Pharm-D graduate" },
  { first: "Danish", last: "Mehmood", job: "BS Data Science graduate" },
  { first: "Laiba", last: "Zafar", job: "Intermediate (ICS) student" },
  { first: "Shahzaib", last: "Ali", job: "BS Mechanical Engineering graduate" },
  { first: "Fiza", last: "Rehman", job: "Lecturer" },
  { first: "Imran", last: "Sadiq", job: "Parent, based in Riyadh" },
  { first: "Aiman", last: "Chaudhry", job: "A-Level student" },
  { first: "Noman", last: "Akhtar", job: "Marketing executive" },
  { first: "Mehwish", last: "Gill", job: "Nurse" },
  { first: "Arslan", last: "Haider", job: "BS Accounting and Finance graduate" },
  { first: "Kinza", last: "Shah", job: "BS Architecture graduate" },
  { first: "Nadia", last: "Pervaiz", job: "Parent, based in Manchester" },
];

/**
 * SBC's referral partners and corporate clients: A-level colleges whose career counsellors refer
 * students, IELTS/PTE centres, and employers sponsoring staff for a master's. All fictional.
 */
export interface CompanySeed {
  name: string;
  emirate: Emirate;
  jurisdiction: Jurisdiction;
  freeZoneName: string | null;
  industry: string;
  website: string;
  address: string;
  /** Leading digits of the 7-digit SECP registration number. */
  licensePrefix: string;
  contact: { first: string; last: string; job: string };
}

export const COMPANIES: CompanySeed[] = [
  {
    name: "Indus Loom Textiles (Pvt) Ltd",
    emirate: "punjab",
    jurisdiction: "free_zone",
    freeZoneName: "Quaid-e-Azam Business Park",
    industry: "Textiles",
    website: "indusloom.com.pk",
    address: "Plot 14, Quaid-e-Azam Business Park, Sheikhupura",
    licensePrefix: "01",
    contact: { first: "Farah", last: "Naz", job: "HR manager" },
  },
  {
    name: "Sportsline Industries (Pvt) Ltd",
    emirate: "punjab",
    jurisdiction: "free_zone",
    freeZoneName: "Sialkot Export Processing Zone",
    industry: "Sports goods",
    website: "sportsline.com.pk",
    address: "Plot 7, Sialkot Export Processing Zone, Sialkot",
    licensePrefix: "00",
    contact: { first: "Waqas", last: "Cheema", job: "General manager" },
  },
  {
    name: "Kohsar Scholars College",
    emirate: "islamabad",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "A-level college",
    website: "kohsarscholars.edu.pk",
    address: "Street 12, F-7/2, Islamabad",
    licensePrefix: "01",
    contact: { first: "Samina", last: "Yousaf", job: "Career counsellor" },
  },
  {
    name: "Ravi Crescent College",
    emirate: "punjab",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "A-level college",
    website: "ravicrescent.edu.pk",
    address: "12-C Model Town Link Road, Lahore",
    licensePrefix: "00",
    contact: { first: "Sadia", last: "Rauf", job: "Head of A-levels" },
  },
  {
    name: "Clifton Codeworks (Pvt) Ltd",
    emirate: "sindh",
    jurisdiction: "free_zone",
    freeZoneName: "Karachi Export Processing Zone",
    industry: "Software",
    website: "cliftoncodeworks.com.pk",
    address: "Sector B-III, Karachi Export Processing Zone, Landhi, Karachi",
    licensePrefix: "01",
    contact: { first: "Adnan", last: "Qazi", job: "Head of people" },
  },
  {
    name: "Band Eight Language Centre",
    emirate: "punjab",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Test preparation",
    website: "bandeight.pk",
    address: "Bank Road, Saddar, Rawalpindi",
    licensePrefix: "01",
    contact: { first: "Adeel", last: "Anjum", job: "Centre director" },
  },
  {
    name: "Lyallpur Heights College",
    emirate: "punjab",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "A-level college",
    website: "lyallpurheights.edu.pk",
    address: "Susan Road, Madina Town, Faisalabad",
    licensePrefix: "00",
    contact: { first: "Nazia", last: "Hameed", job: "Head of careers" },
  },
  {
    name: "Qila Kohna Cambridge Campus",
    emirate: "punjab",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "School",
    website: "qilakohna.edu.pk",
    address: "Bosan Road, Gulgasht Colony, Multan",
    licensePrefix: "00",
    contact: { first: "Tahir", last: "Mehmood", job: "Principal" },
  },
  {
    name: "Khyber Crest PTE Centre",
    emirate: "khyber_pakhtunkhwa",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Test preparation",
    website: "khybercrest.pk",
    address: "University Road, Peshawar",
    licensePrefix: "01",
    contact: { first: "Asfandyar", last: "Khan", job: "Owner" },
  },
  {
    name: "Chenab Engineering Works (Pvt) Ltd",
    emirate: "punjab",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Engineering goods",
    website: "chenabengineering.com.pk",
    address: "GT Road, Gujranwala",
    licensePrefix: "00",
    contact: { first: "Rizwan", last: "Ashraf", job: "Admin manager" },
  },
  {
    name: "Mangla View College",
    emirate: "azad_kashmir",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "A-level college",
    website: "manglaview.edu.pk",
    address: "Allama Iqbal Road, Sector F-1, Mirpur",
    licensePrefix: "01",
    contact: { first: "Shazia", last: "Kiani", job: "Career counsellor" },
  },
  {
    name: "Indus Bridge IELTS Academy",
    emirate: "sindh",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "Test preparation",
    website: "indusbridge.pk",
    address: "Auto Bhan Road, Latifabad, Hyderabad",
    licensePrefix: "01",
    contact: { first: "Faraz", last: "Memon", job: "Academy director" },
  },
  {
    name: "Shalkot Grammar Academy",
    emirate: "balochistan",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "School",
    website: "shalkotgrammar.edu.pk",
    address: "Jinnah Road, Quetta",
    licensePrefix: "00",
    contact: { first: "Mehrunnisa", last: "Kakar", job: "Vice principal" },
  },
  {
    name: "Karakoram Heights School & College",
    emirate: "gilgit_baltistan",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "A-level college",
    website: "karakoramheights.edu.pk",
    address: "Jutial, Gilgit",
    licensePrefix: "00",
    contact: { first: "Shireen", last: "Hunzai", job: "Career guidance teacher" },
  },
  {
    name: "Harbour Lights A-Level College",
    emirate: "sindh",
    jurisdiction: "mainland",
    freeZoneName: null,
    industry: "A-level college",
    website: "harbourlights.edu.pk",
    address: "Khayaban-e-Ittehad, DHA Phase 6, Karachi",
    licensePrefix: "01",
    contact: { first: "Mehreen", last: "Ansari", job: "Career counsellor" },
  },
];

/** Names used for leads that never became contacts. */
export const LEAD_NAMES = [
  "Abdullah Tariq",
  "Maham Nadeem",
  "Talha Mushtaq",
  "Anum Saleem",
  "Haris Rafiq",
  "Sidra Arshad",
  "Zain Abbas",
  "Rimsha Kanwal",
  "Fahad Butt",
  "Esha Waheed",
  "Owais Siddiqi",
  "Hafsa Naqvi",
  "Shayan Rizvi",
  "Alishba Zaidi",
  "Taha Hashmi",
  "Rida Ansari",
  "Asfand Yousafzai",
  "Palwasha Khattak",
  "Junaid Afridi",
  "Zarmina Durrani",
  "Wali Marwat",
  "Sanam Memon",
  "Sarmad Soomro",
  "Nimra Jatoi",
  "Adil Kiani",
  "Uzma Mir",
  "Tanveer Dar",
  "Saima Abbasi",
  "Samuel Masih",
  "Sharon Bhatti",
  "Karim Hunzai",
  "Gulnar Baig",
  "Shahdad Baloch",
  "Minahil Cheema",
  "Waleed Warraich",
  "Zoya Gondal",
  "Arsalan Mughal",
  "Kinza Awan",
  "Hamid Rana",
  "Mahrukh Sheikh",
  "Faizan Virk",
  "Noor Fatima",
  "Rehan Farooqui",
  "Sehrish Jafri",
  "Usama Tarar",
  "Aqsa Arain",
  "Rayyan Chaudhry",
  "Hania Latif",
  "Moiz Qadir",
  "Emaan Rashid",
];

/** First messages people send about each service, in the English and Roman Urdu mix students write in. */
export const ENQUIRIES: Record<string, string[]> = {
  uk: [
    "AoA, mujhe UK study visa ke baare mein info chahiye. Mera IELTS 6.5 hai",
    "Mera beta A-levels kar raha hai. UK mein undergraduate ke liye kya process hai?",
    "I have a UK refusal from 2024. Can I apply again for September?",
  ],
  canada: [
    "Canada study permit ke liye kitna kharcha hoga total? GIC included",
    "I did FSc with 78%. Which Canadian colleges can I get into for Fall 2027?",
  ],
  australia: [
    "Assalam o Alaikum, Australia February intake mein Pharm-D ke baad kya options hain?",
    "What is the bank statement requirement for an Australia student visa?",
  ],
  usa: [
    "Want to apply for MS in the USA for Fall 2027. Do I need GRE?",
    "F-1 visa interview ki preparation karwate hain? My first interview was refused",
  ],
  germany: [
    "Germany mein tuition free hai? I have BS Mechanical, CGPA 2.9",
    "How much is the blocked account for Germany now and do you help with APS?",
  ],
  ireland: ["Ireland mein 2 saal ka stay back milta hai? MSc Business Analytics ke liye info chahiye"],
  malaysia: [
    "Malaysia is budget friendly? Beta ne A-levels kiye hain, BS Computer Science ke liye",
    "Can I apply to Malaysia without IELTS?",
  ],
  ielts: [
    "IELTS ki next batch kab start ho rahi hai? Weekend classes hain?",
    "I need 7 bands in writing. Do you have a crash course?",
  ],
  pte: ["PTE ka course kitne weeks ka hai aur fee kya hai?"],
  sop: [
    "Can you review my SOP for a UK master's? Deadline is in 10 days",
    "HEC attestation mein kitna time lagta hai? Degree aur transcript dono ki",
  ],
};

export const CAMPAIGNS: Partial<Record<LeadSource, string[]>> = {
  instagram: [
    "UK January intake — apply now (Instagram)",
    "Australia February intake (Instagram)",
    "IELTS in 8 weeks — new batch (Instagram)",
  ],
  facebook: ["Free counselling — Canada study permit (Facebook)", "USA Fall 2027 — F-1 guidance (Facebook)"],
  tiktok: [
    "Study in Germany tuition-free (TikTok instant form)",
    "UK January intake — apply now (TikTok instant form)",
  ],
  whatsapp: ["Click-to-WhatsApp: Book free counselling"],
};

export const WHATSAPP_TEMPLATES = [
  {
    name: "lead_first_touch",
    category: "utility" as const,
    body: "Assalam o Alaikum {{1}}, thank you for your {{2}} enquiry with SBC Study Abroad Consultants. This is {{3}}, your student counsellor. When is a good time to call you?",
    variableHints: ["Student first name", "Service", "Your name"],
  },
  {
    name: "appointment_reminder",
    category: "utility" as const,
    body: "Hi {{1}}, this is a reminder of your {{2}} counselling session on {{3}} at our Gulberg office, Lahore. Reply YES to confirm or call 042 3578 0142 to reschedule.",
    variableHints: ["Student first name", "Service", "Date and time"],
  },
  {
    name: "treatment_plan_followup",
    category: "utility" as const,
    body: "Hi {{1}}, your document checklist and university shortlist for {{2}} are ready. Reply to this message and we will share the details and next intake dates.",
    variableHints: ["Student first name", "Service"],
  },
];
