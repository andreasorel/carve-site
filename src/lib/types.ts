// Product model aligned with the ACP / OpenAI Product Feed Spec
// Fields are grouped by ACP tier: Required, Recommended, Optional

export interface Product {
  // ── ACP Required ──────────────────────────────────────────
  item_id: string;                // Unique merchant product ID (max 100)
  title: string;                  // Product name (max 150)
  description: string;            // Full details (max 5,000)
  url: string;                    // Product page link (must HTTP 200)
  brand: string;                  // Brand name (max 70)
  image_url: string;              // Primary image (JPEG/PNG, HTTPS)
  availability: string;           // in_stock | out_of_stock | pre_order | backorder | unknown
  price: string;                  // e.g. "29.99 USD" — value + ISO 4217 currency
  group_id: string;               // Variant group identifier
  listing_has_variations: boolean; // Whether this product has variants
  target_countries: string[];     // ISO 3166-1 alpha-2 codes
  store_country: string;          // Seller location code
  seller_name: string;            // Business name (max 70)
  seller_url: string;             // Merchant storefront link

  // ── ACP Recommended ───────────────────────────────────────
  sale_price: string;             // Discounted price + currency
  variant_dict: Record<string, string>; // e.g. { "Color": "Blue", "Size": "M" }
  size: string;                   // Apparel sizing
  reviews: ReviewData | null;     // Aggregated review data
  review_count: number;           // Separate count (ACP field)
  star_rating: string;            // Aggregate 0-5 (ACP field)
  review_list: ReviewItem[];      // Actual review content (maps to ACP reviews)
  q_and_a: QAPair[];              // FAQ content as structured pairs
  age_group: string;              // newborn | infant | toddler | kids | adult
  gender: string;                 // male | female | unisex
  related_product_id: string;     // Cross-sell product id
  warning: string;                // Compliance disclaimers
  warning_url: string;            // URL for warning details
  additional_images: string[];    // Extra images beyond primary

  // ── ACP Optional ──────────────────────────────────────────
  material: string;
  condition: string;              // new | refurbished | used
  weight: string;
  dimensions: string;
  video_url: string;
  shipping_details: string;
  return_policy: string;

  // ── Meta (internal, used for relevance heuristics, not scored) ──
  category: string;              // product_type / google_product_category
  structuredDataFormat: string;   // json | xml | json-ld — how we found it
}

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

export interface DiscoveryResult {
  products: Product[];
  feedType: string;
  feedUrl: string;
}

export interface CheckDetail {
  name: string;
  passed: number;
  total: number;       // number of products this check is relevant to (not always all products)
  description: string;
  notApplicable?: boolean; // true when 0 products matched the relevance filter
}

export interface CategoryScore {
  name: string;
  score: number;
  maxScore: number;
  details: CheckDetail[];
  llmPowered?: boolean;
}

export interface Recommendation {
  title: string;
  description: string;
  impact: number;
  category: string;
}

export interface AnalysisResult {
  overallScore: number;
  grade: string;
  categories: CategoryScore[];
  recommendations: Recommendation[];
  summary: string;
  productCount: number;
  feedUrl: string;
  feedType: string;
  llmPowered: boolean;
  products?: Product[];
  catalogMetrics?: CatalogMetrics;
  perProductMetrics?: ProductMetrics[];
  vertical?: ProductVertical;
}

// ── Vertical / Category-Aware Scoring ───────────────────────

export type ProductVertical =
  | "Apparel"
  | "Electronics"
  | "Home & Garden"
  | "Food & Beverage"
  | "Beauty & Personal Care"
  | "Sports & Outdoors"
  | "Toys & Games"
  | "Health"
  | "Automotive"
  | "Books & Media"
  | "Jewelry & Accessories"
  | "General";

export type AttributeRelevance = "expected" | "not_applicable";

export interface CategoryProfile {
  vertical: ProductVertical;
  confidence: number;
  attributeRelevance: Record<string, AttributeRelevance>;
}

export interface ProductMetrics {
  title: {
    present: boolean;
    length: number;
    containsBrand: boolean;
    isGeneric: boolean;
  };
  description: {
    present: boolean;
    strippedLength: number;
    hasHtml: boolean;
    isDuplicateOfTitle: boolean;
    qualityTier: "none" | "poor" | "fair" | "good" | "excellent";
  };
  attributes: {
    populatedRequiredCount: number;
    totalRequiredCount: number;
    populatedExpectedCount: number;
    totalExpectedCount: number;
    missingRequired: string[];
    missingExpected: string[];
  };
  price: {
    present: boolean;
    hasCurrencyCode: boolean;
    validFormat: boolean;
    hasSalePrice: boolean;
  };
  reviews: {
    hasReviewData: boolean;
    reviewCount: number;
    hasStarRating: boolean;
    hasIndividualReviews: boolean;
  };
  media: {
    hasPrimaryImage: boolean;
    additionalImageCount: number;
    hasVideo: boolean;
  };
  identity: {
    hasItemId: boolean;
    hasUrl: boolean;
    hasGroupId: boolean;
  };
  productScore: number;
}

export interface CatalogMetrics {
  totalProducts: number;
  vertical: ProductVertical;
  fieldCoverageRates: Record<string, number>;
  qualityDistribution: {
    none: number;
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
  worst10: { index: number; title: string; score: number }[];
}

// ── LLM analysis types ──────────────────────────────────────

export interface LLMSubScore {
  score: number;
  maxScore: number;
  finding: string;
}

export interface LLMAnalysis {
  // Data Quality — 60 pts total, LLM-evaluated content quality
  dataQuality: {
    titleQuality: LLMSubScore;       // 0-8:  titles specific, descriptive, buyer-useful?
    descriptionQuality: LLMSubScore; // 0-30: descriptions substantive, factual, detailed?
    attributeRichness: LLMSubScore;  // 0-5:  can agent extract specs, features, attributes?
    pricingClarity: LLMSubScore;     // 0-2:  pricing clear with currency, sale prices correct?
    qaQuality: LLMSubScore;          // 0-15: Q&A pairs present and genuinely useful for buyers?
  };
  // Trust Signals — 20 pts total, LLM-evaluated quality (not just presence)
  trustSignals: {
    brandCredibility: LLMSubScore;          // 0-6: brand real, consistent, identifiable?
    reviewQuality: LLMSubScore;             // 0-8: review volume, ratings, authenticity?
    returnsFulfillmentQuality: LLMSubScore; // 0-6: quality of return/shipping policy content?
  };
}
