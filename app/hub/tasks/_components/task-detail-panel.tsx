"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  RotateCcw,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Note, TaskStatus, Subtask } from "@/modules/notes/notes.schema";
import { notifyTaskUpdate } from "@/modules/notes/tasks.store";
import { EditorContent, useEditor, type Content } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Highlight } from "@tiptap/extension-highlight";
import { Typography } from "@tiptap/extension-typography";
import { motion, AnimatePresence } from "framer-motion";

// Styles for the inline editor
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  to_start: {
    label: "A Fazer",
    icon: <CircleDashed className="size-4" />,
    color: "text-amber-600 dark:text-amber-400",
  },
  in_progress: {
    label: "Em Progresso",
    icon: <Loader2 className="size-4" />,
    color: "text-blue-600 dark:text-blue-400",
  },
  done: {
    label: "Concluído",
    icon: <CheckCircle2 className="size-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
  },
};

interface TaskDetailPanelProps {
  task: Note;
  onClose: () => void;
}

function AnimatedCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "shrink-0 size-4.5 rounded border flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
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
          className="size-3 stroke-[3px]"
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

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const currentStatus = (task.taskStatus || "to_start") as TaskStatus;
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [deadline, setDeadline] = useState(task.taskDeadline || "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.taskSubtasks || []);
  const [shouldNotify, setShouldNotify] = useState(task.taskShouldNotify || false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [title, setTitle] = useState(task.title);
  
  const prevTaskIdRef = useRef<string>(task.id);
  const contentRef = useRef<string>(
    typeof task.content === "string" ? task.content : ""
  );

  useEffect(() => {
    const wasTemp = prevTaskIdRef.current.startsWith("temp_");
    const isReal = !task.id.startsWith("temp_");
    
    if (wasTemp && isReal && task.id !== prevTaskIdRef.current) {
      // Swapped temp -> real. Sync local edits to server in background.
      const currentEdits: Partial<Note> = {};
      if (title !== task.title) currentEdits.title = title;
      if (status !== task.taskStatus) currentEdits.taskStatus = status;
      if (deadline !== task.taskDeadline) currentEdits.taskDeadline = deadline;
      if (JSON.stringify(subtasks) !== JSON.stringify(task.taskSubtasks)) currentEdits.taskSubtasks = subtasks;
      if (shouldNotify !== task.taskShouldNotify) currentEdits.taskShouldNotify = shouldNotify;
      if (contentRef.current !== (task.content || "")) {
        currentEdits.content = contentRef.current;
        currentEdits.searchText = contentRef.current.replace(/<[^>]*>/g, " ").trim();
      }
      
      if (Object.keys(currentEdits).length > 0) {
        updateNoteAction({ id: task.id, updates: currentEdits }).catch(console.error);
      }
    }
    prevTaskIdRef.current = task.id;
  }, [task, title, status, deadline, subtasks, shouldNotify]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveField = useCallback(async (updates: Partial<Note>) => {
    if (task.id.startsWith("temp_")) {
      return; // Hold edits in local state
    }
    
    notifyTaskUpdate(task.id, updates);
    
    try {
      await updateNoteAction({
        id: task.id,
        updates,
      });
    } catch (err) {
      console.error("Erro no auto-save em segundo plano:", err);
    }
  }, [task.id]);

  const triggerDebouncedSave = useCallback((updates: Partial<Note>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    notifyTaskUpdate(task.id, updates);
    
    if (task.id.startsWith("temp_")) {
      return; // Hold edits in local state
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateNoteAction({
          id: task.id,
          updates,
        });
      } catch (err) {
        console.error("Erro no auto-save debounced do editor:", err);
      }
    }, 800);
  }, [task.id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Minimal TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: { openOnClick: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Typography,
    ],
    content: (task.content as Content) || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] px-4 py-3",
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      contentRef.current = html;
      const searchText = html.replace(/<[^>]*>/g, " ").trim();
      triggerDebouncedSave({ content: html, searchText });
    },
  });

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
        onClose();
      } else {
        toast.error("Erro ao converter.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao converter.", { id: toastId });
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
        onClose();
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
        onClose();
      } else {
        toast.error("Erro ao excluir.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao excluir.", { id: toastId });
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Title Input */}
      <div className="px-4 pt-4 pb-2 border-b border-border/10 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            triggerDebouncedSave({ title: e.target.value });
          }}
          onBlur={() => {
            const trimmed = title.trim();
            if (!trimmed) {
              setTitle(task.title);
              toast.error("O título da tarefa não pode ser vazio.");
              triggerDebouncedSave({ title: task.title });
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
          className="w-full text-base font-bold bg-transparent border-transparent hover:border-border/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded px-2 py-1 -ml-2 text-foreground focus:outline-none transition-all"
        />
      </div>

      {/* Metadata Section */}
      <div className="p-4 space-y-4 border-b border-border/30">
        {/* Status */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Status
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer",
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
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Data Limite
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="datetime-local"
              value={deadline ? deadline.slice(0, 16) : ""}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              className="w-full h-8 pl-8 pr-2 rounded-lg border border-border/50 bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Subtasks */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Subtasks
            </label>
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {completedCount}/{subtasks.length}
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

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
                  <div className="relative flex-1 text-xs select-none">
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

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="Nova subtask..."
              className="flex-1 h-8 px-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-foreground"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="shrink-0 size-8 flex items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-muted/10 hover:bg-muted/30"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Notification Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {shouldNotify ? (
              <Bell className="size-3.5 text-primary" />
            ) : (
              <BellOff className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium">Notificar</span>
          </div>
          <button
            onClick={() => handleNotifyChange(!shouldNotify)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
              shouldNotify ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-4 rounded-full bg-white transition-transform duration-200",
                shouldNotify ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Conteúdo
          </label>
        </div>
        <EditorContent editor={editor} />
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 p-3 border-t border-border/30 shrink-0">
        <button
          onClick={handleConvertToNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          Transformar em Nota
        </button>
        <div className="flex-1" />
        <button
          onClick={handleArchiveTask}
          className="flex items-center justify-center p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer"
          title="Arquivar Tarefa"
        >
          <Archive className="size-3.5" />
        </button>
        <button
          onClick={handleTrashTask}
          className="flex items-center justify-center p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer"
          title="Excluir Tarefa"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
