import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, CheckSquare, FileSpreadsheet, FileIcon } from "lucide-react";

export interface MentionItem {
  id: string;
  title: string;
  type: string;
}

export interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string; type: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.title, type: item.type });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckSquare className="size-4 shrink-0 text-blue-500" />;
      case "pdf":
        return <FileIcon className="size-4 shrink-0 text-red-500" />;
      case "excel":
        return <FileSpreadsheet className="size-4 shrink-0 text-emerald-500" />;
      case "note":
      default:
        return <FileText className="size-4 shrink-0 text-amber-500" />;
    }
  };

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border shadow-md p-1 min-w-[200px] max-w-[300px] flex flex-col gap-0.5 overflow-hidden z-50">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-left transition-colors cursor-pointer w-full outline-none",
              index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            {getIcon(item.type)}
            <span className="truncate">{item.title}</span>
          </button>
        ))
      ) : (
        <div className="p-2 text-sm text-muted-foreground text-center">Nenhum resultado</div>
      )}
    </div>
  );
});

MentionList.displayName = "MentionList";
