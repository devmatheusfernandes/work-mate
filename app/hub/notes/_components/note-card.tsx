"use client";

import { useState } from "react";
import { Note, Tag } from "@/modules/notes/notes.schema";
import { useRouter } from "next/navigation";
import { FileText, MoreVertical, Pin, Lock, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteNoteAction, updateNoteAction, embedNoteNowAction } from "@/modules/notes/notes.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TaskStatusVault } from "./task-status-vault";

interface NoteCardProps {
  note: Note;
  tags?: Tag[];
  searchQuery?: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  isSelectionActive: boolean;
  mode?: "normal" | "archive" | "trash";
  onOpenNote?: (note: Note) => void;
}

export function NoteCard({
  note,
  tags = [],
  isSelected,
  onToggleSelect,
  isSelectionActive,
  mode = "normal",
  onOpenNote,
}: NoteCardProps) {
  const router = useRouter();
  const [taskVaultOpen, setTaskVaultOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionActive) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect();
      return;
    }

    if (note.isLocked) {
      e.preventDefault();
      e.stopPropagation();
      toast.info("Esta nota está protegida por senha.");
      return;
    }

    // In trash or archive, do not open details editor directly
    if (mode !== "normal") {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect();
      return;
    }

    // If offline or it's a temporary note, open in-app Vault editor
    if (typeof window !== "undefined" && (!window.navigator.onLine || note.id.startsWith("temp_"))) {
      e.preventDefault();
      e.stopPropagation();
      onOpenNote?.(note);
      return;
    }

    router.push(`/hub/notes/${note.id}`);
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPinned = !note.pinned;
    try {
      const res = await updateNoteAction({ id: note.id, updates: { pinned: nextPinned } });
      if (res?.data?.success) {
        toast.success(nextPinned ? "Nota fixada!" : "Nota desafixada!");
      }
    } catch {
      toast.error("Erro ao atualizar nota.");
    }
  };

  const handleToggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !note.isLocked;
    try {
      const res = await updateNoteAction({ id: note.id, updates: { isLocked: nextLocked } });
      if (res?.data?.success) {
        toast.success(nextLocked ? "Nota trancada!" : "Nota destrancada!");
      }
    } catch {
      toast.error("Erro ao atualizar nota.");
    }
  };

  const handleSoftDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Enviando para a lixeira...");
    try {
      const res = await updateNoteAction({ id: note.id, updates: { trashed: true, archived: false } });
      if (res?.data?.success) {
        toast.success("Nota enviada para a lixeira!", { id: toastId });
      } else {
        toast.error("Erro ao excluir nota.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao excluir nota.", { id: toastId });
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Arquivando nota...");
    try {
      const res = await updateNoteAction({ id: note.id, updates: { archived: true, trashed: false } });
      if (res?.data?.success) {
        toast.success("Nota arquivada!", { id: toastId });
      } else {
        toast.error("Erro ao arquivar nota.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao arquivar nota.", { id: toastId });
    }
  };

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Desarquivando nota...");
    try {
      const res = await updateNoteAction({ id: note.id, updates: { archived: false } });
      if (res?.data?.success) {
        toast.success("Nota desarquivada!", { id: toastId });
      } else {
        toast.error("Erro ao desarquivar nota.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao desarquivar nota.", { id: toastId });
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Restaurando nota...");
    try {
      const res = await updateNoteAction({ id: note.id, updates: { trashed: false, archived: false } });
      if (res?.data?.success) {
        toast.success("Nota restaurada!", { id: toastId });
      } else {
        toast.error("Erro ao restaurar nota.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao restaurar nota.", { id: toastId });
    }
  };

  const handlePermanentDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Excluindo permanentemente...");
    try {
      const res = await deleteNoteAction({ id: note.id });
      if (res?.data?.success) {
        toast.success("Nota excluída permanentemente!", { id: toastId });
      } else {
        toast.error("Erro ao excluir nota permanentemente.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao excluir nota permanentemente.", { id: toastId });
    }
  };

  const handleEmbedNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Vetorizando nota com Gemini...");
    try {
      const res = await embedNoteNowAction({ id: note.id });
      if (res?.data?.success) {
        toast.success("Nota vetorizada com sucesso!", { id: toastId });
      } else {
        toast.error(res?.data?.error || "Erro ao vetorizar nota.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao vetorizar nota.", { id: toastId });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (mode !== "normal") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", `note:${note.id}`);
  };

  const noteTags = tags.filter((t) => note.tagIds.includes(t.id));

  const formatFriendlyDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return "HOJE";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isYesterday) return "ONTEM";

    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "2-digit",
    };
    return date.toLocaleDateString("pt-BR", options).toUpperCase().replace(/\./g, "");
  };

  const previewText = note.searchText || "Sem conteúdo...";

  return (
    <>
    <article
      draggable={mode === "normal"}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer min-h-[160px] p-4 text-left border shadow-none",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : note.pinned
          ? "bg-gradient-to-br from-[#007AFF] to-[#0055D4] text-white border-transparent"
          : "border-border/50 bg-card hover:border-border"
      )}
    >
      {/* Selection Circle */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={cn(
          "absolute top-3.5 left-3 z-10 flex size-6 items-center justify-center rounded-full border bg-background/95 transition-all",
          note.pinned && !isSelected && "border-white/30 bg-white/10",
          !note.pinned && "border-border/80 bg-background/95",
          isSelected
            ? "opacity-100 scale-100 border-primary bg-primary text-primary-foreground"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        )}
      >
        {isSelected && <span className="size-2 rounded-full bg-white" />}
      </div>

      {/* Action Menu (Absolute top right) */}
      <div onClick={(e) => e.stopPropagation()} className="absolute top-3.5 right-3 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors cursor-pointer border-none outline-none",
              note.pinned ? "hover:bg-white/15 text-white/80 hover:text-white" : "hover:bg-muted text-muted-foreground"
            )}>
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={onToggleSelect}>
              {isSelected ? "Desmarcar" : "Selecionar"}
            </DropdownMenuItem>

            {mode === "normal" && (
              <>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleTogglePin}>
                  {note.pinned ? "Desafixar" : "Fixar"}
                </DropdownMenuItem>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleToggleLock}>
                  {note.isLocked ? "Destrancar" : "Trancar"}
                </DropdownMenuItem>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleEmbedNow}>
                  Vetorizar agora
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="items-center flex flex-col justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskVaultOpen(true);
                  }}
                >
                  Transformar em task
                </DropdownMenuItem>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleArchive}>
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSoftDelete}
                  className="items-center flex flex-col justify-center text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  Excluir
                </DropdownMenuItem>
              </>
            )}

            {mode === "archive" && (
              <>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleUnarchive}>
                  Desarquivar
                </DropdownMenuItem>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleToggleLock}>
                  {note.isLocked ? "Destrancar" : "Trancar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSoftDelete}
                  className="items-center flex flex-col justify-center text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  Mover para Lixeira
                </DropdownMenuItem>
              </>
            )}

            {mode === "trash" && (
              <>
                <DropdownMenuItem className="items-center flex flex-col justify-center" onClick={handleRestore}>
                  Restaurar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handlePermanentDelete}
                  className="items-center flex flex-col justify-center text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  Excluir permanentemente
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Text details (Slides to the right when hovered/selected to clear the selection checkbox) */}
      <div className={cn(
        "flex-1 flex flex-col justify-start transition-all duration-300 pr-7 mt-1",
        (isSelectionActive || isSelected) ? "pl-7" : "group-hover:pl-7 pl-0"
      )}>
        {/* Tags Row (Includes inline PDF badge) */}
        {(noteTags.length > 0 || note.type === "pdf" || note.type === "excel") && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {note.type === "pdf" && (
              <span
                className={cn(
                  "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 shrink-0",
                  note.pinned
                    ? "bg-white/15 text-white border-white/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                )}
              >
                <FileText className="size-3" />
                PDF
              </span>
            )}
            {note.type === "excel" && (
              <span
                className={cn(
                  "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 shrink-0",
                  note.pinned
                    ? "bg-white/15 text-white border-white/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}
              >
                <FileSpreadsheet className="size-3" />
                EXCEL
              </span>
            )}
            {noteTags.map((tag) => {
              const isLightBg = tag.color?.includes("yellow") || tag.color?.includes("amber");
              return (
                <span
                  key={tag.id}
                  className={cn(
                    "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border shrink-0",
                    note.pinned
                      ? "bg-white/15 text-white border-white/20"
                      : tag.color
                      ? cn(tag.color, isLightBg ? "text-amber-950 border-transparent" : "text-white border-transparent")
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {tag.title}
                </span>
              );
            })}
          </div>
        )}

        {/* Title */}
        <h3 className={cn(
          "text-base font-bold leading-tight line-clamp-2 pr-4 flex items-center gap-1.5",
          note.pinned ? "text-white" : "text-foreground"
        )}>
          {note.title}
          {note.isLocked && <Lock className={cn("size-3.5", note.pinned ? "text-white/60" : "text-muted-foreground")} />}
        </h3>

        {/* Locked Blur or Preview */}
        {note.isLocked ? (
          <div className="relative mt-2">
            <div className={cn(
              "blur-[4px] select-none opacity-40 leading-relaxed text-xs space-y-1.5",
              note.pinned ? "text-white/60" : "text-muted-foreground/60"
            )}>
              <div className="h-2 bg-current rounded w-full" />
              <div className="h-2 bg-current rounded w-[90%]" />
              <div className="h-2 bg-current rounded w-[95%]" />
              <div className="h-2 bg-current rounded w-[60%]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "border rounded-full p-2 backdrop-blur-sm",
                note.pinned ? "bg-white/10 border-white/20" : "bg-background/80 dark:bg-card/80 border-border/40"
              )}>
                <Lock className={cn("size-4", note.pinned ? "text-white" : "text-muted-foreground")} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Subtasks checklist if type === "task" */}
            {note.type === "task" && note.taskSubtasks && note.taskSubtasks.length > 0 ? (
              <ul className={cn(
                "mt-3 space-y-1.5 text-[11px] font-medium",
                note.pinned ? "text-blue-100" : "text-muted-foreground/90"
              )}>
                {note.taskSubtasks.slice(0, 3).map((subtask) => (
                  <li key={subtask.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      readOnly
                      className={cn(
                        "size-3.5 rounded focus:ring-0 pointer-events-none shrink-0",
                        note.pinned 
                          ? "border-white/30 bg-white/10 text-white checked:bg-white checked:border-white" 
                          : "border-muted-foreground/30 text-primary"
                      )}
                    />
                    <span className={cn("truncate", subtask.completed && (note.pinned ? "line-through text-white/50" : "line-through text-muted-foreground/45"))}>
                      {subtask.title}
                    </span>
                  </li>
                ))}
                {note.taskSubtasks.length > 3 && (
                  <li className={cn(
                    "text-[9px] pl-5 font-bold tracking-wider uppercase",
                    note.pinned ? "text-white/60" : "text-muted-foreground/50"
                  )}>
                    + {note.taskSubtasks.length - 3} itens
                  </li>
                )}
              </ul>
            ) : (
              <p className={cn(
                "text-xs leading-relaxed line-clamp-3 mt-1.5 whitespace-pre-line",
                note.pinned ? "text-blue-100/90" : "text-muted-foreground"
              )}>
                {previewText}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer details */}
      <div className={cn(
        "flex justify-between items-center mt-4 pt-2.5 border-t text-[10px] font-medium",
        note.pinned ? "border-white/10 text-blue-200/80" : "border-border/20 text-muted-foreground"
      )}>
        <div className="flex items-center gap-2">
          <span>{formatFriendlyDate(note.createdAt)}</span>
          <span className={cn("h-2 w-px", note.pinned ? "bg-white/10" : "bg-border/40")} />
          {note.isVectorized ? (
            <span className={cn(
              "flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md border",
              note.pinned
                ? "text-white bg-white/15 border-white/20"
                : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
            )}>
              <span className={cn("size-1 rounded-full animate-pulse", note.pinned ? "bg-white" : "bg-emerald-500")} />
              IA Ativa
            </span>
          ) : (
            <span className={cn(
              "flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md border",
              note.pinned
                ? "text-blue-200/60 bg-white/5 border-white/10"
                : "text-muted-foreground bg-muted/40 border-border/20"
            )}>
              <span className={cn("size-1 rounded-full", note.pinned ? "bg-blue-300/40" : "bg-muted-foreground/60")} />
              IA Pendente
            </span>
          )}
        </div>
        {note.pinned && <Pin className="size-3 text-white fill-white/10" />}
      </div>
    </article>

    {/* Task Status Vault for conversion */}
    <TaskStatusVault
      noteId={note.id}
      noteTitle={note.title}
      open={taskVaultOpen}
      onOpenChange={setTaskVaultOpen}
    />
    </>
  );
}
