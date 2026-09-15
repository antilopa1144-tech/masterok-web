import { ExternalLink } from "lucide-react";

type Platform = "youtube" | "tiktok" | "instagram";

export interface VideoSocialLink {
  platform: Platform;
  label: string;
  handle: string;
  href: string;
}

function PlatformIcon({ platform, className = "" }: { platform: Platform; className?: string }) {
  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0033" />
        <path d="m10 9 5 3-5 3V9Z" fill="white" />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="instagram-gradient" x1="3" y1="21" x2="21" y2="3">
            <stop offset="0" stopColor="#FFD600" />
            <stop offset=".45" stopColor="#FF0169" />
            <stop offset="1" stopColor="#D300C5" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#instagram-gradient)" />
        <circle cx="12" cy="12" r="4.25" fill="none" stroke="white" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.7" r="1.15" fill="white" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#111827" />
      <path d="M14.2 5.2c.55 2.4 1.95 3.85 4.15 4.05v2.55a7.4 7.4 0 0 1-4.05-1.2v5.15a5.15 5.15 0 1 1-4.45-5.1v2.65a2.55 2.55 0 1 0 1.8 2.45V5.2h2.55Z" fill="#25F4EE" transform="translate(-.45 .35)" />
      <path d="M14.2 5.2c.55 2.4 1.95 3.85 4.15 4.05v2.55a7.4 7.4 0 0 1-4.05-1.2v5.15a5.15 5.15 0 1 1-4.45-5.1v2.65a2.55 2.55 0 1 0 1.8 2.45V5.2h2.55Z" fill="#FE2C55" transform="translate(.45 -.35)" />
      <path d="M14.2 5.2c.55 2.4 1.95 3.85 4.15 4.05v2.55a7.4 7.4 0 0 1-4.05-1.2v5.15a5.15 5.15 0 1 1-4.45-5.1v2.65a2.55 2.55 0 1 0 1.8 2.45V5.2h2.55Z" fill="white" />
    </svg>
  );
}

interface VideoSocialLinksProps {
  links: readonly VideoSocialLink[];
  variant?: "compact" | "cards";
}

export default function VideoSocialLinks({
  links,
  variant = "compact",
}: VideoSocialLinksProps) {
  if (variant === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.platform}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-accent-700"
            aria-label={`${link.label} ${link.handle} — открыть в новой вкладке`}
          >
            <PlatformIcon platform={link.platform} className="h-11 w-11 shrink-0" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                {link.label}
                <ExternalLink size={14} className="text-slate-400" aria-hidden="true" />
              </span>
              <span className="mt-0.5 block truncate text-sm text-slate-500 dark:text-slate-400">
                {link.handle}
              </span>
            </span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Видеоканалы Мастерка">
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 no-underline transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-accent-700"
          aria-label={`${link.label} ${link.handle} — открыть в новой вкладке`}
        >
          <PlatformIcon platform={link.platform} className="h-6 w-6" />
          {link.label}
        </a>
      ))}
    </div>
  );
}
