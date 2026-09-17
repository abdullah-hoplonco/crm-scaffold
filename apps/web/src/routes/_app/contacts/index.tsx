import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import { ContactsPage } from "@/features/contacts/ContactsPage";

export const Route = createFileRoute("/_app/contacts/")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: ContactsRoute,
});

function ContactsRoute() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (next: string) => void navigate({ search: { q: next || undefined }, replace: true }),
    [navigate],
  );
  return <ContactsPage search={q ?? ""} onSearchChange={onSearchChange} />;
}
