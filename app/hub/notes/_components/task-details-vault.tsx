"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { notifyTaskUpdate } from "@/modules/notes/tasks.store";
import {
  CircleDashed,
  Loader2,
  CheckCircle2,
  Calendar,
  Bell,
  BellOff,
  Plus,
  ArrowRight,
  X,
  Archive,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultBody,
} from "@/components/ui/vault";
import type { Note, TaskStatus, Subtask } from "@/modules/notes/notes.schema";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function AnimatedCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "shrink-0 size-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        checked
          ? "bg-primary border-primary"
          : "border-border/80 hover:border-primary/50 bg-transparent"
      )}
    >
      <motion.div
        initial={false}
        animate={checked ? "checked" : "unchecked"}
        variants={{
          checked: { scale: 1, opacity: 1 },
          unchecked: { scale: 0.5, opacity: 0 },
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="flex items-center justify-center text-primary-foreground"
      >
        <svg
          className="size-3.5 stroke-[3px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: checked ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>
    </button>
  );
}

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
  const [title, setTitle] = useState(task.title);
  
  const prevTaskIdRef = useRef<string>(task.id);

  useEffect(() => {
    const wasTemp = prevTaskIdRef.current.startsWith("temp_");
    const isReal = !task.id.startsWith("temp_");

    if (wasTemp && isReal && task.id !== prevTaskIdRef.current) {
      const currentEdits: Partial<Note> = {};
      if (title !== task.title) currentEdits.title = title;
      if (status !== task.taskStatus) currentEdits.taskStatus = status;
      if (deadline !== task.taskDeadline) currentEdits.taskDeadline = deadline;
      if (JSON.stringify(subtasks) !== JSON.stringify(task.taskSubtasks)) currentEdits.taskSubtasks = subtasks;
      if (shouldNotify !== task.taskShouldNotify) currentEdits.taskShouldNotify = shouldNotify;

      if (Object.keys(currentEdits).length > 0) {
        updateNoteAction({ id: task.id, updates: currentEdits }).catch(console.error);
      }
    }
    prevTaskIdRef.current = task.id;
  }, [task, title, status, deadline, subtasks, shouldNotify]);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const saveField = useCallback(async (updates: Partial<Note>, rollbackFn?: () => void) => {
    if (task.id.startsWith("temp_")) {
      return; // Hold edits in local state
    }
    // Notify store and sidebar immediately (optimistic)
    notifyTaskUpdate(task.id, updates);
    try {
      const result = await updateNoteAction({
        id: task.id,
        updates,
      });
      if (!result?.data?.success) {
        toast.error("Erro ao salvar alteração em segundo plano.");
        rollbackFn?.();
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar alteração.");
      rollbackFn?.();
    }
  }, [task.id]);

  const handleAddSubtask = useCallback(() => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: "sub_" + Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const prevSubtasks = [...subtasks];
    const next = [...subtasks, newSub];
    setSubtasks(next);
    setNewSubtaskTitle("");
    saveField({ taskSubtasks: next }, () => {
      setSubtasks(prevSubtasks);
    });
  }, [newSubtaskTitle, subtasks, saveField]);

  const handleToggleSubtask = useCallback((id: string) => {
    const prevSubtasks = [...subtasks];
    const next = subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    setSubtasks(next);
    saveField({ taskSubtasks: next }, () => {
      setSubtasks(prevSubtasks);
    });
  }, [subtasks, saveField]);

  const handleDeleteSubtask = useCallback((id: string) => {
    const prevSubtasks = [...subtasks];
    const next = subtasks.filter((s) => s.id !== id);
    setSubtasks(next);
    saveField({ taskSubtasks: next }, () => {
      setSubtasks(prevSubtasks);
    });
  }, [subtasks, saveField]);

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

    const handleArchiveTask = async () => {
      const toastId = toast.loading("Arquivando tarefa...");
      try {
        const result = await updateNoteAction({
          id: task.id,
          updates: { archived: true },
        });
        if (result?.data?.success) {
          toast.success("Tarefa arquivada!", { id: toastId });
          onOpenChange(false);
        } else {
          toast.error("Erro ao arquivar.", { id: toastId });
        }
      } catch {
        toast.error("Erro ao arquivar.", { id: toastId });
      }
    };

    const handleTrashTask = async () => {
      const toastId = toast.loading("Excluindo tarefa...");
      try {
        const result = await updateNoteAction({
          id: task.id,
          updates: { trashed: true },
        });
        if (result?.data?.success) {
          toast.success("Tarefa movida para a lixeira!", { id: toastId });
          onOpenChange(false);
        } else {
          toast.error("Erro ao excluir.", { id: toastId });
        }
      } catch {
        toast.error("Erro ao excluir.", { id: toastId });
      }
    };

  return (
    <Vault open={open} onOpenChange={onOpenChange}>
      <VaultContent aria-label="Detalhes da tarefa" className="sm:max-w-xl">
        <VaultHeader showCloseButton={false} className="w-full">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const trimmed = title.trim();
              if (!trimmed) {
                setTitle(task.title);
                toast.error("O título da tarefa não pode ser vazio.");
                return;
              }
              if (trimmed !== task.title) {
                saveField({ title: trimmed });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="Título da tarefa"
            className="w-full text-lg font-bold bg-transparent border-transparent hover:border-border/50 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 h-10 px-2 -ml-2 text-left"
          />
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
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="datetime-local"
                value={deadline ? deadline.slice(0, 16) : ""}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                className="pl-10 bg-muted/10"
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
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto overflow-x-hidden pr-1">
              <AnimatePresence initial={false} mode="popLayout">
                {subtasks.map((sub) => (
                  <motion.div
                    key={sub.id}
                    layout
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/20"
                  >
                    <AnimatedCheckbox
                      checked={sub.completed}
                      onChange={() => handleToggleSubtask(sub.id)}
                    />
                    <div className="relative flex-1 text-sm select-none">
                      <span className={cn("transition-colors duration-300 font-medium", sub.completed ? "text-muted-foreground" : "text-foreground")}>
                        {sub.title}
                      </span>
                      <motion.div
                        initial={false}
                        animate={{ width: sub.completed ? "100%" : "0%" }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] bg-muted-foreground/60 origin-left"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer p-1 rounded hover:bg-muted"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                placeholder="Nova subtask..."
                className="flex-1 h-9 text-sm"
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

          <div className="flex min-w-full items-center gap-2">
            <Link
              href={`/hub/tasks?taskId=${task.id}`}
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <Button className="w-full" variant="outline">
                Ver no Kanban
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              onClick={handleConvertToNote}
              disabled={isConverting}
              title="Converter para Nota"
              className="shrink-0"
            >
              {isConverting ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleArchiveTask}
              title="Arquivar Tarefa"
              className="shrink-0"
            >
              <Archive className="size-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleTrashTask}
              title="Excluir Tarefa"
              className="shrink-0"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </VaultBody>
      </VaultContent>
    </Vault>
  );
}
