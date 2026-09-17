import { api } from "@hco/shared";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";

/** Confirm, then soft-delete. A contact with open deals can't be deleted, and the dialog says why up front. */
export function DeleteContactDialog({
  open,
  onOpenChange,
  contactId,
  name,
  openDealsCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  name: string;
  openDealsCount: number;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const remove = useApiMutation(api.contacts.remove);
  const blocked = openDealsCount > 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) remove.reset();
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked ? t("delete.blockedTitle", { name }) : t("delete.title", { name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked ? t("delete.blocked", { count: openDealsCount }) : t("delete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(remove.error)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{blocked ? tc("actions.close") : tc("actions.cancel")}</AlertDialogCancel>
          {blocked ? null : (
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(
                  { params: { contactId } },
                  {
                    onSuccess: () => {
                      toast.success(t("delete.done", { name }));
                      onOpenChange(false);
                      void navigate({ to: "/contacts" });
                    },
                  },
                )
              }
            >
              {remove.isPending ? t("delete.deleting") : t("delete.confirm")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
