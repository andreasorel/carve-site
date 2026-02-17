// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "connecting"
  | "fetching_homepage"
  | "discovering_feeds"
  | "extracting_store_meta"
  | "sampling_products"
  | "scraping_product_pages"
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
// Review & Q&A types
// ---------------------------------------------------------------------------

export interface ReviewData {
  rating: number;
  count: number;
}

export interface ReviewItem {
  title: string;
  content: string;
  minRating: number;
  maxRating: number;
  rating: number;
}

export interface QAPair {
  q: string;
  a: string;
}

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
  /** Scraped shipping details text */
  shippingDetails?: string;
  /** Scraped return policy text (full body, not just URL) */
  returnPolicyText?: string;
}

// ---------------------------------------------------------------------------
// Product model — expanded to cover all 49 ACP fields
// ---------------------------------------------------------------------------

export interface NormalizedProduct {
  source: string;

  // ── ACP Required ──────────────────────────────────────────
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  price?: string;
  currency?: string;
  availability?: string;
  brand?: string;

  // Identifiers
  sku?: string;
  productId?: string; // maps to ACP group_id
  itemId?: string; // maps to ACP item_id (variant-level)

  // Variant structure
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

  // ── ACP Recommended ───────────────────────────────────────
  additionalImageUrls?: string[];
  salePrice?: string;
  gtin?: string;
  productType?: string;
  tags?: string[];
  condition?: string; // new | refurbished | used
  reviews?: ReviewData;
  reviewCount?: number;
  starRating?: string;
  reviewList?: ReviewItem[];
  qAndA?: QAPair[];
  size?: string;
  ageGroup?: string; // newborn | infant | toddler | kids | adult
  gender?: string; // male | female | unisex
  relatedProductId?: string;
  warning?: string;
  warningUrl?: string;
  variantDict?: Record<string, string>;

  // ── ACP Optional ──────────────────────────────────────────
  material?: string;
  weight?: string;
  dimensions?: string;
  videoUrl?: string;
  shippingDetails?: string;
  returnPolicy?: string;

  // ── Meta (internal, not scored) ───────────────────────────
  category?: string;
  structuredDataFormat?: string;

  /** Raw data from the source feed (for debugging) */
  rawData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Scraped product page data
// ---------------------------------------------------------------------------

export interface ScrapedProductData {
  reviews: ReviewData | null;
  additionalImages: string[];
  videoUrl: string;
  qAndA: QAPair[];
  condition: string;
  material: string;
  weight: string;
  dimensions: string;
  pageText: string;
  reviewItems: ReviewItem[];
  ageGroup: string;
  gender: string;
}

// ---------------------------------------------------------------------------
// Feed & crawl types
// ---------------------------------------------------------------------------

export interface DiscoveredFeed {
  type:
    | "json-ld"
    | "sitemap"
    | "shopify"
    | "woocommerce"
    | "meta-tags"
    | "microdata"
    | "xml-feed";
  url: string;
  productCount: number | null;
}

export interface SiteData {
  products: NormalizedProduct[];
  feeds: DiscoveredFeed[];
  storeMeta: StoreMeta;
}

// ---------------------------------------------------------------------------
// Enrichment pipeline types
// ---------------------------------------------------------------------------

export interface EnrichmentProgress {
  type: "phase" | "progress" | "complete" | "error";
  phase?: string;
  phaseLabel?: string;
  batch?: number;
  total?: number;
  products?: NormalizedProduct[];
  count?: number;
  error?: string;
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
