import type { Metadata } from "next";
import Link from "next/link";
import ConstructorEditor from "@/components/constructor/ConstructorEditor";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Редактор комнаты — Конструктор Мастерок",
  description: "3D-редактор комнаты: размеры, отделка, раскладки и материалы к покупке.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/konstruktor/redaktor/` },
};

export default function ConstructorEditorPage() {
  return <><ConstructorEditor /><noscript><div className="page-container py-12"><p>Для редактирования комнаты включите JavaScript в браузере.</p><Link href="/konstruktor/">Возможности конструктора</Link></div></noscript></>;
}
