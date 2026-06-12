"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Globe,
  Sliders,
  CheckCircle,
  AlertTriangle,
  X,
  AlertCircle,
  Circle,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  TaskReminder,
} from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getNextOccurrenceDate = (reminder: TaskReminder): Date => {
  const now = new Date();
  
  if (reminder.interval_type === "date") {
    return new Date(reminder.interval_value);
  }
  
  if (reminder.interval_type === "weekly") {
    const days = reminder.interval_value.split(",");
    const dayMap: Record<string, number> = {
      "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
    };
    
    let minDiff = 8;
    let nextDate = new Date();
    
    days.forEach(day => {
      const targetDayNum = dayMap[day.trim()];
      if (targetDayNum !== undefined) {
        const currentDayNum = now.getDay();
        let diff = targetDayNum - currentDayNum;
        if (diff < 0) {
          diff += 7;
        }
        if (diff < minDiff) {
          minDiff = diff;
          const target = new Date();
          target.setDate(now.getDate() + diff);
          target.setHours(0, 0, 0, 0);
          nextDate = target;
        }
      }
    });
    return nextDate;
  }
  
  if (reminder.interval_type === "monthly") {
    const dayOfMonth = parseInt(reminder.interval_value, 10);
    const targetDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 0, 0, 0, 0);
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
    return targetDate;
  }
  
  return new Date(8640000000000000); // far future
};

export default function RemindersPage() {
  return (
    <LayoutShell>
      <RemindersContent />
    </LayoutShell>
  );
}

