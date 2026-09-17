import { Check, Pencil, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Click-to-edit value. Enter saves, Escape cancels. `parse` returns the value to save, or null
 * when the text isn't valid (then `invalidMessage` shows).
 */
export function InlineEdit({
  value,
  label,
  onSave,
  parse = (raw) => raw.trim() || null,
  invalidMessage,
  prefix,
  disabled,
  className,
  inputClassName,
  children,
}: {
  value: string;
  label: string;
  onSave: (next: string) => void;
  parse?: (raw: string) => string | null;
  invalidMessage?: string;
  prefix?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("pipeline");
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  if (draft === null) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setDraft(value);
          setInvalid(false);
        }}
        aria-label={t("deal.editField", { field: label })}
        className={cn(
          "group/edit -mx-1.5 inline-flex max-w-full items-center gap-2 rounded-md px-1.5 text-start outline-none",
          "hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none",
          className,
        )}
      >
        {children}
        {disabled ? null : (
          <Pencil
            className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    );
  }

  const save = () => {
    const next = parse(draft);
    if (next === null) {
      setInvalid(true);
      return;
    }
    if (next !== value) onSave(next);
    setDraft(null);
  };

  return (
    <form
      className={cn("flex max-w-full flex-col gap-1", className)}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          {prefix ? (
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {prefix}
            </span>
          ) : null}
          <Input
            autoFocus
            value={draft}
            aria-label={label}
            aria-invalid={invalid}
            onChange={(e) => {
              setDraft(e.target.value);
              setInvalid(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(null);
              }
            }}
            className={cn("bg-card", prefix && "ps-12", inputClassName)}
          />
        </div>
        <Button type="submit" size="icon-sm" aria-label={t("deal.saveField", { field: label })}>
          <Check />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("common:actions.cancel")}
          onClick={() => setDraft(null)}
        >
          <X />
        </Button>
      </div>
      {invalid && invalidMessage ? (
        <p role="alert" className="text-xs text-destructive">
          {invalidMessage}
        </p>
      ) : null}
    </form>
  );
}
