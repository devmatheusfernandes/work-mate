"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import {
  CircleDashed,
  Loader2,
  CheckCircle2,
  Calendar,
  Bell,
  BellOff,
  Plus,
  Trash2,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultBody,
  VaultFooter,
  VaultPrimaryButton,
} from "@/components/ui/vault";
import type { Note, TaskStatus, Subtask } from "@/modules/notes/notes.schema";
import Link from "next/link";

interface TaskDetailsVaultProps {
  task: Note;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; color: string; dotColor: string }
> = {
  to_start: {
    label: "A Fazer",
    icon: <CircleDashed className="size-4" />,
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  in_progress: {
    label: "Em Progresso",
    icon: <Loader2 className="size-4" />,
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  done: {
    label: "Concluído",
    icon: <CheckCircle2 className="size-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
};

export function TaskDetailsVault({
  task,
  open,
  onOpenChange,
}: TaskDetailsVaultProps) {
  const currentStatus = (task.taskStatus || "to_start") as TaskStatus;
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [deadline, setDeadline] = useState(task.taskDeadline || "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.taskSubtasks || []);
  const [shouldNotify, setShouldNotify] = useState(task.taskShouldNotify || false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const saveField = useCallback(async (updates: Partial<Note>) => {
    try {
      const result = await updateNoteAction({
        id: task.id,
        updates,
      });
      if (!result?.data?.success) {
        toast.error("Erro ao salvar alteração em segundo plano.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar alteração.");
    }
  }, [task.id]);

  const handleAddSubtask = useCallback(() => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: "sub_" + Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks((prev) => {
      const next = [...prev, newSub];
      saveField({ taskSubtasks: next });
      return next;
    });
    setNewSubtaskTitle("");
  }, [newSubtaskTitle, saveField]);

  const handleToggleSubtask = useCallback((id: string) => {
    setSubtasks((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
      saveField({ taskSubtasks: next });
      return next;
    });
  }, [saveField]);

  const handleDeleteSubtask = useCallback((id: string) => {
    setSubtasks((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveField({ taskSubtasks: next });
      return next;
    });
  }, [saveField]);

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    saveField({ taskStatus: newStatus });
  };

  const handleDeadlineChange = (val: string) => {
    const newDeadline = val ? new Date(val).toISOString() : "";
    setDeadline(newDeadline);
    saveField({ taskDeadline: newDeadline || null });
  };

  const handleNotifyChange = (val: boolean) => {
    setShouldNotify(val);
    saveField({ taskShouldNotify: val });
  };

  const handleConvertToNote = async () => {
    setIsConverting(true);
    const toastId = toast.loading("Convertendo para nota...");

    try {
      const result = await updateNoteAction({
        id: task.id,
        updates: {
          type: "note",
          taskStatus: null,
          taskDeadline: null,
          taskSubtasks: [],
          taskShouldNotify: false,
        },
      });

      if (result?.data?.success) {
        toast.success("Tarefa convertida em nota!", { id: toastId });
        onOpenChange(false);
      } else {
        toast.error("Erro ao converter.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao converter.", { id: toastId });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Vault open={open} onOpenChange={onOpenChange}>
      <VaultContent aria-label="Detalhes da tarefa" className="sm:max-w-xl">
        <VaultHeader showCloseButton={false}>
          <VaultTitle className="text-left text-lg">{task.title}</VaultTitle>
        </VaultHeader>

        <VaultBody className="space-y-5">
          {/* Status Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Status
            </label>
            <div className="flex gap-2">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                      status === s
                        ? cn("border-current", cfg.color, "bg-current/10")
                        : "border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Data Limite
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="datetime-local"
                value={deadline ? deadline.slice(0, 16) : ""}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Subtasks
              </label>
              {subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{subtasks.length}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Subtask list */}
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 group py-1 px-1 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <button
                    onClick={() => handleToggleSubtask(sub.id)}
                    className={cn(
                      "shrink-0 size-4 rounded border transition-all cursor-pointer",
                      sub.completed
                        ? "bg-primary border-primary"
                        : "border-border/80 hover:border-primary/50"
                    )}
                  >
                    {sub.completed && (
                      <CheckCircle2 className="size-4 text-primary-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-sm flex-1 transition-all",
                      sub.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {sub.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                placeholder="Nova subtask..."
                className="flex-1 h-9 px-3 rounded-lg border border-border/50 bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="shrink-0 size-9 flex items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              {shouldNotify ? (
                <Bell className="size-4 text-primary" />
              ) : (
                <BellOff className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Notificar ao se aproximar do prazo</span>
            </div>
            <button
              onClick={() => handleNotifyChange(!shouldNotify)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                shouldNotify ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block size-5 rounded-full bg-white transition-transform duration-200",
                  shouldNotify ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Link to Kanban */}
          <Link
            href={`/hub/tasks?taskId=${task.id}`}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border/50 bg-muted/20 text-sm font-medium text-foreground hover:bg-muted/40 transition-all"
          >
            Ver no Kanban
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </VaultBody>

        <VaultFooter>
          <VaultPrimaryButton
            onClick={handleConvertToNote}
            disabled={isConverting}
          >
            {isConverting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Convertendo...
              </>
            ) : (
              <>
                <X className="size-4" />
                Voltar para Nota
              </>
            )}
          </VaultPrimaryButton>
        </VaultFooter>
      </VaultContent>
    </Vault>
  );
}
