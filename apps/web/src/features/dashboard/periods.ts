import { z } from "zod";

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;

/** `?period=7|30|90` on /dashboard; anything else falls back to the default. */
export const dashboardSearch = z.object({
  period: z
    .union([z.literal(7), z.literal(30), z.literal(90)])
    .optional()
    .catch(undefined),
});
