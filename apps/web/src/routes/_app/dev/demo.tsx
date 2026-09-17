import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the demo-simulator workstream. */
export const Route = createFileRoute("/_app/dev/demo")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Demo panel" />
      <EmptyState
        icon={Hammer}
        title="Demo panel is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
