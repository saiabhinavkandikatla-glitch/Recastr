"use client";

import { useState } from "react";
import { Copy, Save, Share2, Calendar, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGenerator } from "./GeneratorProvider";

function getActiveContent(outputs: ReturnType<typeof useGenerator>["outputs"], activeTab: string): string {
  const match = outputs.find((o) => o.platform === activeTab);
  if (!match) return "";
  if (typeof match.content === "string") {
    return match.content;
  }
  if (match.content && typeof match.content === "object") {
    const obj = match.content as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.content === "string") return obj.content;
  }
  return "";
}

export function ActionBar() {
  const { outputs, activePreviewTab, project } = useGenerator();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

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
    const content = getActiveContent(outputs, activePreviewTab);
    if (!content) {
      toast.error("No content to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleShare = async () => {
    const content = getActiveContent(outputs, activePreviewTab);
    if (!content) {
      toast.error("No content to share");
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "ReCastr Content", text: content });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(content);
        toast.success("Content copied — paste to share");
      } catch {
        toast.error("Failed to copy content");
      }
    }
  };

  const handleSave = async (silent = false) => {
    const contentText = getActiveContent(outputs, activePreviewTab);
    if (!contentText) {
      toast.error("No content to save");
      return null;
    }
    if (!project) {
      toast.error("Please ingest a source first");
      return null;
    }

    const matchingContent = project.contents?.find(
      (c) => c.platform.toUpperCase() === activePreviewTab.toUpperCase()
    );
    if (!matchingContent) {
      toast.error(`No content slot found for ${activePreviewTab} in this project.`);
      return null;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/content/${matchingContent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: contentText, approved: true }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save content");
      }
      if (!silent) {
        toast.success("Content saved to project!");
      }
      return matchingContent.id;
    } catch {
      toast.error("Failed to save content to database");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSchedule = async () => {
    const scheduledTime = new Date(selectedYear, selectedMonth, selectedDay, parseInt(selectedHour), parseInt(selectedMinute));
    if (scheduledTime.getTime() <= Date.now()) {
      toast.error("Schedule time must be in the future");
      return;
    }

    setIsScheduling(true);
    try {
      // 1. Auto-save generated content to the database first
      const contentId = await handleSave(true);
      if (!contentId) {
        setIsScheduling(false);
        return;
      }

      // 2. Schedule the email reminder using schedule API
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          platform: activePreviewTab,
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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const paddingCells = Array.from({ length: firstDayIndex }, (_, i) => i);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between gap-4 overflow-x-auto border-t border-[#232323] bg-[#151515] p-4 scrollbar-none">
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          variant="outline"
          className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]"
          onClick={() => {
            const content = getActiveContent(outputs, activePreviewTab);
            if (!content) {
              toast.error("No content to schedule");
              return;
            }
            if (!project) {
              toast.error("Please ingest a source first");
              return;
            }
            setIsModalOpen(true);
          }}
        >
          <Calendar className="h-4 w-4 text-[#8A8A8A]" /> Schedule Reminder
        </Button>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {project && (
          <Button
            variant="default"
            className="gap-2 bg-white text-black hover:bg-zinc-200"
            onClick={() => router.push(`/projects/${project.id}`)}
          >
            <ExternalLink className="h-4 w-4 text-black" /> Open in Workspace
          </Button>
        )}
      </div>

      {/* Schedule Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#232323] bg-[#0F0F0F] p-6 shadow-xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-white mb-2">Schedule Email Reminder</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Pick a date and time to receive an email reminder with this generated post for {activePreviewTab}.
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

                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
                  {paddingCells.map((_, i) => (
                    <div key={`pad-${i}`} className="py-1"></div>
                  ))}
                  {dayCells.map((day) => {
                    const isSelected = selectedDay === day && selectedMonth === calMonth && selectedYear === calYear;
                    const cellDate = new Date(calYear, calMonth, day);
                    const isPast = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate() + 1).getTime() <= Date.now();
                    
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedMonth(calMonth);
                          setSelectedYear(calYear);
                        }}
                        className={`w-7 h-7 flex items-center justify-center mx-auto rounded-full font-medium transition-colors ${
                          isSelected
                            ? "bg-white text-black font-bold"
                            : isPast
                              ? "text-zinc-700 cursor-not-allowed opacity-50"
                              : "text-zinc-300 hover:bg-[#1A1A1A] hover:text-white"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Time Picker */}
                <div className="flex gap-3 border-t border-[#232323] pt-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Hour
                    </label>
                    <select
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(e.target.value)}
                      className="w-full rounded-xl border border-[#232323] bg-[#090909] px-4 py-2 text-sm text-white focus:border-[#444] focus:outline-none appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white'><path d='M3 4l3 3 3-3z'/></svg>")`,
                        backgroundPosition: 'right 12px center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const val = i.toString().padStart(2, "0");
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Minute
                    </label>
                    <select
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      className="w-full rounded-xl border border-[#232323] bg-[#090909] px-4 py-2 text-sm text-white focus:border-[#444] focus:outline-none appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white'><path d='M3 4l3 3 3-3z'/></svg>")`,
                        backgroundPosition: 'right 12px center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {Array.from({ length: 60 }, (_, i) => {
                        const val = i.toString().padStart(2, "0");
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  className="border-[#232323] bg-[#090909] text-white hover:bg-[#151515]"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isScheduling}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-white text-black hover:bg-zinc-200"
                  onClick={handleConfirmSchedule}
                  disabled={isScheduling}
                >
                  {isScheduling ? "Scheduling..." : "Schedule Reminder"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
