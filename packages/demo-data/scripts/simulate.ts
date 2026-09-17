/**
 * Print a handful of Simulator outputs for a seed, to eyeball names, enquiries and campaigns.
 * Run with `pnpm --filter @hco/demo-data exec tsx scripts/simulate.ts [seed]`.
 */
import {
  createRng,
  pickMixedSource,
  simulateFollowUp,
  simulateLead,
  simulateUnknownWhatsapp,
  type PatientPhase,
} from "../src/index";

const seed = Number(process.argv[2] ?? 42);
const rng = createRng(seed);
const used = new Set<string>();
const now = new Date();

for (let i = 0; i < 10; i++) {
  const lead = simulateLead(rng, { source: pickMixedSource(rng), usedPhones: used, now });
  console.log(
    `${lead.source.padEnd(9)} ${lead.person.name.padEnd(24)} ${lead.phoneE164}  ${lead.campaignName ?? "-"}\n          "${lead.message}"`,
  );
}

const unknown = simulateUnknownWhatsapp(rng, { usedPhones: used, now });
console.log(`\nunknown number: ${unknown.person.name} ${unknown.phoneE164}: "${unknown.body}"`);

for (const phase of ["enquiry", "booked", "consulted", "customer", "none"] as PatientPhase[]) {
  console.log(`${phase.padEnd(9)} "${simulateFollowUp(rng, { phase, treatmentKey: "invisalign" })}"`);
}

const again = simulateLead(createRng(seed), { source: "instagram", usedPhones: new Set(), now });
const repeat = simulateLead(createRng(seed), { source: "instagram", usedPhones: new Set(), now });
console.log("\ndeterministic for a seed:", JSON.stringify(again) === JSON.stringify(repeat));
