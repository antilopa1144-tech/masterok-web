import type { Metadata } from "next";
import ProjectWorkspace from "@/components/commerce/ProjectWorkspace";
export const metadata: Metadata = { title: "Корзина проекта", robots: { index: false, follow: false } };
export default async function PurchasePage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{cloud?:string}> }) { const {id}=await params; const {cloud}=await searchParams; return <ProjectWorkspace projectId={id} cloudId={cloud}/>; }
