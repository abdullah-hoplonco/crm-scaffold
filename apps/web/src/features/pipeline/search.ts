import { LeadSource } from "@hco/shared";
import { z } from "zod";

/** URL state of the board, so a filtered view can be shared or reloaded. */
export const pipelineSearch = z.object({
  view: z.enum(["mine", "everyone"]).optional(),
  q: z.string().optional(),
  source: LeadSource.optional(),
});
export type PipelineSearch = z.infer<typeof pipelineSearch>;
