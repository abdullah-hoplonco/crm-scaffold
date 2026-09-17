import { canManageSettings, canManageTeamRules } from "@hco/core";
import { useSession } from "@/lib/session";

/** Everyone can look at settings; owners change them, managers also change team rules. */
export function useSettingsAccess() {
  const { user, workspace } = useSession();
  const actor = { userId: user.id, workspaceId: workspace.id, role: user.role };
  return {
    user,
    workspace,
    canEditWorkspace: canManageSettings(actor),
    canEditTeamRules: canManageTeamRules(actor),
  };
}
