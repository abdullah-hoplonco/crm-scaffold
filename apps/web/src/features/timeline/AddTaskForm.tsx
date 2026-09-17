import { api } from "@hco/shared";
import { startOfToday } from "date-fns";
import { CalendarClock, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation } from "@/lib/api/hooks";
import { formatDueShort, isPastFiveToday, pickedDue, todayAtFive, tomorrowAtTen } from "./due";
import type { TimelineSubject } from "./Timeline";

type Preset = "today" | "tomorrow" | "pick";

const TIMES = Array.from({ length: 29 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** One-line task entry with due presets: Today 5 pm, Tomorrow 10 am, or a picked date and time. */
export function AddTaskForm({ subject }: { subject: TimelineSubject }) {
  const { t } = useTranslation("pipeline");
  const titleId = useId();
  const timeId = useId();
  const [title, setTitle] = useState("");
  const todayPassed = isPastFiveToday();
  const [preset, setPreset] = useState<Preset>(todayPassed ? "tomorrow" : "today");
  const [pickOpen, setPickOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [pickedTime, setPickedTime] = useState("10:00");
  const [picked, setPicked] = useState<string | null>(null);

  const effectivePreset = preset === "today" && todayPassed ? "tomorrow" : preset;
  const dueAt =
    effectivePreset === "today" ? todayAtFive() : effectivePreset === "tomorrow" ? tomorrowAtTen() : picked;

  const create = useApiMutation(api.timeline.createTask, {
    onSuccess: (task) => {
      toast.success(t("tasks.added"), {
        description: t("tasks.addedDue", { title: task.title, due: formatDueShort(task.dueAt) }),
      });
      setTitle("");
    },
    onError: (error) => toast.error(t("tasks.addFailed"), { description: errorMessage(error) }),
  });

  const submit = () => {
    if (!title.trim() || !dueAt || create.isPending) return;
    create.mutate({
      body: {
        title: title.trim(),
        dueAt,
        leadId: subject.leadId ?? null,
        contactId: subject.contactId ?? null,
        dealId: subject.dealId ?? null,
      },
    });
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Label htmlFor={titleId} className="sr-only">
        {t("tasks.titleLabel")}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={titleId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("tasks.placeholder")}
          className="bg-card"
        />
        <Button type="submit" className="shrink-0" disabled={!title.trim() || !dueAt || create.isPending}>
          <Plus />
          {t("tasks.add")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={pickOpen} onOpenChange={setPickOpen}>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={effectivePreset}
            onValueChange={(value) => {
              if (value === "today" || value === "tomorrow") setPreset(value);
            }}
            aria-label={t("tasks.dueLabel")}
            className="bg-card"
          >
            <ToggleGroupItem
              value="today"
              disabled={todayPassed}
              title={todayPassed ? t("tasks.todayPassed") : undefined}
            >
              {t("tasks.presetToday")}
            </ToggleGroupItem>
            <ToggleGroupItem value="tomorrow">{t("tasks.presetTomorrow")}</ToggleGroupItem>
            <PopoverAnchor asChild>
              <ToggleGroupItem
                value="pick"
                onClick={(e) => {
                  e.preventDefault();
                  setPickOpen(true);
                }}
                aria-haspopup="dialog"
                aria-expanded={pickOpen}
              >
                <CalendarClock className="size-3.5" />
                {effectivePreset === "pick" && picked ? formatDueShort(picked) : t("tasks.presetPick")}
              </ToggleGroupItem>
            </PopoverAnchor>
          </ToggleGroup>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              weekStartsOn={1}
              selected={pickedDate}
              onSelect={setPickedDate}
              disabled={{ before: startOfToday() }}
            />
            <div className="flex items-end gap-2 border-t p-3">
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor={timeId} className="text-xs text-muted-foreground">
                  {t("tasks.timeLabel")}
                </Label>
                <Select value={pickedTime} onValueChange={setPickedTime}>
                  <SelectTrigger id={timeId} size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                    {TIMES.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!pickedDate}
                onClick={() => {
                  if (!pickedDate) return;
                  setPicked(pickedDue(pickedDate, pickedTime));
                  setPreset("pick");
                  setPickOpen(false);
                }}
              >
                {t("tasks.setDue")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </form>
  );
}
