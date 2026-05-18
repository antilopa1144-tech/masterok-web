export function IconPencil({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.5 2.5l2 2L5.5 12.5 2 13l.5-3.5L11.5 2.5z"
      />
    </svg>
  );
}

export function IconPrint({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" d="M4 6V2h8v4M4 10H2V6h12v4h-2" />
      <rect x="4" y="10" width="8" height="4" rx="0.5" />
    </svg>
  );
}

export function IconTable({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M2 6h12M2 10h12M6 2v12" />
    </svg>
  );
}

export function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="5" y="5" width="9" height="9" rx="1" />
      <path strokeLinecap="round" d="M3 11V3h8" />
    </svg>
  );
}

export function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="7" cy="7" r="4" />
      <path strokeLinecap="round" d="M10 10l4 4" />
    </svg>
  );
}

export function IconFolderEmpty({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M6 14a4 4 0 014-4h8l4 4h16a4 4 0 014 4v18a4 4 0 01-4 4H10a4 4 0 01-4-4V14z"
        className="fill-accent-100 stroke-accent-300 dark:fill-accent-950/40 dark:stroke-accent-700"
        strokeWidth="2"
      />
      <path
        d="M20 26h8M24 22v8"
        className="stroke-accent-500 dark:stroke-accent-400"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconChevron({ open, className = "w-4 h-4" }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className} transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
    </svg>
  );
}
