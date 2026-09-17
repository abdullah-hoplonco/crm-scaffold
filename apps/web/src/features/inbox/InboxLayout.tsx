import { Outlet, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ConversationList, type InboxFilter } from "./ConversationList";

/**
 * Two panes on desktop (conversation list + thread). On phones the list and the thread are separate
 * screens: the list hides while a conversation is open.
 */
export function InboxLayout() {
  const { conversationId } = useParams({ strict: false });
  // Lives in the layout so the chosen filter survives opening a thread and coming back.
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-full min-h-0">
      <aside
        className={cn(
          "min-h-0 w-full min-w-0 flex-col border-e bg-card lg:flex lg:w-[22.5rem] lg:shrink-0",
          conversationId ? "hidden" : "flex",
        )}
      >
        <ConversationList
          selectedId={conversationId ?? null}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
        />
      </aside>
      <section
        className={cn("min-h-0 min-w-0 flex-1 flex-col lg:flex", conversationId ? "flex" : "hidden")}
      >
        <Outlet />
      </section>
    </div>
  );
}
