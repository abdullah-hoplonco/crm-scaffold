import { api, type LostReason, type StageType } from "@hco/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/errors";
import { apiKey, useApiMutation } from "@/lib/api/hooks";
import { applyMoveToBoard, type BoardData, type BoardInput, type MovePlacement } from "./board-state";
import { LostDealDialog, WonDealDialog } from "./StageMoveDialogs";

export interface MoveDeal {
  id: string;
  title: string;
  valueAed: string;
  stageId: string;
  stageType: StageType;
}

export interface MoveTarget {
  id: string;
  name: string;
  type: StageType;
}

export interface MoveRequest {
  deal: MoveDeal;
  to: MoveTarget;
  placement?: MovePlacement;
  /** Toast plain moves between open stages too. The board keeps quiet about those. */
  announce?: boolean;
  /** The move is about to be sent (after any dialog), e.g. to drop the drag layer's state. */
  onCommit?: () => void;
  /** The person closed the won/lost dialog without confirming. */
  onCancel?: () => void;
}

/** The last dialog stays in state while it animates closed, so its text doesn't vanish mid-fade. */
type PendingDialog = { kind: "won" | "lost"; request: MoveRequest; open: boolean } | null;

/**
 * Moving a deal between stages, shared by the board, the mobile "Move to…" menu and the deal page.
 * Lost asks for a reason, won asks for a short confirmation, everything else moves straight away.
 * With `boardInput` the board updates optimistically and rolls back if the move fails.
 */
export function useStageMove({ boardInput }: { boardInput?: BoardInput } = {}) {
  const { t } = useTranslation("pipeline");
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<PendingDialog>(null);
  const mutation = useApiMutation(api.pipeline.move);

  const commit = async (request: MoveRequest, lost?: { lostReason: LostReason; lostNote: string }) => {
    const { deal, to, placement = {} } = request;
    const key = boardInput ? apiKey(api.pipeline.board, boardInput) : null;
    let previous: BoardData | undefined;
    if (key) {
      await queryClient.cancelQueries({ queryKey: key });
      previous = queryClient.getQueryData<BoardData>(key);
      if (previous) queryClient.setQueryData(key, applyMoveToBoard(previous, deal.id, to.id, placement));
    }
    request.onCommit?.();

    const isReopen = deal.stageType !== "open" && to.type === "open";
    mutation.mutate(
      {
        params: { dealId: deal.id },
        body: {
          toStageId: to.id,
          index: placement.index,
          beforeDealId: placement.beforeDealId,
          afterDealId: placement.afterDealId,
          lostReason: lost?.lostReason,
          lostNote: lost?.lostNote || undefined,
        },
      },
      {
        onSuccess: () => {
          if (deal.stageId === to.id) return;
          if (to.type === "won") toast.success(t("move.markedWon"), { description: deal.title });
          else if (to.type === "lost") toast(t("move.markedLost"), { description: deal.title });
          else if (isReopen)
            toast.success(t("move.reopened"), { description: t("move.movedTo", { stage: to.name }) });
          else if (request.announce)
            toast.success(t("move.movedTo", { stage: to.name }), { description: deal.title });
        },
        onError: (error) => {
          if (key && previous) queryClient.setQueryData(key, previous);
          toast.error(t("move.failed"), { description: errorMessage(error) });
        },
      },
    );
  };

  const request = (req: MoveRequest) => {
    const fromOpen = req.deal.stageType === "open";
    if (fromOpen && req.to.type === "lost") setDialog({ kind: "lost", request: req, open: true });
    else if (fromOpen && req.to.type === "won") setDialog({ kind: "won", request: req, open: true });
    else void commit(req);
  };

  const close = () => setDialog((current) => (current ? { ...current, open: false } : null));

  const cancel = () => {
    if (dialog?.open) dialog.request.onCancel?.();
    close();
  };

  const dialogs = (
    <>
      <WonDealDialog
        open={dialog?.kind === "won" && dialog.open}
        deal={dialog?.request.deal ?? null}
        stageName={dialog?.request.to.name ?? ""}
        onCancel={cancel}
        onConfirm={() => {
          if (dialog?.open) void commit(dialog.request);
          close();
        }}
      />
      <LostDealDialog
        open={dialog?.kind === "lost" && dialog.open}
        deal={dialog?.request.deal ?? null}
        stageName={dialog?.request.to.name ?? ""}
        onCancel={cancel}
        onConfirm={(lost) => {
          if (dialog?.open) void commit(dialog.request, lost);
          close();
        }}
      />
    </>
  );

  return { request, dialogs, isPending: mutation.isPending };
}
