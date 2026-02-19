import { Product, CategoryProfile, ProductMetrics } from "./types";

// ── ACP Required fields (13) ────────────────────────────────
const ACP_REQUIRED_FIELDS: (keyof Product)[] = [
  "item_id",
  "title",
  "description",
  "url",
  "brand",
  "image_url",
  "availability",
  "price",
  "group_id",
  "seller_name",
  "seller_url",
  "store_country",
  "target_countries",
];

// ── Helpers ─────────────────────────────────────────────────

function strip(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function hasHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hashString(str: string): string {
  // Simple fast hash for duplicate detection
  let hash = 0;
  const s = str.toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}

function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function getDescriptionQualityTier(length: number): "none" | "poor" | "fair" | "good" | "excellent" {
  if (length === 0) return "none";
  if (length < 50) return "poor";
  if (length < 200) return "fair";
  if (length < 500) return "good";
  return "excellent";
}

function hasValidCurrencyCode(price: string): boolean {
  // ISO 4217: 3 uppercase letters at end or beginning
  return /[A-Z]{3}/.test(price);
}

function hasValidPriceFormat(price: string): boolean {
  // Matches patterns like "29.99 USD", "$29.99", "29.99", etc.
  return /\d+([.,]\d{1,2})?/.test(price);
}

// ── Category-aware expected fields ──────────────────────────

function getExpectedFields(profile: CategoryProfile): (keyof Product)[] {
  const fields: (keyof Product)[] = [];
  for (const [attr, relevance] of Object.entries(profile.attributeRelevance)) {
    if (relevance === "expected") {
      fields.push(attr as keyof Product);
    }
  }
  return fields;
}

// ── Two-pass scoring ────────────────────────────────────────

interface CatalogContext {
  titleFrequencies: Map<string, number>;
  descriptionHashes: Map<string, number>;
  genericThreshold: number;
}

function buildCatalogContext(products: Product[]): CatalogContext {
  const titleFrequencies = new Map<string, number>();
  const descriptionHashes = new Map<string, number>();
  const genericThreshold = products.length < 10 ? 2 : 3;

  for (const p of products) {
    if (p.title) {
      const normalized = normalizeTitle(p.title);
      titleFrequencies.set(normalized, (titleFrequencies.get(normalized) || 0) + 1);
    }
    if (p.description) {
      const stripped = strip(p.description);
      if (stripped.length > 0) {
        const hash = hashString(stripped);
        descriptionHashes.set(hash, (descriptionHashes.get(hash) || 0) + 1);
      }
    }
  }

  return { titleFrequencies, descriptionHashes, genericThreshold };
}

function scoreProduct(
  product: Product,
  profile: CategoryProfile,
  ctx: CatalogContext
): ProductMetrics {
  const expectedFields = getExpectedFields(profile);

  // ── Title ──
  const titlePresent = isPopulated(product.title);
  const titleLength = (product.title || "").length;
  const titleContainsBrand = !!(
    product.brand &&
    product.title &&
    product.title.toLowerCase().includes(product.brand.toLowerCase())
  );
  const normalizedTitle = normalizeTitle(product.title || "");
  const titleIsGeneric =
    normalizedTitle.length > 0 &&
    (ctx.titleFrequencies.get(normalizedTitle) || 0) >= ctx.genericThreshold;

  // ── Description ──
  const rawDesc = product.description || "";
  const descHasHtml = hasHtmlTags(rawDesc);
  const strippedDesc = strip(rawDesc);
  const descPresent = strippedDesc.length > 0;
  const descLength = strippedDesc.length;

  // Check if description is just the title repeated
  const descIsDuplicateOfTitle =
    descPresent &&
    titlePresent &&
    (strippedDesc.toLowerCase().trim() === (product.title || "").toLowerCase().trim() ||
      strippedDesc.length < product.title.length * 1.2 &&
      strippedDesc.toLowerCase().includes((product.title || "").toLowerCase()));

  const qualityTier = getDescriptionQualityTier(descLength);

  // ── Attributes ──
  const missingRequired: string[] = [];
  let populatedRequired = 0;
  for (const field of ACP_REQUIRED_FIELDS) {
    if (isPopulated(product[field])) {
      populatedRequired++;
    } else {
      missingRequired.push(field);
    }
  }

  const missingExpected: string[] = [];
  let populatedExpected = 0;
  for (const field of expectedFields) {
    if (isPopulated(product[field])) {
      populatedExpected++;
    } else {
      missingExpected.push(field);
    }
  }

  // ── Price ──
  const priceStr = product.price || "";
  const pricePresent = priceStr.length > 0;
  const hasCurrencyCode = pricePresent && hasValidCurrencyCode(priceStr);
  const validFormat = pricePresent && hasValidPriceFormat(priceStr);
  const hasSalePrice = isPopulated(product.sale_price);

  // ── Reviews ──
  const hasReviewData = !!(product.reviews && product.reviews.count > 0);
  const reviewCount = product.reviews?.count || product.review_count || 0;
  const hasStarRating = !!(
    product.reviews?.rating ||
    (product.star_rating && product.star_rating !== "0")
  );
  const hasIndividualReviews = !!(
    product.review_list && product.review_list.length > 0
  );

  // ── Media ──
  const hasPrimaryImage = isPopulated(product.image_url);
  const additionalImageCount = product.additional_images?.length || 0;
  const hasVideo = isPopulated(product.video_url);

  // ── Identity ──
  const hasItemId = isPopulated(product.item_id);
  const hasUrl = isPopulated(product.url);
  const hasGroupId = isPopulated(product.group_id);

  // ── Composite product score (0-100, diagnostic) ──
  let score = 0;
  // Title: 20 pts
  if (titlePresent) score += 5;
  if (titleLength >= 20 && titleLength <= 150) score += 5;
  if (titleContainsBrand) score += 5;
  if (!titleIsGeneric) score += 5;

  // Description: 25 pts
  if (descPresent) score += 5;
  const tierScores = { none: 0, poor: 3, fair: 8, good: 15, excellent: 18 };
  score += tierScores[qualityTier];
  if (!descIsDuplicateOfTitle) score += 2;

  // Attributes: 15 pts
  const reqCoverage = ACP_REQUIRED_FIELDS.length > 0 ? populatedRequired / ACP_REQUIRED_FIELDS.length : 0;
  score += Math.round(reqCoverage * 10);
  const expCoverage = expectedFields.length > 0 ? populatedExpected / expectedFields.length : 1;
  score += Math.round(expCoverage * 5);

  // Price: 10 pts
  if (pricePresent) score += 4;
  if (hasCurrencyCode) score += 3;
  if (hasSalePrice) score += 3;

  // Reviews: 15 pts
  if (hasReviewData) score += 6;
  if (hasStarRating) score += 3;
  if (hasIndividualReviews) score += 3;
  score += Math.min(3, Math.round((reviewCount / 10) * 3));

  // Media: 10 pts
  if (hasPrimaryImage) score += 4;
  score += Math.min(3, Math.round((additionalImageCount / 3) * 3));
  if (hasVideo) score += 3;

  // Identity: 5 pts
  if (hasItemId) score += 2;
  if (hasUrl) score += 1;
  if (hasGroupId) score += 2;

  return {
    title: { present: titlePresent, length: titleLength, containsBrand: titleContainsBrand, isGeneric: titleIsGeneric },
    description: { present: descPresent, strippedLength: descLength, hasHtml: descHasHtml, isDuplicateOfTitle: descIsDuplicateOfTitle, qualityTier },
    attributes: {
      populatedRequiredCount: populatedRequired,
      totalRequiredCount: ACP_REQUIRED_FIELDS.length,
      populatedExpectedCount: populatedExpected,
      totalExpectedCount: expectedFields.length,
      missingRequired,
      missingExpected,
    },
    price: { present: pricePresent, hasCurrencyCode, validFormat, hasSalePrice },
    reviews: { hasReviewData, reviewCount, hasStarRating, hasIndividualReviews },
    media: { hasPrimaryImage, additionalImageCount, hasVideo },
    identity: { hasItemId, hasUrl, hasGroupId },
    productScore: Math.min(100, score),
  };
}

// ── Public API ───────────────────────────────────────────────

export function scoreAllProducts(
  products: Product[],
  profile: CategoryProfile
): ProductMetrics[] {
  console.log("[Scorer] Scoring", products.length, "products deterministically");
  const ctx = buildCatalogContext(products);
  const metrics = products.map((p) => scoreProduct(p, profile, ctx));
  console.log("[Scorer] Scoring complete");
  return metrics;
}
