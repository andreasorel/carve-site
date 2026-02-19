import { Product, AnalysisResult } from "./types";
import { detectVertical } from "./category-detector";
import { scoreAllProducts } from "./product-scorer";
import { computeCatalogScore } from "./catalog-scorer";
import { analyzeSampleWithLLM } from "./llm-analyzer";

// ─── Scoring Philosophy ──────────────────────────────────────
//
//  Scoring weights:
//    Data Quality      (50 pts) — LLM-evaluated content quality
//    Trust Signals     (20 pts) — LLM-evaluated brand, reviews, returns/fulfillment
//    Completeness      (20 pts) — Programmatic: do the fields exist?
//    Media             (10 pts) — Programmatic: images & video presence
//                                 ─────────
//                       Total:    100 pts

// ─── Grading ─────────────────────────────────────────────────

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}

function getSummary(
  score: number,
  count: number,
  vertical: string,
  biggestGap: string
): string {
  const base = `Analyzed ${count} ${vertical} products.${biggestGap ? ` Biggest gap: ${biggestGap}.` : ""}`;

  if (score >= 80) return `${base} Your product data is strong. AI agents can confidently surface and recommend your products.`;
  if (score >= 60) return `${base} Your data has a solid foundation but quality gaps are limiting your AI agent ranking potential.`;
  if (score >= 40) return `${base} Significant data quality gaps mean AI agents will likely prefer competitors with richer product data.`;
  return `${base} Your product data needs major improvements. AI agents cannot effectively surface or recommend your products in their current state.`;
}

// ─── Main entry ──────────────────────────────────────────────

export async function analyzeProducts(
  products: Product[],
  feedUrl: string,
  feedType: string
): Promise<AnalysisResult> {
  // 1. Detect vertical (LLM call)
  const profile = await detectVertical(products);

  // 2. LLM evaluates data quality and trust signal content (50 + 20 pts)
  const llmAnalysis = await analyzeSampleWithLLM(products);

  // 3. Score all products deterministically for programmatic metrics
  const perProductMetrics = scoreAllProducts(products, profile);

  // 4. Aggregate: LLM scores + programmatic completeness & media scores
  const { catalogMetrics, categories, recommendations, overallScore } =
    computeCatalogScore(perProductMetrics, profile, products, llmAnalysis);

  // 5. Build summary
  const grade = getGrade(overallScore);
  const biggestGap = recommendations[0]?.title || "";
  const summary = getSummary(overallScore, products.length, profile.vertical, biggestGap);

  return {
    overallScore,
    grade,
    categories,
    recommendations,
    summary,
    productCount: products.length,
    feedUrl,
    feedType,
    llmPowered: true,
    catalogMetrics,
    perProductMetrics,
    vertical: profile.vertical,
  };
}
