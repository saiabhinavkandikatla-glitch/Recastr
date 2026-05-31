"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPreviewEngine } from "@/components/preview/PlatformPreview";
import { getPlatformCharacterLimit } from "@/lib/platform-limits";
import type { PreviewPlatform } from "@/lib/preview-content";
import { cn } from "@/lib/utils";

export type ContentCardPlatform = "twitter" | "linkedin" | "instagram" | "youtube";

export interface ContentCardProps {
  id: string;
  platform: ContentCardPlatform;
  contentType: string;
  body: string;
  tone: string;
  approved: boolean;
  scheduledAt?: Date;
  order: number;
  onApprove: (id: string) => void;
  onToneChange: (id: string, tone: string) => void;
  onBodyChange: (id: string, body: string) => void;
  onSchedule: (id: string, date: Date) => void;
  onCopy: (id: string) => void;
  onRegenerate: (id: string) => void;
  onActivate?: (id: string) => void;
  selected?: boolean;
}

const tones = ["professional", "casual", "educational", "entertaining"] as const;

const platformMeta: Record<
  ContentCardPlatform,
  { label: string; dot: string; accent: string; limit: number }
> = {
  twitter: {
    label: "Twitter / X",
    dot: "bg-[var(--platform-twitter)]",
    accent: "border-l-[var(--platform-twitter)]",
    limit: getPlatformCharacterLimit("TWITTER"),
  },
  linkedin: {
    label: "LinkedIn",
    dot: "bg-[var(--platform-linkedin)]",
    accent: "border-l-[var(--platform-linkedin)]",
    limit: getPlatformCharacterLimit("LINKEDIN"),
  },
  instagram: {
    label: "Instagram",
    dot: "bg-[var(--platform-instagram)]",
    accent: "border-l-[var(--platform-instagram)]",
    limit: getPlatformCharacterLimit("INSTAGRAM"),
  },
  youtube: {
    label: "YouTube",
    dot: "bg-[var(--platform-youtube)]",
    accent: "border-l-[var(--platform-youtube)]",
    limit: getPlatformCharacterLimit("YOUTUBE"),
  },
};

const cardEntrance = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.32, 1] },
} as const;

