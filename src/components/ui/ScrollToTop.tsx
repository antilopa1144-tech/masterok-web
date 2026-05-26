"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const aboveProjectBar = /^\/proekty\/[^/]+\/?$/.test(pathname ?? "");

  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 400);
        ticking = false;
      });
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition-all duration-200 right-[calc(1rem+env(safe-area-inset-right,0px))] hover:border-accent-300 hover:text-accent-700 hover:shadow-xl sm:right-[calc(1.5rem+env(safe-area-inset-right,0px))] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-accent-500/40 ${
        aboveProjectBar
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      }`}
      aria-label="Наверх"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
