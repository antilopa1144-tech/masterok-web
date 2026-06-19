"use client";

import { OPEN_FEEDBACK_EVENT } from "./FeedbackWidget";

/** Ссылка в футере, открывающая виджет обратной связи. */
export default function FeedbackFooterLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}
