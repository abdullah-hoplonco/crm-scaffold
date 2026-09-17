import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the settings-onboarding workstream. */
export const Route = createFileRoute("/_app/settings/assignment")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Lead assignment" />
      <EmptyState
        icon={Hammer}
        title="Lead assignment is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
