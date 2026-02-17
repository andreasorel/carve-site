import Anthropic from "@anthropic-ai/sdk";
import type {
  NormalizedProduct,
  ScrapedProductData,
  EnrichmentProgress,
  StoreMeta,
  QAPair,
} from "./types";
import { scrapeProductPages } from "./scraper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 8192;
const BATCH_SIZE = 3;

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

/**
 * Robustly extract a JSON array from LLM output.
 * Finds the first `[`, tracks bracket depth, and extracts the complete array.
 */
function extractJsonArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        const jsonStr = text.slice(start, i + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Merge scraped data into a product (fill-only, never overwrite)
// ---------------------------------------------------------------------------

/**
 * Merge scraped page data and store-level metadata into a NormalizedProduct.
 * Only fills empty/missing fields -- never overwrites existing values.
 */
export function mergeScrapedData(
  product: NormalizedProduct,
  scraped: ScrapedProductData,
  storeMeta: StoreMeta,
): NormalizedProduct {
  const merged = { ...product };

  // Reviews -- only fill if product has no review data
  if (!merged.reviews && scraped.reviews) {
    merged.reviews = scraped.reviews;
    merged.starRating = merged.starRating ?? String(scraped.reviews.rating);
    merged.reviewCount = merged.reviewCount ?? scraped.reviews.count;
  }

  // Review list
  if (
    (!merged.reviewList || merged.reviewList.length === 0) &&
    scraped.reviewItems.length > 0
  ) {
    merged.reviewList = scraped.reviewItems;
  }

  // Additional images
  if (
    (!merged.additionalImageUrls || merged.additionalImageUrls.length === 0) &&
    scraped.additionalImages.length > 0
  ) {
    merged.additionalImageUrls = scraped.additionalImages;
  }

  // Video URL
  if (!merged.videoUrl && scraped.videoUrl) {
    merged.videoUrl = scraped.videoUrl;
  }

  // Q&A pairs
  if ((!merged.qAndA || merged.qAndA.length === 0) && scraped.qAndA.length > 0) {
    merged.qAndA = scraped.qAndA;
  }

  // Physical attributes
  if (!merged.condition && scraped.condition) {
    merged.condition = scraped.condition;
  }
  if (!merged.material && scraped.material) {
    merged.material = scraped.material;
  }
  if (!merged.weight && scraped.weight) {
    merged.weight = scraped.weight;
  }
  if (!merged.dimensions && scraped.dimensions) {
    merged.dimensions = scraped.dimensions;
  }

  // Demographics
  if (!merged.ageGroup && scraped.ageGroup) {
    merged.ageGroup = scraped.ageGroup;
  }
  if (!merged.gender && scraped.gender) {
    merged.gender = scraped.gender;
  }

  // Store-level context (fill only)
  if (!merged.shippingDetails && storeMeta.shippingDetails) {
    merged.shippingDetails = storeMeta.shippingDetails;
  }
  if (!merged.returnPolicy) {
    if (storeMeta.returnPolicyText) {
      merged.returnPolicy = storeMeta.returnPolicyText;
    } else if (storeMeta.returnPolicy) {
      merged.returnPolicy = storeMeta.returnPolicy;
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Condition inference (text-based heuristic)
// ---------------------------------------------------------------------------

const REFURB_PATTERNS = [
  /refurbish/i,
  /renewed/i,
  /recondition/i,
  /certified\s*pre[\s-]?owned/i,
  /factory\s*restored/i,
];

const USED_PATTERNS = [
  /\bused\b/i,
  /\bpre[\s-]?owned\b/i,
  /\bsecond[\s-]?hand\b/i,
  /\bvintage\b/i,
];

/**
 * Infer product condition from title and description text.
 * Returns "new", "refurbished", or "used".
 */
export function inferCondition(product: NormalizedProduct): string {
  const text = `${product.title ?? ""} ${product.description ?? ""}`;

  for (const pattern of REFURB_PATTERNS) {
    if (pattern.test(text)) return "refurbished";
  }

  for (const pattern of USED_PATTERNS) {
    if (pattern.test(text)) return "used";
  }

  return "new";
}

// ---------------------------------------------------------------------------
// LLM enrichment (batch)
// ---------------------------------------------------------------------------

/**
 * Build the system prompt for ACP product enrichment.
 */
function buildSystemPrompt(storeContext?: string): string {
  return `You are a product data specialist preparing items for the Amazon Compatibility Program (ACP).
Your job is to enrich product listings so they meet ACP requirements for completeness and quality.

RULES:
- Write comprehensive, factual product descriptions (target 500-2000 characters).
- Descriptions must highlight key features, materials, use cases, and specifications.
- Never fabricate specifications you cannot reasonably infer from the provided data.
- For condition: use exactly "new", "refurbished", or "used".
- For age_group: use exactly "newborn", "infant", "toddler", "kids", or "adult".
- For gender: use exactly "male", "female", or "unisex".
- Generate 3-5 Q&A pairs that a shopper would realistically ask. Base answers on the product data and store context provided.
- If you cannot determine a field with reasonable confidence, return an empty string for it.
- Never overwrite or modify review data -- leave it out of your response entirely.
${storeContext ? `\nSTORE CONTEXT (use for Q&A answers about shipping, returns, etc.):\n${storeContext}` : ""}

OUTPUT FORMAT:
Return a JSON array with one object per product:
[{"itemId":"...","description":"...","condition":"...","material":"...","dimensions":"...","weight":"...","size":"...","age_group":"...","gender":"...","q_and_a":[{"q":"...","a":"..."}]}]

Return ONLY the JSON array, no markdown fences, no commentary.`;
}

/**
 * Build user message content for a batch of products.
 */
function buildUserMessage(
  products: NormalizedProduct[],
  scrapedMap?: Map<string, ScrapedProductData>,
): string {
  const items = products.map((p) => {
    const id = p.itemId ?? p.productId ?? p.sku ?? p.title ?? "unknown";
    const scraped = scrapedMap?.get(id);

    const entry: Record<string, unknown> = {
      itemId: id,
      title: p.title ?? "",
      currentDescription: p.description ?? "",
      price: p.price ?? "",
      brand: p.brand ?? "",
      category: p.productType ?? p.category ?? "",
      condition: p.condition ?? "",
      material: p.material ?? "",
      weight: p.weight ?? "",
      dimensions: p.dimensions ?? "",
      size: p.size ?? "",
      ageGroup: p.ageGroup ?? "",
      gender: p.gender ?? "",
      tags: p.tags ?? [],
    };

    // Include scraped page text as grounding context
    if (scraped?.pageText) {
      entry.pageText = scraped.pageText.slice(0, 3000);
    }

    // Include existing reviews as context for Q&A generation
    if (p.reviewList && p.reviewList.length > 0) {
      entry.customerReviews = p.reviewList.slice(0, 5).map((r) => ({
        title: r.title,
        content: r.content.slice(0, 300),
        rating: r.rating,
      }));
    }

    // Include existing Q&A for context
    if (p.qAndA && p.qAndA.length > 0) {
      entry.existingQA = p.qAndA;
    }

    return entry;
  });

  return `Enrich the following ${items.length} product(s):\n\n${JSON.stringify(items, null, 2)}`;
}

/**
 * Call Claude Haiku to enrich a batch of products.
 * Merges LLM results back into the product objects.
 * Never overwrites existing review data.
 */
export async function optimizeBatch(
  products: NormalizedProduct[],
  storeContext?: string,
  scrapedMap?: Map<string, ScrapedProductData>,
): Promise<NormalizedProduct[]> {
  if (products.length === 0) return products;

  const client = new Anthropic();

  const systemPrompt = buildSystemPrompt(storeContext);
  const userMessage = buildUserMessage(products, scrapedMap);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    console.error("LLM enrichment call failed:", err);
    // Return products with heuristic condition inference as fallback
    return products.map((p) => ({
      ...p,
      condition: p.condition || inferCondition(p),
    }));
  }

  // Extract text from response
  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const enrichedArray = extractJsonArray(responseText);
  if (!enrichedArray) {
    console.error("Failed to parse LLM enrichment response");
    return products.map((p) => ({
      ...p,
      condition: p.condition || inferCondition(p),
    }));
  }

  // Build a lookup from itemId to enrichment data
  const enrichmentMap = new Map<string, Record<string, unknown>>();
  for (const item of enrichedArray) {
    if (typeof item === "object" && item !== null) {
      const record = item as Record<string, unknown>;
      const id = String(record.itemId ?? "");
      if (id) enrichmentMap.set(id, record);
    }
  }

  // Merge enrichment into products (fill-only for most fields)
  return products.map((p) => {
    const id = p.itemId ?? p.productId ?? p.sku ?? p.title ?? "unknown";
    const enrichment = enrichmentMap.get(id);
    if (!enrichment) {
      return { ...p, condition: p.condition || inferCondition(p) };
    }

    const enriched = { ...p };

    // Description: use LLM version if it is longer and more comprehensive
    const llmDescription = typeof enrichment.description === "string"
      ? enrichment.description.trim()
      : "";
    if (llmDescription.length > 0) {
      const currentLen = (enriched.description ?? "").length;
      // Prefer LLM description if current is short or missing
      if (currentLen < 200 || llmDescription.length > currentLen * 1.5) {
        enriched.description = llmDescription;
      }
    }

    // Condition: LLM or heuristic
    if (!enriched.condition) {
      const llmCondition = typeof enrichment.condition === "string"
        ? enrichment.condition.trim().toLowerCase()
        : "";
      enriched.condition = ["new", "refurbished", "used"].includes(llmCondition)
        ? llmCondition
        : inferCondition(p);
    }

    // Physical attributes -- fill only
    if (!enriched.material && typeof enrichment.material === "string" && enrichment.material.trim()) {
      enriched.material = enrichment.material.trim();
    }
    if (!enriched.dimensions && typeof enrichment.dimensions === "string" && enrichment.dimensions.trim()) {
      enriched.dimensions = enrichment.dimensions.trim();
    }
    if (!enriched.weight && typeof enrichment.weight === "string" && enrichment.weight.trim()) {
      enriched.weight = enrichment.weight.trim();
    }
    if (!enriched.size && typeof enrichment.size === "string" && enrichment.size.trim()) {
      enriched.size = enrichment.size.trim();
    }

    // Demographics -- fill only
    if (!enriched.ageGroup && typeof enrichment.age_group === "string" && enrichment.age_group.trim()) {
      enriched.ageGroup = enrichment.age_group.trim();
    }
    if (!enriched.gender && typeof enrichment.gender === "string" && enrichment.gender.trim()) {
      enriched.gender = enrichment.gender.trim();
    }

    // Q&A pairs -- merge, never overwrite existing
    if (Array.isArray(enrichment.q_and_a) && enrichment.q_and_a.length > 0) {
      const llmQA: QAPair[] = [];
      for (const pair of enrichment.q_and_a) {
        if (
          typeof pair === "object" &&
          pair !== null &&
          typeof (pair as Record<string, unknown>).q === "string" &&
          typeof (pair as Record<string, unknown>).a === "string"
        ) {
          const typed = pair as { q: string; a: string };
          if (typed.q.trim() && typed.a.trim()) {
            llmQA.push({ q: typed.q.trim(), a: typed.a.trim() });
          }
        }
      }

      if (llmQA.length > 0) {
        // Append to existing Q&A, avoiding duplicates by question text
        const existing = enriched.qAndA ?? [];
        const existingQuestions = new Set(
          existing.map((qa) => qa.q.toLowerCase().trim()),
        );
        const newPairs = llmQA.filter(
          (qa) => !existingQuestions.has(qa.q.toLowerCase().trim()),
        );
        enriched.qAndA = [...existing, ...newPairs];
      }
    }

    // Never touch reviews -- they come from scraped data only

    return enriched;
  });
}

// ---------------------------------------------------------------------------
// Build store context string for LLM prompt
// ---------------------------------------------------------------------------

function buildStoreContext(storeMeta: StoreMeta): string {
  const parts: string[] = [];

  if (storeMeta.sellerName) {
    parts.push(`Store: ${storeMeta.sellerName}`);
  }

  if (storeMeta.shippingDetails) {
    parts.push(`Shipping: ${storeMeta.shippingDetails.slice(0, 1000)}`);
  }

  if (storeMeta.returnPolicyText) {
    parts.push(`Return Policy: ${storeMeta.returnPolicyText.slice(0, 1000)}`);
  } else if (storeMeta.returnPolicy) {
    parts.push(`Return Policy URL: ${storeMeta.returnPolicy}`);
  }

  if (storeMeta.storeCountry) {
    parts.push(`Store Country: ${storeMeta.storeCountry}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Main enrichment pipeline (async generator)
// ---------------------------------------------------------------------------

/**
 * Streaming enrichment pipeline.
 *
 * Phase 1: Scrape individual product pages for structured data
 * Phase 2: Merge scraped data + store context into products
 * Phase 3: LLM enrichment in batches
 *
 * Yields EnrichmentProgress events for each phase/batch.
 */
export async function* enrichProducts(
  products: NormalizedProduct[],
  baseUrl: string,
  storeMeta: StoreMeta,
): AsyncGenerator<EnrichmentProgress> {
  const productCount = products.length;

  // ── Phase 1: Scrape product pages ──────────────────────────────────────

  yield {
    type: "phase",
    phase: "scraping",
    phaseLabel: `Scraping ${productCount} product page${productCount !== 1 ? "s" : ""} for structured data...`,
  };

  let scrapedMap: Map<string, ScrapedProductData>;
  try {
    // scrapeProductPages expects NormalizedProduct[] and handles URL filtering internally
    scrapedMap = await scrapeProductPages(products);
  } catch (err) {
    console.error("Product page scraping failed:", err);
    scrapedMap = new Map();
  }

  yield {
    type: "progress",
    phase: "scraping",
    batch: productCount,
    total: productCount,
  };

  // ── Phase 2: Merge scraped data + store context ────────────────────────

  yield {
    type: "phase",
    phase: "merging",
    phaseLabel: "Merging scraped data and store context...",
  };

  // scrapedMap is keyed by itemId || productId || sku || url (from scraper)
  // Use the same key logic to look up scraped data
  const enrichedProducts = products.map((p) => {
    const id = p.itemId ?? p.productId ?? p.sku ?? p.url ?? "";
    const scraped = scrapedMap.get(id);

    if (scraped) {
      return mergeScrapedData(p, scraped, storeMeta);
    }

    // Even without scraped data, apply store-level context
    const merged = { ...p };
    if (!merged.shippingDetails && storeMeta.shippingDetails) {
      merged.shippingDetails = storeMeta.shippingDetails;
    }
    if (!merged.returnPolicy) {
      if (storeMeta.returnPolicyText) {
        merged.returnPolicy = storeMeta.returnPolicyText;
      } else if (storeMeta.returnPolicy) {
        merged.returnPolicy = storeMeta.returnPolicy;
      }
    }
    return merged;
  });

  yield {
    type: "progress",
    phase: "merging",
    batch: productCount,
    total: productCount,
  };

  // ── Phase 3: LLM enrichment in batches ─────────────────────────────────

  const totalBatches = Math.ceil(enrichedProducts.length / BATCH_SIZE);

  yield {
    type: "phase",
    phase: "llm_enrichment",
    phaseLabel: `Enriching products with AI (${totalBatches} batch${totalBatches !== 1 ? "es" : ""})...`,
  };

  const storeContext = buildStoreContext(storeMeta);
  const finalProducts: NormalizedProduct[] = [];

  for (let i = 0; i < enrichedProducts.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const batch = enrichedProducts.slice(i, i + BATCH_SIZE);

    const enrichedBatch = await optimizeBatch(batch, storeContext, scrapedMap);
    finalProducts.push(...enrichedBatch);

    yield {
      type: "progress",
      phase: "llm_enrichment",
      batch: batchIndex,
      total: totalBatches,
    };
  }

  // ── Complete ───────────────────────────────────────────────────────────

  yield {
    type: "complete",
    products: finalProducts,
    count: finalProducts.length,
  };
}
