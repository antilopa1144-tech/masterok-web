"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { trackEvent, type VideoServiceContactPlacement } from "@/lib/analytics";
import {
  OPEN_FEEDBACK_EVENT,
  type OpenFeedbackDetail,
} from "@/components/feedback/FeedbackWidget";

interface VideoServiceContactButtonProps {
  placement: VideoServiceContactPlacement;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

export default function VideoServiceContactButton({
  placement,
  className = "",
  compact = false,
  children = "Обсудить ролик",
}: VideoServiceContactButtonProps) {
  const openContact = () => {
    trackEvent("video_service_contact_click", { placement });
    window.dispatchEvent(new CustomEvent<OpenFeedbackDetail>(OPEN_FEEDBACK_EVENT, {
      detail: { mode: "video-service" },
    }));
  };

  return (
    <button
      type="button"
      onClick={openContact}
      className={`inline-flex min-h-11 items-center justify-center gap-2 ${className}`}
    >
      <MessageCircle size={compact ? 17 : 19} aria-hidden="true" />
      <span>{children}</span>
      {!compact && <ArrowRight size={17} aria-hidden="true" />}
    </button>
  );
}
