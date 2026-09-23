export type CommerceMode = "off" | "local" | "sandbox" | "live";
export type ProductKind = "project_pack" | "pro_month";
export type PaymentState = "pending" | "paid" | "canceled" | "partially_refunded" | "refunded";

export const PROCUREMENT_PILOT = ["plaster", "putty", "primer", "paint", "tile", "tile-adhesive", "tile-grout", "laminate", "self-leveling", "waterproofing"] as const;

export interface MaterialOffer {
  id: string;
  title: string;
  provider: "lemanapro" | "yandex_market" | "sponsor";
  url: string;
  calculatorSlugs: string[];
  suitability: string;
  limitations: string;
  advertiser: string;
  advertiserInn: string;
  erid: string;
  contractReference: string;
  reviewedAt: string;
  expiresAt: string;
  enabled: boolean;
}

export interface CommerceSettings {
  revision: number;
  packPriceKopecks: number;
  proPriceKopecks: number;
  checkoutEnabled: boolean;
  proEnabled: boolean;
  recurringEnabled: boolean;
  offersEnabled: boolean;
  proAiEnabled: boolean;
  proAiRequests: number;
  freeAiWeeklyRequests: number;
  proAiBudgetKopecks: number;
  aiInputKopecksPerMillion: number;
  aiOutputKopecksPerMillion: number;
  aiPriceCheckedAt: string;
  sellerName: string;
  sellerInn: string;
  supportEmail: string;
  offerVersion: string;
  legalApproved: boolean;
  offers: MaterialOffer[];
}

export interface CommerceUser { id: string; email: string; admin: boolean }
export interface CommerceOrder {
  id: string; invoice: string; user_id: string; project_id: string | null;
  kind: ProductKind; amount: number; refunded: number; state: PaymentState;
  mode: CommerceMode; created_at: number; paid_at: number | null;
  access_start: number | null; access_end: number | null;
  recurring_consent: boolean; settings_revision: number;
  provider_operation: string | null;
}

export interface CommercePublicState {
  mode: CommerceMode;
  enabled: boolean;
  checkoutAvailable: boolean;
  proAvailable: boolean;
  recurringAvailable: boolean;
  aiAvailable: boolean;
  packPriceKopecks: number;
  proPriceKopecks: number;
  proAiRequests: number;
  freeAiWeeklyRequests: number;
  offerVersion: string;
  sellerName: string;
  sellerInn: string;
  supportEmail: string;
}

export class CommerceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
