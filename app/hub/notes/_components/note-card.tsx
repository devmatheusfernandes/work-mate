"use client";

import { useState } from "react";
import { Note } from "@/modules/notes/notes.schema";
import { useRouter } from "next/navigation";
import { FileText, MoreVertical, Pin, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteNoteAction, updateNoteAction } from "@/modules/notes/notes.actions";
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
  searchQuery?: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  isSelectionActive: boolean;
  mode?: "normal" | "archive" | "trash";
}

export function NoteCard({
  note,
  isSelected,
  onToggleSelect,
  isSelectionActive,
  mode = "normal",
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (mode !== "normal") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", `note:${note.id}`);
  };

  // Simple preview extraction
  const previewText = note.searchText || "Sem conteúdo...";

  return (
    <>
    <article
      draggable={mode === "normal"}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl transition-all duration-300 cursor-pointer min-h-[160px] p-4 text-left border shadow-none",
        isSelected
          ? "border-primary/50 bg-primary/5"
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
          "absolute top-3 left-3 z-10 flex size-6 items-center justify-center rounded-full border border-border/80 bg-background/95 transition-all",
          isSelected
            ? "opacity-100 scale-100 border-primary bg-primary text-primary-foreground"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        )}
      >
        {isSelected && <span className="size-2 rounded-full bg-white" />}
      </div>

      {/* PDF Badge */}
      {note.type === "pdf" && (
        <div
          className={cn(
            "absolute top-3 transition-all flex items-center gap-1 bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold",
            isSelected ? "left-11" : "left-3 group-hover:left-11"
          )}
        >
          <FileText className="size-3" />
          <span>PDF</span>
        </div>
      )}

      {/* Top action row */}
      <div className="flex justify-between items-start gap-4">
        {/* Empty space for overlays */}
        <div className="h-6" />

        {/* Action Menu */}
        <div onClick={(e) => e.stopPropagation()} className="relative z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex size-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer border-none outline-none">
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
      </div>

      {/* Text details */}
      <div className="flex-1 mt-2">
        <h3 className="text-base font-bold leading-tight text-foreground line-clamp-2 pr-4 flex items-center gap-1.5">
          {note.title}
          {note.isLocked && <Lock className="size-3.5 text-muted-foreground" />}
        </h3>
        {note.isLocked ? (
          <p className="text-xs text-muted-foreground/60 italic mt-2">Conteúdo protegido</p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3 mt-1.5">
            {previewText}
          </p>
        )}
      </div>

      {/* Footer details */}
      <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
        <span>{new Date(note.createdAt).toLocaleDateString("pt-BR")}</span>
        {note.pinned && <Pin className="size-3 text-primary fill-primary/10" />}
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
