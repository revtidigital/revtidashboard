"use client";

import React, { useState, useEffect } from "react";
import { User, getWorkspaceService } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssignDialogProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignSuccess?: () => void;
}

const TEAMS = ["Engineering", "QA Testing", "Product", "Operations", "HR / People", "Marketing", "Sales", "Design"];

export function AssignDialog({
  documentId,
  documentTitle,
  isOpen,
  onOpenChange,
  onAssignSuccess,
}: AssignDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [team, setTeam] = useState<string>("none");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadUsers() {
      try {
        const service = getWorkspaceService();
        const allUsers = await service.getUsers();
        setUsers(allUsers);
      } catch (err) {
        console.error("Failed to load users for assignment:", err);
      }
    }

    loadUsers();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const service = getWorkspaceService();
      await service.assignDocument({
        document_id: documentId,
        assigned_to: assignedTo === "none" ? null : assignedTo,
        team: team === "none" ? null : team,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        notes: notes || null,
        assigned_by: null, // Resolved inside service
      });
      
      // Reset state
      setAssignedTo("none");
      setTeam("none");
      setDueDate("");
      setNotes("");
      
      onOpenChange(false);
      if (onAssignSuccess) onAssignSuccess();
    } catch (err) {
      console.error("Failed to assign document:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[#252B45] bg-[#151A2D] text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">Assign Document</DialogTitle>
          <p className="text-xs text-[#94A3B8] mt-1.5">
            Assigning: <span className="font-semibold text-white">{documentTitle}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* User Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="user-select" className="text-xs font-semibold text-slate-300">
              Assign to User
            </Label>
            <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || "none")}>
              <SelectTrigger id="user-select" className="w-full border-[#252B45] bg-[#0B1020] text-white">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent className="border-[#252B45] bg-[#151A2D] text-white">
                <SelectItem value="none" className="hover:bg-[#252B45] focus:bg-[#252B45]">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="hover:bg-[#252B45] focus:bg-[#252B45]">
                    {u.full_name} ({u.email.split("@")[0]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="team-select" className="text-xs font-semibold text-slate-300">
              Assign to Department / Team
            </Label>
            <Select value={team} onValueChange={(val) => setTeam(val || "none")}>
              <SelectTrigger id="team-select" className="w-full border-[#252B45] bg-[#0B1020] text-white">
                <SelectValue placeholder="Select a team..." />
              </SelectTrigger>
              <SelectContent className="border-[#252B45] bg-[#151A2D] text-white">
                <SelectItem value="none" className="hover:bg-[#252B45] focus:bg-[#252B45]">No Team</SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t} value={t} className="hover:bg-[#252B45] focus:bg-[#252B45]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="due-date" className="text-xs font-semibold text-slate-300">
              Due Date
            </Label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-[#252B45] bg-[#0B1020] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC] focus:border-[#7C5CFC]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="assign-notes" className="text-xs font-semibold text-slate-300">
              Notes & Instructions
            </Label>
            <Textarea
              id="assign-notes"
              placeholder="Provide context or guidelines for this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-[#252B45] bg-[#0B1020] text-white placeholder-slate-500 focus:ring-[#7C5CFC]"
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="border-[#252B45] text-slate-400 hover:bg-[#252B45] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (assignedTo === "none" && team === "none")}
              className="bg-[#7C5CFC] hover:bg-[#6847ea] text-white"
            >
              {isSubmitting ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
