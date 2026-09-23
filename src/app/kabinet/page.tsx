import type { Metadata } from "next";
import AccountPanel from "@/components/commerce/AccountPanel";
export const metadata: Metadata = { title: "Кабинет", robots: { index: false, follow: false } };
export default function AccountPage() { return <AccountPanel />; }
