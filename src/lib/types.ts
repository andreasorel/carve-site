export type PipelineStage =
  | "connecting"
  | "fetching_homepage"
  | "discovering_feeds"
  | "sampling_products"
  | "analyzing_acp"
  | "generating_scorecard"
  | "complete"
  | "error";

export interface DimensionScore {
  name: string;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  findings: string[];
  recommendations: string[];
}

export interface Scorecard {
  url: string;
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  headline: string; // AI-generated newspaper-style headline
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

export interface NormalizedProduct {
  source: string;
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  price?: string;
  currency?: string;
  availability?: string;
  brand?: string;
  sku?: string;
  gtin?: string;
  variants?: Array<Record<string, unknown>>;
  reviews?: { count?: number; average?: number };
  rawData: Record<string, unknown>;
}
