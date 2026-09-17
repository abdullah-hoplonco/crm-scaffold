import { api } from "@hco/shared";
import { Mail, MessageCircle } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { useApiMutation } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { handleFrom, type ConnectableType } from "./channel-meta";
import {
  BusyState,
  ChoiceRow,
  DetailList,
  FlowFrame,
  PermissionList,
  ProviderButton,
  ResultState,
  simulateProvider,
} from "./flow-parts";

/** Believable, clearly-marked demo connect flows for each channel. */
export function ConnectDialog({
  type,
  onOpenChange,
}: {
  type: ConnectableType | null;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={type !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {type === "whatsapp_cloud" ? <WhatsappFlow onClose={close} /> : null}
        {type === "meta_leadads" ? <MetaFlow onClose={close} /> : null}
        {type === "tiktok_leads" ? <TiktokFlow onClose={close} /> : null}
        {type === "gmail" ? <GmailFlow onClose={close} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function useConnect(successKey: string) {
  const { t } = useTranslation("settings");
  return useApiMutation(api.workspace.connectChannel, {
    onSuccess: () => toast.success(t(successKey)),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

function CancelButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      {t("actions.cancel")}
    </Button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button type="button" variant="ghost" onClick={onClick}>
      {t("actions.back")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp Business
// ---------------------------------------------------------------------------

function WhatsappFlow({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("settings");
  const { workspace } = useSession();
  const id = useId();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const numbers = [
    { phone: "+971 4 555 0142", meta: t("connect.whatsapp.numberVerified", { name: workspace.name }) },
    { phone: "+971 50 555 0199", meta: t("connect.whatsapp.numberNew") },
  ];
  const [phone, setPhone] = useState(numbers[0]?.phone ?? "");
  const [code, setCode] = useState("482915");
  const [codeError, setCodeError] = useState<string | null>(null);
  const connect = useConnect("connect.whatsapp.toast");
  const steps = [
    t("connect.steps.signIn"),
    t("connect.whatsapp.stepNumber"),
    t("connect.whatsapp.stepVerify"),
    t("connect.steps.done"),
  ];

  const signIn = async () => {
    setBusy(t("connect.waitingFor", { provider: "Facebook" }));
    await simulateProvider();
    setBusy(null);
    setStep(1);
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) {
      setCodeError(t("connect.whatsapp.codeError"));
      return;
    }
    setBusy(t("connect.whatsapp.registering"));
    try {
      await simulateProvider(900);
      await connect.mutateAsync({
        body: { type: "whatsapp_cloud", details: { displayPhone: phone, verifiedName: workspace.name } },
      });
      setStep(3);
    } catch {
      // The toast explains what went wrong; stay on this step.
    } finally {
      setBusy(null);
    }
  };

  return (
    <FlowFrame
      type="whatsapp_cloud"
      title={t("connect.whatsapp.title")}
      description={t("connect.whatsapp.intro")}
      steps={steps}
      current={step}
      footer={
        busy ? null : step === 0 ? (
          <CancelButton onClick={onClose} />
        ) : step === 1 ? (
          <>
            <BackButton onClick={() => setStep(0)} />
            <Button onClick={() => setStep(2)}>{t("connect.continue")}</Button>
          </>
        ) : step === 2 ? (
          <>
            <BackButton onClick={() => setStep(1)} />
            <Button onClick={() => void verify()}>{t("connect.whatsapp.verify")}</Button>
          </>
        ) : (
          <Button onClick={onClose}>{t("connect.done")}</Button>
        )
      }
    >
      {busy ? (
        <BusyState label={busy} detail={t("connect.busyDetail")} />
      ) : step === 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t("connect.whatsapp.intro")}</p>
          <PermissionList
            items={[
              t("connect.whatsapp.permSend"),
              t("connect.whatsapp.permReceipts"),
              t("connect.whatsapp.permTemplates"),
            ]}
          />
          <ProviderButton provider="facebook" onClick={() => void signIn()}>
            {t("connect.continueWith", { provider: "Facebook" })}
          </ProviderButton>
          <p className="text-center text-xs text-muted-foreground">{t("connect.demoNote")}</p>
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("connect.whatsapp.chooseNumber")}</p>
          <RadioGroup value={phone} onValueChange={setPhone} className="gap-2">
            {numbers.map((n, i) => (
              <ChoiceRow
                key={n.phone}
                id={`${id}-n${i}`}
                value={n.phone}
                selected={phone === n.phone}
                title={<span className="tabular-nums">{n.phone}</span>}
                meta={n.meta}
                aside={<MessageCircle className="size-4 text-channel-whatsapp" aria-hidden="true" />}
              />
            ))}
          </RadioGroup>
        </div>
      ) : step === 2 ? (
        <div className="grid gap-3">
          <Label htmlFor={`${id}-code`} className="block leading-snug font-normal text-muted-foreground">
            {t("connect.whatsapp.codeLabel", { phone })}
          </Label>
          <Input
            id={`${id}-code`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setCodeError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-12 text-center text-xl font-semibold tracking-[0.5em] tabular-nums"
            aria-invalid={codeError ? true : undefined}
          />
          {codeError ? <p className="text-sm text-destructive">{codeError}</p> : null}
          <p className="text-xs text-muted-foreground">{t("connect.whatsapp.codeDemo")}</p>
        </div>
      ) : (
        <ResultState title={t("connect.whatsapp.doneTitle")}>
          <p>{t("connect.whatsapp.doneBody", { phone })}</p>
          <DetailList
            items={[
              { label: t("channels.whatsapp.number"), value: <span className="tabular-nums">{phone}</span> },
              { label: t("channels.whatsapp.verifiedName"), value: workspace.name },
              { label: t("channels.whatsapp.quality"), value: t("channels.quality.high") },
            ]}
          />
        </ResultState>
      )}
    </FlowFrame>
  );
}

// ---------------------------------------------------------------------------
// Facebook & Instagram lead ads
// ---------------------------------------------------------------------------

function MetaFlow({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("settings");
  const { workspace } = useSession();
  const id = useId();
  const handle = handleFrom(workspace.name);
  const pages = [
    { name: workspace.name, instagram: `@${handle}` },
    { name: t("connect.meta.careersPage", { name: workspace.name }), instagram: null },
  ];
  const forms = [
    t("connect.meta.forms.enquiry"),
    t("connect.meta.forms.consultation"),
    t("connect.meta.forms.callback"),
    t("connect.meta.forms.priceList"),
  ];
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [pageName, setPageName] = useState(pages[0]?.name ?? "");
  const [selectedForms, setSelectedForms] = useState<string[]>(forms);
  const connect = useConnect("connect.meta.toast");
  const page = pages.find((p) => p.name === pageName);
  const steps = [
    t("connect.steps.signIn"),
    t("connect.meta.stepPage"),
    t("connect.meta.stepForms"),
    t("connect.meta.stepSubscribed"),
  ];

  const signIn = async () => {
    setBusy(t("connect.waitingFor", { provider: "Facebook" }));
    await simulateProvider();
    setBusy(null);
    setStep(1);
  };

  const subscribe = async () => {
    setBusy(t("connect.meta.subscribing", { page: pageName }));
    try {
      await simulateProvider(900);
      await connect.mutateAsync({
        body: {
          type: "meta_leadads",
          details: {
            pageName,
            formNames: selectedForms,
            ...(page?.instagram ? { instagramHandle: page.instagram } : {}),
          },
        },
      });
      setStep(3);
    } catch {
      // The toast explains what went wrong; stay on this step.
    } finally {
      setBusy(null);
    }
  };

  const toggleForm = (form: string, checked: boolean) =>
    setSelectedForms((current) =>
      checked ? forms.filter((f) => f === form || current.includes(f)) : current.filter((f) => f !== form),
    );

  return (
    <FlowFrame
      type="meta_leadads"
      title={t("connect.meta.title")}
      description={t("connect.meta.intro")}
      steps={steps}
      current={step}
      footer={
        busy ? null : step === 0 ? (
          <CancelButton onClick={onClose} />
        ) : step === 1 ? (
          <>
            <BackButton onClick={() => setStep(0)} />
            <Button onClick={() => setStep(2)}>{t("connect.continue")}</Button>
          </>
        ) : step === 2 ? (
          <>
            <BackButton onClick={() => setStep(1)} />
            <Button onClick={() => void subscribe()} disabled={selectedForms.length === 0}>
              {t("connect.meta.subscribe")}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>{t("connect.done")}</Button>
        )
      }
    >
      {busy ? (
        <BusyState label={busy} detail={t("connect.busyDetail")} />
      ) : step === 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t("connect.meta.intro")}</p>
          <PermissionList
            items={[
              t("connect.meta.permPages"),
              t("connect.meta.permLeads"),
              t("connect.meta.permInstagram"),
            ]}
          />
          <ProviderButton provider="facebook" onClick={() => void signIn()}>
            {t("connect.continueWith", { provider: "Facebook" })}
          </ProviderButton>
          <p className="text-center text-xs text-muted-foreground">{t("connect.demoNote")}</p>
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("connect.meta.choosePage")}</p>
          <RadioGroup value={pageName} onValueChange={setPageName} className="gap-2">
            {pages.map((p, i) => (
              <ChoiceRow
                key={p.name}
                id={`${id}-p${i}`}
                value={p.name}
                selected={pageName === p.name}
                title={p.name}
                meta={
                  p.instagram
                    ? t("connect.meta.linkedInstagram", { handle: p.instagram })
                    : t("connect.meta.noInstagram")
                }
              />
            ))}
          </RadioGroup>
        </div>
      ) : step === 2 ? (
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm text-muted-foreground">
            {t("connect.meta.chooseForms", { page: pageName })}
          </legend>
          <div className="grid gap-2">
            {forms.map((form, i) => {
              const checked = selectedForms.includes(form);
              return (
                <label
                  key={form}
                  htmlFor={`${id}-f${i}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
                    checked && "border-primary/40 bg-accent/40",
                  )}
                >
                  <Checkbox
                    id={`${id}-f${i}`}
                    checked={checked}
                    onCheckedChange={(v) => toggleForm(form, v === true)}
                  />
                  <span className="min-w-0 flex-1 truncate">{form}</span>
                </label>
              );
            })}
          </div>
          {selectedForms.length === 0 ? (
            <p className="text-sm text-destructive">{t("connect.meta.formsError")}</p>
          ) : null}
        </fieldset>
      ) : (
        <ResultState title={t("connect.meta.doneTitle")}>
          <p>{t("connect.meta.doneBody", { count: selectedForms.length, page: pageName })}</p>
          <DetailList
            items={[
              { label: t("channels.meta.page"), value: pageName },
              { label: t("channels.meta.instagram"), value: page?.instagram ?? t("channels.meta.notLinked") },
              { label: t("channels.meta.forms"), value: selectedForms.length },
            ]}
          />
        </ResultState>
      )}
    </FlowFrame>
  );
}

// ---------------------------------------------------------------------------
// TikTok lead forms
// ---------------------------------------------------------------------------

function TiktokFlow({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("settings");
  const { workspace } = useSession();
  const id = useId();
  const accounts = [
    { name: t("connect.tiktok.accountUae", { name: workspace.name }), id: "7301 5582 0914" },
    { name: t("connect.tiktok.accountKsa", { name: workspace.name }), id: "7301 5582 1127" },
  ];
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [advertiser, setAdvertiser] = useState(accounts[0]?.name ?? "");
  const connect = useConnect("connect.tiktok.toast");
  const steps = [
    t("connect.steps.signIn"),
    t("connect.tiktok.stepAccount"),
    t("connect.tiktok.stepRequest"),
    t("connect.tiktok.stepPending"),
  ];

  const signIn = async () => {
    setBusy(t("connect.waitingFor", { provider: "TikTok" }));
    await simulateProvider();
    setBusy(null);
    setStep(1);
  };

  const request = async () => {
    setBusy(t("connect.tiktok.requesting"));
    try {
      await simulateProvider(900);
      await connect.mutateAsync({ body: { type: "tiktok_leads", details: { advertiserName: advertiser } } });
      setStep(3);
    } catch {
      // The toast explains what went wrong; stay on this step.
    } finally {
      setBusy(null);
    }
  };

  return (
    <FlowFrame
      type="tiktok_leads"
      title={t("connect.tiktok.title")}
      description={t("connect.tiktok.intro")}
      steps={steps}
      current={step}
      footer={
        busy ? null : step === 0 ? (
          <CancelButton onClick={onClose} />
        ) : step === 1 ? (
          <>
            <BackButton onClick={() => setStep(0)} />
            <Button onClick={() => setStep(2)}>{t("connect.continue")}</Button>
          </>
        ) : step === 2 ? (
          <>
            <BackButton onClick={() => setStep(1)} />
            <Button onClick={() => void request()}>{t("connect.tiktok.request")}</Button>
          </>
        ) : (
          <Button onClick={onClose}>{t("connect.done")}</Button>
        )
      }
    >
      {busy ? (
        <BusyState label={busy} detail={t("connect.busyDetail")} />
      ) : step === 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t("connect.tiktok.intro")}</p>
          <PermissionList items={[t("connect.tiktok.permForms"), t("connect.tiktok.permLeads")]} />
          <ProviderButton provider="tiktok" onClick={() => void signIn()}>
            {t("connect.continueWith", { provider: "TikTok" })}
          </ProviderButton>
          <p className="text-center text-xs text-muted-foreground">{t("connect.demoNote")}</p>
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("connect.tiktok.chooseAccount")}</p>
          <RadioGroup value={advertiser} onValueChange={setAdvertiser} className="gap-2">
            {accounts.map((a, i) => (
              <ChoiceRow
                key={a.name}
                id={`${id}-a${i}`}
                value={a.name}
                selected={advertiser === a.name}
                title={a.name}
                meta={t("connect.tiktok.advertiserId", { id: a.id })}
              />
            ))}
          </RadioGroup>
        </div>
      ) : step === 2 ? (
        <div className="grid gap-3 text-sm">
          <p className="font-medium">{t("connect.tiktok.reviewTitle")}</p>
          <p className="text-muted-foreground">{t("connect.tiktok.reviewBody")}</p>
          <DetailList
            items={[
              { label: t("channels.tiktok.account"), value: advertiser },
              { label: t("connect.tiktok.access"), value: t("connect.tiktok.accessValue") },
            ]}
          />
        </div>
      ) : (
        <ResultState tone="pending" title={t("connect.tiktok.doneTitle")}>
          <p>{t("connect.tiktok.doneBody")}</p>
        </ResultState>
      )}
    </FlowFrame>
  );
}

// ---------------------------------------------------------------------------
// Gmail (per user)
// ---------------------------------------------------------------------------

function GmailFlow({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const connect = useConnect("connect.gmail.toast");
  const steps = [t("connect.steps.signIn"), t("connect.gmail.stepAllow"), t("connect.steps.done")];

  const signIn = async () => {
    setBusy(t("connect.waitingFor", { provider: "Google" }));
    await simulateProvider();
    setBusy(null);
    setStep(1);
  };

  const allow = async () => {
    setBusy(t("connect.gmail.connecting", { email: user.email }));
    try {
      await simulateProvider(800);
      await connect.mutateAsync({ body: { type: "gmail" } });
      setStep(2);
    } catch {
      // The toast explains what went wrong; stay on this step.
    } finally {
      setBusy(null);
    }
  };

  const account = (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <UserAvatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Mail className="size-4 text-channel-email" aria-hidden="true" />
    </div>
  );

  return (
    <FlowFrame
      type="gmail"
      title={t("connect.gmail.title")}
      description={t("connect.gmail.intro")}
      steps={steps}
      current={step}
      footer={
        busy ? null : step === 0 ? (
          <CancelButton onClick={onClose} />
        ) : step === 1 ? (
          <>
            <BackButton onClick={() => setStep(0)} />
            <Button onClick={() => void allow()}>{t("connect.gmail.allow")}</Button>
          </>
        ) : (
          <Button onClick={onClose}>{t("connect.done")}</Button>
        )
      }
    >
      {busy ? (
        <BusyState label={busy} detail={t("connect.busyDetail")} />
      ) : step === 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t("connect.gmail.intro")}</p>
          {account}
          <ProviderButton provider="google" onClick={() => void signIn()}>
            {t("connect.continueWith", { provider: "Google" })}
          </ProviderButton>
          <p className="text-center text-xs text-muted-foreground">{t("connect.demoNote")}</p>
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3">
          {account}
          <p className="text-sm text-muted-foreground">{t("connect.gmail.wantsTo")}</p>
          <PermissionList
            items={[t("connect.gmail.permSend", { email: user.email }), t("connect.gmail.permThreads")]}
          />
        </div>
      ) : (
        <ResultState title={t("connect.gmail.doneTitle")}>
          <p>{t("connect.gmail.doneBody", { email: user.email })}</p>
        </ResultState>
      )}
    </FlowFrame>
  );
}
