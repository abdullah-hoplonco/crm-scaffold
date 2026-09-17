import { api, DisqualifyReason } from "@hco/shared";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export function DisqualifyDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
}: {
  leadId: string;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("leads");
  const [reason, setReason] = useState<DisqualifyReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const disqualify = useApiMutation(api.leads.setStatus, {
    onSuccess: () => {
      toast.success(t("actions.disqualified"));
      onOpenChange(false);
      setReason(null);
      setNote("");
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return setError(t("disqualify.reasonRequired"));
    setError(null);
    disqualify.mutate({
      params: { leadId },
      body: { status: "disqualified", reason, note: note.trim() || undefined },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="text-start">
          <DialogTitle>{t("disqualify.title", { name: leadName })}</DialogTitle>
          <DialogDescription>{t("disqualify.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("disqualify.reason")}</legend>
            <RadioGroup
              value={reason ?? ""}
              onValueChange={(v) => {
                setReason(v as DisqualifyReason);
                setError(null);
              }}
              className="grid gap-2 sm:grid-cols-2"
            >
              {DisqualifyReason.options.map((r) => (
                <Label
                  key={r}
                  htmlFor={`dq-${r}`}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-muted",
                    reason === r && "border-primary bg-accent",
                  )}
                >
                  <RadioGroupItem id={`dq-${r}`} value={r} />
                  {t(`common:disqualifyReasons.${r}`)}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="dq-note">
              {t("disqualify.note")} <span className="font-normal text-muted-foreground">{t("add.optional")}</span>
            </Label>
            <Textarea
              id="dq-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("disqualify.notePlaceholder")}
              className="min-h-20"
            />
          </div>
          {error ? (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={disqualify.isPending}>
              {disqualify.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("actions.disqualify")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
