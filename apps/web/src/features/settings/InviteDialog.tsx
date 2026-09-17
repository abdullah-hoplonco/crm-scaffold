import { Role, api, type User } from "@hco/shared";
import { InviteInput } from "@hco/shared/api/workspace";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useApiMutation } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<"name" | "email", string>>;

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [result, setResult] = useState<{ user: User; inviteUrl: string } | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) window.setTimeout(() => setResult(null), 200);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {result ? (
          <InviteResult result={result} onDone={() => onOpenChange(false)} />
        ) : (
          <InviteForm onInvited={setResult} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  onInvited,
  onCancel,
}: {
  onInvited: (result: { user: User; inviteUrl: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("rep");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const invite = useApiMutation(api.workspace.inviteUser, {
    onSuccess: (data) => {
      toast.success(t("team.inviteDialog.created", { name: data.user.name }));
      onInvited(data);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const parsed = InviteInput.safeParse({ name, email: email.trim(), role });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "name" || field === "email") && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    invite.mutate({ body: parsed.data });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{t("team.inviteDialog.title")}</DialogTitle>
        <DialogDescription>{t("team.inviteDialog.description")}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>{t("team.inviteDialog.name")}</Label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            placeholder={t("team.inviteDialog.namePlaceholder")}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            autoFocus
          />
          {errors.name ? (
            <p id={`${id}-name-error`} className="text-sm text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-email`}>{t("team.inviteDialog.email")}</Label>
          <Input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            placeholder={t("team.inviteDialog.emailPlaceholder")}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
          />
          {errors.email ? (
            <p id={`${id}-email-error`} className="text-sm text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium">{t("team.inviteDialog.role")}</legend>
          <RadioGroup value={role} onValueChange={(v) => setRole(Role.parse(v))} className="gap-2">
            {(["rep", "manager", "owner"] as const).map((option) => (
              <label
                key={option}
                htmlFor={`${id}-role-${option}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50",
                  role === option && "border-primary/50 bg-accent/60 hover:bg-accent/60",
                )}
              >
                <RadioGroupItem id={`${id}-role-${option}`} value={option} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{tc(`roles.${option}`)}</span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">
                    {t(`team.roleHelp.${option}`)}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>
        {formError ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc("actions.cancel")}
        </Button>
        <Button type="submit" disabled={invite.isPending}>
          <Link2 />
          {invite.isPending ? t("team.inviteDialog.submitting") : t("team.inviteDialog.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function InviteResult({ result, onDone }: { result: { user: User; inviteUrl: string }; onDone: () => void }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const { user, inviteUrl } = result;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success(t("team.inviteResult.copied"));
    } catch {
      inputRef.current?.select();
      toast(t("team.inviteResult.copyManually"));
    }
  };

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{t("team.inviteResult.title", { name: user.name })}</DialogTitle>
        <DialogDescription>{t("team.inviteResult.description")}</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
        <UserAvatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          {tc(`roles.${user.role}`)}
        </span>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-link`}>{t("team.inviteResult.linkLabel")}</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={`${id}-link`}
            value={inviteUrl}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="text-[13px]"
          />
          <Button type="button" variant="outline" onClick={() => void copy()} className="shrink-0">
            {copied ? <Check className="text-success" /> : <Copy />}
            {copied ? t("team.inviteResult.copiedShort") : t("team.inviteResult.copy")}
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground">{t("team.inviteResult.demoNote")}</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => window.open(inviteUrl, "_blank", "noopener")}>
          <ExternalLink />
          {t("team.inviteResult.openWindow")}
        </Button>
        <Button type="button" onClick={onDone}>
          {t("team.inviteResult.done")}
        </Button>
      </DialogFooter>
    </div>
  );
}
