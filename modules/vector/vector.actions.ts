"use server";

import { revalidatePath } from "next/cache";
import { protectedAction } from "@/lib/safe-action";
import { vectorService } from "./vector.service";
import { notesService } from "@/modules/notes/notes.service";
import { z } from "zod";

type NoteSourceType = "note" | "pdf" | "task" | "excel";

/**
 * Enfileira todas as notas ativas não vetorizadas do usuário.
 * Equivale a "Atualizar Fila" — coloca os itens pendentes na fila para o cron processar.
 */
export const enqueueAllPendingNotesAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const notes = await notesService.getNotes(ctx.user.id);
    const activeNotes = notes.filter((n) => !n.trashed && !n.archived);

    let enqueued = 0;
    let skipped = 0;

    for (const note of activeNotes) {
      if (note.isVectorized) {
        skipped++;
        continue;
      }
      try {
        // Build the content string exactly like the service does
        const bodyText = note.searchText || "";
        let contentToEmbed = `Título: ${note.title}\nConteúdo: ${bodyText}`;

        if (note.type === "task") {
          const statusLabel =
            note.taskStatus === "done"
              ? "Concluída"
              : note.taskStatus === "in_progress"
              ? "Em Progresso"
              : "A Fazer";
          contentToEmbed += `\nTipo: Tarefa\nStatus: ${statusLabel}`;
          if (note.taskSubtasks && note.taskSubtasks.length > 0) {
            const subtaskDetails = note.taskSubtasks
              .map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`)
              .join("\n");
            contentToEmbed += `\nSubtarefas:\n${subtaskDetails}`;
          }
          if (note.taskDeadline) {
            contentToEmbed += `\nPrazo: ${note.taskDeadline}`;
          }
        } else if (note.type === "pdf") {
          contentToEmbed += `\nTipo: Documento PDF`;
        } else if (note.type === "excel") {
          contentToEmbed += `\nTipo: Planilha Excel`;
        } else {
          contentToEmbed += `\nTipo: Nota de Texto`;
        }

        contentToEmbed = contentToEmbed.trim();
        await vectorService.enqueue(ctx.user.id, note.id, note.type as NoteSourceType, contentToEmbed);
        enqueued++;
      } catch (e) {
        console.error(`Erro ao enfileirar nota ${note.id}:`, e);
      }
    }

    revalidatePath("/hub/settings");
    return { success: true, enqueued, skipped };
  });

/**
 * Processa imediatamente a fila de vetorização do usuário (até 50 itens).
 * Equivale a "Iniciar Fila" — chama a API do Gemini e salva os embeddings.
 */
export const processUserVectorizationQueueAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const result = await vectorService.processUserQueue(ctx.user.id);
    revalidatePath("/hub/settings");
    return { success: true, processed: result.processed, errors: result.errors };
  });
