"use server";

import { protectedAction } from "@/lib/safe-action";
import { z } from "zod";
import { memoryService } from "./memory.service";
import { revalidatePath } from "next/cache";

export const getMemoriesAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const memories = await memoryService.getUserMemories(ctx.user.id);
    return { memories };
  });

export const saveMemoryAction = protectedAction
  .schema(z.object({
    content: z.string().min(1),
    isAuto: z.boolean().default(true),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const memoryId = await memoryService.saveMemory(
      ctx.user.id,
      parsedInput.content,
      parsedInput.isAuto
    );
    revalidatePath("/hub/settings");
    return { success: true, memoryId };
  });

export const deleteMemoryAction = protectedAction
  .schema(z.object({
    id: z.string(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    await memoryService.deleteMemory(ctx.user.id, parsedInput.id);
    revalidatePath("/hub/settings");
    return { success: true };
  });
