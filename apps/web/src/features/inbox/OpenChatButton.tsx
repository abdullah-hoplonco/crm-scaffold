import { api } from "@hco/shared";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** Opens the WhatsApp conversation for a lead or contact, starting one if there isn't one yet. */
export function OpenChatButton({
  leadId,
  contactId,
  className,
}: {
  leadId?: string;
  contactId?: string;
  className?: string;
}) {
  const { t } = useTranslation("inbox");
  const navigate = useNavigate();
  const start = useApiMutation(api.inbox.start, {
    onSuccess: (conversation) =>
      void navigate({ to: "/inbox/$conversationId", params: { conversationId: conversation.id } }),
    onError: (error) => toast.error(t("openChat.failed"), { description: errorMessage(error) }),
  });
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("gap-2", className)}
      disabled={start.isPending || (!leadId && !contactId)}
      onClick={() => start.mutate({ body: { leadId, contactId } })}
    >
      {start.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageCircle className="size-4 text-channel-whatsapp" />
      )}
      {t("openChat.label")}
    </Button>
  );
}
