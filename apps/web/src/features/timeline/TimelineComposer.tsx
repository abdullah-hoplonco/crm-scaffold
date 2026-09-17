import { api } from "@hco/shared";
import { Phone, StickyNote, Users } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import type { TimelineSubject } from "./Timeline";

type Kind = "note" | "call" | "meeting";

const ICONS = { note: StickyNote, call: Phone, meeting: Users } as const;

/** Log a note, call or meeting against a lead, contact or deal. Ctrl/Cmd+Enter submits. */
export function TimelineComposer({ subject }: { subject: TimelineSubject }) {
  const { t } = useTranslation("pipeline");
  const [kind, setKind] = useState<Kind>("note");
  const [body, setBody] = useState("");
  const fieldId = useId();
  const add = useApiMutation(api.timeline.addActivity, {
    onSuccess: () => {
      toast.success(t(`composer.${kind}.done`));
      setBody("");
    },
    onError: (error) => toast.error(t("composer.failed"), { description: errorMessage(error) }),
  });

  const submit = () => {
    if (!body.trim() || add.isPending) return;
    add.mutate({
      body: {
        type: kind,
        body: body.trim(),
        leadId: subject.leadId ?? null,
        contactId: subject.contactId ?? null,
        dealId: subject.dealId ?? null,
      },
    });
  };

  return (
    <form
      className="rounded-xl border bg-card shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={fieldId} className="sr-only">
        {t(`composer.${kind}.label`)}
      </label>
      <Textarea
        id={fieldId}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t(`composer.${kind}.placeholder`)}
        rows={2}
        className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <div className="flex flex-wrap items-center gap-2 border-t px-2 py-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={kind}
          onValueChange={(value) => {
            if (value === "note" || value === "call" || value === "meeting") setKind(value);
          }}
          aria-label={t("composer.kindLabel")}
        >
          {(["note", "call", "meeting"] as const).map((k) => {
            const Icon = ICONS[k];
            return (
              <ToggleGroupItem key={k} value={k} className="gap-1.5 rounded-md px-2.5 text-muted-foreground">
                <Icon className="size-3.5" />
                {t(`composer.${k}.tab`)}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <Button type="submit" size="sm" className="ms-auto" disabled={!body.trim() || add.isPending}>
          {t(`composer.${kind}.submit`)}
        </Button>
      </div>
    </form>
  );
}
