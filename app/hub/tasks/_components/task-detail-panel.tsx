"use client";

import { useState, useCallback, useRef } from "react";
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
  Save,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Note, TaskStatus, Subtask } from "@/modules/notes/notes.schema";
import { EditorContent, useEditor, type Content } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Highlight } from "@tiptap/extension-highlight";
import { Typography } from "@tiptap/extension-typography";

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

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const currentStatus = (task.taskStatus || "to_start") as TaskStatus;
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [deadline, setDeadline] = useState(task.taskDeadline || "");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.taskSubtasks || []);
  const [shouldNotify, setShouldNotify] = useState(task.taskShouldNotify || false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<string>(
    typeof task.content === "string" ? task.content : ""
  );

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
      contentRef.current = editor.getHTML();
    },
  });

  const handleAddSubtask = useCallback(() => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: "sub_" + Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks((prev) => [...prev, newSub]);
    setNewSubtaskTitle("");
  }, [newSubtaskTitle]);

  const handleToggleSubtask = useCallback((id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  }, []);

  const handleDeleteSubtask = useCallback((id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Salvando tarefa...");

    const searchText = contentRef.current
      .replace(/<[^>]*>/g, " ")
      .trim();

    try {
      const result = await updateNoteAction({
        id: task.id,
        updates: {
          taskStatus: status,
          taskDeadline: deadline || null,
          taskSubtasks: subtasks,
          taskShouldNotify: shouldNotify,
          content: contentRef.current,
          searchText,
        },
      });

      if (result?.data?.success) {
        toast.success("Tarefa salva!", { id: toastId });
      } else {
        toast.error("Erro ao salvar tarefa.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao salvar tarefa.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
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

  return (
    <div className="flex flex-col gap-0 h-full">
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
                  onClick={() => setStatus(s)}
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
              onChange={(e) =>
                setDeadline(e.target.value ? new Date(e.target.value).toISOString() : "")
              }
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

          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 group py-0.5 px-1 rounded hover:bg-muted/30 transition-colors"
              >
                <button
                  onClick={() => handleToggleSubtask(sub.id)}
                  className={cn(
                    "shrink-0 size-3.5 rounded border transition-all cursor-pointer",
                    sub.completed
                      ? "bg-primary border-primary"
                      : "border-border/80 hover:border-primary/50"
                  )}
                >
                  {sub.completed && (
                    <CheckCircle2 className="size-3.5 text-primary-foreground" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs flex-1 transition-all",
                    sub.completed && "line-through text-muted-foreground"
                  )}
                >
                  {sub.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="Nova subtask..."
              className="flex-1 h-7 px-2 rounded border border-border/50 bg-muted/20 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="shrink-0 size-7 flex items-center justify-center rounded border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="size-3.5" />
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
            onClick={() => setShouldNotify(!shouldNotify)}
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
          Voltar p/ Nota
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Salvar
        </button>
      </div>
    </div>
  );
}
