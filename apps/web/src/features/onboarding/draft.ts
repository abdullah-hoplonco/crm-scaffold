import type { Emirate, Role } from "@hco/shared";
import { InviteInput, OnboardingInput } from "@hco/shared/api/workspace";
import { isValidTrn, trnDigits } from "@/features/settings/trn";

export const PRESETS = ["clinic", "realEstate", "b2b"] as const;
export type PresetKey = (typeof PRESETS)[number];

export const MAX_OPEN_STAGES = 12;
export const MAX_INVITES = 20;

export interface InviteDraft {
  key: string;
  name: string;
  email: string;
  role: Role;
}

export interface StageDraft {
  key: string;
  name: string;
}

export interface OnboardingDraft {
  workspaceName: string;
  trn: string;
  emirate: Emirate | null;
  ownerName: string;
  ownerEmail: string;
  invites: InviteDraft[];
  preset: PresetKey | null;
  stages: StageDraft[];
}

/** Field errors keyed by path, e.g. "workspaceName" or "invites.<key>.email". Values are i18n keys. */
export type DraftErrors = Record<string, string>;

let counter = 0;
export function draftKey(): string {
  counter += 1;
  return `k${Date.now().toString(36)}${counter}`;
}

export function emptyInvite(): InviteDraft {
  return { key: draftKey(), name: "", email: "", role: "rep" };
}

export function stagesFrom(names: string[]): StageDraft[] {
  return names.map((name) => ({ key: draftKey(), name }));
}

export function isBlankInvite(invite: InviteDraft) {
  return !invite.name.trim() && !invite.email.trim();
}

export function validateBusiness(draft: OnboardingDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!OnboardingInput.shape.workspaceName.safeParse(draft.workspaceName).success) {
    errors.workspaceName = "onboarding.errors.workspaceName";
  }
  if (draft.trn.trim() && !isValidTrn(draft.trn)) errors.trn = "onboarding.errors.trn";
  return errors;
}

export function validateOwner(draft: OnboardingDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!OnboardingInput.shape.ownerName.safeParse(draft.ownerName).success) {
    errors.ownerName = "onboarding.errors.ownerName";
  }
  if (!OnboardingInput.shape.ownerEmail.safeParse(draft.ownerEmail.trim()).success) {
    errors.ownerEmail = "onboarding.errors.email";
  }
  return errors;
}

export function validateTeam(draft: OnboardingDraft): DraftErrors {
  const errors: DraftErrors = {};
  const seen = new Set([draft.ownerEmail.trim().toLowerCase()]);
  for (const invite of draft.invites) {
    if (isBlankInvite(invite)) continue;
    if (!InviteInput.shape.name.safeParse(invite.name).success) {
      errors[`invites.${invite.key}.name`] = "onboarding.errors.inviteName";
    }
    const email = invite.email.trim().toLowerCase();
    if (!InviteInput.shape.email.safeParse(email).success) {
      errors[`invites.${invite.key}.email`] = "onboarding.errors.email";
    } else if (seen.has(email)) {
      errors[`invites.${invite.key}.email`] = "onboarding.errors.emailTwice";
    }
    seen.add(email);
  }
  return errors;
}

export function validatePipeline(draft: OnboardingDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.stages.length === 0) errors.stages = "onboarding.errors.noStages";
  const seen = new Set(["won", "lost"]);
  for (const stage of draft.stages) {
    const name = stage.name.trim().toLowerCase();
    if (!name) errors[`stages.${stage.key}`] = "onboarding.errors.stageName";
    else if (seen.has(name)) errors[`stages.${stage.key}`] = "onboarding.errors.stageTwice";
    seen.add(name);
  }
  return errors;
}

export const STEP_VALIDATORS = [validateBusiness, validateOwner, validateTeam, validatePipeline, () => ({})];

export function toOnboardingInput(draft: OnboardingDraft): OnboardingInput {
  return {
    workspaceName: draft.workspaceName.trim(),
    trn: draft.trn.trim() ? trnDigits(draft.trn) : null,
    emirate: draft.emirate,
    ownerName: draft.ownerName.trim(),
    ownerEmail: draft.ownerEmail.trim().toLowerCase(),
    invites: draft.invites
      .filter((invite) => !isBlankInvite(invite))
      .map((invite) => ({
        name: invite.name.trim(),
        email: invite.email.trim().toLowerCase(),
        role: invite.role,
      })),
    stages: draft.stages.map((stage) => stage.name.trim()),
  };
}