function RemindersContent() {
  const { user } = useUser();
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [websiteName, setWebsiteName] = useState("");
  const [taskType, setTaskType] = useState("Website Maintenance");
  const [description, setDescription] = useState("");
  const [intervalType, setIntervalType] = useState<"weekly" | "monthly" | "date">("weekly");
  
  // Weekly specific state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Monthly specific state
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState("1");
  
  // Date specific state
  const [selectedDate, setSelectedDate] = useState("");
  const [frequency, setFrequency] = useState("1");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRemindersData = async () => {
    try {
      const service = getWorkspaceService();
      const data = await service.getTaskReminders();
      setReminders(data);
    } catch (err) {
      console.error("Failed to load task reminders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRemindersData();
    }
  }, [user]);

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isAuthorized || !websiteName.trim()) return;
    setIsSaving(true);

    let intervalValue = "";
    if (intervalType === "weekly") {
      if (selectedDays.length === 0) {
        alert("Please select at least one weekday.");
        setIsSaving(false);
        return;
      }
      intervalValue = selectedDays.join(",");
    } else if (intervalType === "monthly") {
      intervalValue = selectedDayOfMonth;
    } else if (intervalType === "date") {
      if (!selectedDate) {
        alert("Please select a specific date.");
        setIsSaving(false);
        return;
      }
      intervalValue = selectedDate;
    }

    try {
      const service = getWorkspaceService();
      await service.createTaskReminder({
        website_name: websiteName.trim(),
        task_type: taskType,
        description: description.trim(),
        interval_type: intervalType,
        interval_value: intervalValue,
        frequency: intervalType === "date" ? 1 : parseInt(frequency, 10),
        created_by: user?.id || null,
      });

      // Reset form
      setWebsiteName("");
      setTaskType("Website Maintenance");
      setDescription("");
      setIntervalType("weekly");
      setSelectedDays([]);
      setSelectedDayOfMonth("1");
      setSelectedDate("");
      setFrequency("1");
      setShowAddForm(false);

      loadRemindersData();
    } catch (err: any) {
      console.error("Failed to save reminder:", err);
      setErrorMsg(err.message || "Failed to save task reminder. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!isAuthorized) return;
    if (!confirm("Delete this task reminder?")) return;
    try {
      const service = getWorkspaceService();
      await service.deleteTaskReminder(id);
      loadRemindersData();
    } catch (err: any) {
      console.error("Failed to delete task reminder:", err);
      alert(err.message || "Failed to delete task reminder.");
    }
  };

  const handleToggleComplete = async (reminder: TaskReminder) => {
    if (!isAuthorized) return;
    try {
      const service = getWorkspaceService();
      await service.updateTaskReminder(reminder.id, {
        is_completed: !reminder.is_completed
      });
      loadRemindersData();
    } catch (err: any) {
      console.error("Failed to toggle completion status:", err);
      alert(err.message || "Failed to update completion status.");
    }
  };

  const getScheduleText = (reminder: TaskReminder) => {
    const freq = reminder.frequency || 1;
    if (reminder.interval_type === "weekly") {
      const freqText = freq === 1 ? "Every week" : `Every ${freq} weeks`;
      return `${freqText} on ${reminder.interval_value}`;
    } else if (reminder.interval_type === "monthly") {
      // ordinal suffix (e.g. 1st, 2nd, 3rd, 4th)
      const dayNum = parseInt(reminder.interval_value, 10);
      let suffix = "th";
      if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = "st";
      else if (dayNum === 2 || dayNum === 22) suffix = "nd";
      else if (dayNum === 3 || dayNum === 23) suffix = "rd";
      
      let freqText = freq === 1 ? "Every month" : `Every ${freq} months`;
      if (freq === 3) freqText = "Every 3 months (Quarterly)";
      else if (freq === 6) freqText = "Every 6 months (Semi-Annually)";
      else if (freq === 12) freqText = "Every 12 months (Annually)";

      return `${freqText} on the ${dayNum}${suffix}`;
    } else if (reminder.interval_type === "date") {
      const formattedDate = new Date(reminder.interval_value).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return `One-time on ${formattedDate}`;
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-48 rounded bg-[#0F1629] animate-pulse" />
        <div className="h-12 w-full rounded bg-[#0F1629] animate-pulse" />
        <div className="h-80 rounded bg-[#0F1629] animate-pulse" />
      </div>
    );
  }

  const isAuthorized = user?.role === "admin" || user?.role === "edit";

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Task Reminders
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Schedule and manage recurring website maintenance and task notifications.
          </p>
        </div>
        {isAuthorized && (
          <Button
            onClick={() => {
              setErrorMsg(null);
              setFrequency("1");
              setShowAddForm((v) => !v);
            }}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white flex items-center gap-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Reminder
          </Button>
        )}
      </div>

      {/* Add Reminder Form */}
      {showAddForm && isAuthorized && (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white transition-all duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-[#1E2D47]/40 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#0EA5E9]" />
              New Task Reminder
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveReminder} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Website Name *</Label>
              <Input
                placeholder="e.g. Revti Digital Main Site, Client Staging"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Task Type</Label>
              <Select value={taskType} onValueChange={(val) => val && setTaskType(val)}>
                <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                  <SelectItem value="Website Maintenance">Website Maintenance</SelectItem>
                  <SelectItem value="SSL Renewal">SSL Renewal</SelectItem>
                  <SelectItem value="DB Backup">DB Backup</SelectItem>
                  <SelectItem value="Code Deployment">Code Deployment</SelectItem>
                  <SelectItem value="Content Update">Content Update</SelectItem>
                  <SelectItem value="Security Audit">Security Audit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Description</Label>
              <textarea
                placeholder="Describe the maintenance task details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-[#1E2D47] bg-[#07090F] p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#0EA5E9]"
              />
            </div>

            {/* Interval Configuration */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Interval / Recurrence</Label>
                <Select
                  value={intervalType}
                  onValueChange={(val) => {
                    if (val) {
                      setIntervalType(val as "weekly" | "monthly" | "date");
                      if (val === "date") setFrequency("1");
                    }
                  }}
                >
                  <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="date">Specific Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {intervalType !== "date" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Frequency</Label>
                  <Select
                    value={frequency}
                    onValueChange={(val) => val && setFrequency(val)}
                  >
                    <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    {intervalType === "weekly" ? (
                      <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                        <SelectItem value="1">Every week</SelectItem>
                        <SelectItem value="2">Every 2 weeks</SelectItem>
                        <SelectItem value="3">Every 3 weeks</SelectItem>
                        <SelectItem value="4">Every 4 weeks</SelectItem>
                        <SelectItem value="6">Every 6 weeks</SelectItem>
                        <SelectItem value="8">Every 8 weeks</SelectItem>
                        <SelectItem value="12">Every 12 weeks</SelectItem>
                      </SelectContent>
                    ) : (
                      <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                        <SelectItem value="1">Every month</SelectItem>
                        <SelectItem value="2">Every 2 months</SelectItem>
                        <SelectItem value="3">Every 3 months (Quarterly)</SelectItem>
                        <SelectItem value="4">Every 4 months</SelectItem>
                        <SelectItem value="6">Every 6 months (Semi-Annually)</SelectItem>
                        <SelectItem value="12">Every 12 months (Annually)</SelectItem>
                      </SelectContent>
                    )}
                  </Select>
                </div>
              )}
            </div>

            {/* Conditional Sub-Interval Forms */}
            <div className="space-y-1.5">
              {intervalType === "weekly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Select Weekdays</Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {WEEKDAYS.map((day) => {
                      const short = day.slice(0, 3);
                      const isSelected = selectedDays.includes(short);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDayToggle(short)}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all ${
                            isSelected
                              ? "bg-[#0EA5E9] border-[#0EA5E9] text-white shadow-sm"
                              : "bg-[#07090F] border-[#1E2D47] text-slate-400 hover:text-white"
                          }`}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {intervalType === "monthly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Day of the Month</Label>
                  <Select value={selectedDayOfMonth} onValueChange={(val) => val && setSelectedDayOfMonth(val)}>
                    <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white max-h-48 overflow-y-auto">
                      {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {intervalType === "date" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Pick Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9] w-full"
                    required
                  />
                </div>
              )}
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSaving || !websiteName.trim()}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Reminder"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setErrorMsg(null);
                  setFrequency("1");
                  setShowAddForm(false);
                }}
                className="border-[#1E2D47] text-slate-300 hover:bg-[#1E2D47]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-12 text-center text-[#94A3B8]">
          <Bell className="h-8 w-8 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="text-sm font-medium">No task reminders scheduled yet.</p>
          {isAuthorized && <p className="text-xs mt-1">Click "Add Reminder" to create one.</p>}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...reminders]
            .sort((a, b) => {
              if (a.is_completed && !b.is_completed) return 1;
              if (!a.is_completed && b.is_completed) return -1;
              const dateA = getNextOccurrenceDate(a).getTime();
              const dateB = getNextOccurrenceDate(b).getTime();
              return dateA - dateB;
            })
            .map((rem) => {
            const isWeekly = rem.interval_type === "weekly";
            const isMonthly = rem.interval_type === "monthly";
            
            // Assign different colors to different task types
            const typeColors: Record<string, string> = {
              "Website Maintenance": "text-[#0EA5E9] bg-[#0EA5E9]/10 border-[#0EA5E9]/20",
              "SSL Renewal": "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
              "DB Backup": "text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20",
              "Code Deployment": "text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/20",
              "Content Update": "text-[#FB7185] bg-[#FB7185]/10 border-[#FB7185]/20",
              "Security Audit": "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20",
              "Other": "text-slate-400 bg-slate-400/10 border-slate-400/20",
            };

            const defaultColor = "text-slate-400 bg-slate-400/10 border-slate-400/20";
            const typeColor = typeColors[rem.task_type] || defaultColor;

            return (
              <Card
                key={rem.id}
                className="border-[#1E2D47] bg-[#0F1629] p-5 text-white flex flex-col gap-4 hover:border-[#0EA5E9]/30 transition-all duration-200"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(rem)}
                      disabled={!isAuthorized}
                      className={`flex-shrink-0 rounded-md border p-2 transition-all ${
                        rem.is_completed
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-[#1E2D47] bg-[#07090F] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30"
                      }`}
                      title={rem.is_completed ? "Mark Incomplete" : "Mark Complete"}
                    >
                      {rem.is_completed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${rem.is_completed ? "text-slate-400 line-through" : "text-white"}`}>
                        {rem.website_name}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${typeColor}`}>
                        {rem.task_type}
                      </span>
                    </div>
                  </div>
                  {isAuthorized && (
                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="flex-shrink-0 p-1.5 rounded hover:bg-[#EF4444]/10 text-slate-500 hover:text-[#EF4444] transition-colors"
                      title="Delete Reminder"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Body Content */}
                <div className="flex-1 text-xs space-y-3">
                  {rem.description && (
                    <p className="text-slate-300 leading-relaxed bg-[#07090F]/50 p-2.5 rounded border border-[#1E2D47]/40 text-[11px]">
                      {rem.description}
                    </p>
                  )}

                  {/* Recurrence Schedule block */}
                  <div className="flex items-center gap-2 p-2 rounded bg-[#07090F] border border-[#1E2D47] text-[10px]">
                    {isWeekly || isMonthly ? (
                      <Clock className="h-3.5 w-3.5 text-[#34D399] shrink-0" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5 text-[#A78BFA] shrink-0" />
                    )}
                    <span className="font-semibold text-slate-200 truncate">
                      {getScheduleText(rem)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
