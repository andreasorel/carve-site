import Anthropic from "@anthropic-ai/sdk";
import { Product, LLMAnalysis } from "./types";

/**
 * Extract the first complete JSON object from a string,
 * ignoring any surrounding text the LLM may have added.
 */
function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
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
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        let slice = text.slice(start, i + 1);
        slice = slice.replace(/,\s*([}\]])/g, "$1");
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function sampleProducts(products: Product[], count: number): Product[] {
  if (products.length <= count) return products;
  const sampled: Product[] = [];
  const step = products.length / count;
  for (let i = 0; i < count; i++) {
    sampled.push(products[Math.floor(i * step)]);
  }
  return sampled;
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen) + "...";
}

function strip(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function formatProduct(p: Product, i: number): string {
  const lines = [`--- Product ${i + 1} ---`];
  lines.push(`Title: ${truncate(p.title || "(missing)", 150)}`);
  lines.push(`Brand: ${p.brand || "(missing)"}`);
  lines.push(`Price: ${p.price || "(missing)"}${p.sale_price ? ` | Sale: ${p.sale_price}` : ""}`);
  lines.push(`Availability: ${p.availability || "(missing)"}`);
  lines.push(`Description: ${truncate(strip(p.description || ""), 600)}`);
  lines.push(`Reviews: ${p.reviews ? `${p.reviews.rating}/5 from ${p.reviews.count} reviews` : "(none)"}${p.review_list?.length ? ` | ${p.review_list.length} individual reviews` : ""}`);
  lines.push(`Brand field: ${p.brand || "(missing)"}`);
  lines.push(`Seller: ${p.seller_name || "(missing)"}${p.seller_url ? ` (${p.seller_url})` : ""}`);
  lines.push(`Return policy: ${p.return_policy ? truncate(p.return_policy, 200) : "(missing)"}`);
  lines.push(`Shipping: ${p.shipping_details ? truncate(p.shipping_details, 200) : "(missing)"}`);
  lines.push(`Images: primary=${p.image_url ? "yes" : "no"}, additional=${p.additional_images?.length || 0}${p.video_url ? ", video=yes" : ""}`);
  if (p.material) lines.push(`Material: ${p.material}`);
  if (p.weight) lines.push(`Weight: ${p.weight}`);
  if (p.dimensions) lines.push(`Dimensions: ${p.dimensions}`);
  if (p.condition) lines.push(`Condition: ${p.condition}`);
  if (Object.keys(p.variant_dict || {}).length > 0) lines.push(`Variants: ${JSON.stringify(p.variant_dict)}`);
  if (p.size) lines.push(`Size: ${p.size}`);
  if (p.q_and_a?.length > 0) lines.push(`Q&A: ${p.q_and_a.length} pairs`);
  return lines.join("\n");
}

const PROMPT_TEMPLATE = (productBlock: string, sampleSize: number, totalSize: number) => `You are an expert evaluating product catalog data quality for AI commerce agents.

You are scoring ${sampleSize} products sampled from a catalog of ${totalSize}. Your job is to assess the ACTUAL QUALITY of the data content — not just whether fields exist, but whether the content is genuinely useful for an AI agent helping a buyer make a purchase decision.

Be brutally honest. Mediocre data = mediocre scores. Do not reward the mere presence of data.

${productBlock}

Score the catalog on TWO dimensions. Return ONLY valid JSON (no markdown, no backticks):

{
  "dataQuality": {
    "titleQuality": {
      "score": <0-8>,
      "maxScore": 8,
      "finding": "<2-3 sentences: Are titles descriptive and specific? Do they include brand, model, key specs? Or are they generic, keyword-stuffed, truncated, or missing key identifiers that a buyer would search for?>"
    },
    "descriptionQuality": {
      "score": <0-30>,
      "maxScore": 30,
      "finding": "<3-4 sentences: Are descriptions genuinely informative with specs, materials, use cases, and dimensions? Or are they thin marketing copy, boilerplate, or just repeating the title? Would a buyer learn something meaningful from reading them? Score harshly — thin or vague descriptions should score below 15.>"
    },
    "attributeRichness": {
      "score": <0-5>,
      "maxScore": 5,
      "finding": "<2 sentences: Can an AI agent extract structured facts — materials, dimensions, weight, compatibility, variants? Or are key purchase-decision attributes absent or buried in vague text?>"
    },
    "pricingClarity": {
      "score": <0-2>,
      "maxScore": 2,
      "finding": "<1 sentence: Is pricing clear with proper currency codes? Are sale prices present and correctly marked where applicable?>"
    },
    "qaQuality": {
      "score": <0-15>,
      "maxScore": 15,
      "finding": "<3-4 sentences: Are Q&A pairs present? Do the questions reflect real buyer concerns (sizing, compatibility, care, returns)? Are the answers specific, accurate, and genuinely helpful — or generic and evasive? No Q&A at all should score 0. Present but low-quality Q&A should score below 8.>"
    }
  },
  "trustSignals": {
    "brandCredibility": {
      "score": <0-6>,
      "maxScore": 6,
      "finding": "<1-2 sentences: Are brands clearly identified and legitimate? Consistent across the catalog? Or generic, missing, or placeholder values?>"
    },
    "reviewQuality": {
      "score": <0-8>,
      "maxScore": 8,
      "finding": "<2-3 sentences: Do products have meaningful review data — real ratings with review counts? Are individual reviews present? High review volume indicates a trusted seller. No reviews = major trust penalty.>"
    },
    "returnsFulfillmentQuality": {
      "score": <0-6>,
      "maxScore": 6,
      "finding": "<2-3 sentences: What is the quality of return policy and shipping information? Is it specific and actionable (e.g. '30-day free returns', '2-day delivery') or vague/missing? Good fulfillment data reduces buyer friction.>"
    }
  }
}`;

export async function analyzeSampleWithLLM(
  products: Product[]
): Promise<LLMAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CARVE_ANTHROPIC_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. An API key is required to analyze product data.");
  }

  const sample = sampleProducts(products, 10);
  const productBlock = sample.map((p, i) => formatProduct(p, i)).join("\n\n");
  const prompt = PROMPT_TEMPLATE(productBlock, sample.length, products.length);

  console.log("[LLM] Scoring data quality & trust signals for", sample.length, "sampled products from", products.length, "total");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM returned no text response");
  }

  console.log("[LLM] Response received, parsing JSON...");
  const raw = textBlock.text;
  const parsed = extractJson(raw) as LLMAnalysis;
  if (!parsed) {
    console.error("[LLM] Could not extract JSON. First 500 chars:", raw.slice(0, 500));
    throw new Error("LLM returned a response that could not be parsed as JSON. Please try again.");
  }

  // Validate structure
  const checks: { group: Record<string, unknown>; keys: string[] }[] = [
    {
      group: parsed.dataQuality as unknown as Record<string, unknown>,
      keys: ["titleQuality", "descriptionQuality", "attributeRichness", "pricingClarity", "qaQuality"],
    },
    {
      group: parsed.trustSignals as unknown as Record<string, unknown>,
      keys: ["brandCredibility", "reviewQuality", "returnsFulfillmentQuality"],
    },
  ];

  for (const { group, keys } of checks) {
    if (!group) throw new Error("LLM response missing expected scoring group");
    for (const key of keys) {
      const sub = group[key] as { score?: unknown; maxScore?: unknown; finding?: unknown } | undefined;
      if (typeof sub?.score !== "number" || typeof sub?.maxScore !== "number" || typeof sub?.finding !== "string") {
        throw new Error(`LLM response validation failed for field: ${key}`);
      }
    }
  }

  const llmTotal =
    parsed.dataQuality.titleQuality.score +
    parsed.dataQuality.descriptionQuality.score +
    parsed.dataQuality.attributeRichness.score +
    parsed.dataQuality.pricingClarity.score +
    parsed.dataQuality.qaQuality.score +
    parsed.trustSignals.brandCredibility.score +
    parsed.trustSignals.reviewQuality.score +
    parsed.trustSignals.returnsFulfillmentQuality.score;

  console.log("[LLM] Analysis complete — LLM score:", llmTotal, "/ 80");

  return parsed;
}
