import { api } from "@hco/shared";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { clearDemoLog } from "./demo-session";

export function ResetDemoButton() {
  const { t } = useTranslation("demo");
  const { t: tc } = useTranslation();
  const [open, setOpen] = useState(false);
  const reset = useApiMutation(api.demo.reset, {
    onSuccess: () => {
      // The logged leads and conversations no longer exist.
      clearDemoLog();
      setOpen(false);
      toast.success(t("toast.reset"), { description: t("toast.resetBody") });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <AlertDialog open={open} onOpenChange={(next) => !reset.isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RotateCcw />
          {t("reset.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("reset.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("reset.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reset.isPending}>{tc("actions.cancel")}</AlertDialogCancel>
          {/* A plain button, not AlertDialogAction, so the dialog stays open until the reset finishes. */}
          <Button variant="destructive" onClick={() => reset.mutate({})} disabled={reset.isPending}>
            {reset.isPending ? t("reset.working") : t("reset.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
