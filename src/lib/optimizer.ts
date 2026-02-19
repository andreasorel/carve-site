import Anthropic from "@anthropic-ai/sdk";
import { Product, QAPair, CategoryScore, Recommendation } from "./types";
import { ScrapedProductData } from "./scraper";

export interface AnalysisContext {
  categories: CategoryScore[];
  recommendations: Recommendation[];
}

// Optional — only enriched when the analysis says they're relevant
const OPTIONAL_FIELDS = [
  "condition",
  "material",
  "dimensions",
  "weight",
  "size",
  "age_group",
  "gender",
] as const;

type OptionalField = (typeof OPTIONAL_FIELDS)[number];

/**
 * Determine which optional fields to enrich based on:
 * 1. Fields missing in >30% of the products being optimized
 * 2. Fields explicitly mentioned in analysis recommendations or completeness findings
 */
function selectOptionalFields(
  products: Product[],
  analysisContext?: AnalysisContext
): OptionalField[] {
  const relevant = new Set<OptionalField>();

  // 1. Fields empty in >30% of the sample → worth enriching
  for (const field of OPTIONAL_FIELDS) {
    const missingCount = products.filter((p) => {
      const val = p[field as keyof Product];
      return !val || (typeof val === "string" && !val.trim());
    }).length;
    if (missingCount > products.length * 0.3) {
      relevant.add(field);
    }
  }

  if (analysisContext) {
    // 2. Recommendations that mention specific fields
    for (const rec of analysisContext.recommendations) {
      const text = `${rec.title} ${rec.description}`.toLowerCase();
      for (const field of OPTIONAL_FIELDS) {
        const readable = field.replace("_", " "); // e.g. "age_group" → "age group"
        if (text.includes(field) || text.includes(readable)) {
          relevant.add(field);
        }
      }
    }

    // 3. Completeness category details — mentions missing expected fields
    const completeness = analysisContext.categories.find((c) => c.name === "Completeness");
    if (completeness) {
      for (const detail of completeness.details) {
        const text = detail.description.toLowerCase();
        for (const field of OPTIONAL_FIELDS) {
          const readable = field.replace("_", " ");
          if (text.includes(field) || text.includes(readable)) {
            relevant.add(field);
          }
        }
      }
    }
  }

  return Array.from(relevant);
}

/**
 * Extract the first complete JSON array from a string.
 */
function extractJsonArray(text: string): unknown | null {
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        let slice = text.slice(start, i + 1);
        slice = slice.replace(/,\s*([}\]])/g, "$1");
        try { return JSON.parse(slice); } catch { return null; }
      }
    }
  }
  return null;
}

function buildProductBlock(
  product: Product,
  optionalFields: OptionalField[],
  scraped?: ScrapedProductData
): string {
  const parts: string[] = [];

  parts.push(`item_id: ${product.item_id}`);
  parts.push(`Title: ${product.title}`);
  parts.push(`Brand: ${product.brand || "(unknown)"}`);
  parts.push(`Price: ${product.price || "(unknown)"}${product.sale_price ? ` (sale: ${product.sale_price})` : ""}`);
  parts.push(`Availability: ${product.availability || "(unknown)"}`);
  if (product.category) parts.push(`Category: ${product.category}`);

  // Current description
  parts.push(`Current description: ${product.description || "(empty)"}`);

  // Current Q&A
  if (product.q_and_a?.length > 0) {
    parts.push(`Current Q&A (${product.q_and_a.length} pairs): ${JSON.stringify(product.q_and_a)}`);
  } else {
    parts.push(`Current Q&A: (none)`);
  }

  // Only show optional fields that are relevant
  if (optionalFields.length > 0) {
    const currentOptional: Record<string, string> = {};
    for (const field of optionalFields) {
      const val = product[field as keyof Product];
      currentOptional[field] = (val && typeof val === "string") ? val.trim() : "";
    }
    parts.push(`Current optional fields to enrich:\n${JSON.stringify(currentOptional, null, 2)}`);
  }

  if (product.reviews) {
    parts.push(`Aggregate rating: ${product.reviews.rating}/5 (${product.reviews.count} reviews)`);
  }

  if (scraped) {
    if (scraped.pageText) {
      parts.push(`=== SCRAPED PAGE CONTENT (source of truth for material/ingredients and physical attributes) ===\n${scraped.pageText}`);
    } else {
      parts.push(`=== SCRAPED PAGE CONTENT: (not available — leave material empty) ===`);
    }
    if (scraped.reviewItems.length > 0) {
      parts.push(
        `=== CUSTOMER REVIEWS ===\n${scraped.reviewItems
          .map((r, i) => `${i + 1}. ${r.title ? r.title + ": " : ""}${r.content}${r.rating ? ` (${r.rating}/5)` : ""}`)
          .join("\n")}`
      );
    }
  } else {
    parts.push(`=== SCRAPED PAGE CONTENT: (not available — leave material empty) ===`);
  }

  return parts.join("\n\n");
}

