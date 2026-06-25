"use client";

import { useState, useCallback } from "react";
import {
  CircleDashed,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Calendar,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { TaskDetailsVault } from "./task-details-vault";
import type { Note, TaskStatus } from "@/modules/notes/notes.schema";

interface TasksSidebarProps {
  tasks: Note[];
  isOpen: boolean;
  onToggle: () => void;
  onDragOverSidebar: () => void;
  onUpdateNoteOptimistic: (
    id: string,
    updates: Partial<Note>,
    apiCall: () => Promise<{ data?: { success?: boolean } } | undefined>
  ) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

const LANES: {
  status: TaskStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    status: "to_start",
    label: "A Fazer",
    icon: <CircleDashed className="size-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/20",
  },
  {
    status: "in_progress",
    label: "Em Progresso",
    icon: <Loader2 className="size-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/20",
  },
  {
    status: "done",
    label: "Concluído",
    icon: <CheckCircle2 className="size-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/5",
    borderColor: "border-emerald-500/20",
  },
];

function MiniTaskCard({
  task,
  onClick,
}: {
  task: Note;
  onClick: () => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `task:${task.id}`);
  };

  const completedSubs = (task.taskSubtasks || []).filter((s) => s.completed).length;
  const totalSubs = (task.taskSubtasks || []).length;
  const hasDeadline = !!task.taskDeadline;
  const isOverdue =
    hasDeadline && new Date(task.taskDeadline!) < new Date() && task.taskStatus !== "done";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "shrink-0 w-48 p-3 rounded-lg border border-border/40 bg-card cursor-pointer",
        "hover:border-border hover:bg-muted/10 transition-all duration-200",
        "flex flex-col gap-1.5 group"
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="size-3.5 text-muted-foreground/30 shrink-0 mt-0.5 group-hover:text-muted-foreground/60 transition-colors" />
        <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight flex-1">
          {task.title}
        </h4>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {totalSubs > 0 && (
          <span>
            {completedSubs}/{totalSubs}
          </span>
        )}
        {hasDeadline && (
          <span className={cn("flex items-center gap-0.5", isOverdue && "text-red-500")}>
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

function ExpandedTaskCard({
  task,
  onClick,
}: {
  task: Note;
  onClick: () => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `task:${task.id}`);
  };

  const completedSubs = (task.taskSubtasks || []).filter((s) => s.completed).length;
  const totalSubs = (task.taskSubtasks || []).length;
  const progress = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;
  const hasDeadline = !!task.taskDeadline;
  const isOverdue =
    hasDeadline && new Date(task.taskDeadline!) < new Date() && task.taskStatus !== "done";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border border-border/40 bg-card cursor-pointer",
        "hover:border-border hover:bg-muted/10 transition-all duration-200",
        "flex flex-col gap-2"
      )}
    >
      <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
        {task.title}
      </h4>
      {task.searchText && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.searchText}</p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {totalSubs > 0 && (
          <div className="flex items-center gap-1.5 flex-1">
            <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
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
          <span className={cn("flex items-center gap-0.5", isOverdue && "text-red-500")}>
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

export function TasksSidebar({
  tasks,
  isOpen,
  onToggle,
  onDragOverSidebar,
  onUpdateNoteOptimistic,
  onExpandedChange,
}: TasksSidebarProps) {
  const [expandedLane, setExpandedLaneState] = useState<TaskStatus | null>(null);
  
  const setExpandedLane = useCallback((lane: TaskStatus | null) => {
    setExpandedLaneState(lane);
    onExpandedChange?.(lane !== null);
  }, [onExpandedChange]);

  const [dragOverLane, setDragOverLane] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<Note | null>(null);

  const tasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.taskStatus === status),
    [tasks]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOverSidebar();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverLane(null);

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const [type, id] = data.split(":");
    if (!id) return;

    if (type === "note") {
      onUpdateNoteOptimistic(
        id,
        {
          type: "task",
          taskStatus: targetStatus,
          taskSubtasks: [],
          taskDeadline: null,
          taskShouldNotify: false,
        },
        () =>
          updateNoteAction({
            id,
            updates: {
              type: "task",
              taskStatus: targetStatus,
              taskSubtasks: [],
              taskDeadline: null,
              taskShouldNotify: false,
            },
          })
      );
    } else if (type === "task") {
      const existingTask = tasks.find((t) => t.id === id);
      if (existingTask && existingTask.taskStatus === targetStatus) return;

      onUpdateNoteOptimistic(
        id,
        { taskStatus: targetStatus },
        () =>
          updateNoteAction({
            id,
            updates: { taskStatus: targetStatus },
          })
      );
    }
  };

  const renderLaneTasks = (laneTasks: Note[], laneStatus: TaskStatus, isExpanded: boolean) => {
    const elements: React.ReactNode[] = [];

    laneTasks.forEach((task) => {
      elements.push(
        isExpanded ? (
          <motion.div
            key={task.id}
            layout
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            <ExpandedTaskCard
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          </motion.div>
        ) : (
          <motion.div
            key={task.id}
            layout
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            <MiniTaskCard
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          </motion.div>
        )
      );
    });

    if (dragOverLane === laneStatus) {
      elements.push(
        isExpanded ? (
          <motion.div
            key="lane-placeholder"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="w-full h-[76px] rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center text-primary/40 text-xs font-semibold"
          >
            Solte para mover
          </motion.div>
        ) : (
          <motion.div
            key="lane-placeholder"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="shrink-0 w-48 h-[76px] rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center text-primary/40 text-[10px] font-semibold"
          >
            Solte aqui
          </motion.div>
        )
      );
    }

    return elements;
  };

  const isExpanded = expandedLane !== null;

  return (
    <>
      {/* Toggle Handle */}
      {!isOpen && (
        <button
          onClick={onToggle}
          onDragOver={(e) => {
            e.preventDefault();
            onDragOverSidebar();
          }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-6 h-16 bg-muted/80 hover:bg-muted border border-r-0 border-border/50 rounded-l-lg transition-all cursor-pointer"
        >
          <CheckCircle2 className="size-4 text-primary" />
        </button>
      )}

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: isExpanded ? 480 : 320,
              opacity: 1,
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="relative h-full overflow-hidden shrink-0"
            onDragOver={handleDragOver}
          >
            <div className="h-full w-full">
              <div className={cn(
                "h-full bg-card rounded-xl overflow-hidden flex flex-col relative border border-border/20",
                isExpanded ? "w-[470px]" : "w-full"
              )}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-border/30 shrink-0">
              {isExpanded ? (
                <button
                  onClick={() => setExpandedLane(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  Voltar
                </button>
              ) : (
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Tarefas
                </h2>
              )}
              <button
                onClick={onToggle}
                className="flex items-center justify-center size-7 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Lanes */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {LANES.map((lane) => {
                const laneTasks = tasksByStatus(lane.status);
                const isThisExpanded = expandedLane === lane.status;
                const isHidden = isExpanded && !isThisExpanded;

                if (isHidden) return null;

                return (
                  <div
                    key={lane.status}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverLane(lane.status);
                    }}
                    onDragLeave={() => setDragOverLane(null)}
                    onDrop={(e) => handleDrop(e, lane.status)}
                    className={cn(
                      "rounded-xl border p-3 transition-all duration-200",
                      lane.bgColor,
                      lane.borderColor,
                      dragOverLane === lane.status &&
                        "ring-2 ring-primary/30 border-primary/40",
                      isThisExpanded ? "flex-1" : "min-h-[100px]"
                    )}
                  >
                    {/* Lane Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("flex items-center gap-1.5", lane.color)}>
                        {lane.icon}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {lane.label}
                        </span>
                        <span className="text-[10px] font-medium opacity-60">
                          ({laneTasks.length})
                        </span>
                      </div>
                      {!isExpanded && laneTasks.length > 2 && (
                        <button
                          onClick={() => setExpandedLane(lane.status)}
                          className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Ver todas
                        </button>
                      )}
                    </div>

                    {/* Lane Content */}
                    {isThisExpanded ? (
                      // Expanded: vertical list
                      <div className="flex flex-col gap-2 overflow-y-auto">
                        {laneTasks.length === 0 && dragOverLane !== lane.status ? (
                          <p className="text-xs text-muted-foreground/50 text-center py-4">
                            Nenhuma tarefa
                          </p>
                        ) : (
                          renderLaneTasks(laneTasks, lane.status, true)
                        )}
                      </div>
                    ) : (
                      // Collapsed: horizontal scroll
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {laneTasks.length === 0 && dragOverLane !== lane.status ? (
                          <p className="text-xs text-muted-foreground/50 text-center w-full py-4">
                            Arraste uma nota aqui
                          </p>
                        ) : (
                          renderLaneTasks(laneTasks, lane.status, false)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Task Details Vault */}
      {selectedTask && (
        <TaskDetailsVault
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => {
            if (!open) setSelectedTask(null);
          }}
        />
      )}
    </>
  );
}
