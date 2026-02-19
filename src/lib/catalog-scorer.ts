import {
  Product,
  ProductMetrics,
  CategoryProfile,
  CatalogMetrics,
  CategoryScore,
  CheckDetail,
  LLMAnalysis,
  Recommendation,
} from "./types";

// ── Helpers ─────────────────────────────────────────────────

function rate(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function pct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

function fraction(count: number, total: number): string {
  return `${count}/${total}`;
}

function roundScore(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Aggregate rates from ProductMetrics[] ───────────────────

interface AggregateRates {
  n: number;
  // Required field coverage
  avgRequiredFieldCoverage: number;
  topMissingRequired: { field: string; count: number }[];
  // Category-expected field coverage
  avgExpectedFieldCoverage: number;
  topMissingExpected: { field: string; count: number }[];
  // Media
  primaryImageRate: number;
  primaryImageCount: number;
  avgAdditionalImages: number;
  videoRate: number;
  videoCount: number;
  // For recommendations
  reviewPresentRate: number;
  reviewPresentCount: number;
  descPresentRate: number;
  descPresentCount: number;
  shippingPresentRate: number;
  shippingPresentCount: number;
  returnPolicyRate: number;
  returnPolicyCount: number;
  brandFieldPresentRate: number;
  brandFieldPresentCount: number;
}

function computeRates(metrics: ProductMetrics[], products: Product[]): AggregateRates {
  const n = metrics.length;
  if (n === 0) return {} as AggregateRates;

  let totalReqCoverage = 0, totalExpCoverage = 0;
  const missingReqCounts = new Map<string, number>();
  const missingExpCounts = new Map<string, number>();

  let primaryImage = 0, totalAdditionalImages = 0, video = 0;
  let reviewPresent = 0, descPresent = 0, shippingPresent = 0, returnPolicy = 0, brandField = 0;

  for (let i = 0; i < n; i++) {
    const m = metrics[i];
    const p = products[i];

    const reqCov = m.attributes.totalRequiredCount > 0
      ? m.attributes.populatedRequiredCount / m.attributes.totalRequiredCount
      : 0;
    totalReqCoverage += reqCov;

    const expCov = m.attributes.totalExpectedCount > 0
      ? m.attributes.populatedExpectedCount / m.attributes.totalExpectedCount
      : 1;
    totalExpCoverage += expCov;

    for (const f of m.attributes.missingRequired) {
      missingReqCounts.set(f, (missingReqCounts.get(f) || 0) + 1);
    }
    for (const f of m.attributes.missingExpected) {
      missingExpCounts.set(f, (missingExpCounts.get(f) || 0) + 1);
    }

    if (m.media.hasPrimaryImage) primaryImage++;
    totalAdditionalImages += m.media.additionalImageCount;
    if (m.media.hasVideo) video++;

    if (m.reviews.hasReviewData) reviewPresent++;
    if (m.description.present) descPresent++;
    if (p.shipping_details) shippingPresent++;
    if (p.return_policy) returnPolicy++;
    if (p.brand) brandField++;
  }

  const sortedMissing = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => ({ field, count }));

  return {
    n,
    avgRequiredFieldCoverage: totalReqCoverage / n,
    topMissingRequired: sortedMissing(missingReqCounts),
    avgExpectedFieldCoverage: totalExpCoverage / n,
    topMissingExpected: sortedMissing(missingExpCounts),
    primaryImageRate: rate(primaryImage, n),
    primaryImageCount: primaryImage,
    avgAdditionalImages: totalAdditionalImages / n,
    videoRate: rate(video, n),
    videoCount: video,
    reviewPresentRate: rate(reviewPresent, n),
    reviewPresentCount: reviewPresent,
    descPresentRate: rate(descPresent, n),
    descPresentCount: descPresent,
    shippingPresentRate: rate(shippingPresent, n),
    shippingPresentCount: shippingPresent,
    returnPolicyRate: rate(returnPolicy, n),
    returnPolicyCount: returnPolicy,
    brandFieldPresentRate: rate(brandField, n),
    brandFieldPresentCount: brandField,
  };
}

// ── Completeness (10 pts) — programmatic ────────────────────
// "Do you have the attributes you should?"

function scoreCompleteness(r: AggregateRates, profile: CategoryProfile): CategoryScore {
  // Required ACP fields: 7 pts
  const reqScore = roundScore(7 * r.avgRequiredFieldCoverage);
  const topMissingReq = r.topMissingRequired.slice(0, 5)
    .map(m => `${m.field} (${fraction(m.count, r.n)})`).join(", ");
  const reqDetail: CheckDetail = {
    name: "Required field coverage",
    passed: reqScore,
    total: 7,
    description: `${pct(r.avgRequiredFieldCoverage)} of ACP required fields populated across the catalog.${topMissingReq ? ` Most commonly missing: ${topMissingReq}.` : " All required fields well populated."}`,
  };

  // Category-relevant fields: 3 pts
  const expScore = roundScore(3 * r.avgExpectedFieldCoverage);
  const topMissingExp = r.topMissingExpected.slice(0, 3)
    .map(m => m.field).join(", ");
  const expDetail: CheckDetail = {
    name: `${profile.vertical} attribute coverage`,
    passed: expScore,
    total: 3,
    description: `${pct(r.avgExpectedFieldCoverage)} of ${profile.vertical}-relevant attributes populated.${topMissingExp ? ` Missing: ${topMissingExp}.` : ""}`,
  };

  return {
    name: "Completeness",
    score: roundScore(reqScore + expScore),
    maxScore: 10,
    details: [reqDetail, expDetail],
    llmPowered: false,
  };
}

// ── Media (10 pts) — programmatic ───────────────────────────
// "Do you have pictures? What's the count?"

function scoreMedia(r: AggregateRates): CategoryScore {
  // Primary image: 4 pts
  const primaryScore = roundScore(4 * r.primaryImageRate);
  const primaryDetail: CheckDetail = {
    name: "Primary image",
    passed: primaryScore,
    total: 4,
    description: `${fraction(r.primaryImageCount, r.n)} products have a primary image (${pct(r.primaryImageRate)}).`,
  };

  // Additional images: 4 pts (full score at avg ≥3 additional images)
  const additionalScore = roundScore(Math.min(4, (r.avgAdditionalImages / 3) * 4));
  const additionalDetail: CheckDetail = {
    name: "Additional images",
    passed: additionalScore,
    total: 4,
    description: `Average of ${r.avgAdditionalImages.toFixed(1)} additional images per product. Aim for 3+ per product for optimal AI agent display.`,
  };

  // Video: 2 pts
  const videoScore = roundScore(2 * r.videoRate);
  const videoDetail: CheckDetail = {
    name: "Video content",
    passed: videoScore,
    total: 2,
    description: `${fraction(r.videoCount, r.n)} products have video (${pct(r.videoRate)}). Video enriches the shopping experience.`,
  };

  return {
    name: "Media",
    score: roundScore(primaryScore + additionalScore + videoScore),
    maxScore: 10,
    details: [primaryDetail, additionalDetail, videoDetail],
    llmPowered: false,
  };
}

// ── Data Quality (60 pts) — from LLM ────────────────────────

function scoreDataQualityFromLLM(llm: LLMAnalysis): CategoryScore {
  const dq = llm.dataQuality;
  return {
    name: "Data Quality",
    score: roundScore(
      dq.titleQuality.score +
      dq.descriptionQuality.score +
      dq.attributeRichness.score +
      dq.pricingClarity.score +
      dq.qaQuality.score
    ),
    maxScore: 60,
    details: [
      { name: "Description quality", passed: dq.descriptionQuality.score, total: 30, description: dq.descriptionQuality.finding },
      { name: "Q&A quality", passed: dq.qaQuality.score, total: 15, description: dq.qaQuality.finding },
      { name: "Title quality", passed: dq.titleQuality.score, total: 8, description: dq.titleQuality.finding },
      { name: "Attribute richness", passed: dq.attributeRichness.score, total: 5, description: dq.attributeRichness.finding },
      { name: "Pricing clarity", passed: dq.pricingClarity.score, total: 2, description: dq.pricingClarity.finding },
    ],
    llmPowered: true,
  };
}

// ── Trust Signals (20 pts) — from LLM ───────────────────────

function scoreTrustSignalsFromLLM(llm: LLMAnalysis): CategoryScore {
  const ts = llm.trustSignals;
  return {
    name: "Trust Signals",
    score: roundScore(
      ts.brandCredibility.score +
      ts.reviewQuality.score +
      ts.returnsFulfillmentQuality.score
    ),
    maxScore: 20,
    details: [
      { name: "Brand credibility", passed: ts.brandCredibility.score, total: 6, description: ts.brandCredibility.finding },
      { name: "Review quality", passed: ts.reviewQuality.score, total: 8, description: ts.reviewQuality.finding },
      { name: "Returns & fulfillment quality", passed: ts.returnsFulfillmentQuality.score, total: 6, description: ts.returnsFulfillmentQuality.finding },
    ],
    llmPowered: true,
  };
}

// ── Recommendations ─────────────────────────────────────────

function buildRecommendations(
  r: AggregateRates,
  llm: LLMAnalysis,
  profile: CategoryProfile
): Recommendation[] {
  const recs: Recommendation[] = [];
  const n = r.n;
  const dq = llm.dataQuality;
  const ts = llm.trustSignals;

  // Data quality issues (LLM-driven)
  if (dq.descriptionQuality.score < 12) {
    recs.push({
      title: "Improve description quality",
      description: dq.descriptionQuality.finding,
      impact: 90,
      category: "Data Quality",
    });
  }

  if (dq.attributeRichness.score < 7) {
    recs.push({
      title: "Add structured attributes",
      description: dq.attributeRichness.finding,
      impact: 80,
      category: "Data Quality",
    });
  }

  if (dq.titleQuality.score < 7) {
    recs.push({
      title: "Improve title specificity",
      description: dq.titleQuality.finding,
      impact: 75,
      category: "Data Quality",
    });
  }

  // Trust signal issues (LLM-driven)
  if (ts.reviewQuality.score < 4) {
    recs.push({
      title: "Add review data",
      description: ts.reviewQuality.finding,
      impact: 85,
      category: "Trust Signals",
    });
  }

  if (ts.returnsFulfillmentQuality.score < 3) {
    recs.push({
      title: "Improve returns & shipping content",
      description: ts.returnsFulfillmentQuality.finding,
      impact: 65,
      category: "Trust Signals",
    });
  }

  if (ts.brandCredibility.score < 3) {
    recs.push({
      title: "Strengthen brand data",
      description: ts.brandCredibility.finding,
      impact: 55,
      category: "Trust Signals",
    });
  }

  // Completeness issues (programmatic)
  if (r.avgRequiredFieldCoverage < 0.9) {
    const topMissing = r.topMissingRequired.slice(0, 5).map(m => m.field).join(", ");
    recs.push({
      title: "Fill required ACP fields",
      description: `Required field coverage is ${pct(r.avgRequiredFieldCoverage)}. Most commonly missing: ${topMissing}. ACP requires these fields for full compatibility.`,
      impact: 70,
      category: "Completeness",
    });
  }

  if (r.avgExpectedFieldCoverage < 0.5) {
    const topMissing = r.topMissingExpected.slice(0, 5).map(m => m.field).join(", ");
    recs.push({
      title: `Add ${profile.vertical}-relevant attributes`,
      description: `Only ${pct(r.avgExpectedFieldCoverage)} of category-relevant attributes are populated. Missing: ${topMissing}.`,
      impact: 50,
      category: "Completeness",
    });
  }

  // Media issues (programmatic)
  if (r.primaryImageRate < 0.95) {
    recs.push({
      title: "Add primary images",
      description: `${fraction(r.primaryImageCount, n)} products have a primary image. Images are essential for AI agents to display products.`,
      impact: 60,
      category: "Media",
    });
  }

  if (r.avgAdditionalImages < 2) {
    recs.push({
      title: "Add more product images",
      description: `Average of ${r.avgAdditionalImages.toFixed(1)} additional images per product. Aim for 3+ to improve AI agent presentation quality.`,
      impact: 35,
      category: "Media",
    });
  }

  if (r.videoRate < 0.05) {
    recs.push({
      title: "Add product videos",
      description: `Only ${fraction(r.videoCount, n)} products have video. Video significantly enriches the AI shopping experience.`,
      impact: 25,
      category: "Media",
    });
  }

  recs.sort((a, b) => b.impact - a.impact);
  return recs.slice(0, 8);
}

// ── Public API ───────────────────────────────────────────────

export function computeCatalogScore(
  metrics: ProductMetrics[],
  profile: CategoryProfile,
  products: Product[],
  llm: LLMAnalysis
): {
  catalogMetrics: CatalogMetrics;
  categories: CategoryScore[];
  recommendations: Recommendation[];
  overallScore: number;
} {
  console.log("[Catalog] Computing catalog score for", metrics.length, "products, vertical:", profile.vertical);

  const r = computeRates(metrics, products);

  const completeness = scoreCompleteness(r, profile);
  const media = scoreMedia(r);
  const dataQuality = scoreDataQualityFromLLM(llm);
  const trustSignals = scoreTrustSignalsFromLLM(llm);

  // Order: most impactful first
  const categories = [dataQuality, trustSignals, completeness, media];

  const overallScore = Math.round(categories.reduce((s, c) => s + c.score, 0));
  const recommendations = buildRecommendations(r, llm, profile);

  const fieldCoverageRates: Record<string, number> = {
    title: r.avgRequiredFieldCoverage, // approximate
    image_url: r.primaryImageRate,
    reviews: r.reviewPresentRate,
    description: r.descPresentRate,
    shipping_details: r.shippingPresentRate,
    return_policy: r.returnPolicyRate,
    brand: r.brandFieldPresentRate,
  };

  const indexed = metrics.map((m, i) => ({
    index: i,
    title: products[i]?.title || "(no title)",
    score: m.productScore,
  }));
  indexed.sort((a, b) => a.score - b.score);
  const worst10 = indexed.slice(0, 10);

  const catalogMetrics: CatalogMetrics = {
    totalProducts: metrics.length,
    vertical: profile.vertical,
    fieldCoverageRates,
    qualityDistribution: {
      none: metrics.filter(m => m.description.qualityTier === "none").length,
      poor: metrics.filter(m => m.description.qualityTier === "poor").length,
      fair: metrics.filter(m => m.description.qualityTier === "fair").length,
      good: metrics.filter(m => m.description.qualityTier === "good").length,
      excellent: metrics.filter(m => m.description.qualityTier === "excellent").length,
    },
    worst10,
  };

  console.log("[Catalog] Overall score:", overallScore, "/ 100");

  return { catalogMetrics, categories, recommendations, overallScore };
}
