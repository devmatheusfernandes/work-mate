"use client";

import { useState } from "react";
import { Folder } from "@/modules/notes/notes.schema";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, MoreVertical, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateNoteAction, updateFolderAction, deleteFolderAction } from "@/modules/notes/notes.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface FolderCardProps {
  folder: Folder;
  searchQuery?: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  isSelectionActive: boolean;
}

export function FolderCard({
  folder,
  isSelected,
  onToggleSelect,
  isSelectionActive,
}: FolderCardProps) {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionActive) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect();
      return;
    }

    if (folder.isLocked) {
      e.preventDefault();
      e.stopPropagation();
      toast.info("Esta pasta está protegida por senha.");
      return;
    }

    router.push(`/hub/notes/folder/${folder.id}`);
  };

  const handleToggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !folder.isLocked;
    try {
      const res = await updateFolderAction({ id: folder.id, updates: { isLocked: nextLocked } });
      if (res?.data?.success) {
        toast.success(nextLocked ? "Pasta trancada!" : "Pasta destrancada!");
      }
    } catch {
      toast.error("Erro ao atualizar pasta.");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = toast.loading("Excluindo pasta...");
    try {
      const res = await deleteFolderAction({ id: folder.id });
      if (res?.data?.success) {
        toast.success("Pasta excluída com sucesso!", { id: toastId });
      } else {
        toast.error("Erro ao excluir pasta.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao excluir pasta.", { id: toastId });
    }
  };

  // Drag start handler (this folder can be dragged into another folder)
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `folder:${folder.id}`);
  };

  // Droppable handlers (items can be dropped into this folder)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const [type, id] = data.split(":");
    if (!type || !id) return;

    // Prevent dropping a folder into itself
    if (type === "folder" && id === folder.id) return;

    const toastId = toast.loading("Movendo item...");
    try {
      if (type === "note") {
        const res = await updateNoteAction({ id, updates: { folderId: folder.id } });
        if (res?.data?.success) {
          toast.success("Nota movida com sucesso!", { id: toastId });
        } else {
          toast.error("Erro ao mover nota.", { id: toastId });
        }
      } else if (type === "task") {
        // Convert task back to note and assign to this folder
        const res = await updateNoteAction({
          id,
          updates: {
            type: "note",
            folderId: folder.id,
            taskStatus: null,
            taskDeadline: null,
            taskSubtasks: [],
            taskShouldNotify: false,
          },
        });
        if (res?.data?.success) {
          toast.success("Tarefa convertida e movida para a pasta!", { id: toastId });
        } else {
          toast.error("Erro ao converter tarefa.", { id: toastId });
        }
      } else if (type === "folder") {
        const res = await updateFolderAction({ id, updates: { parentId: folder.id } });
        if (res?.data?.success) {
          toast.success("Pasta movida com sucesso!", { id: toastId });
        } else {
          toast.error("Erro ao mover pasta.", { id: toastId });
        }
      }
    } catch {
      toast.error("Erro ao mover item.", { id: toastId });
    }
  };

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "group relative flex items-center gap-3 cursor-pointer overflow-hidden rounded-xl p-3 border transition-all duration-300 active:scale-[0.98] shadow-none",
        isSelected
          ? "border-primary/50 bg-primary/10"
          : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/30",
        isDragOver && "ring-2 ring-primary/30 border-primary/40 bg-primary/5"
      )}
    >
      {/* Selection Overlay */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={cn(
          "absolute top-1/2 left-3 z-15 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border/85 bg-background/95 transition-all",
          isSelected
            ? "opacity-100 scale-100 border-primary bg-primary text-primary-foreground"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
        )}
      >
        {isSelected && <span className="size-2 rounded-full bg-white" />}
      </div>

      {/* Folder Icon wrapper */}
      <div className={cn(
        "size-10 flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all",
        isSelected ? "opacity-0" : "group-hover:opacity-0"
      )}>
        <FolderIcon className="size-5 fill-current" />
      </div>

      {/* Spacing placeholder when selection is hovered */}
      <div className={cn("w-10 shrink-0", isSelected ? "block" : "hidden group-hover:block")} />

      {/* Folder info */}
      <div className="flex-1 min-w-0 pr-4">
        <h3 className="truncate text-sm font-semibold leading-tight text-foreground flex items-center gap-1.5">
          {folder.title}
          {folder.isLocked && <Lock className="size-3 text-muted-foreground" />}
        </h3>
        <span className="text-[10px] text-muted-foreground mt-0.5 block">
          {new Date(folder.createdAt).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {/* Action Menu */}
      <div onClick={(e) => e.stopPropagation()} className="relative z-20 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer border-none outline-none">
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onToggleSelect}>
              {isSelected ? "Desmarcar" : "Selecionar"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleLock}>
              {folder.isLocked ? "Destrancar" : "Trancar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
