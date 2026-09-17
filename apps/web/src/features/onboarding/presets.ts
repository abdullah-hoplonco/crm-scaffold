import { useTranslation } from "react-i18next";
import { z } from "zod";
import { PRESETS, type PresetKey } from "./draft";

const StageNames = z.array(z.string()).catch([]);

/** Starter pipelines people pick from. Won and Lost are added automatically after these open stages. */
export function usePresets(): Array<{ key: PresetKey; label: string; stages: string[] }> {
  const { t } = useTranslation("settings");
  return PRESETS.map((key) => ({
    key,
    label: t(`onboarding.presets.${key}.label`),
    stages: StageNames.parse(t(`onboarding.presets.${key}.stages`, { returnObjects: true })),
  }));
}
