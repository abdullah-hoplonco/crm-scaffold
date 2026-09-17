import { api } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import { EventLog } from "./EventLog";
import { RepWindows } from "./RepWindows";
import { ResetDemoButton } from "./ResetDemoButton";
import { ScriptCard } from "./ScriptCard";
import { SimulatorControls } from "./SimulatorControls";
import { useSimulate } from "./useSimulate";

/** /dev/demo: the presenter's console for a live demo (owners and managers). */
export function DemoPanelPage() {
  const { t } = useTranslation("demo");
  const { user } = useSession();

  if (user.role === "rep") {
    return (
      <EmptyState
        icon={FlaskConical}
        title={t("noAccess.title")}
        description={t("noAccess.description")}
        className="min-h-[60dvh]"
        action={
          <Button asChild>
            <Link to="/today">{t("noAccess.action")}</Link>
          </Button>
        }
      />
    );
  }
  return <DemoPanel />;
}

function DemoPanel() {
  const { t } = useTranslation("demo");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const status = useApiQuery(api.demo.status, {});
  const { run, pending } = useSimulate({ phone, onInvalidPhone: setPhoneError });

  const runAction: typeof run = (key) => {
    setPhoneError(null);
    return run(key);
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={<ResetDemoButton />} />
      <div className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start xl:gap-8">
          <div className="flex min-w-0 flex-col gap-8">
            <ScriptCard
              status={status.data}
              isLoading={status.isPending}
              pending={pending}
              onRun={(key) => void runAction(key)}
            />
            <SimulatorControls
              pending={pending}
              onRun={(key) => void runAction(key)}
              phone={phone}
              onPhoneChange={(value) => {
                setPhone(value);
                setPhoneError(null);
              }}
              phoneError={phoneError}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <RepWindows status={status} />
            <EventLog />
          </div>
        </div>
      </div>
    </>
  );
}
