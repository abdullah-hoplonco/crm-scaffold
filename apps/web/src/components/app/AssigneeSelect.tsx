import { api } from "@hco/shared";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiQuery } from "@/lib/api/hooks";
import { UserAvatar } from "./UserAvatar";

const NONE = "__none__";

/** Pick a teammate. `allowUnassigned` adds an "Unassigned" option that maps to null. */
export function AssigneeSelect({
  value,
  onChange,
  allowUnassigned = true,
  id,
  className,
  disabled,
}: {
  value: string | null;
  onChange: (userId: string | null) => void;
  allowUnassigned?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const users = useApiQuery(api.workspace.listUsers, {});
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={t("states.unassigned")} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned ? <SelectItem value={NONE}>{t("states.unassigned")}</SelectItem> : null}
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
  );
}
