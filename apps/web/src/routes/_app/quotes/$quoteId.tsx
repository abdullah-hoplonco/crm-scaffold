import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { QuotePage } from "@/features/quotes/QuotePage";

export const Route = createFileRoute("/_app/quotes/$quoteId")({
  validateSearch: z.object({ mode: z.literal("edit").optional() }),
  component: RouteComponent,
});

function RouteComponent() {
  const { quoteId } = Route.useParams();
  const { mode } = Route.useSearch();
  return <QuotePage quoteId={quoteId} mode={mode} />;
}
