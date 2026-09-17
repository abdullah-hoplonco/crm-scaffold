import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the pipeline workstream. */
export const Route = createFileRoute("/_app/deals/$dealId")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Deal" />
      <EmptyState
        icon={Hammer}
        title="Deal is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
