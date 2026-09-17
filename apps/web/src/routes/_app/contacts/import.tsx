import { createFileRoute } from "@tanstack/react-router";
import { ImportWizard } from "@/features/contacts/import/ImportWizard";

export const Route = createFileRoute("/_app/contacts/import")({
  component: ImportWizard,
});
