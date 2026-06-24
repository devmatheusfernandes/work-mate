"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Note, TaskStatus } from "@/modules/notes/notes.schema";
import { Header } from "@/components/layout/header";
import {
  CircleDashed,
  Loader2,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Calendar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { useDevice } from "@/hooks/ui/use-device";
import { TaskDetailPanel } from "./task-detail-panel";

const COLUMNS: {
  status: TaskStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  headerBg: string;
}[] = [
  {
    status: "to_start",
    label: "A Fazer",
    icon: <CircleDashed className="size-4" />,
    color: "text-amber-600 dark:text-amber-400",
    headerBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    status: "in_progress",
    label: "Em Progresso",
    icon: <Loader2 className="size-4" />,
    color: "text-blue-600 dark:text-blue-400",
    headerBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    status: "done",
    label: "Concluído",
    icon: <CheckCircle2 className="size-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    headerBg: "bg-emerald-500/10 border-emerald-500/20",
  },
];

const STATUS_ORDER: TaskStatus[] = ["to_start", "in_progress", "done"];

function KanbanCard({
  task,
  onClick,
  isActive,
  showArrows,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  task: Note;
  onClick: () => void;
  isActive: boolean;
  showArrows?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `task:${task.id}`);
  };

  const completedSubs = (task.taskSubtasks || []).filter(
    (s) => s.completed,
  ).length;
  const totalSubs = (task.taskSubtasks || []).length;
  const progress = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;
  const hasDeadline = !!task.taskDeadline;
  const isOverdue =
    hasDeadline &&
    new Date(task.taskDeadline!) < new Date() &&
    task.taskStatus !== "done";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border bg-card cursor-pointer transition-all duration-200",
        "hover:bg-muted/10",
        isActive
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/40 hover:border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight flex-1">
          {task.title}
        </h4>
        {showArrows && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={isFirst}
              className="size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={isLast}
              className="size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {task.searchText && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {task.searchText}
        </p>
      )}

      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        {totalSubs > 0 && (
          <div className="flex items-center gap-1.5 flex-1">
            <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden max-w-[60px]">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>
              {completedSubs}/{totalSubs}
            </span>
          </div>
        )}
        {hasDeadline && (
          <span
            className={cn(
              "flex items-center gap-0.5",
              isOverdue && "text-red-500",
            )}
          >
            <Calendar className="size-2.5" />
            {new Date(task.taskDeadline!).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks }: { tasks: Note[] }) {
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskIdParam);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const { isMobile } = useDevice();

  // Sync selectedTaskId when taskIdParam (search param) changes without cascading setState in an effect
  const effectiveSelectedTaskId = taskIdParam ?? selectedTaskId;
  const setEffectiveSelectedTaskId = useCallback((id: string | null) => {
    setSelectedTaskId(id);
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === effectiveSelectedTaskId) ?? null,
    [tasks, effectiveSelectedTaskId],
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Note[]> = {
      to_start: [],
      in_progress: [],
      done: [],
    };
    for (const task of tasks) {
      const status = (task.taskStatus || "to_start") as TaskStatus;
      map[status].push(task);
    }
    return map;
  }, [tasks]);

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const [type, id] = data.split(":");
    if (type !== "task" || !id) return;

    const existingTask = tasks.find((t) => t.id === id);
    if (existingTask && existingTask.taskStatus === targetStatus) return;

    const toastId = toast.loading("Movendo tarefa...");
    try {
      const result = await updateNoteAction({
        id,
        updates: { taskStatus: targetStatus },
      });
      if (result?.data?.success) {
        toast.success("Tarefa movida!", { id: toastId });
      } else {
        toast.error("Erro ao mover tarefa.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao mover tarefa.", { id: toastId });
    }
  };

  const handleMoveStatus = async (taskId: string, direction: "up" | "down") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentIndex = STATUS_ORDER.indexOf(
      (task.taskStatus || "to_start") as TaskStatus,
    );
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[newIndex];
    const toastId = toast.loading("Movendo tarefa...");

    try {
      const result = await updateNoteAction({
        id: taskId,
        updates: { taskStatus: newStatus },
      });
      if (result?.data?.success) {
        toast.success("Tarefa movida!", { id: toastId });
      } else {
        toast.error("Erro ao mover tarefa.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao mover tarefa.", { id: toastId });
    }
  };

  const isPanelOpen = !!selectedTask;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Tarefas"
        backHref="/hub/notes"
        showSubHeader={false}
        className="contents"
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Kanban Columns */}
        <div
          className={cn(
            "flex-1 flex overflow-hidden transition-all duration-300",
            isMobile
              ? "flex-col overflow-y-auto p-4 gap-4"
              : "flex-row p-4 gap-4",
          )}
        >
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col.status];
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(col.status);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.status)}
                className={cn(
                  "flex flex-col rounded-xl border transition-all duration-200",
                  isMobile ? "min-h-[120px]" : "flex-1 min-w-0",
                  col.headerBg,
                  dragOverColumn === col.status &&
                    "ring-2 ring-primary/30 border-primary/40",
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
                  <div className={cn("flex items-center gap-1.5", col.color)}>
                    {col.icon}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground/60 bg-background/50 px-1.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/40">
                      {isMobile ? "Nenhuma tarefa" : "Arraste tarefas aqui"}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onClick={() =>
                          setEffectiveSelectedTaskId(
                            effectiveSelectedTaskId === task.id ? null : task.id,
                          )
                        }
                        isActive={effectiveSelectedTaskId === task.id}
                        showArrows={isMobile}
                        onMoveUp={() => handleMoveStatus(task.id, "up")}
                        onMoveDown={() => handleMoveStatus(task.id, "down")}
                        isFirst={col.status === STATUS_ORDER[0]}
                        isLast={
                          col.status === STATUS_ORDER[STATUS_ORDER.length - 1]
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Split Screen Detail Panel (Desktop) */}
        {!isMobile && (
          <AnimatePresence>
            {isPanelOpen && selectedTask && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "50%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                className="border-l border-border/50 overflow-hidden shrink-0"
              >
                <div className="h-full flex flex-col">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-4 h-12 border-b border-border/30 shrink-0">
                    <h2 className="text-sm font-bold tracking-tight text-foreground truncate pr-4">
                      {selectedTask.title}
                    </h2>
                    <button
                      onClick={() => setEffectiveSelectedTaskId(null)}
                      className="shrink-0 size-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto">
                    <TaskDetailPanel
                      key={selectedTask.id}
                      task={selectedTask}
                      onClose={() => setEffectiveSelectedTaskId(null)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
