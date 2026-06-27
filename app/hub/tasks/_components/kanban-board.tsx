"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createNoteAction, updateNoteAction } from "@/modules/notes/notes.actions";
import { useDevice } from "@/hooks/ui/use-device";
import { TaskDetailPanel } from "./task-detail-panel";
import { TaskDetailsVault } from "@/app/hub/notes/_components/task-details-vault";
import { CreateButton } from "@/app/hub/notes/_components/create-button";
import { Tag } from "@/modules/notes/notes.schema";

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

export function KanbanBoard({ tasks, tags }: { tasks: Note[]; tags: Tag[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskIdParam);
  const [activeSelectionKey, setActiveSelectionKey] = useState<string | null>(taskIdParam);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const { isMobile } = useDevice();

  const [localTasks, setLocalTasks] = useState(tasks);
  const [prevTasks, setPrevTasks] = useState(tasks);

  if (tasks !== prevTasks) {
    setLocalTasks(tasks);
    setPrevTasks(tasks);
  }

  // Sync selectedTaskId when taskIdParam (search param) changes without cascading setState in an effect
  const effectiveSelectedTaskId = taskIdParam ?? selectedTaskId;
  const setEffectiveSelectedTaskId = useCallback((id: string | null) => {
    setSelectedTaskId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) {
      params.set("taskId", id);
      setActiveSelectionKey((prev) => {
        if (prev && prev.startsWith("temp_") && id && !id.startsWith("temp_")) {
          return prev;
        }
        return id;
      });
    } else {
      params.delete("taskId");
      setActiveSelectionKey(null);
    }
    router.replace(`/hub/tasks?${params.toString()}`);
  }, [router]);

  const selectedTask = useMemo(
    () => localTasks.find((t) => t.id === effectiveSelectedTaskId) ?? null,
    [localTasks, effectiveSelectedTaskId],
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Note[]> = {
      to_start: [],
      in_progress: [],
      done: [],
    };
    for (const task of localTasks) {
      const status = (task.taskStatus || "to_start") as TaskStatus;
      map[status].push(task);
    }
    return map;
  }, [localTasks]);

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const [type, id] = data.split(":");
    if (type !== "task" || !id) return;

    const existingTask = localTasks.find((t) => t.id === id);
    if (existingTask && existingTask.taskStatus === targetStatus) return;

    const prev = [...localTasks];
    setLocalTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, taskStatus: targetStatus } : t))
    );

    try {
      const result = await updateNoteAction({
        id,
        updates: { taskStatus: targetStatus },
      });
      if (!result?.data?.success) {
        setLocalTasks(prev);
        toast.error("Erro ao mover tarefa.");
      }
    } catch {
      setLocalTasks(prev);
      toast.error("Erro ao mover tarefa.");
    }
  };

  const handleMoveStatus = async (taskId: string, direction: "up" | "down") => {
    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentIndex = STATUS_ORDER.indexOf(
      (task.taskStatus || "to_start") as TaskStatus,
    );
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[newIndex];
    const prev = [...localTasks];
    setLocalTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, taskStatus: newStatus } : t))
    );

    try {
      const result = await updateNoteAction({
        id: taskId,
        updates: { taskStatus: newStatus },
      });
      if (!result?.data?.success) {
        setLocalTasks(prev);
        toast.error("Erro ao mover tarefa.");
      }
    } catch {
      setLocalTasks(prev);
      toast.error("Erro ao mover tarefa.");
    }
  };

  const handleCreateTask = useCallback(async (status: TaskStatus) => {
    const tempId = `temp_task_${Date.now()}`;
    const tempTask: Note = {
      userId: "local",
      id: tempId,
      title: "Nova Tarefa",
      folderId: null,
      type: "task",
      content: "",
      searchText: "",
      tagIds: [] as string[],
      archived: false,
      trashed: false,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLocked: false,
      taskStatus: status,
      taskDeadline: null,
      taskSubtasks: [],
      taskShouldNotify: false,
    };

    setLocalTasks((curr) => [...curr, tempTask]);
    setEffectiveSelectedTaskId(tempId);

    try {
      const res = await createNoteAction({
        title: "Nova Tarefa",
        type: "task",
        taskStatus: status,
      });

      if (res?.data?.success && res.data.note) {
        setLocalTasks((curr) => curr.map((t) => (t.id === tempId ? res.data.note! : t)));
        setEffectiveSelectedTaskId(res.data.note.id);
      } else {
        setLocalTasks((curr) => curr.filter((t) => t.id !== tempId));
        setEffectiveSelectedTaskId(null);
        toast.error(res?.serverError || "Erro ao criar tarefa.");
      }
    } catch (err) {
      console.error(err);
      setLocalTasks((curr) => curr.filter((t) => t.id !== tempId));
      setEffectiveSelectedTaskId(null);
      toast.error("Erro ao criar tarefa.");
    }
  }, [setEffectiveSelectedTaskId]);

  const headerActions = useMemo(() => [
    {
      label: "Nova Tarefa",
      icon: <Plus className="size-4" />,
      onClick: () => handleCreateTask("to_start"),
    }
  ], [handleCreateTask]);

  const isPanelOpen = !!selectedTask;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Tarefas"
        showSidebarTrigger
        showSubHeader={false}
        className="contents"
        actions={headerActions}
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

                  <button
                    onClick={() => handleCreateTask(col.status)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-border/20 hover:border-primary/30 rounded-lg text-xs text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer mt-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar tarefa</span>
                  </button>
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
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Detalhes da Tarefa
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
                      key={activeSelectionKey}
                      task={selectedTask}
                      onClose={() => setEffectiveSelectedTaskId(null)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Task Details Vault (Mobile) */}
        {isMobile && selectedTask && (
          <TaskDetailsVault
            task={selectedTask}
            open={isPanelOpen}
            onOpenChange={(open) => {
              if (!open) {
                setEffectiveSelectedTaskId(null);
              }
            }}
          />
        )}
      </main>

      <CreateButton
        activeFolderId={null}
        tags={tags}
        defaultType="task"
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}
