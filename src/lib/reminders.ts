import type { Draw } from "@/lib/types";

export const REMINDER_DAYS_BEFORE = 3;

const DAY_MS = 86_400_000;

function addDays(day: string, days: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Day to send the reminder: three days before the date, but never in the past. Needs a date from tomorrow on. */
export function reminderSendOn(date: string | undefined, today: string): string | undefined {
  if (!date || date <= today) return undefined;
  const target = addDays(date, -REMINDER_DAYS_BEFORE);
  return target < today ? today : target;
}

/** Due once its day has come, as long as the occasion itself is not over. */
export function isReminderDue(draw: Pick<Draw, "reminder" | "date">, today: string) {
  return Boolean(draw.reminder && draw.date && draw.date >= today && draw.reminder.sendOn <= today);
}

/** A reminder that can never be sent any more (date passed or removed) and should just be wiped. */
export function isReminderStale(draw: Pick<Draw, "reminder" | "date">, today: string) {
  return Boolean(draw.reminder && (!draw.date || draw.date < today));
}
