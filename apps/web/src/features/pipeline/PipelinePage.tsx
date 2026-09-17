import { pipelineTotals } from "@hco/core/pipeline/board";
import { api } from "@hco/shared";
import { KanbanSquare, Plus, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAed } from "@/lib/format";
import { useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import type { BoardInput } from "./board-state";
import { BoardToolbar } from "./BoardToolbar";
import { KanbanBoard } from "./KanbanBoard";
import { MobilePipeline } from "./MobilePipeline";
import { NewDealDialog } from "./NewDealDialog";
import type { PipelineSearch } from "./search";
import { useMediaQuery } from "./useMediaQuery";

export function PipelinePage({
  search,
  onSearchChange,
}: {
  search: PipelineSearch;
  onSearchChange: (next: Partial<PipelineSearch>) => void;
}) {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [newDealOpen, setNewDealOpen] = useState(false);
  const view = search.view ?? (user.role === "rep" ? "mine" : "everyone");

  const boardInput = useMemo<BoardInput>(
    () => ({
      query: {
        ...(view === "mine" ? { assigneeId: user.id } : {}),
        ...(search.q ? { q: search.q } : {}),
        ...(search.source ? { source: search.source } : {}),
      },
    }),
    [view, user.id, search.q, search.source],
  );
  const board = useApiQuery(api.pipeline.board, boardInput, { placeholderData: (previous) => previous });
  const totals = board.data ? pipelineTotals(board.data.columns) : null;
  const dealCount = board.data?.columns.reduce((n, c) => n + c.count, 0) ?? 0;
  const filtered = Boolean(search.q || search.source);

  return (
    <div className="flex min-h-full flex-col md:h-full">
      <PageHeader
        title={t("title")}
        description={
          totals
            ? t("summary", {
                count: totals.openCount,
                value: formatAed(totals.openValueAed),
                weighted: formatAed(totals.weightedValueAed),
              })
            : t("summaryLoading")
        }
        actions={
          <Button onClick={() => setNewDealOpen(true)}>
            <Plus />
            {t("newDeal")}
          </Button>
        }
      >
        <BoardToolbar search={search} view={view} onChange={onSearchChange} />
      </PageHeader>

      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 lg:px-8">
        {board.isPending ? (
          <BoardSkeleton />
        ) : board.isError ? (
          <ErrorState error={board.error} onRetry={() => void board.refetch()} />
        ) : dealCount === 0 && (filtered || view === "mine") ? (
          <EmptyState
            icon={SearchX}
            title={t("empty.filteredTitle")}
            description={filtered ? t("empty.filteredDescription") : t("empty.mineDescription")}
            action={
              <Button
                variant="outline"
                onClick={() => onSearchChange({ q: undefined, source: undefined, view: "everyone" })}
              >
                {t("empty.showEveryone")}
              </Button>
            }
          />
        ) : dealCount === 0 ? (
          <EmptyState
            icon={KanbanSquare}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Button onClick={() => setNewDealOpen(true)}>
                <Plus />
                {t("newDeal")}
              </Button>
            }
          />
        ) : isDesktop ? (
          <KanbanBoard columns={board.data.columns} boardInput={boardInput} />
        ) : (
          <MobilePipeline columns={board.data.columns} boardInput={boardInput} />
        )}
      </div>

      <NewDealDialog open={newDealOpen} onOpenChange={setNewDealOpen} />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex h-full gap-3" aria-busy="true" aria-live="polite">
      <div className="flex h-full min-w-0 flex-1 gap-3 overflow-hidden">
        {[3, 4, 2, 3].map((cards, column) => (
          <div
            key={column}
            className="flex min-w-[232px] flex-1 flex-col gap-2 max-md:hidden md:max-w-[360px]"
          >
            <Skeleton className="mb-2 h-10 w-full" />
            {Array.from({ length: cards }, (_, i) => (
              <Skeleton key={i} className="h-[118px] w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
      {[0, 1].map((rail) => (
        <Skeleton key={rail} className="hidden h-full w-16 shrink-0 rounded-xl md:block" />
      ))}
      <div className="flex w-full flex-col gap-2 md:hidden">
        <Skeleton className="h-8 w-full rounded-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
