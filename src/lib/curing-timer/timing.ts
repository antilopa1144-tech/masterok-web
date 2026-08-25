export const MIN_CUSTOM_MINUTES = 1;
export const MAX_CUSTOM_MINUTES = 14_400;

export interface CustomDurationResult {
  minutes: number | null;
  error: string | null;
}

export function parseCustomMinutes(value: string): CustomDurationResult {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return { minutes: null, error: "Укажите время от 1 минуты" };
  }

  const minutes = Number(normalized);
  if (!Number.isInteger(minutes)) {
    return { minutes: null, error: "Укажите целое число минут" };
  }
  if (minutes < MIN_CUSTOM_MINUTES || minutes > MAX_CUSTOM_MINUTES) {
    return { minutes: null, error: `Допустимо от ${MIN_CUSTOM_MINUTES} до ${MAX_CUSTOM_MINUTES.toLocaleString("ru-RU")} минут` };
  }

  return { minutes, error: null };
}

export function formatTimerDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return remainder === 0 ? `${hours} ч` : `${hours} ч ${remainder} мин`;
  const days = Math.floor(hours / 24);
  const hoursRemainder = hours % 24;
  return hoursRemainder === 0 ? `${days} дн.` : `${days} дн. ${hoursRemainder} ч`;
}

export function formatTimerCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function getRemainingSeconds(deadlineMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function getTimerProgress(totalSeconds: number, remainingSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100));
}
