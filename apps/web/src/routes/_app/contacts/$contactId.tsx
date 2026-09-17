import { createFileRoute } from "@tanstack/react-router";
import { ContactDetailPage } from "@/features/contacts/ContactDetailPage";

export const Route = createFileRoute("/_app/contacts/$contactId")({
  component: ContactRoute,
});

function ContactRoute() {
  const { contactId } = Route.useParams();
  return <ContactDetailPage key={contactId} contactId={contactId} />;
}
