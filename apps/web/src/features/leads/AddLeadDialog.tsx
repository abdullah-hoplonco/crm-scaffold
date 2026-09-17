import { api } from "@hco/shared";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";

const AUTO = "__auto__";
const NONE = "__none__";

interface Draft {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  message: string;
  assignee: string;
}

export function AddLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("leads");
  const { user } = useSession();
  const navigate = useNavigate();
  const users = useApiQuery(api.workspace.listUsers, {});
  const blank = (): Draft => ({
    name: "",
    phone: "",
    email: "",
    companyName: "",
    message: "",
    // Reps usually log leads they're handling themselves; managers let the rotation decide.
    assignee: user.role === "rep" ? user.id : AUTO,
  });
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const create = useApiMutation(api.leads.create, {
    onSuccess: (lead) => {
      toast.success(lead.created === false ? t("add.merged", { name: lead.name }) : t("add.done"), {
        description: lead.created === false ? t("add.mergedDescription") : undefined,
      });
      onOpenChange(false);
      setDraft(blank());
      void navigate({ to: "/leads/$leadId", params: { leadId: lead.id } });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!draft.name.trim()) return setError(t("add.errors.name"));
    if (!draft.phone.trim() && !draft.email.trim()) return setError(t("add.errors.reach"));
    create.mutate({
      body: {
        name: draft.name.trim(),
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        companyName: draft.companyName.trim() || null,
        message: draft.message.trim() || null,
        assigneeId: draft.assignee === AUTO ? undefined : draft.assignee === NONE ? null : draft.assignee,
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>{t("add.title")}</DialogTitle>
          <DialogDescription>{t("add.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="lead-name">{t("add.name")}</Label>
            <Input
              id="lead-name"
              value={draft.name}
              onChange={(e) => set("name")(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-phone">{t("add.phone")}</Label>
              <Input
                id="lead-phone"
                type="tel"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="050 123 4567"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-email">{t("add.email")}</Label>
              <Input
                id="lead-email"
                type="email"
                value={draft.email}
                onChange={(e) => set("email")(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lead-company">
              {t("add.company")} <span className="font-normal text-muted-foreground">{t("add.optional")}</span>
            </Label>
            <Input
              id="lead-company"
              value={draft.companyName}
              onChange={(e) => set("companyName")(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lead-message">{t("add.message")}</Label>
            <Textarea
              id="lead-message"
              value={draft.message}
              onChange={(e) => set("message")(e.target.value)}
              placeholder={t("add.messagePlaceholder")}
              className="min-h-20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lead-assignee">{t("add.assignee")}</Label>
            <Select value={draft.assignee} onValueChange={set("assignee")}>
              <SelectTrigger id="lead-assignee" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>{t("add.assignAuto")}</SelectItem>
                <SelectItem value={NONE}>{t("common:states.unassigned")}</SelectItem>
                <SelectSeparator />
                {(users.data?.items ?? [])
                  .filter((u) => u.isActive)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        <UserAvatar name={u.name} size="sm" />
                        {u.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("add.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
