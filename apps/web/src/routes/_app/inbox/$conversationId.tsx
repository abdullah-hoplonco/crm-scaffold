import { createFileRoute } from "@tanstack/react-router";
import { ConversationThread } from "@/features/inbox/ConversationThread";

export const Route = createFileRoute("/_app/inbox/$conversationId")({
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  return <ConversationThread key={conversationId} conversationId={conversationId} />;
}
