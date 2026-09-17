import { LostReason } from "@hco/shared";
import { CircleX, Trophy } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/app/Money";
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
import { cn } from "@/lib/utils";

interface DealSummary {
  title: string;
  valueAed: string;
}

export function WonDealDialog({
  deal,
  stageName,
  open,
  onConfirm,
  onCancel,
}: {
  deal: DealSummary | null;
  stageName: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("pipeline");
  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
            <Trophy className="size-5" />
          </span>
          <AlertDialogTitle>{t("won.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("won.description", { stage: stageName })}</AlertDialogDescription>
        </AlertDialogHeader>
        {deal ? (
          <div className="flex items-baseline justify-between gap-3 rounded-md border bg-card px-3 py-2.5 text-sm">
            <span className="min-w-0 truncate font-medium">{deal.title}</span>
            <Money value={deal.valueAed} className="font-semibold" />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
          <Button
            className="bg-success text-white hover:bg-success/90 focus-visible:ring-success/30"
            onClick={onConfirm}
          >
            <Trophy />
            {t("won.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LostDealDialog({
  deal,
  stageName,
  open,
  onConfirm,
  onCancel,
}: {
  deal: DealSummary | null;
  stageName: string;
  open: boolean;
  onConfirm: (input: { lostReason: LostReason; lostNote: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("pipeline");
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>{t("lost.title")}</DialogTitle>
          <DialogDescription>
            {deal ? t("lost.description", { title: deal.title, stage: stageName }) : null}
          </DialogDescription>
        </DialogHeader>
        {/* Lives inside the content so every opening starts with a blank form. */}
        <LostReasonForm onConfirm={onConfirm} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}

function LostReasonForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (input: { lostReason: LostReason; lostNote: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("pipeline");
  const [reason, setReason] = useState<LostReason | null>(null);
  const [note, setNote] = useState("");
  const [showError, setShowError] = useState(false);
  const noteId = useId();
  const errorId = useId();
  const reasonId = useId();

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) {
          setShowError(true);
          return;
        }
        onConfirm({ lostReason: reason, lostNote: note.trim() });
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("lost.reasonLabel")}</legend>
        <RadioGroup
          value={reason ?? ""}
          onValueChange={(value) => {
            setReason(LostReason.parse(value));
            setShowError(false);
          }}
          aria-describedby={showError && !reason ? errorId : undefined}
          className="grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {LostReason.options.map((option) => (
            <Label
              key={option}
              htmlFor={`${reasonId}-${option}`}
              className={cn(
                "cursor-pointer rounded-md border bg-card px-3 py-2.5 font-normal transition-colors",
                "hover:border-destructive/40 has-[[data-state=checked]]:border-destructive has-[[data-state=checked]]:bg-danger-soft has-[[data-state=checked]]:font-medium has-[[data-state=checked]]:text-destructive",
              )}
            >
              <RadioGroupItem
                id={`${reasonId}-${option}`}
                value={option}
                className="data-[state=checked]:border-destructive [&_svg]:fill-destructive"
              />
              {t(`common:lostReasons.${option}`)}
            </Label>
          ))}
        </RadioGroup>
        {showError && !reason ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {t("lost.reasonRequired")}
          </p>
        ) : null}
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor={noteId}>
          {t("lost.noteLabel")}
          <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </Label>
        <Textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("lost.notePlaceholder")}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common:actions.cancel")}
        </Button>
        <Button type="submit" variant="destructive">
          <CircleX />
          {t("lost.confirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}
