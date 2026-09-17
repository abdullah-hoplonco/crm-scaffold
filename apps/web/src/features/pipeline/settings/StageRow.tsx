import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StageType } from "@hco/shared";
import { CircleX, GripVertical, Lock, Trash2, Trophy } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DraftStage {
  /** Stable key for the list: the stage id, or a temporary key for a new stage. */
  key: string;
  id?: string;
  name: string;
  probability: number;
  type: StageType;
}

/** One stage in the editor. Open stages are sortable; won and lost are pinned to the end. */
export function StageRow({
  stage,
  position,
  dealCount,
  canEdit,
  canDelete,
  error,
  onChange,
  onDelete,
}: {
  stage: DraftStage;
  position?: number;
  dealCount: number;
  canEdit: boolean;
  canDelete: boolean;
  error?: string;
  onChange: (patch: Partial<DraftStage>) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("pipeline");
  const nameId = useId();
  const probabilityId = useId();
  const isOpen = stage.type === "open";
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: stage.key,
      disabled: !isOpen || !canEdit,
    });
  const deleteBlockedReason = !isOpen
    ? t("stages.closedLocked")
    : dealCount > 0
      ? t("stages.deleteBlocked", { count: dealCount })
      : !canDelete
        ? t("stages.lastOpen")
        : null;
  const label = stage.name || t("stages.untitled");

  return (
    <li
      ref={isOpen ? setNodeRef : undefined}
      style={isOpen ? { transform: CSS.Translate.toString(transform), transition } : undefined}
      className={cn(
        "relative grid grid-cols-[2rem_minmax(0,1fr)_2.25rem] items-start gap-x-3 gap-y-2 bg-card px-3 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_7rem_5.5rem_2.25rem] sm:items-center",
        !isOpen && "bg-transparent",
        isDragging && "z-10 rounded-lg shadow-[0_12px_28px_-10px_rgba(15,43,49,0.35)] ring-1 ring-primary/30",
      )}
    >
      {isOpen ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={!canEdit}
          aria-label={t("stages.reorder", { stage: label, position })}
          className="mt-1.5 inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-default disabled:opacity-40 sm:mt-0"
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="mt-1.5 inline-flex size-8 items-center justify-center sm:mt-0" aria-hidden="true">
          {stage.type === "won" ? (
            <Trophy className="size-4 text-success" />
          ) : (
            <CircleX className="size-4 text-destructive" />
          )}
        </span>
      )}

      <div className="min-w-0">
        <label htmlFor={nameId} className="sr-only">
          {t("stages.nameLabel", { position: position ?? "" })}
        </label>
        <Input
          id={nameId}
          value={stage.name}
          onChange={(e) => onChange({ name: e.target.value })}
          disabled={!canEdit}
          placeholder={t("stages.namePlaceholder")}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${nameId}-error` : undefined}
          className="bg-card"
          maxLength={40}
        />
        {error ? (
          <p id={`${nameId}-error`} className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <div className="col-start-2 row-start-2 flex items-center gap-3 sm:col-start-auto sm:row-start-auto sm:block">
        {isOpen ? (
          <div className="relative w-28 sm:w-auto">
            <label htmlFor={probabilityId} className="sr-only">
              {t("stages.probabilityLabel", { stage: label })}
            </label>
            <Input
              id={probabilityId}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={5}
              value={stage.probability}
              disabled={!canEdit}
              onChange={(e) => {
                const value = Math.round(Number(e.target.value));
                onChange({ probability: Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0 });
              }}
              className="bg-card pe-7 tabular-nums"
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
        ) : (
          <span className="flex h-9 items-center gap-1.5 px-1 text-sm text-muted-foreground tabular-nums">
            <Lock className="size-3.5" aria-hidden="true" />
            {stage.type === "won" ? "100%" : "0%"}
          </span>
        )}
        <span className="text-xs text-muted-foreground sm:hidden">
          {t("stages.dealsCount", { count: dealCount })}
        </span>
      </div>

      <span className="hidden text-sm text-muted-foreground tabular-nums sm:block">
        {t("stages.dealsCount", { count: dealCount })}
      </span>

      <div className="mt-0.5 sm:mt-0">
        {canEdit ? (
          deleteBlockedReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground/50 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  aria-label={deleteBlockedReason}
                >
                  {isOpen ? <Trash2 className="size-4" /> : <Lock className="size-4" />}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-60">{deleteBlockedReason}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={t("stages.delete", { stage: label })}
              className="text-muted-foreground hover:bg-danger-soft hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )
        ) : null}
      </div>
    </li>
  );
}
