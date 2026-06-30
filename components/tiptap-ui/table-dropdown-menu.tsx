"use client"

import { forwardRef, useCallback, useState } from "react"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/tiptap-ui-primitive/dropdown-menu"
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon"
import {
  Table2,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash,
  Combine,
  SplitSquareHorizontal
} from "lucide-react"
import type { Editor } from "@tiptap/core"

export interface TableDropdownMenuProps extends Omit<ButtonProps, "type"> {
  editor?: Editor | null
  modal?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export const TableDropdownMenu = forwardRef<HTMLButtonElement, TableDropdownMenuProps>(
  ({ editor: providedEditor, modal = true, onOpenChange, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState(false)

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!editor) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [editor, onOpenChange]
    )

    if (!editor) {
      return null
    }

    const isActive = editor.isActive("table")

    return (
      <DropdownMenu modal={modal} open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            data-active-state={isActive ? "on" : "off"}
            role="button"
            tabIndex={-1}
            aria-label="Tabela"
            aria-pressed={isActive}
            tooltip="Tabela"
            {...buttonProps}
            ref={ref}
          >
            <Table2 className="tiptap-button-icon" />
            <ChevronDownIcon className="tiptap-button-dropdown-small" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="gap-2 cursor-pointer"
            >
              <Table2 className="size-4" /> Inserir Tabela (3x3)
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                  className="gap-2 cursor-pointer"
                >
                  <ArrowLeftToLine className="size-4" /> Inserir Coluna Antes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="gap-2 cursor-pointer"
                >
                  <ArrowRightToLine className="size-4" /> Inserir Coluna Depois
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  className="gap-2 text-destructive cursor-pointer"
                >
                  <Trash2 className="size-4" /> Excluir Coluna
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                  className="gap-2 cursor-pointer"
                >
                  <ArrowUpToLine className="size-4" /> Inserir Linha Antes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="gap-2 cursor-pointer"
                >
                  <ArrowDownToLine className="size-4" /> Inserir Linha Depois
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  className="gap-2 text-destructive cursor-pointer"
                >
                  <Trash2 className="size-4" /> Excluir Linha
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().mergeCells().run()}
                  disabled={!editor.can().mergeCells()}
                  className="gap-2 cursor-pointer"
                >
                  <Combine className="size-4" /> Mesclar Células
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().splitCell().run()}
                  disabled={!editor.can().splitCell()}
                  className="gap-2 cursor-pointer"
                >
                  <SplitSquareHorizontal className="size-4" /> Separar Células
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="gap-2 text-destructive cursor-pointer font-bold"
                >
                  <Trash className="size-4" /> Excluir Tabela
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

TableDropdownMenu.displayName = "TableDropdownMenu"
