import { Product } from "./types";
import { scrapeStoreContext, scrapeProductPages, StoreContext, ScrapedProductData } from "./scraper";
import { optimizeBatch, AnalysisContext } from "./optimizer";

// ─── Types ───────────────────────────────────────────────────

export interface EnrichmentProgress {
  type: "phase" | "progress" | "complete" | "error";
  phase?: string;
  phaseLabel?: string;
  batch?: number;
  total?: number;
  products?: Product[];
  count?: number;
  error?: string;
}

// ─── Merge helpers ───────────────────────────────────────────

/** Only fills empty fields — never overwrites existing data */
export function mergeScrapedData(
  product: Product,
  scraped: ScrapedProductData | undefined,
  storeContext: StoreContext
): Product {
  const merged = { ...product };

  // Store-level fields (lowest priority — only fill if empty)
  if (!merged.shipping_details && storeContext.shipping_details) {
    merged.shipping_details = storeContext.shipping_details.slice(0, 500);
  }
  if (!merged.return_policy && storeContext.return_policy) {
    merged.return_policy = storeContext.return_policy.slice(0, 500);
  }
  if (!merged.seller_name && storeContext.seller_name) {
    merged.seller_name = storeContext.seller_name;
  }
  if (!merged.store_country && storeContext.store_country) {
    merged.store_country = storeContext.store_country;
  }
  if ((!merged.target_countries || merged.target_countries.length === 0) && storeContext.target_countries.length > 0) {
    merged.target_countries = storeContext.target_countries;
  }

  // Scraped product data (higher priority than store context, lower than existing)
  if (scraped) {
    if (!merged.reviews && scraped.reviews) {
      merged.reviews = scraped.reviews;
    }
    if ((!merged.additional_images || merged.additional_images.length === 0) && scraped.additional_images.length > 0) {
      merged.additional_images = scraped.additional_images;
    }
    if (!merged.video_url && scraped.video_url) {
      merged.video_url = scraped.video_url;
    }
    if ((!merged.q_and_a || merged.q_and_a.length === 0) && scraped.q_and_a.length > 0) {
      merged.q_and_a = scraped.q_and_a;
    }
    if (scraped.reviewItems.length > 0) {
      merged.review_list = scraped.reviewItems;
    }
    if (!merged.age_group && scraped.age_group) {
      merged.age_group = scraped.age_group;
    }
    if (!merged.gender && scraped.gender) {
      merged.gender = scraped.gender;
    }
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
  }

  // Populate review_count and star_rating from ReviewData
  if (merged.reviews && !merged.review_count) {
    merged.review_count = merged.reviews.count;
  }
  if (merged.reviews && !merged.star_rating) {
    merged.star_rating = String(merged.reviews.rating);
  }

  // Infer condition from title/description if still empty
  if (!merged.condition) {
    merged.condition = inferCondition(merged);
  }

  return merged;
}

/** Check title/description for condition signals */
export function inferCondition(product: Product): string {
  const text = `${product.title} ${product.description}`.toLowerCase();
  if (text.includes("refurbished") || text.includes("renewed")) return "refurbished";
  if (text.includes("pre-owned") || text.includes("pre owned")) return "used";
  if (text.includes("used")) return "used";
  return "new";
}

// ─── Pipeline ────────────────────────────────────────────────

const LLM_BATCH_SIZE = 3;

export async function* enrichProducts(
  products: Product[],
  baseUrl: string,
  analysisContext?: AnalysisContext
): AsyncGenerator<EnrichmentProgress> {
  let enrichedProducts = [...products];
  let storeContext: StoreContext = {
    shipping_details: "",
    return_policy: "",
    seller_name: "",
    store_country: "",
    target_countries: [],
  };

  // ── Phase 0: Store Context ─────────────────────────────────
  yield {
    type: "phase",
    phase: "store-context",
    phaseLabel: "Analyzing store policies...",
  };

  try {
    storeContext = await scrapeStoreContext(baseUrl);
    console.log(
      `[Enrichment] Store context: country=${storeContext.store_country}, ` +
      `targets=${storeContext.target_countries.join(",")}, ` +
      `shipping=${storeContext.shipping_details.length}chars, ` +
      `returns=${storeContext.return_policy.length}chars`
    );
  } catch (err) {
    console.warn("[Enrichment] Phase 0 (store context) failed:", err);
  }

  // ── Phase 1: Product Page Scraping ─────────────────────────
  yield {
    type: "phase",
    phase: "scraping",
    phaseLabel: "Scraping product pages...",
  };

  let scrapedMap = new Map<string, ScrapedProductData>();
  try {
    scrapedMap = await scrapeProductPages(products, 10);
    console.log(`[Enrichment] Scraped ${scrapedMap.size}/${products.length} product pages`);
  } catch (err) {
    console.warn("[Enrichment] Phase 1 (product scraping) failed:", err);
  }

  // Merge scraped data + store context into products
  enrichedProducts = enrichedProducts.map((product) =>
    mergeScrapedData(product, scrapedMap.get(product.item_id), storeContext)
  );

  // ── Phase 2: LLM Enrichment ────────────────────────────────
  yield {
    type: "phase",
    phase: "llm-enrichment",
    phaseLabel: "Enriching with AI...",
  };

  // Build store context string for the LLM
  const storeContextStr = [
    storeContext.seller_name && `Store: ${storeContext.seller_name}`,
    storeContext.store_country && `Country: ${storeContext.store_country}`,
    storeContext.shipping_details && `Shipping: ${storeContext.shipping_details.slice(0, 1000)}`,
    storeContext.return_policy && `Returns: ${storeContext.return_policy.slice(0, 1000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const totalBatches = Math.ceil(enrichedProducts.length / LLM_BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = enrichedProducts.slice(
      i * LLM_BATCH_SIZE,
      (i + 1) * LLM_BATCH_SIZE
    );

    console.log(
      `[Enrichment] LLM batch ${i + 1}/${totalBatches} (${batch.length} products)`
    );

    try {
      const optimized = await optimizeBatch(batch, storeContextStr || undefined, scrapedMap, analysisContext);

      // Replace the batch slice in enrichedProducts
      for (let j = 0; j < optimized.length; j++) {
        enrichedProducts[i * LLM_BATCH_SIZE + j] = optimized[j];
      }

      yield {
        type: "progress",
        batch: i + 1,
        total: totalBatches,
        products: optimized,
      };
    } catch (err) {
      console.warn(`[Enrichment] LLM batch ${i + 1} failed:`, err);
      // Return original products for this batch unmodified
      yield {
        type: "progress",
        batch: i + 1,
        total: totalBatches,
        products: batch,
      };
    }
  }

  yield {
    type: "complete",
    count: enrichedProducts.length,
  };
}
