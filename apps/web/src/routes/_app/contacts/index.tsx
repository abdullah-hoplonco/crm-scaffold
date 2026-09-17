import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the contacts-companies workstream. */
export const Route = createFileRoute("/_app/contacts/")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Contacts" />
      <EmptyState
        icon={Hammer}
        title="Contacts is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
