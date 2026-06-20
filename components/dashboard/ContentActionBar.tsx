"use client";

import { 
  Copy, Share2, CalendarClock, 
  Save, ExternalLink, Check, ChevronLeft, ChevronRight 
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ContentActionBarProps {
  content: string;
  projectId?: string;
  contentId?: string;
  platform: string;
  onSave?: () => Promise<void>;
  hideOpenWorkspace?: boolean;
}

export function ContentActionBar({ 
  content, 
  projectId, 
  contentId,
  platform, 
  onSave,
  hideOpenWorkspace = false
}: ContentActionBarProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Scheduling states
  const [selectedDay, setSelectedDay] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getDate();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getMonth();
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getFullYear();
  });
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const [calMonth, setCalMonth] = useState(selectedMonth);
  const [calYear, setCalYear] = useState(selectedYear);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleCopy = async () => {
    if (!content) {
      toast.error("No content to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (!content) {
      toast.error("No content to share");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text: content });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    } else {
      await handleCopy();
      toast.info("Text copied — share anywhere");
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
      toast.success("Saved to project");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenWorkspace = () => {
    if (projectId) {
      router.push(`/projects/${projectId}`);
    } else {
      toast.info("Saving to project first...");
      handleSave().then(() => {
        if (projectId) {
          router.push(`/projects/${projectId}`);
        } else {
          router.push("/projects");
        }
      });
    }
  };

  const handleConfirmSchedule = async () => {
    const scheduledTime = new Date(selectedYear, selectedMonth, selectedDay, parseInt(selectedHour), parseInt(selectedMinute));
    if (scheduledTime.getTime() <= Date.now()) {
      toast.error("Schedule time must be in the future");
      return;
    }

    if (!contentId) {
      toast.error("Content must be saved to a project before scheduling");
      return;
    }

    setIsScheduling(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          platform: platform.toUpperCase(),
          scheduledAt: scheduledTime.toISOString(),
          postingMethod: "email_reminder",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule");
      }

      toast.success("Reminder scheduled successfully!", {
        description: "Please check your spam or promotions folder if you don't see our emails.",
      });
      setIsModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule reminder");
    } finally {
      setIsScheduling(false);
    }
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const paddingCells = Array.from({ length: firstDayIndex }, (_, i) => i);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2 pt-4 border-t border-[#232323]">
      {/* Left group */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border-[#333] hover:bg-neutral-700 text-sm text-neutral-200 transition-colors"
        >
          {copied 
            ? <><Check className="h-4 w-4 text-green-400" /> Copied!</>
            : <><Copy className="h-4 w-4" /> Copy</>
          }
        </Button>

        <Button
          variant="outline"
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border-[#333] hover:bg-neutral-700 text-sm text-neutral-200 transition-colors"
        >
          <Share2 className="h-4 w-4" /> Share
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            if (!contentId) {
              toast.error("Please save this post to the project first before scheduling.");
              return;
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border-[#333] hover:bg-neutral-700 text-sm text-neutral-200 transition-colors"
        >
          <CalendarClock className="h-4 w-4" /> Schedule Reminder
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right group */}
      <div className="flex items-center gap-2">
        {/* Open in Workspace button */}
        {!hideOpenWorkspace && projectId && (
          <Button
            variant="outline"
            onClick={handleOpenWorkspace}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 border-[#333] hover:bg-neutral-700 text-sm text-neutral-200 transition-colors"
          >
            <ExternalLink className="h-4 w-4" /> Open in Workspace
          </Button>
        )}

        {onSave && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-neutral-100 text-sm text-neutral-900 font-medium transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save to Project"}
          </Button>
        )}
      </div>

      {/* Schedule Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#232323] bg-[#0F0F0F] p-6 shadow-xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-white mb-2">Schedule Email Reminder</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Pick a date and time to receive an email reminder with this rewritten post.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Reminder Date &amp; Time
                </label>
                
                <div className="flex items-center justify-between mb-3 bg-[#151515] p-2 rounded-xl border border-[#232323]">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#232323] transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-white">
                    {monthNames[calMonth]} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#232323] transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-zinc-500 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {paddingCells.map((_, i) => (
                    <div key={`pad-${i}`} className="py-2" />
                  ))}
                  {dayCells.map((day) => {
                    const isSelected = selectedDay === day && selectedMonth === calMonth && selectedYear === calYear;
                    return (
                      <button
                        key={`day-${day}`}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedMonth(calMonth);
                          setSelectedYear(calYear);
                        }}
                        className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          isSelected
                            ? "bg-white text-black"
                            : "text-zinc-300 hover:bg-[#151515]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-4 border-t border-[#232323] pt-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Hour (24h)
                  </label>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full rounded-xl border border-[#232323] bg-[#151515] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  >
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")).map((hr) => (
                      <option key={hr} value={hr}>{hr}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Minute
                  </label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="w-full rounded-xl border border-[#232323] bg-[#151515] p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  >
                    {["00", "15", "30", "45"].map((min) => (
                      <option key={min} value={min}>{min}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 border-[#232323] bg-[#151515] text-white hover:bg-[#232323]"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-zinc-200"
                onClick={handleConfirmSchedule}
                disabled={isScheduling}
              >
                {isScheduling ? "Scheduling..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
