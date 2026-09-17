import { api, type ChannelConnection, type User } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { FlaskConical, Hourglass } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ErrorState } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSettingsAccess } from "./access";
import {
  ChannelGlyph,
  StatusPill,
  metaConfig,
  noteConfig,
  qualityTone,
  tiktokConfig,
  whatsappConfig,
  type ConnectableType,
} from "./channels/channel-meta";
import { ConnectDialog } from "./channels/ConnectDialog";
import { ReadOnlyNote, SettingsSection } from "./SettingsSection";

interface DisconnectTarget {
  connection: ChannelConnection;
  name: string;
  consequence: string;
}

export function ChannelsSettings() {
  const { t } = useTranslation("settings");
  const { canEditWorkspace } = useSettingsAccess();
  const connections = useApiQuery(api.workspace.listConnections, {});
  const users = useApiQuery(api.workspace.listUsers, {});
  const [connecting, setConnecting] = useState<ConnectableType | null>(null);
  const [disconnecting, setDisconnecting] = useState<DisconnectTarget | null>(null);

  return (
    <SettingsSection title={t("channels.title")} description={t("channels.description")}>
      {!canEditWorkspace ? <ReadOnlyNote>{t("readOnly.channels")}</ReadOnlyNote> : null}
      {connections.isPending ? (
        <ChannelsSkeleton />
      ) : connections.isError ? (
        <ErrorState
          error={connections.error}
          onRetry={() => void connections.refetch()}
          className="rounded-xl border bg-card"
        />
      ) : (
        <ChannelList
          connections={connections.data.items}
          users={users.data?.items ?? []}
          onConnect={setConnecting}
          onDisconnect={setDisconnecting}
        />
      )}
      <ConnectDialog type={connecting} onOpenChange={(open) => !open && setConnecting(null)} />
      <DisconnectDialog target={disconnecting} onClose={() => setDisconnecting(null)} />
    </SettingsSection>
  );
}

function ChannelsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-start gap-4 rounded-xl border bg-card p-5">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function ChannelList({
  connections,
  users,
  onConnect,
  onDisconnect,
}: {
  connections: ChannelConnection[];
  users: User[];
  onConnect: (type: ConnectableType) => void;
  onDisconnect: (target: DisconnectTarget) => void;
}) {
  const { t } = useTranslation("settings");
  const { canEditWorkspace } = useSettingsAccess();
  const byType = (type: ChannelConnection["type"]) => connections.find((c) => c.type === type);
  const whatsapp = byType("whatsapp_cloud");
  const meta = byType("meta_leadads");
  const tiktok = byType("tiktok_leads");
  const simulator = byType("simulator");
  const gmail = connections.filter((c) => c.type === "gmail");

  const workspaceAction = (
    type: ConnectableType,
    connection: ChannelConnection | undefined,
    name: string,
    consequenceKey: string,
  ) => {
    if (!canEditWorkspace) return null;
    const live = connection && (connection.status === "connected" || connection.status === "pending");
    if (live) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDisconnect({ connection, name, consequence: t(consequenceKey) })}
        >
          {connection.status === "pending" ? t("channels.withdraw") : t("channels.disconnect")}
        </Button>
      );
    }
    return (
      <Button size="sm" onClick={() => onConnect(type)}>
        {connection ? t("channels.reconnect") : t("channels.connect")}
      </Button>
    );
  };

  const wa = whatsappConfig(whatsapp);
  const quality = qualityTone(wa.qualityRating);
  const fb = metaConfig(meta);
  const tt = tiktokConfig(tiktok);

  return (
    <div className="flex flex-col gap-4">
      <ChannelCard
        type="whatsapp_cloud"
        connection={whatsapp}
        name={t("channels.whatsapp.name")}
        description={t("channels.whatsapp.description")}
        action={workspaceAction(
          "whatsapp_cloud",
          whatsapp,
          t("channels.whatsapp.name"),
          "channels.whatsapp.consequence",
        )}
        details={
          whatsapp?.status === "connected"
            ? [
                {
                  label: t("channels.whatsapp.number"),
                  value: <span className="tabular-nums">{wa.displayPhone ?? whatsapp.displayName}</span>,
                },
                { label: t("channels.whatsapp.verifiedName"), value: wa.verifiedName ?? "—" },
                {
                  label: t("channels.whatsapp.quality"),
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", quality.dot)} aria-hidden="true" />
                      {t(`channels.quality.${quality.key}`)}
                    </span>
                  ),
                },
                syncedDetail(t, whatsapp),
              ]
            : undefined
        }
      />

      <ChannelCard
        type="meta_leadads"
        connection={meta}
        name={t("channels.meta.name")}
        description={t("channels.meta.description")}
        badges={
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            <span className="size-2 rounded-full bg-channel-facebook" />
            <span className="size-2 rounded-full bg-channel-instagram" />
          </span>
        }
        action={workspaceAction("meta_leadads", meta, t("channels.meta.name"), "channels.meta.consequence")}
        details={
          meta?.status === "connected"
            ? [
                { label: t("channels.meta.page"), value: fb.pageName ?? meta.displayName },
                {
                  label: t("channels.meta.instagram"),
                  value: fb.instagramHandle ?? t("channels.meta.linkedPage"),
                },
                {
                  label: t("channels.meta.forms"),
                  value: t("channels.meta.formsCount", { count: fb.formNames?.length ?? fb.forms ?? 0 }),
                },
                syncedDetail(t, meta),
              ]
            : undefined
        }
        footer={
          meta?.status === "connected" && fb.formNames?.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={t("channels.meta.forms")}>
              {fb.formNames.map((form) => (
                <li key={form} className="rounded-full border bg-card px-2 py-0.5 text-xs text-foreground/80">
                  {form}
                </li>
              ))}
            </ul>
          ) : null
        }
      />

      <ChannelCard
        type="tiktok_leads"
        connection={tiktok}
        name={t("channels.tiktok.name")}
        description={t("channels.tiktok.description")}
        action={workspaceAction(
          "tiktok_leads",
          tiktok,
          t("channels.tiktok.name"),
          "channels.tiktok.consequence",
        )}
        details={
          tiktok?.status === "pending" || tiktok?.status === "connected"
            ? [
                {
                  label: t("channels.tiktok.account"),
                  value: tt.advertiserName ?? tiktok.displayName.replace(/\s+—\s+TikTok$/, ""),
                },
                { label: t("channels.tiktok.requested"), value: formatRelative(tiktok.updatedAt) },
              ]
            : undefined
        }
        footer={
          tiktok?.status === "pending" ? (
            <p className="flex items-start gap-2 text-sm text-warning">
              <Hourglass className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {tt.note ?? t("channels.tiktok.pendingNote")}. {t("channels.tiktok.pendingNext")}
            </p>
          ) : null
        }
      />

      <GmailCard
        connections={gmail}
        users={users}
        onConnect={() => onConnect("gmail")}
        onDisconnect={onDisconnect}
      />

      <SimulatorCard connection={simulator} />
    </div>
  );
}

function syncedDetail(t: (key: string, options?: Record<string, unknown>) => string, c: ChannelConnection) {
  return {
    label: t("channels.lastSynced"),
    value: c.lastSyncedAt ? formatRelative(c.lastSyncedAt) : t("channels.neverSynced"),
  };
}

