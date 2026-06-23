"use client";

import { Trash2, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionActionBarProps {
  selectedNoteIds: Set<string>;
  selectedFolderIds: Set<string>;
  onClear: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

export function SelectionActionBar({
  selectedNoteIds,
  selectedFolderIds,
  onClear,
  onDelete,
  onArchive,
}: SelectionActionBarProps) {
  const totalSelected = selectedNoteIds.size + selectedFolderIds.size;

  if (totalSelected === 0) return null;

  return (
    <div className="fixed bottom-22 inset-x-0 z-40 px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex w-fit max-w-[95vw] mx-auto items-center justify-center bg-card border border-border/60 text-card-foreground p-2 px-3 rounded-2xl shadow-xl overflow-x-auto gap-3 pointer-events-auto">
        <span className="text-xs font-semibold px-1 shrink-0 text-muted-foreground">
          {totalSelected} selecionado{totalSelected > 1 ? "s" : ""}
        </span>

        <div className="h-5 w-px bg-border/60" />

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
          >
            <Archive className="size-3.5 mr-2" />
            <span>Arquivar</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive/90 cursor-pointer px-2"
          >
            <Trash2 className="size-3.5 mr-2" />
            <span>Excluir</span>
          </Button>

          <div className="h-5 w-px bg-border/60 mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 gap-1 text-xs hover:bg-muted text-muted-foreground cursor-pointer px-2"
          >
            <X className="size-3.5 mr-2" />
            <span>Limpar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
