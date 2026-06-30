import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /**
       * Indent the current paragraph or heading
       */
      indent: () => ReturnType;
      /**
       * Outdent the current paragraph or heading
       */
      outdent: () => ReturnType;
    };
  }
}

export const IndentExtension = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      indentSize: 24, // 24px per indent level
      minLevel: 0,
      maxLevel: 8,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const paddingLeft = element.style.paddingLeft || element.style.marginLeft;
              if (paddingLeft) {
                const value = parseInt(paddingLeft, 10);
                return Math.floor(value / this.options.indentSize);
              }
              return 0;
            },
            renderHTML: attributes => {
              if (!attributes.indent) {
                return {};
              }
              return {
                style: `margin-left: ${attributes.indent * this.options.indentSize}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        let hasChanged = false;

        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = node.attrs.indent || 0;
            if (indent < this.options.maxLevel) {
              hasChanged = true;
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: indent + 1,
                });
              }
            }
          }
        });

        if (hasChanged && dispatch) {
          dispatch(tr);
          return true;
        }
        return hasChanged;
      },
      outdent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        let hasChanged = false;

        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = node.attrs.indent || 0;
            if (indent > this.options.minLevel) {
              hasChanged = true;
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: indent - 1,
                });
              }
            }
          }
        });

        if (hasChanged && dispatch) {
          dispatch(tr);
          return true;
        }
        return hasChanged;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // If we're inside a list, let the list handle Tab (sink item)
        if (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) {
          return false;
        }
        
        const { selection } = this.editor.state;
        const { empty, $from } = selection;
        
        // If cursor is not at the start of the paragraph, insert 4 spaces like Google Docs
        if (empty && $from.parentOffset > 0) {
          return this.editor.commands.insertContent('\u00A0\u00A0\u00A0\u00A0');
        }
        
        // Otherwise, indent the block
        return this.editor.commands.indent();
      },
      'Shift-Tab': () => {
        // If we're inside a list, let the list handle Shift-Tab (lift item)
        if (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) {
          return false;
        }
        return this.editor.commands.outdent();
      },
    };
  },
});
