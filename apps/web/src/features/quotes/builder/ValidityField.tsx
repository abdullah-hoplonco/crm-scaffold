import { differenceInCalendarDays, format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDate } from "@/lib/format";
import { daysFromToday, todayInWorkspace } from "../model";

const PRESETS = [7, 14, 30];

/** YYYY-MM-DD as a local Date at noon, so the calendar shows the same day in any browser timezone. */
function toLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function ValidityField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation("quotes");
  const [open, setOpen] = useState(false);
  const today = todayInWorkspace();
  const days = differenceInCalendarDays(toLocalDate(value), toLocalDate(today));
  const preset = PRESETS.find((n) => daysFromToday(n) === value);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{t("builder.validity")}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={preset ? String(preset) : ""}
          onValueChange={(next) => {
            if (next) onChange(daysFromToday(Number(next)));
          }}
        >
          {PRESETS.map((n) => (
            <ToggleGroupItem key={n} value={String(n)} className="px-3 tabular-nums">
              {t("builder.validityDays", { count: n })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="tabular-nums">
              <CalendarDays />
              {preset ? t("builder.validityPick") : formatDate(value)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={toLocalDate(value)}
              defaultMonth={toLocalDate(value)}
              disabled={{ before: toLocalDate(today) }}
              onSelect={(date) => {
                if (!date) return;
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        {days <= 0
          ? t("builder.validityHintToday")
          : t("builder.validityHint", { count: days, date: formatDate(value) })}
      </p>
    </fieldset>
  );
}
