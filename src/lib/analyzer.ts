// ---------------------------------------------------------------------------
// AI enrichment layer -- generates editorial commentary ONLY.
// Scores, grades, and field audits are computed deterministically by scorer.ts.
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { NormalizedProduct, Scorecard } from "./types";

// ---------------------------------------------------------------------------
// Anthropic client (lazy-initialized to ensure env vars are available)
// ---------------------------------------------------------------------------

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local or your Vercel environment variables.",
    );
  }
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// Zod schema for the AI enrichment response
// ---------------------------------------------------------------------------

const dimensionNarrativeSchema = z.object({
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const aiEnrichmentSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  dimensions: z.object({
    contentCompleteness: dimensionNarrativeSchema,
    variantHandling: dimensionNarrativeSchema,
    sellerIntegrity: dimensionNarrativeSchema,
    eligibilityFlags: dimensionNarrativeSchema,
    contentQuality: dimensionNarrativeSchema,
    enrichment: dimensionNarrativeSchema,
  }),
});

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const MAX_PRODUCT_JSON_CHARS = 2_000;

function truncateProduct(product: NormalizedProduct): Record<string, unknown> {
  const serialized = JSON.stringify(product);
  if (serialized.length <= MAX_PRODUCT_JSON_CHARS) {
    return product as unknown as Record<string, unknown>;
  }

  // Strip rawData to keep within budget
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rawData: _raw, ...slim } = product;
  const slimSerialized = JSON.stringify(slim);
  if (slimSerialized.length <= MAX_PRODUCT_JSON_CHARS) {
    return { ...slim, rawData: "[truncated]" };
  }

  // Further truncate long descriptions
  const truncated = { ...slim };
  if (truncated.description && truncated.description.length > 300) {
    truncated.description = truncated.description.slice(0, 300) + "...";
  }
  return { ...truncated, rawData: "[truncated]" };
}

function buildSystemPrompt(): string {
  return `You are an expert ecommerce analyst writing for a newspaper-style scorecard. You receive a pre-computed ACP (Agent Commerce Protocol) readiness scorecard with deterministic scores, grades, and field-level audit data.

Your job is to add editorial commentary:
1. A witty, punchy newspaper headline that captures the overall assessment
2. A 2-3 sentence executive summary explaining what this means for the store's visibility to AI shopping agents
3. For each scoring dimension: 2-5 specific findings (what you observed) and 2-4 actionable recommendations

Focus on agentic commerce: explain HOW missing fields affect the store's visibility to ChatGPT, Claude, and other AI shopping agents. Be specific about what to fix and why it matters.

CRITICAL: Respond with ONLY valid JSON. No markdown fences, no explanatory text. Just the JSON object.`;
}

function buildUserPrompt(
  precomputed: Scorecard,
  products: NormalizedProduct[],
): string {
  const sampleProducts = products.slice(0, 3).map(truncateProduct);

  return `Here is the pre-computed ACP readiness scorecard with deterministic scores, grades, and field-level audit data:

${JSON.stringify(precomputed, null, 2)}

Here are ${sampleProducts.length} sample products for context:

${JSON.stringify(sampleProducts, null, 2)}

---

Based on the scorecard data above, provide ONLY a JSON object with this exact structure:

{
  "headline": "<witty newspaper headline>",
  "summary": "<2-3 sentence executive summary>",
  "dimensions": {
    "contentCompleteness": {
      "findings": ["<finding 1>", "..."],
      "recommendations": ["<rec 1>", "..."]
    },
    "variantHandling": {
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "sellerIntegrity": {
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "eligibilityFlags": {
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "contentQuality": {
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "enrichment": {
      "findings": ["..."],
      "recommendations": ["..."]
    }
  }
}

Each dimension should have 2-5 findings and 2-4 recommendations. Do NOT include scores, grades, or fields -- those are already computed.`;
}

// ---------------------------------------------------------------------------
// Fallback: build a scorecard with generic findings when AI fails
// ---------------------------------------------------------------------------

function buildFallbackEnrichment(precomputed: Scorecard): Scorecard {
  const enriched = { ...precomputed };

  enriched.headline = "Agent Readiness Report";

  // Count present fields across all dimensions
  const allFields = Object.values(enriched.dimensions).flatMap(d => d.fields);
  const presentCount = allFields.filter(
    f => f.status === "present" || f.status === "warn",
  ).length;

  enriched.summary = `Your store scored ${enriched.overallScore}/100 (${enriched.overallGrade}). ${presentCount} of 17 required ACP fields were detected.`;

  // Set generic findings for each dimension based on field audit data
  const dimensionKeys = [
    "contentCompleteness",
    "variantHandling",
    "sellerIntegrity",
    "eligibilityFlags",
    "contentQuality",
    "enrichment",
  ] as const;

  for (const key of dimensionKeys) {
    const dim = enriched.dimensions[key];
    dim.findings = dim.fields.map(f =>
      f.status === "present" || f.status === "warn"
        ? `Field ${f.fieldName}: detected`
        : `Field ${f.fieldName}: not found`,
    );
    dim.recommendations =
      dim.fields
        .filter(f => f.status === "missing" || f.status === "partial")
        .slice(0, 4)
        .map(f =>
          f.fixHint
            ? `Add ${f.fieldName}: ${f.fixHint}`
            : `Add the missing ${f.fieldName} field to improve this dimension.`,
        );
    if (dim.recommendations.length === 0) {
      dim.recommendations = [
        "All tracked fields are present. Continue maintaining data quality.",
      ];
    }
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Main: enrich a pre-computed scorecard with AI commentary
// ---------------------------------------------------------------------------

export async function enrichScorecardWithAI(
  precomputed: Scorecard,
  products: NormalizedProduct[],
): Promise<Scorecard> {
  try {
    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(precomputed, products),
        },
      ],
    });

    // Extract text content from the response
    const textBlock = response.content.find(block => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("AI returned no text content.");
      return buildFallbackEnrichment(precomputed);
    }

    const rawText = textBlock.text.trim();

    // Strip markdown fences if the AI wrapped them despite instructions
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error(
        "Failed to parse AI JSON response:",
        parseError,
        "Raw text:",
        rawText.slice(0, 500),
      );
      return buildFallbackEnrichment(precomputed);
    }

    // Validate with Zod
    const validated = aiEnrichmentSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("AI enrichment validation failed:", validated.error.issues);
      return buildFallbackEnrichment(precomputed);
    }

    // Merge AI commentary into the precomputed scorecard
    // NEVER touch scores, grades, or fields -- only narrative content
    const result = { ...precomputed };
    result.headline = validated.data.headline;
    result.summary = validated.data.summary;

    const dimensionKeys = [
      "contentCompleteness",
      "variantHandling",
      "sellerIntegrity",
      "eligibilityFlags",
      "contentQuality",
      "enrichment",
    ] as const;

    for (const key of dimensionKeys) {
      result.dimensions[key] = {
        ...result.dimensions[key],
        findings: validated.data.dimensions[key].findings,
        recommendations: validated.data.dimensions[key].recommendations,
      };
    }

    return result;
  } catch (error) {
    console.error("Anthropic API call failed:", error);
    return buildFallbackEnrichment(precomputed);
  }
}
