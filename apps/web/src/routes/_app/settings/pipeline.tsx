import { createFileRoute } from "@tanstack/react-router";
import { StageEditor } from "@/features/pipeline/settings/StageEditor";

export const Route = createFileRoute("/_app/settings/pipeline")({
  component: StageEditor,
});
