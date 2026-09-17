import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { PipelinePage } from "@/features/pipeline/PipelinePage";
import { pipelineSearch, type PipelineSearch } from "@/features/pipeline/search";

export const Route = createFileRoute("/_app/pipeline")({
  validateSearch: pipelineSearch,
  component: PipelineRoute,
});

function PipelineRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (next: Partial<PipelineSearch>) =>
      void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true }),
    [navigate],
  );
  return <PipelinePage search={search} onSearchChange={onSearchChange} />;
}
