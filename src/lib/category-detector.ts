import Anthropic from "@anthropic-ai/sdk";
import {
  Product,
  ProductVertical,
  AttributeRelevance,
  CategoryProfile,
} from "./types";

// ── Attribute keys that are category-dependent ──────────────
const CATEGORY_AWARE_ATTRIBUTES = [
  "size",
  "material",
  "age_group",
  "gender",
  "dimensions",
  "weight",
  "condition",
  "video_url",
  "variant_dict",
  "q_and_a",
  "warning",
] as const;

// ── Hardcoded fallback profiles per vertical ────────────────
type RelevanceMap = Record<string, AttributeRelevance>;

function rel(expected: string[]): RelevanceMap {
  const map: RelevanceMap = {};
  for (const attr of CATEGORY_AWARE_ATTRIBUTES) {
    map[attr] = expected.includes(attr) ? "expected" : "not_applicable";
  }
  return map;
}

const FALLBACK_PROFILES: Record<ProductVertical, RelevanceMap> = {
  Apparel: rel(["size", "material", "age_group", "gender", "condition", "variant_dict"]),
  Electronics: rel(["dimensions", "weight", "condition", "video_url", "variant_dict", "warning"]),
  "Home & Garden": rel(["dimensions", "weight", "material", "condition"]),
  "Food & Beverage": rel(["weight", "warning", "age_group"]),
  "Beauty & Personal Care": rel(["weight", "age_group", "gender", "warning"]),
  "Sports & Outdoors": rel(["size", "material", "weight", "dimensions", "gender", "age_group"]),
  "Toys & Games": rel(["age_group", "dimensions", "weight", "warning"]),
  Health: rel(["weight", "warning", "age_group"]),
  Automotive: rel(["dimensions", "weight", "material", "condition", "variant_dict"]),
  "Books & Media": rel(["dimensions", "weight", "condition"]),
  "Jewelry & Accessories": rel(["material", "size", "gender", "condition", "weight"]),
  General: rel([...CATEGORY_AWARE_ATTRIBUTES]),
};

// ── Sampling ────────────────────────────────────────────────

function sampleProducts(products: Product[], count: number): Product[] {
  if (products.length <= count) return products;
  const sampled: Product[] = [];
  const step = products.length / count;
  for (let i = 0; i < count; i++) {
    sampled.push(products[Math.floor(i * step)]);
  }
  return sampled;
}

// ── JSON extraction (shared logic) ──────────────────────────

export function extractJson(text: string): unknown | null {
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

// ── LLM-based vertical detection ────────────────────────────

function buildPrompt(products: Product[]): string {
  const productLines = products.map((p, i) => {
    const desc = (p.description || "").replace(/<[^>]*>/g, "").trim().slice(0, 200);
    return `Product ${i + 1}:\n  Title: ${p.title}\n  Category: ${p.category || "(none)"}\n  Brand: ${p.brand || "(none)"}\n  Description: ${desc}`;
  }).join("\n\n");

  return `You are classifying a product catalog into one vertical. Here are sample products:

${productLines}

Choose the single best vertical from this list:
Apparel, Electronics, Home & Garden, Food & Beverage, Beauty & Personal Care, Sports & Outdoors, Toys & Games, Health, Automotive, Books & Media, Jewelry & Accessories, General

For the chosen vertical, indicate which of these attributes are "expected" vs "not_applicable" for this product type:
size, material, age_group, gender, dimensions, weight, condition, video_url, variant_dict, q_and_a, warning

Return ONLY valid JSON (no markdown, no backticks):
{
  "vertical": "<one of the verticals above>",
  "confidence": <0.0-1.0>,
  "attributeRelevance": {
    "size": "expected" or "not_applicable",
    "material": "expected" or "not_applicable",
    "age_group": "expected" or "not_applicable",
    "gender": "expected" or "not_applicable",
    "dimensions": "expected" or "not_applicable",
    "weight": "expected" or "not_applicable",
    "condition": "expected" or "not_applicable",
    "video_url": "expected" or "not_applicable",
    "variant_dict": "expected" or "not_applicable",
    "q_and_a": "expected" or "not_applicable",
    "warning": "expected" or "not_applicable"
  }
}`;
}

function fallbackProfile(vertical: ProductVertical): CategoryProfile {
  return {
    vertical,
    confidence: 1.0,
    attributeRelevance: { ...FALLBACK_PROFILES[vertical] },
  };
}

export async function detectVertical(
  products: Product[]
): Promise<CategoryProfile> {
  const sample = sampleProducts(products, 5);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CARVE_ANTHROPIC_KEY;
  if (!apiKey) {
    console.log("[Vertical] No API key — using General fallback");
    return fallbackProfile("General");
  }

  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildPrompt(sample);

    console.log("[Vertical] Detecting vertical from", sample.length, "sampled products");

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response");
    }

    const parsed = extractJson(textBlock.text) as {
      vertical?: string;
      confidence?: number;
      attributeRelevance?: Record<string, string>;
    } | null;

    if (!parsed || !parsed.vertical) {
      throw new Error("Could not parse vertical response");
    }

    const vertical = parsed.vertical as ProductVertical;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;

    // Low confidence or unknown vertical → General
    if (confidence < 0.5 || !FALLBACK_PROFILES[vertical]) {
      console.log("[Vertical] Low confidence or unknown vertical, using General");
      return fallbackProfile("General");
    }

    // Validate and merge attribute relevance
    const relevance: Record<string, AttributeRelevance> = { ...FALLBACK_PROFILES[vertical] };
    if (parsed.attributeRelevance) {
      for (const attr of CATEGORY_AWARE_ATTRIBUTES) {
        const val = parsed.attributeRelevance[attr];
        if (val === "expected" || val === "not_applicable") {
          relevance[attr] = val;
        }
      }
    }

    console.log("[Vertical] Detected:", vertical, "confidence:", confidence);

    return { vertical, confidence, attributeRelevance: relevance };
  } catch (err) {
    console.error("[Vertical] LLM detection failed, using General fallback:", err);
    return fallbackProfile("General");
  }
}
