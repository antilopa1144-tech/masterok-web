import type { Metadata } from "next";
import CommerceAdmin from "@/components/commerce/CommerceAdmin";

export const metadata: Metadata = {
  title: "Управление монетизацией",
  robots: { index: false, follow: false },
};

export default function CommerceAdminPage() {
  return <CommerceAdmin />;
}
