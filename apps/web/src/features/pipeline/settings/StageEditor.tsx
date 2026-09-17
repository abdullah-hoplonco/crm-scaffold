import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { validateStageOrder } from "@hco/core";
import { api, type Stage } from "@hco/shared";
import { KanbanSquare, Lock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { useSession } from "@/lib/session";
import { StageRow, type DraftStage } from "./StageRow";

let draftKey = 0;
const nextKey = () => `new-${++draftKey}`;

function toDraft(stages: Stage[]): DraftStage[] {
  return stages.map((s) => ({ key: s.id, id: s.id, name: s.name, probability: s.probability, type: s.type }));
}

function sameStages(a: DraftStage[], b: DraftStage[]) {
  return (
    a.length === b.length &&
    a.every((s, i) => {
      const o = b[i];
      return o && s.key === o.key && s.name === o.name && s.probability === o.probability;
    })
  );
}

export function StageEditor() {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const canEdit = user.role !== "rep";
  const pipeline = useApiQuery(api.pipeline.getDefault, {});
  const board = useApiQuery(api.pipeline.board, { query: {} });

  return (
    <div className="flex flex-col">
      <PageHeader title={t("stages.title")} description={t("stages.description")} />
      <div className="px-4 pb-10 sm:px-6 lg:px-8">
        {pipeline.isPending ? (
          <LoadingRows rows={6} className="max-w-3xl p-0" />
        ) : pipeline.isError ? (
          <ErrorState error={pipeline.error} onRetry={() => void pipeline.refetch()} />
        ) : pipeline.data.stages.length === 0 ? (
          <EmptyState icon={KanbanSquare} title={t("stages.emptyTitle")} />
        ) : (
          <StageForm
            key={pipeline.data.pipeline.updatedAt}
            pipelineId={pipeline.data.pipeline.id}
            stages={pipeline.data.stages}
            dealCounts={new Map((board.data?.columns ?? []).map((c) => [c.stage.id, c.count]))}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}

function StageForm({
  pipelineId,
  stages,
  dealCounts,
  canEdit,
}: {
  pipelineId: string;
  stages: Stage[];
  dealCounts: Map<string, number>;
  canEdit: boolean;
}) {
  const { t } = useTranslation("pipeline");
  const initial = useMemo(() => toDraft(stages), [stages]);
  const [draft, setDraft] = useState<DraftStage[]>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const dirty = !sameStages(draft, initial);

  const open = draft.filter((s) => s.type === "open");
  const closed = draft.filter((s) => s.type !== "open");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const save = useApiMutation(api.pipeline.saveStages, {
    onSuccess: () => toast.success(t("stages.saved")),
    onError: (error) => toast.error(t("stages.saveFailed"), { description: errorMessage(error) }),
  });

  const nameErrors = new Map(
    draft.flatMap((s) => (s.name.trim() ? [] : [[s.key, t("stages.nameRequired")] as const])),
  );
  const rules = validateStageOrder(draft.map((s) => ({ type: s.type, name: s.name })));
  const ruleError = !rules.ok && nameErrors.size === 0 ? rules.error.message : null;

  const update = (key: string, patch: Partial<DraftStage>) =>
    setDraft((current) => current.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = open.findIndex((s) => s.key === active.id);
    const to = open.findIndex((s) => s.key === over.id);
    if (from < 0 || to < 0) return;
    setDraft([...arrayMove(open, from, to), ...closed]);
  };

  const addStage = () => {
    const last = open[open.length - 1];
    const probability = Math.min(95, (last?.probability ?? 0) + 10);
    setDraft([...open, { key: nextKey(), name: "", probability, type: "open" }, ...closed]);
    setShowErrors(false);
  };

  const submit = () => {
    if (nameErrors.size > 0 || !rules.ok) {
      setShowErrors(true);
      return;
    }
    save.mutate({
      params: { pipelineId },
      body: {
        stages: draft.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          probability: s.type === "won" ? 100 : s.type === "lost" ? 0 : s.probability,
          type: s.type,
        })),
      },
    });
  };

  return (
    <form
      className="flex max-w-3xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {canEdit ? null : (
        <p className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t("stages.readOnly")}
        </p>
      )}

      <div className="rounded-xl border bg-card">
        <div className="hidden grid-cols-[2rem_minmax(0,1fr)_7rem_5.5rem_2.25rem] items-center gap-3 border-b px-3 py-2 text-xs text-muted-foreground sm:grid">
          <span />
          <span>{t("stages.nameColumn")}</span>
          <span>{t("stages.probabilityColumn")}</span>
          <span>{t("stages.dealsColumn")}</span>
          <span />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={open.map((s) => s.key)} strategy={verticalListSortingStrategy}>
            <ol className="divide-y" aria-label={t("stages.openLabel")}>
              {open.map((stage, index) => (
                <StageRow
                  key={stage.key}
                  stage={stage}
                  position={index + 1}
                  dealCount={stage.id ? (dealCounts.get(stage.id) ?? 0) : 0}
                  canEdit={canEdit}
                  canDelete={open.length > 1}
                  error={showErrors ? nameErrors.get(stage.key) : undefined}
                  onChange={(patch) => update(stage.key, patch)}
                  onDelete={() => setDraft((current) => current.filter((s) => s.key !== stage.key))}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>

        {canEdit ? (
          <div className="border-t px-3 py-2">
            <Button type="button" variant="ghost" size="sm" onClick={addStage} className="text-primary">
              <Plus />
              {t("stages.add")}
            </Button>
          </div>
        ) : null}

        <ol className="divide-y border-t bg-muted/30" aria-label={t("stages.closedLabel")}>
          {closed.map((stage) => (
            <StageRow
              key={stage.key}
              stage={stage}
              dealCount={stage.id ? (dealCounts.get(stage.id) ?? 0) : 0}
              canEdit={canEdit}
              canDelete={false}
              error={showErrors ? nameErrors.get(stage.key) : undefined}
              onChange={(patch) => update(stage.key, patch)}
              onDelete={() => undefined}
            />
          ))}
        </ol>
      </div>

      {showErrors && ruleError ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive">
          {ruleError}
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty ? <p className="me-auto text-sm text-muted-foreground">{t("stages.unsaved")}</p> : null}
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setDraft(initial);
              setShowErrors(false);
            }}
          >
            {t("stages.discard")}
          </Button>
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending ? t("stages.saving") : t("stages.save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
