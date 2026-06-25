"use server";

import { revalidatePath } from "next/cache";
import { protectedAction } from "@/lib/safe-action";
import { calendarService } from "./calendar.service";
import {
  createCalendarSchema,
  createCalendarEventSchema,
} from "./calendar.schema";
import { z } from "zod";

// --- Calendar Actions ---
export const getCalendarsAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const calendars = await calendarService.getCalendars(ctx.user.id);
    return { success: true, calendars };
  });

export const createCalendarAction = protectedAction
  .schema(createCalendarSchema)
  .action(async ({ parsedInput, ctx }) => {
    const calendar = await calendarService.createCalendar(ctx.user.id, parsedInput);
    revalidatePath("/hub/settings");
    return { success: true, calendar };
  });

export const importSharedCalendarAction = protectedAction
  .schema(
    z.object({
      url: z.string().url("URL inválida"),
      backgroundColor: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const calendar = await calendarService.importSharedCalendar(
      ctx.user.id,
      parsedInput.url,
      parsedInput.backgroundColor
    );
    revalidatePath("/hub/settings");
    return { success: true, calendar };
  });

export const syncCalendarAction = protectedAction
  .schema(
    z.object({
      id: z.string(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const success = await calendarService.syncCalendar(ctx.user.id, parsedInput.id);
    revalidatePath("/hub");
    revalidatePath("/hub/settings");
    return { success };
  });

export const deleteCalendarAction = protectedAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await calendarService.deleteCalendar(ctx.user.id, parsedInput.id);
    revalidatePath("/hub/settings");
    return { success: true };
  });

// --- Event Actions ---
export const getEventsAction = protectedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const events = await calendarService.getEvents(ctx.user.id);
    return { success: true, events };
  });

export const createEventAction = protectedAction
  .schema(createCalendarEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const event = await calendarService.createEvent(ctx.user.id, parsedInput);
    revalidatePath("/hub");
    return { success: true, event };
  });

export const deleteEventAction = protectedAction
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await calendarService.deleteEvent(ctx.user.id, parsedInput.id);
    revalidatePath("/hub");
    return { success: true };
  });
