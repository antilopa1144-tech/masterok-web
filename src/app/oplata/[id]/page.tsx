import type { Metadata } from "next";
import PaymentPanel from "@/components/commerce/PaymentPanel";
export const metadata: Metadata = { title: "Оплата", robots: { index: false, follow: false } };
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) { return <PaymentPanel orderId={(await params).id} />; }
