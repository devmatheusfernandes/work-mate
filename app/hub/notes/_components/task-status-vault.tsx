"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { CircleDashed, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultDescription,
  VaultBody,
} from "@/components/ui/vault";
import type { TaskStatus } from "@/modules/notes/notes.schema";

interface TaskStatusVaultProps {
  noteId: string;
  noteTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: {
  value: TaskStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
  {
    value: "to_start",
    label: "A Fazer",
    description: "Tarefa ainda não iniciada",
    icon: <CircleDashed className="size-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
  },
  {
    value: "in_progress",
    label: "Em Progresso",
    description: "Tarefa em andamento",
    icon: <Loader2 className="size-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",
  },
  {
    value: "done",
    label: "Concluído",
    description: "Tarefa finalizada",
    icon: <CheckCircle2 className="size-5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
  },
];

export function TaskStatusVault({
  noteId,
  noteTitle,
  open,
  onOpenChange,
}: TaskStatusVaultProps) {
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async (status: TaskStatus) => {
    setIsConverting(true);
    const toastId = toast.loading("Convertendo nota em tarefa...");

    try {
      const result = await updateNoteAction({
        id: noteId,
        updates: {
          type: "task",
          taskStatus: status,
          taskSubtasks: [],
          taskDeadline: null,
          taskShouldNotify: false,
        },
      });

      if (result?.data?.success) {
        toast.success("Nota convertida em tarefa!", { id: toastId });
        onOpenChange(false);
      } else {
        toast.error("Erro ao converter nota.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao converter nota.", { id: toastId });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Vault open={open} onOpenChange={onOpenChange}>
      <VaultContent aria-label="Converter em tarefa">
        <VaultHeader showCloseButton={false}>
          <VaultTitle>Transformar em Tarefa</VaultTitle>
          <VaultDescription>
            Escolha o status inicial para{" "}
            <span className="font-semibold text-foreground">&quot;{noteTitle}&quot;</span>
          </VaultDescription>
        </VaultHeader>

        <VaultBody>
          <div className="flex flex-col gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                disabled={isConverting}
                onClick={() => handleConvert(option.value)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  option.bgColor
                )}
              >
                <div className={cn("shrink-0", option.color)}>
                  {option.icon}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={cn("text-sm font-semibold", option.color)}>
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </VaultBody>
      </VaultContent>
    </Vault>
  );
}