export const ContentCard = memo(function ContentCard({
  id,
  platform,
  contentType,
  body,
  tone,
  scheduledAt,
  order,
  onToneChange,
  onBodyChange,
  onSchedule,
  onCopy,
  onRegenerate,
  onActivate,
  selected = false,
}: ContentCardProps) {
  const approved = false;
  const [localBody, setLocalBody] = useState(body);
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState(defaultScheduleValue());
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const meta = platformMeta[platform];
  const overLimit = localBody.length > meta.limit;
  const overLimitText = `${localBody.length - meta.limit} characters over ${meta.label} limit`;
  const showToneStrip = focused && mode === "edit";

  useEffect(() => {
    setLocalBody(body);
    if (editorRef.current && editorRef.current.innerText !== body) {
      editorRef.current.innerText = body;
    }
  }, [body]);

  useEffect(() => {
    if (localBody === body) return;
    const timeout = window.setTimeout(() => onBodyChange(id, localBody), 800);
    return () => window.clearTimeout(timeout);
  }, [body, id, localBody, onBodyChange]);

  const scheduledLabel = useMemo(() => {
    if (!scheduledAt) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(scheduledAt);
  }, [scheduledAt]);

  const counterColor = cn(
    "transition-colors duration-150",
    overLimit ? "text-red-500" : "text-muted-foreground",
  );

  const handleInput = useCallback((event: FormEvent<HTMLDivElement>) => {
    setLocalBody(event.currentTarget.innerText);
  }, []);

  const handleCopy = useCallback(() => {
    onCopy(id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [id, onCopy]);

  const handleRegenerate = useCallback(() => {
    setStreaming(true);
    onRegenerate(id);
    window.setTimeout(() => setStreaming(false), 900);
  }, [id, onRegenerate]);

  const handleToneChange = useCallback(
    (nextTone: string) => {
      setStreaming(true);
      onToneChange(id, nextTone);
      window.setTimeout(() => setStreaming(false), 700);
    },
    [id, onToneChange],
  );

  const handleSchedule = useCallback(() => {
    const date = new Date(scheduleValue);
    if (Number.isNaN(date.getTime())) return;
    onSchedule(id, date);
    setScheduleOpen(false);
    toast.success("Post scheduled. You will get an email when it is time to post.");
  }, [id, onSchedule, scheduleValue]);

  return (
    <motion.article
      {...(order < 8 ? cardEntrance : {})}
      className={cn(
        "group overflow-hidden rounded-[var(--card-radius)] border border-white/10 border-l-[3px] bg-[#090E1D] text-card-foreground",
        meta.accent,
        selected && "ring-1 ring-[var(--violet)]/45",
        focused && "border-[var(--violet)] ring-1 ring-[var(--violet)]/25",
        overLimit && "border-red-500/60 ring-1 ring-red-500/20",
        scheduledAt && "border-l-[var(--status-scheduled)]",
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onClick={() => onActivate?.(id)}
      onFocus={() => {
        setFocused(true);
        onActivate?.(id);
      }}
    >
      <div className="flex min-h-12 items-center gap-2 border-b border-white/10 px-4">
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        <span className="text-sm font-medium text-muted-foreground">{meta.label}</span>
        <button
          type="button"
          onClick={handleRegenerate}
          className="ml-2 hidden h-7 items-center gap-1 rounded-lg border border-white/10 px-2 text-xs text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground group-hover:flex"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Regenerate
        </button>

        <div className="ml-auto flex items-center gap-2">
          {scheduledLabel ? (
            <span className="rounded-full border border-[var(--status-scheduled)]/60 bg-[var(--status-scheduled-bg)] px-2 py-0.5 text-xs text-[var(--status-scheduled)]">
              {scheduledLabel}
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-muted-foreground">
            {contentType}
          </span>
          <div className="flex rounded-full border border-white/10 bg-white/[0.05] p-0.5">
            {(["edit", "preview"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  "h-6 rounded-full px-2 text-[11px] font-medium capitalize text-muted-foreground transition",
                  mode === item && "bg-[var(--violet)] text-white",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            aria-label="Drag content card"
            className="opacity-0 transition group-hover:opacity-100"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showToneStrip ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-center gap-2 overflow-hidden border-b border-white/10 px-4"
          >
            {tones.map((item) => {
              const active = tone.toLowerCase() === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleToneChange(item)}
                  className={cn(
                    "h-7 rounded-full border px-3 text-xs capitalize text-muted-foreground transition hover:text-foreground",
                    active && "border-transparent bg-[var(--violet)] text-white hover:text-white",
                  )}
                >
                  {item}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ opacity: streaming ? 0.48 : 1 }}
        transition={{ duration: 0.25, ease: "easeIn" }}
        className="relative px-4 py-5"
      >
        {mode === "edit" ? (
          <div
            ref={editorRef}
            aria-label={`${meta.label} content editor`}
            className={cn(
              "min-h-20 whitespace-pre-wrap text-sm font-medium leading-relaxed outline-none selection:bg-[var(--violet)]/20",
              focused && "after:ml-1 after:inline-block after:h-4 after:w-[2px] after:animate-pulse after:bg-[var(--violet)] after:content-['']",
            )}
            contentEditable
            role="textbox"
            suppressContentEditableWarning
            tabIndex={0}
            onInput={handleInput}
          >
            {localBody}
          </div>
        ) : (
          <PlatformPreviewEngine
            compact
            draft={localBody}
            platform={toPreviewPlatform(platform)}
            theme="dark"
          />
        )}
        <span className={cn("absolute bottom-3 right-5 font-mono text-xs", counterColor)}>
          {localBody.length} / {meta.limit} chars
        </span>
      </motion.div>

      <div className="flex min-h-12 items-center justify-between gap-3 border-t border-white/10 px-4 py-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className={cn("font-mono text-xs", counterColor)}>{localBody.length} / {meta.limit} chars</span>
          {overLimit ? (
            <span className="text-xs font-medium text-red-400">{overLimitText}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {approved && overLimit ? (
            <span
              className="inline-flex h-8 items-center rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-300"
              title={overLimitText}
            >
              Fix length first
            </span>
          ) : approved ? (
            <Link
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-transparent bg-[var(--status-approved-bg)] px-3 text-xs font-semibold text-[var(--status-approved)] transition hover:underline"
              href="/tasks?tab=scheduled"
              title="Open scheduled reminders"
            >
              <Check className="h-4 w-4" />
              Open schedule
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setScheduleOpen((current) => !current)}
              disabled={overLimit}
              title="Schedule this post and receive an email when it is time to publish manually."
              className="h-8 rounded-lg bg-[var(--violet)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--violet-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-red-500/15 disabled:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-2"
            >
              {overLimit ? "Over limit" : "Schedule"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setScheduleOpen((current) => !current)}
            disabled={overLimit}
            className="hidden h-8 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-2"
          >
            Schedule
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-2"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {scheduleOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/10"
          >
            <SchedulePicker
              value={scheduleValue}
              onCancel={() => setScheduleOpen(false)}
              onChange={setScheduleValue}
              onConfirm={handleSchedule}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
});

function SchedulePicker({
  onCancel,
  onChange,
  onConfirm,
  value,
}: {
  onCancel: () => void;
  onChange: (value: string) => void;
  onConfirm: () => void;
  value: string;
}) {
  const selected = useMemo(() => parseScheduleValue(value), [value]);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(selected));
  const days = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const hour = selected.getHours();
  const minute = selected.getMinutes();

  useEffect(() => {
    setCalendarMonth(startOfMonth(selected));
  }, [selected]);

  const scheduledLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(selected);
  }, [selected]);

  function setDate(day: Date) {
    const next = new Date(selected);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(formatScheduleValue(next));
  }

  function setTime(nextHour: number, nextMinute = minute) {
    const next = new Date(selected);
    next.setHours(nextHour, nextMinute, 0, 0);
    onChange(formatScheduleValue(next));
  }

  function setMinute(nextMinute: number) {
    const next = new Date(selected);
    next.setMinutes(nextMinute, 0, 0);
    onChange(formatScheduleValue(next));
  }

  return (
    <div className="bg-[#080D1B] px-4 py-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--violet)]">
            <CalendarDays className="h-3.5 w-3.5" />
            Schedule reminder
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{scheduledLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-9 rounded-lg border border-white/10 px-3 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-lg bg-[var(--violet)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--violet-hover)] active:scale-[0.98]"
            onClick={onConfirm}
            type="button"
          >
            Save schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-2xl border border-white/10 bg-background/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">{formatMonth(calendarMonth)}</p>
            <button
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
              onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span className="py-1.5" key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const selectedDay = isSameCalendarDay(day, selected);
              const today = isSameCalendarDay(day, new Date());
              const outside = day.getMonth() !== calendarMonth.getMonth();
              const past = isPastDate(day);

              return (
                <button
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition",
                    selectedDay && "bg-[var(--violet)] text-white",
                    !selectedDay && today && "border border-[var(--violet)]/60 text-[var(--violet)]",
                    !selectedDay && !today && "text-foreground hover:bg-white/[0.06]",
                    outside && "text-muted-foreground/45",
                    past && "cursor-not-allowed opacity-35 hover:bg-transparent",
                  )}
                  disabled={past}
                  key={day.toISOString()}
                  onClick={() => setDate(day)}
                  type="button"
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-background/50 p-3">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4 text-[var(--violet)]" />
            Time
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[9, 13, 17, 20].map((quickHour) => (
              <button
                className={cn(
                  "h-9 rounded-lg border border-white/10 text-sm font-medium transition hover:bg-white/[0.06]",
                  hour === quickHour && minute === 0 && "border-[var(--violet)] bg-[var(--violet)]/15 text-[var(--violet)]",
                )}
                key={quickHour}
                onClick={() => setTime(quickHour, 0)}
                type="button"
              >
                {formatTimeLabel(quickHour, 0)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <NumberStepper
              label="Hour"
              max={23}
              min={0}
              onChange={(nextHour) => setTime(nextHour)}
              value={hour}
            />
            <span className="pt-6 text-lg font-semibold text-muted-foreground">:</span>
            <NumberStepper
              label="Minute"
              max={59}
              min={0}
              onChange={setMinute}
              step={5}
              value={minute}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            You will receive an email reminder at this local time.
          </p>
        </div>
      </div>
    </div>
  );
}

function NumberStepper({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  function clamp(next: number) {
    if (next > max) return min;
    if (next < min) return max;
    return next;
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="flex h-10 items-center justify-between rounded-lg border border-white/10 bg-[#070C18]">
        <button
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="h-full px-3 text-muted-foreground transition hover:text-foreground"
          onClick={() => onChange(clamp(value - step))}
          type="button"
        >
          -
        </button>
        <span className="font-mono text-sm font-semibold">{String(value).padStart(2, "0")}</span>
        <button
          aria-label={`Increase ${label.toLowerCase()}`}
          className="h-full px-3 text-muted-foreground transition hover:text-foreground"
          onClick={() => onChange(clamp(value + step))}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

function toPreviewPlatform(platform: ContentCardPlatform): PreviewPlatform {
  if (platform === "linkedin") return "LINKEDIN";
  if (platform === "instagram") return "INSTAGRAM";
  if (platform === "youtube") return "COMMUNITY";
  return "TWITTER";
}

function defaultScheduleValue() {
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  return formatScheduleValue(next);
}

function parseScheduleValue(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function formatScheduleValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isPastDate(day: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(day);
  candidate.setHours(0, 0, 0, 0);
  return candidate.getTime() < today.getTime();
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatTimeLabel(hour: number, minute: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hour, minute));
}
