import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DealCard } from "@hco/shared/api/pipeline";
import { Link, useNavigate } from "@tanstack/react-router";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DealCardView } from "./DealCardView";

/**
 * A board card that can be dragged with a pointer or picked up with Space. Enter opens the deal;
 * clicking anywhere on the card does too (the title link is stretched over it).
 */
export const SortableDealCard = memo(function SortableDealCard({
  card,
  disabled,
}: {
  card: DealCard;
  disabled: boolean;
}) {
  const { t } = useTranslation("pipeline");
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, active } = useSortable({
    id: card.id,
    data: { type: "deal", stageId: card.stageId },
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription={t("board.cardRole")}
      aria-label={t("board.cardLabel", { title: card.title, contact: card.contactName })}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        // Enter drops a card during a keyboard drag, so only treat it as "open" when nothing is picked up.
        if (event.key === "Enter" && event.target === event.currentTarget && !active) {
          void navigate({ to: "/deals/$dealId", params: { dealId: card.id } });
        }
      }}
      className={cn(
        "group/card relative touch-manipulation rounded-lg outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging && "z-10",
      )}
    >
      <DealCardView
        card={card}
        className={cn(
          "group-hover/card:border-primary/30 group-hover/card:shadow-[0_2px_8px_-4px_rgba(15,43,49,0.18)]",
          isDragging &&
            "border-dashed border-primary/50 bg-primary/5 shadow-none [&>*]:invisible group-hover/card:shadow-none",
        )}
      />
      <Link
        to="/deals/$dealId"
        params={{ dealId: card.id }}
        tabIndex={-1}
        draggable={false}
        aria-hidden="true"
        className="absolute inset-0 rounded-lg"
      />
    </li>
  );
});
