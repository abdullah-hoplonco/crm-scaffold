import { Role, api, type User } from "@hco/shared";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiKey, useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { useSettingsAccess } from "./access";
import { InviteDialog } from "./InviteDialog";
import { ReadOnlyNote, SettingsSection } from "./SettingsSection";

const ROLE_ORDER: Record<Role, number> = { owner: 0, manager: 1, rep: 2 };

type UsersData = { items: User[] };

export function TeamSettings() {
  const { t } = useTranslation("settings");
  const { canEditWorkspace } = useSettingsAccess();
  const users = useApiQuery(api.workspace.listUsers, {});
  const [inviteOpen, setInviteOpen] = useState(false);

  const inviteButton = (
    <Button onClick={() => setInviteOpen(true)} disabled={!canEditWorkspace}>
      <UserPlus />
      {t("team.invite")}
    </Button>
  );

  return (
    <SettingsSection
      title={t("team.title")}
      description={t("team.description")}
      actions={
        canEditWorkspace ? (
          inviteButton
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{inviteButton}</span>
            </TooltipTrigger>
            <TooltipContent>{t("readOnly.ownerShort")}</TooltipContent>
          </Tooltip>
        )
      }
    >
      {!canEditWorkspace ? <ReadOnlyNote>{t("readOnly.team")}</ReadOnlyNote> : null}
      {users.isPending ? (
        <div className="rounded-xl border bg-card">
          <LoadingRows rows={5} />
        </div>
      ) : users.isError ? (
        <ErrorState
          error={users.error}
          onRetry={() => void users.refetch()}
          className="rounded-xl border bg-card"
        />
      ) : users.data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("team.empty.title")}
          description={t("team.empty.description")}
          action={canEditWorkspace ? inviteButton : undefined}
          className="rounded-xl border bg-card"
        />
      ) : (
        <TeamList users={users.data.items} />
      )}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </SettingsSection>
  );
}

function TeamList({ users }: { users: User[] }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const sorted = [...users].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.name.localeCompare(b.name),
  );
  const active = users.filter((u) => u.isActive);
  const counts = Role.options
    .map((role) => ({ role, count: active.filter((u) => u.role === role).length }))
    .filter((c) => c.count > 0)
    .map((c) => t(`team.roleCount.${c.role}`, { count: c.count }));

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold">{t("team.activeCount", { count: active.length })}</p>
        <p className="text-[13px] text-muted-foreground">{counts.join(", ")}</p>
      </div>
      <div
        role="table"
        aria-label={t("team.title")}
        className="md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_10rem_9.5rem]"
      >
        <div role="rowgroup" className="hidden md:contents">
          <div role="row" className="contents text-xs font-medium text-muted-foreground">
            <span role="columnheader" className="border-b bg-muted/40 px-5 py-2">
              {t("team.columns.name")}
            </span>
            <span role="columnheader" className="border-b bg-muted/40 px-3 py-2">
              {t("team.columns.email")}
            </span>
            <span role="columnheader" className="border-b bg-muted/40 px-3 py-2">
              {t("team.columns.role")}
            </span>
            <span role="columnheader" className="border-b bg-muted/40 px-5 py-2">
              {t("team.columns.access")}
            </span>
          </div>
        </div>
        <div role="rowgroup" className="divide-y md:contents">
          {sorted.map((user) => (
            <TeamRow key={user.id} user={user} roleLabel={tc(`roles.${user.role}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamRow({ user, roleLabel }: { user: User; roleLabel: string }) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation();
  const { user: me, canEditWorkspace } = useSettingsAccess();
  const queryClient = useQueryClient();
  const isSelf = user.id === me.id;
  const listKey = apiKey(api.workspace.listUsers, {});

  const update = useApiMutation(api.workspace.updateUser, {
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<UsersData>(listKey);
      if (previous) {
        queryClient.setQueryData<UsersData>(listKey, {
          items: previous.items.map((u) => (u.id === user.id ? { ...u, ...input.body } : u)),
        });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (updated, input) => {
      if (input.body?.role !== undefined) {
        toast.success(t("team.toast.roleChanged", { name: updated.name, role: tc(`roles.${updated.role}`) }));
      } else {
        toast.success(
          t(updated.isActive ? "team.toast.reactivated" : "team.toast.deactivated", { name: updated.name }),
        );
      }
    },
  });

  const roleLocked = !canEditWorkspace || isSelf;
  const accessLocked = !canEditWorkspace || isSelf;
  const cell = "md:flex md:items-center md:border-b md:py-3";

  return (
    <div
      role="row"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 px-4 py-3.5 sm:px-5 md:contents",
        !user.isActive && "bg-muted/30",
      )}
    >
      <div
        role="cell"
        className={cn("col-span-2 flex min-w-0 items-center gap-3 md:col-span-1 md:ps-5", cell)}
      >
        <UserAvatar name={user.name} className={cn(!user.isActive && "opacity-50")} />
        <div className="min-w-0">
          <p
            className={cn(
              "flex items-center gap-2 truncate text-sm font-medium",
              !user.isActive && "text-muted-foreground",
            )}
          >
            <span className="truncate">{user.name}</span>
            {isSelf ? (
              <span className="shrink-0 rounded-full bg-accent px-1.5 py-px text-[11px] font-medium text-accent-foreground">
                {t("team.you")}
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="md:hidden">{user.email}</span>
            <span className="hidden md:inline">{user.jobTitle ?? t("team.noJobTitle")}</span>
          </p>
        </div>
      </div>
      <div role="cell" className={cn("hidden min-w-0 px-3 text-sm text-muted-foreground", cell)}>
        <span className="truncate">{user.email}</span>
      </div>
      <div role="cell" className={cn("min-w-0 md:px-3", cell)}>
        <LockedHint locked={isSelf && canEditWorkspace} hint={t("team.selfRole")}>
          <Select
            value={user.role}
            onValueChange={(value) =>
              update.mutate({ params: { userId: user.id }, body: { role: Role.parse(value) } })
            }
            disabled={roleLocked || !user.isActive}
          >
            <SelectTrigger
              size="sm"
              className="w-full min-w-32 md:w-36"
              aria-label={t("team.roleFor", { name: user.name })}
            >
              <SelectValue>{roleLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Role.options.map((role) => (
                <SelectItem key={role} value={role}>
                  {tc(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LockedHint>
      </div>
      <div role="cell" className={cn("flex items-center justify-end gap-2.5 md:justify-start md:pe-5", cell)}>
        <LockedHint locked={isSelf && canEditWorkspace} hint={t("team.selfDeactivate")}>
          <Switch
            checked={user.isActive}
            onCheckedChange={(checked) =>
              update.mutate({ params: { userId: user.id }, body: { isActive: checked } })
            }
            disabled={accessLocked}
            aria-label={t("team.activeFor", { name: user.name })}
          />
        </LockedHint>
        <span className={cn("text-sm", user.isActive ? "text-foreground" : "text-muted-foreground")}>
          {user.isActive ? t("team.active") : t("team.deactivated")}
        </span>
      </div>
    </div>
  );
}

/** Wraps a disabled control so keyboard and pointer users can still read why it is locked. */
function LockedHint({
  locked,
  hint,
  children,
}: {
  locked: boolean;
  hint: string;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex w-full rounded-md md:w-auto">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}