/**
 * Descriptions of optional fields to include in the system prompt.
 */
const OPTIONAL_FIELD_DESCRIPTIONS: Record<OptionalField, string> = {
  condition: '"condition": new | refurbished | used. Default "new" for standard retail.',
  material: '"material": Ingredients or materials VERBATIM from the scraped page content of this specific product (e.g. "100% organic cotton", "Water, Sugar, Natural Flavors"). ONLY populate if you can find the exact text on the scraped page. Do not infer, estimate, or use general knowledge. Leave empty if not explicitly stated on the page.',
  dimensions: '"dimensions": structured string (e.g. "12 x 8 x 5 in"). Only if stated on page.',
  weight: '"weight": with unit (e.g. "250 g", "1.5 lb"). Only if stated on page.',
  size: '"size": size info if present (e.g. "M", "42 EU", "One Size"). Max 50 chars.',
  age_group: '"age_group": newborn | infant | toddler | kids | adult. Infer from context — default "adult".',
  gender: '"gender": male | female | unisex. Infer from context — default "unisex".',
};

function buildSystemPrompt(optionalFields: OptionalField[]): string {
  const optionalSection =
    optionalFields.length > 0
      ? `\n3. RELEVANT OPTIONAL FIELDS — only fill what's listed here, only if you can source facts from the page:\n${optionalFields.map((f) => `   ${OPTIONAL_FIELD_DESCRIPTIONS[f]}`).join("\n")}`
      : "";

  return `You are fixing product data for the OpenAI Agentic Commerce Protocol (ACP) scoring model.

LANGUAGE RULE (non-negotiable): Detect the language used in the original product title and description. Write ALL output fields — description, Q&A questions, Q&A answers, and every other field — in that exact same language. Never translate to English or any other language.

Enrich in this priority order:

1. DESCRIPTION (highest priority — 30 pts in scoring)
   Target: 400-2000 chars. Must include:
   - What the product IS and what it's FOR
   - Key features, materials, construction, specs
   - Who it's ideal for and use cases
   - Sizing guidance or compatibility notes if available
   - Care instructions
   Write in the brand's voice. Not generic catalog copy. Use scraped page content as source material.
   Thin input + rich scraped content = 600+ char output. This is the most important field.

2. Q&A (second priority — 15 pts in scoring)
   Generate 4-6 Q&A pairs as [{"q":"...","a":"..."}].
   Questions must address real buyer concerns: materials, sizing, compatibility, care, returns, value.
   Answers: 2-4 sentences, grounded in product data, scraped content, store context, and reviews.
   No invented facts. No evasive or generic answers.${optionalSection}

RULES:
- LANGUAGE: Match the language of the original product data in every field. Do not translate.
- MATERIAL/INGREDIENTS: Must be copied verbatim from the scraped page content of this specific product. If scraped page content is unavailable or does not contain material/ingredient information, leave the field empty. Never infer or use general knowledge.
- Every other fact must come from scraped page content, existing fields, store context, or reviews. Never invent.
- Empty string "" for any optional field you cannot source facts for.
- The description MUST be substantially richer than the input.

Return JSON array with one object per product:
[{"item_id":"...","description":"...","q_and_a":[...]${optionalFields.length > 0 ? `,"${optionalFields.join('":"...","')}":"..."` : ""}}]
Return ONLY valid JSON. No markdown fences, no explanation.`;
}

