import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fromDateOnly, toDateOnly } from "./dates";

/** A YYYY-MM-DD date in a popover calendar, with a way to clear it. */
export function DatePickerButton({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const { t } = useTranslation("pipeline");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn("justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarDays className="text-muted-foreground" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          weekStartsOn={1}
          selected={value ? fromDateOnly(value) : undefined}
          defaultMonth={value ? fromDateOnly(value) : undefined}
          onSelect={(date) => {
            onChange(date ? toDateOnly(date) : null);
            setOpen(false);
          }}
        />
        {value ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X />
              {t("datePicker.clear")}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
