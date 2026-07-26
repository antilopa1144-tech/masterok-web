const DEFAULT_TITLE_WAIT_ATTEMPTS = 20;
const DEFAULT_TITLE_WAIT_INTERVAL_MS = 50;
const FALLBACK_PAGE_TITLE = "Мастерок";

interface PageviewScheduler {
  readTitle: () => string;
  send: (title: string) => void;
  schedule: (callback: () => void, delayMs: number) => number;
  cancel: (timerId: number) => void;
}

interface PageviewScheduleOptions {
  maxAttempts?: number;
  intervalMs?: number;
}

/**
 * Next.js может на короткое время очистить document.title при клиентском
 * переходе. Не отправляем такой hit сразу, иначе Метрика относит его к
 * заголовку «Не определено».
 */
export function scheduleMetrikaPageview(
  scheduler: PageviewScheduler,
  options: PageviewScheduleOptions = {},
): () => void {
  const maxAttempts = options.maxAttempts ?? DEFAULT_TITLE_WAIT_ATTEMPTS;
  const intervalMs = options.intervalMs ?? DEFAULT_TITLE_WAIT_INTERVAL_MS;
  let attempts = 0;
  let timerId: number | undefined;
  let cancelled = false;

  const attemptSend = () => {
    if (cancelled) return;

    const title = scheduler.readTitle().trim();
    if (title) {
      scheduler.send(title);
      return;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      scheduler.send(FALLBACK_PAGE_TITLE);
      return;
    }

    timerId = scheduler.schedule(attemptSend, intervalMs);
  };

  attemptSend();

  return () => {
    cancelled = true;
    if (timerId !== undefined) scheduler.cancel(timerId);
  };
}