function buildAnalysisContextBlock(ctx: AnalysisContext): string {
  const lines: string[] = ["=== ANALYSIS FINDINGS (target these weaknesses) ==="];

  for (const category of ctx.categories) {
    const pct = Math.round((category.score / category.maxScore) * 100);
    lines.push(`\n${category.name}: ${category.score}/${category.maxScore} (${pct}%)`);
    for (const detail of category.details) {
      const detailPct = Math.round((detail.passed / detail.total) * 100);
      lines.push(`  • ${detail.name}: ${detail.passed}/${detail.total} (${detailPct}%) — ${detail.description}`);
    }
  }

  if (ctx.recommendations.length > 0) {
    lines.push("\nTop recommendations:");
    ctx.recommendations.slice(0, 5).forEach((rec, i) => {
      lines.push(`  ${i + 1}. [${rec.category}] ${rec.title}: ${rec.description}`);
    });
  }

  return lines.join("\n");
}

function buildUserPrompt(
  productBlocks: string[],
  storeContext?: string,
  analysisContext?: AnalysisContext
): string {
  const sections: string[] = [];

  if (analysisContext) {
    sections.push(buildAnalysisContextBlock(analysisContext));
  }

  if (storeContext) {
    sections.push(`=== STORE CONTEXT (use in Q&A and descriptions) ===\n${storeContext}`);
  }

  sections.push(
    `Enrich these products, prioritizing the weaknesses identified above:\n\n${productBlocks
      .map((block, i) => `--- Product ${i + 1} ---\n${block}`)
      .join("\n\n")}`
  );

  return sections.join("\n\n");
}

/** Optimize a batch of products guided by analysis findings */
export async function optimizeBatch(
  products: Product[],
  storeContext?: string,
  scrapedMap?: Map<string, ScrapedProductData>,
  analysisContext?: AnalysisContext
): Promise<Product[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CARVE_ANTHROPIC_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  // Determine which optional fields to enrich based on the analysis
  const optionalFields = selectOptionalFields(products, analysisContext);
  console.log("[Optimizer] Enriching fields:", ["description", "q_and_a", ...optionalFields].join(", "));

  const systemPrompt = buildSystemPrompt(optionalFields);
  const productBlocks = products.map((p) =>
    buildProductBlock(p, optionalFields, scrapedMap?.get(p.item_id))
  );

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: buildUserPrompt(productBlocks, storeContext, analysisContext) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM returned no text response");
  }

  const optimizedRaw = extractJsonArray(textBlock.text);
  if (!optimizedRaw || !Array.isArray(optimizedRaw)) {
    throw new Error("LLM optimization response could not be parsed. Please try again.");
  }
  const optimized = optimizedRaw as Array<{ item_id: string } & Partial<Record<string, unknown>>>;

  const optimizedMap = new Map(optimized.map((o) => [o.item_id, o]));
  return products.map((original) => {
    const improved = optimizedMap.get(original.item_id);
    if (!improved) return original;

    const merged = { ...original };

    // Always apply description
    if (improved.description && typeof improved.description === "string" && improved.description.trim()) {
      merged.description = improved.description.trim();
    }

    // Always apply Q&A
    const qaVal = improved.q_and_a;
    if (qaVal) {
      let parsed: QAPair[] = [];
      if (typeof qaVal === "string") {
        try { parsed = JSON.parse(qaVal) as QAPair[]; } catch { /* ignore */ }
      } else if (Array.isArray(qaVal)) {
        parsed = qaVal as QAPair[];
      }
      if (parsed.length > 0) merged.q_and_a = parsed;
    }

    // Only apply the optional fields that were selected
    for (const field of optionalFields) {
      const val = improved[field];
      if (val && typeof val === "string" && val.trim()) {
        (merged as Record<string, unknown>)[field] = val.trim();
      }
    }

    // Never overwrite scraped reviews
    merged.reviews = original.reviews;
    merged.review_list = original.review_list;
    return merged;
  });
}
