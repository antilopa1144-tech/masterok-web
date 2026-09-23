/**
 * Server-side payload for a paid project document.
 *
 * Values arrive from an authorised endpoint. This module deliberately does not
 * depend on project storage models, so an export cannot accidentally expose
 * fields which were not selected for the document.
 */
export type MoneyCurrency = 'RUB';

export interface DocumentPrice {
  /** An explicitly entered price. Zero is valid and means the item is free. */
  amount: number;
  currency: MoneyCurrency;
  /** Where the price came from, for example: «ввёл заказчик» or «прайс подрядчика». */
  provenance: string;
}

export interface ProjectDocumentParty {
  name?: string;
  contact?: string;
  details?: string;
}

export interface ProjectDocumentMaterialLine {
  key: string;
  name: string;
  subtitle?: string;
  unit: string;
  /** Quantity selected for purchasing, before prices are applied. */
  quantity: number;
  /** Exact calculated demand, when it differs from the purchase quantity. */
  exactQuantity?: number;
  reservePercent?: number;
  packaging?: string;
  unitPrice?: DocumentPrice;
}

export interface ProjectDocumentWorkLine {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice?: DocumentPrice;
}

export interface DocumentDelivery {
  amount?: DocumentPrice;
  note?: string;
}

/** Monetary reserve stays separate from material reserve so they cannot be mixed. */
export interface DocumentMonetaryReserve {
  /** Explicit reserve amount. The optional percent only documents how it was agreed. */
  amount: DocumentPrice;
  percent?: number;
  note?: string;
}

export interface ProjectDocumentLayout {
  kind: 'tile' | 'laminate';
  title: string;
  summary: string;
  /** Server receives only a PNG data URL produced from an already saved layout. */
  image?: {
    dataUrl: string;
    width: number;
    height: number;
  };
  sourceLabel?: string;
}

export interface ProjectDocumentInput {
  project: {
    id: string;
    name: string;
    /** Date printed in the document, normally ISO date from the endpoint. */
    documentDate: string;
    version?: string;
  };
  parties?: {
    customer?: ProjectDocumentParty;
    contractor?: ProjectDocumentParty;
    object?: string;
    notes?: string;
  };
  materials: ProjectDocumentMaterialLine[];
  works?: ProjectDocumentWorkLine[];
  delivery?: DocumentDelivery;
  monetaryReserve?: DocumentMonetaryReserve;
  assumptions?: string[];
  terms?: string[];
  layouts?: ProjectDocumentLayout[];
}

export interface DocumentLineTotal {
  key: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
  priceKnown: boolean;
}

export interface ProjectDocumentTotals {
  materials: DocumentLineTotal[];
  works: DocumentLineTotal[];
  materialsKnownTotal: number;
  worksKnownTotal: number;
  deliveryKnownTotal: number;
  monetaryReserveKnownTotal: number;
  knownGrandTotal: number;
  hasUnknownPrices: boolean;
}

export interface ProjectDocumentGeneratorOptions {
  /** Optional base64 of Roboto Regular. Useful for serverless packaging/tests. */
  fontBase64?: string;
}
