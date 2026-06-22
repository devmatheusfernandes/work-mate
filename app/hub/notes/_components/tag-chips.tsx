"use client";

import { Tag } from "@/modules/notes/notes.schema";
import { cn } from "@/lib/utils";

interface TagChipsProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

export function TagChips({ tags, selectedTagId, onSelectTag }: TagChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 w-full">
      <button
        onClick={() => onSelectTag(null)}
        className={cn(
          "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 shrink-0 cursor-pointer",
          selectedTagId === null
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
        )}
      >
        Todas
      </button>

      {tags.map((tag) => {
        const isSelected = selectedTagId === tag.id;
        const colorClass = tag.color || "bg-blue-500";

        return (
          <button
            key={tag.id}
            onClick={() => onSelectTag(isSelected ? null : tag.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 shrink-0 cursor-pointer",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
            )}
          >
            <span className={cn("size-2 rounded-full", colorClass)} />
            {tag.title}
          </button>
        );
      })}
    </div>
  );
}
