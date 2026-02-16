// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "connecting"
  | "fetching_homepage"
  | "discovering_feeds"
  | "extracting_store_meta"
  | "sampling_products"
  | "scoring_fields"
  | "analyzing_acp"
  | "generating_scorecard"
  | "complete"
  | "error";

// ---------------------------------------------------------------------------
// Field audit types (deterministic scoring)
// ---------------------------------------------------------------------------

export type FieldStatus = "present" | "missing" | "partial" | "warn";

export type FieldTier = "required" | "conditional" | "recommended";

export interface FieldAudit {
  /** ACP field name in snake_case, e.g. "image_url" */
  fieldName: string;
  tier: FieldTier;
  status: FieldStatus;
  /** How many sampled products have this field */
  presentCount: number;
  /** Total products sampled */
  totalCount: number;
  /** presentCount / totalCount as 0-100 */
  coverage: number;
  /** A representative example value found, or null */
  exampleValue: string | null;
  /** Quality sub-check result, if applicable */
  qualityNote: string | null;
  /** Short "how to fix" note when status is missing/warn */
  fixHint: string | null;
}

export type FieldAuditMap = Record<string, FieldAudit>;

// ---------------------------------------------------------------------------
// Store-level metadata
// ---------------------------------------------------------------------------

export interface StoreMeta {
  sellerName: string | null;
  sellerUrl: string;
  returnPolicy: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  storeCountry: string | null;
  targetCountries: string[];
  platform: "shopify" | "woocommerce" | "custom" | null;
}

// ---------------------------------------------------------------------------
// Product & feed types
// ---------------------------------------------------------------------------

export interface NormalizedProduct {
  source: string;
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  additionalImageUrls?: string[];
  price?: string;
  currency?: string;
  availability?: string;
  brand?: string;
  sku?: string;
  gtin?: string;
  productType?: string;
  tags?: string[];
  condition?: string;
  productId?: string;
  options?: Array<{ name: string; values: string[] }>;
  variants?: Array<{
    title?: string;
    price?: string;
    sku?: string;
    available?: boolean;
    imageUrl?: string;
    option1?: string;
    option2?: string;
    option3?: string;
    compareAtPrice?: string;
    variantId?: string;
    [key: string]: unknown;
  }>;
  reviews?: { count?: number; average?: number };
  rawData: Record<string, unknown>;
}

export interface DiscoveredFeed {
  type:
    | "json-ld"
    | "sitemap"
    | "shopify"
    | "woocommerce"
    | "meta-tags"
    | "microdata";
  url: string;
  productCount: number | null;
}

// ---------------------------------------------------------------------------
// Crawl return type
// ---------------------------------------------------------------------------

export interface SiteData {
  products: NormalizedProduct[];
  feeds: DiscoveredFeed[];
  storeMeta: StoreMeta;
}

// ---------------------------------------------------------------------------
// Scoring types
// ---------------------------------------------------------------------------

export interface DimensionScore {
  name: string;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  findings: string[];
  recommendations: string[];
  fields: FieldAudit[];
}

export interface Scorecard {
  url: string;
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  headline: string;
  summary: string;
  dimensions: {
    contentCompleteness: DimensionScore;
    variantHandling: DimensionScore;
    sellerIntegrity: DimensionScore;
    eligibilityFlags: DimensionScore;
    contentQuality: DimensionScore;
    enrichment: DimensionScore;
  };
  discoveredFeeds: DiscoveredFeed[];
  sampleSize: number;
  analyzedAt: string;
  storeMeta: StoreMeta;
}
