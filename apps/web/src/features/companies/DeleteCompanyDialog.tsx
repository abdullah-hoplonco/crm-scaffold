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

export function DeleteCompanyDialog({
  open,
  onOpenChange,
  companyId,
  name,
  contactsCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  name: string;
  contactsCount: number;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const remove = useApiMutation(api.companies.remove);

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
          <AlertDialogTitle>{t("companyDelete.title", { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {contactsCount > 0
              ? t("companyDelete.withContacts", { count: contactsCount })
              : t("companyDelete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(remove.error)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(
                { params: { companyId } },
                {
                  onSuccess: () => {
                    toast.success(t("companyDelete.done", { name }));
                    onOpenChange(false);
                    void navigate({ to: "/companies" });
                  },
                },
              )
            }
          >
            {remove.isPending ? t("delete.deleting") : t("companyDelete.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