function ChannelCard({
  type,
  connection,
  name,
  description,
  badges,
  action,
  details,
  footer,
}: {
  type: ConnectableType;
  connection: ChannelConnection | undefined;
  name: string;
  description: string;
  badges?: ReactNode;
  action: ReactNode;
  details?: Array<{ label: string; value: ReactNode }>;
  footer?: ReactNode;
}) {
  const status = connection?.status ?? "not_connected";
  const live = status === "connected";
  return (
    <article
      aria-label={name}
      className={cn("overflow-hidden rounded-xl border bg-card shadow-xs", !connection && "bg-card/70")}
    >
      <div className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
        <ChannelGlyph type={type} live={live || status === "pending"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-semibold">{name}</h3>
            {badges}
            <StatusPill status={status} />
          </div>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
          {action ? <div className="mt-3 sm:hidden">{action}</div> : null}
        </div>
        {action ? <div className="hidden shrink-0 sm:block">{action}</div> : null}
      </div>
      {details?.length || footer ? (
        <div className="border-t bg-muted/30 px-4 py-3.5 sm:px-5">
          {details?.length ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
              {details.map((d) => (
                <div key={d.label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {footer ? <div className={cn(details?.length && "mt-3")}>{footer}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

function GmailCard({
  connections,
  users,
  onConnect,
  onDisconnect,
}: {
  connections: ChannelConnection[];
  users: User[];
  onConnect: () => void;
  onDisconnect: (target: DisconnectTarget) => void;
}) {
  const { t } = useTranslation("settings");
  const { user: me } = useSettingsAccess();
  const mine = connections.find((c) => c.userId === me.id);
  const myStatus = mine?.status === "connected";
  const connected = connections.filter((c) => c.status === "connected");
  const others = connections.filter((c) => c.userId !== me.id && c.status === "connected");
  const nameOf = (userId: string | null) => users.find((u) => u.id === userId)?.name ?? null;

  return (
    <article
      aria-label={t("channels.gmail.name")}
      className="overflow-hidden rounded-xl border bg-card shadow-xs"
    >
      <div className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
        <ChannelGlyph type="gmail" live={connected.length > 0} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-semibold">{t("channels.gmail.name")}</h3>
            <span className="text-xs text-muted-foreground">
              {t("channels.gmail.mailboxCount", { count: connected.length })}
            </span>
          </div>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("channels.gmail.description")}</p>
        </div>
      </div>
      <ul className="divide-y border-t">
        <li className="flex flex-col gap-3 bg-accent/30 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar name={me.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-medium">{t("channels.gmail.yourMailbox")}</span>
                <span className="ms-1.5 text-muted-foreground">{me.email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {myStatus && mine?.lastSyncedAt
                  ? t("channels.gmail.syncedAgo", { when: formatRelative(mine.lastSyncedAt) })
                  : t("channels.gmail.notConnectedHint")}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 ps-9 sm:justify-end sm:ps-0">
            <StatusPill status={myStatus ? "connected" : mine ? "disconnected" : "not_connected"} />
            {myStatus && mine ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onDisconnect({
                    connection: mine,
                    name: t("channels.gmail.yourGmail"),
                    consequence: t("channels.gmail.consequence"),
                  })
                }
              >
                {t("channels.disconnect")}
              </Button>
            ) : (
              <Button size="sm" onClick={onConnect}>
                {t("channels.gmail.connectMine")}
              </Button>
            )}
          </div>
        </li>
        {others.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <UserAvatar name={nameOf(c.userId)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-medium">{nameOf(c.userId) ?? c.displayName}</span>
                <span className="ms-1.5 text-muted-foreground">{c.displayName}</span>
              </p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {c.lastSyncedAt
                ? t("channels.gmail.syncedAgo", { when: formatRelative(c.lastSyncedAt) })
                : null}
            </span>
            <StatusPill status="connected" />
          </li>
        ))}
      </ul>
    </article>
  );
}

function SimulatorCard({ connection }: { connection: ChannelConnection | undefined }) {
  const { t } = useTranslation("settings");
  const { canEditTeamRules } = useSettingsAccess();
  const note = noteConfig(connection).note;
  return (
    <article
      aria-label={t("channels.simulator.name")}
      className="rounded-xl border border-dashed border-primary/35 bg-accent/25 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        <ChannelGlyph type="simulator" live />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-semibold">{t("channels.simulator.name")}</h3>
            <StatusPill status="always_on" />
          </div>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {t("channels.simulator.description")}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-accent-foreground">
            <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {note ?? t("channels.simulator.note")}
          </p>
          {canEditTeamRules ? (
            <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0">
              <Link to="/dev/demo">{t("channels.simulator.open")}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DisconnectDialog({ target, onClose }: { target: DisconnectTarget | null; onClose: () => void }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const disconnect = useApiMutation(api.workspace.disconnectChannel, {
    onSuccess: () => {
      toast.success(t("channels.disconnected", { name: target?.name ?? "" }));
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const pending = target?.connection.status === "pending";
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pending
              ? t("channels.withdrawTitle", { name: target?.name ?? "" })
              : t("channels.disconnectTitle", { name: target?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>{target?.consequence}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={disconnect.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (target) disconnect.mutate({ params: { connectionId: target.connection.id } });
            }}
          >
            {pending ? t("channels.withdraw") : t("channels.disconnect")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
