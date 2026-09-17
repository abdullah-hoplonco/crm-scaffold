import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Placeholder. Owned by the owner-views workstream: notification list, unread count, mark as read. */
export function NotificationBell() {
  return (
    <Button variant="ghost" size="icon" aria-label="Notifications">
      <Bell className="size-5" />
    </Button>
  );
}
