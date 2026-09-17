import { api } from "@hco/shared";
import { handle, type MockHandler } from "../define";
import { rows } from "../scope";

/** Pipeline and deals. Starter getDefault; the pipeline workstream owns and completes this file. */
export const pipelineHandlers: MockHandler[] = [
  handle(api.pipeline.getDefault, (ctx) => {
    const pipeline = rows(ctx, "pipelines").find((p) => p.isDefault) ?? rows(ctx, "pipelines")[0];
    if (!pipeline) throw ctx.error("NOT_FOUND", "This workspace has no pipeline yet.");
    const stages = rows(ctx, "stages")
      .filter((s) => s.pipelineId === pipeline.id)
      .sort((a, b) => a.position - b.position);
    return { pipeline, stages };
  }),
];
