import Mention from "@tiptap/extension-mention";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useMentionsStore } from "@/modules/notes/mentions.store";
import { FileText, CheckSquare, FileSpreadsheet, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MentionComponent = (props: NodeViewProps) => {
  const { node } = props;
  const id = node.attrs.id;
  const label = node.attrs.label || id;
  const type = node.attrs.type || "note";
  
  const openPreview = useMentionsStore((state) => state.openPreview);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPreview(id, type);
  };

  const getIcon = () => {
    switch (type) {
      case "task":
        return <CheckSquare className="size-3.5 inline-block mr-1 text-blue-500" />;
      case "pdf":
        return <FileIcon className="size-3.5 inline-block mr-1 text-red-500" />;
      case "excel":
        return <FileSpreadsheet className="size-3.5 inline-block mr-1 text-emerald-500" />;
      case "note":
      default:
        return <FileText className="size-3.5 inline-block mr-1 text-amber-500" />;
    }
  };

  return (
    <NodeViewWrapper className="inline-block" as="span">
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-sm font-medium cursor-pointer transition-colors border",
          "bg-muted/50 border-border/50 hover:bg-muted hover:border-border text-foreground"
        )}
        onClick={handleClick}
        contentEditable={false}
      >
        {getIcon()}
        {label}
      </span>
    </NodeViewWrapper>
  );
};

export const CustomMentionNode = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { "data-id": attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) return {};
          return { "data-label": attributes.label };
        },
      },
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          if (!attributes.type) return {};
          return { "data-type": attributes.type };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-type": this.name,
        "data-id": node.attrs.id,
        "data-label": node.attrs.label,
        class: "mention",
      },
      `@${node.attrs.label}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionComponent);
  },
});
