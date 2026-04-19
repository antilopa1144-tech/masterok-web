export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareOrCopy(opts: ShareOptions): Promise<ShareResult> {
  if (typeof window === "undefined") return "failed";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(opts);
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Fall through to clipboard fallback on other errors
    }
  }

  const payload = opts.text ? `${opts.text}\n${opts.url}` : opts.url;
  const ok = await copyText(payload);
  return ok ? "copied" : "failed";
}
