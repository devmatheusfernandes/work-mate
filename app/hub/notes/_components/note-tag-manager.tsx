"use client";

import { Tag as TagIcon, Plus, X } from "lucide-react";
import { Tag } from "@/modules/notes/notes.schema";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteTagManagerProps {
  noteTagIds: string[];
  allTags: Tag[];
  onToggleTag: (tagId: string) => void;
}

export function NoteTagManager({
  noteTagIds = [],
  allTags = [],
  onToggleTag,
}: NoteTagManagerProps) {
  const activeTags = allTags.filter((tag) => noteTagIds.includes(tag.id));
  const availableTags = allTags.filter((tag) => !noteTagIds.includes(tag.id));

  return (
    <div className="flex items-center flex-wrap gap-2 px-8 py-2 border-b border-border/10 bg-muted/5 min-h-[44px]">
      <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs font-semibold mr-1 select-none">
        <TagIcon className="size-3.5" />
        <span>Tags:</span>
      </div>

      {/* List of active tags */}
      {activeTags.map((tag) => {
        const isLightBg = tag.color?.includes("yellow") || tag.color?.includes("amber");
        return (
          <span
            key={tag.id}
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border select-none transition-all duration-200",
              tag.color
                ? cn(tag.color, isLightBg ? "text-amber-950 border-transparent" : "text-white border-transparent")
                : "bg-primary/10 text-primary border-primary/20"
            )}
          >
            {tag.title}
            <button
              onClick={() => onToggleTag(tag.id)}
              className="hover:bg-white/20 dark:hover:bg-black/20 rounded-full p-0.5 -mr-1 transition-colors cursor-pointer border-none outline-none"
              title="Remover tag"
            >
              <X className="size-2.5" />
            </button>
          </span>
        );
      })}

      {/* Dropdown to add tags */}
      {availableTags.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center size-5 rounded-full border border-dashed border-border/80 text-muted-foreground/60 hover:text-foreground hover:border-border transition-colors cursor-pointer bg-transparent outline-none">
              <Plus className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 max-h-60 overflow-y-auto">
            {availableTags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => onToggleTag(tag.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className={cn("size-2 rounded-full border border-border/10", tag.color || "bg-primary")} />
                <span className="text-xs font-semibold">{tag.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : activeTags.length === 0 ? (
        <span className="text-xs text-muted-foreground/35 italic select-none">Sem tags disponíveis</span>
      ) : null}
    </div>
  );
}
