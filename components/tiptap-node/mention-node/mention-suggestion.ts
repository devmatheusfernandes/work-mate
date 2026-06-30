import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { MentionList, MentionListProps, MentionItem, MentionListRef } from "./mention-list";
import { searchMentionsAction } from "@/modules/notes/notes.actions";
import { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

export const getMentionSuggestionConfig = () => ({
  items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
    try {
      const res = await searchMentionsAction({ query });
      if (res?.data?.success && res.data.items) {
        return res.data.items as MentionItem[];
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  render: () => {
    let component: ReactRenderer<MentionListRef, MentionListProps>;
    let popup: TippyInstance[];

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: SuggestionProps) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }

        return component.ref?.onKeyDown(props) || false;
      },

      onExit() {
        if (popup && popup.length > 0) {
          popup[0].destroy();
        }
        if (component) {
          component.destroy();
        }
      },
    };
  },
});
