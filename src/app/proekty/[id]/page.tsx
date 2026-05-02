import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import ProjectDetailClient from "./ProjectDetailClient";

export const metadata: Metadata = {
  title: `Смета проекта — ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="page-container py-8">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Главная</Link>
        <span>/</span>
        <Link href="/proekty/" className="hover:text-slate-600 dark:hover:text-slate-300">Проекты</Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">Смета</span>
      </nav>

      <Suspense fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="rounded-3xl h-40 bg-slate-200 dark:bg-slate-700" />
        </div>
      }>
        <ProjectDetailClient projectId={id} />
      </Suspense>
    </div>
  );
}
