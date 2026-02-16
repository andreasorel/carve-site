import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { NormalizedProduct, DiscoveredFeed, Scorecard } from "./types";
import {
  ACP_REQUIRED_FIELDS,
  ACP_CONDITIONAL_FIELDS,
  ACP_RECOMMENDED_FIELDS,
  ACP_QUALITY_DIMENSIONS,
} from "./acp-spec";

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
// Zod schema for validating the AI response
// ---------------------------------------------------------------------------

const gradeSchema = z.enum(["A", "B", "C", "D", "F"]);

const dimensionScoreSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  grade: gradeSchema,
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const discoveredFeedSchema = z.object({
  type: z.enum([
    "json-ld",
    "sitemap",
    "shopify",
    "woocommerce",
    "meta-tags",
    "microdata",
  ]),
  url: z.string(),
  productCount: z.number().nullable(),
});

const scorecardSchema = z.object({
  url: z.string(),
  overallScore: z.number().min(0).max(100),
  overallGrade: gradeSchema,
  headline: z.string(),
  summary: z.string(),
  dimensions: z.object({
    contentCompleteness: dimensionScoreSchema,
    variantHandling: dimensionScoreSchema,
    sellerIntegrity: dimensionScoreSchema,
    eligibilityFlags: dimensionScoreSchema,
    contentQuality: dimensionScoreSchema,
    enrichment: dimensionScoreSchema,
  }),
  discoveredFeeds: z.array(discoveredFeedSchema),
  sampleSize: z.number(),
  analyzedAt: z.string(),
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
  return `You are an expert ecommerce data analyst specializing in product feed quality assessment. You evaluate online stores against the OpenAI Agent Commerce Protocol (ACP) specification.

Your analysis must be thorough, specific, and actionable. You score stores across 6 dimensions and produce structured JSON scorecards.

You have a sharp, witty editorial voice. When writing headlines, channel the style of a newspaper editor — punchy, memorable, and occasionally cheeky. Headlines should capture the essence of the score in a single phrase.

CRITICAL: Respond with ONLY valid JSON. No markdown fences, no explanatory text, no code blocks. Just the raw JSON object.`;
}

function buildUserPrompt(
  url: string,
  products: NormalizedProduct[],
  feeds: DiscoveredFeed[],
): string {
  const requiredFieldsList = ACP_REQUIRED_FIELDS.map(
    (f) => `  - ${f.name}: ${f.description}`,
  ).join("\n");

  const conditionalFieldsList = Object.entries(ACP_CONDITIONAL_FIELDS)
    .map(
      ([condition, fields]) =>
        `  When ${condition}:\n${fields.map((f) => `    - ${f.name}: ${f.description}`).join("\n")}`,
    )
    .join("\n");

  const recommendedFieldsList = ACP_RECOMMENDED_FIELDS.map(
    (f) => `  - ${f.name}: ${f.description}`,
  ).join("\n");

  const dimensionGuidelines = ACP_QUALITY_DIMENSIONS.map(
    (d) =>
      `  ${d.key} (${d.label}, weight ${(d.weight * 100).toFixed(0)}%): ${d.description}`,
  ).join("\n");

  const truncatedProducts = products.map(truncateProduct);

  return `Analyze this webshop's product data against the OpenAI Agent Commerce Protocol (ACP).

STORE URL: ${url}

DISCOVERED DATA FEEDS:
${JSON.stringify(feeds, null, 2)}

PRODUCT SAMPLES (${products.length} products):
${JSON.stringify(truncatedProducts, null, 2)}

---

ACP REQUIRED FIELDS (17 total):
${requiredFieldsList}

ACP CONDITIONAL FIELDS:
${conditionalFieldsList}

ACP RECOMMENDED FIELDS:
${recommendedFieldsList}

---

SCORING DIMENSIONS & GUIDELINES:
${dimensionGuidelines}

For each dimension:
- Score 0-100.
- Grade: A (90-100), B (75-89), C (60-74), D (40-59), F (0-39).
- Provide 2-5 specific findings (what you observed in the data).
- Provide 2-4 actionable recommendations (what they should fix/add).

Overall score = weighted average of dimension scores using the weights above.
Overall grade uses the same A-F scale as dimensions.

Generate a witty, newspaper-style headline that captures the overall assessment (e.g., "Extra, Extra! Shopify Store Ships Solid Data, But Variants Left in the Dark" or "Breaking: Premium Brand's Product Feed Reads Like a Blank Page").

---

Respond with ONLY this exact JSON structure (no markdown, no code fences, no extra text):

{
  "url": "${url}",
  "overallScore": <0-100>,
  "overallGrade": "<A|B|C|D|F>",
  "headline": "<witty newspaper headline>",
  "summary": "<2-3 sentence executive summary>",
  "dimensions": {
    "contentCompleteness": {
      "name": "Content Completeness",
      "score": <0-100>,
      "grade": "<A|B|C|D|F>",
      "findings": ["<finding 1>", "<finding 2>"],
      "recommendations": ["<rec 1>", "<rec 2>"]
    },
    "variantHandling": {
      "name": "Variant Handling",
      "score": <0-100>,
      "grade": "<A|B|C|D|F>",
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "sellerIntegrity": {
      "name": "Seller & Policy Integrity",
      "score": <0-100>,
      "grade": "<A|B|C|D|F>",
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "eligibilityFlags": {
      "name": "Eligibility Flags",
      "score": <0-100>,
      "grade": "<A|B|C|D|F>",
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "contentQuality": {
      "name": "Content Quality",
      "score": <0-100>,
      "grade": "<A|B|C|D|F>",
      "findings": ["..."],
      "recommendations": ["..."]
    },
    "enrichment": {
      "name": "Enrichment",
      "score": <0-100>,
      "grade": "<A|B|C|D|F>",
      "findings": ["..."],
      "recommendations": ["..."]
    }
  },
  "discoveredFeeds": ${JSON.stringify(feeds)},
  "sampleSize": ${products.length},
  "analyzedAt": "${new Date().toISOString()}"
}`;
}

// ---------------------------------------------------------------------------
// Fallback scorecard when AI response can't be parsed
// ---------------------------------------------------------------------------

function buildFallbackScorecard(
  url: string,
  products: NormalizedProduct[],
  feeds: DiscoveredFeed[],
  errorMsg: string,
): Scorecard {
  const emptyDimension = (name: string) => ({
    name,
    score: 0,
    grade: "F" as const,
    findings: ["Analysis could not be completed: " + errorMsg],
    recommendations: [
      "Please try again. If the issue persists, ensure the site is publicly accessible.",
    ],
  });

  return {
    url,
    overallScore: 0,
    overallGrade: "F",
    headline: "Stop the Presses! Our Analysts Hit a Snag",
    summary: `We were unable to fully analyze ${url}. ${errorMsg}`,
    dimensions: {
      contentCompleteness: emptyDimension("Content Completeness"),
      variantHandling: emptyDimension("Variant Handling"),
      sellerIntegrity: emptyDimension("Seller & Policy Integrity"),
      eligibilityFlags: emptyDimension("Eligibility Flags"),
      contentQuality: emptyDimension("Content Quality"),
      enrichment: emptyDimension("Enrichment"),
    },
    discoveredFeeds: feeds,
    sampleSize: products.length,
    analyzedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export async function analyzeProducts(
  url: string,
  products: NormalizedProduct[],
  feeds: DiscoveredFeed[],
): Promise<Scorecard> {
  // If no products were found, return a meaningful fallback
  if (products.length === 0 && feeds.length === 0) {
    return buildFallbackScorecard(
      url,
      products,
      feeds,
      "No product data or feeds were discovered on this site.",
    );
  }

  try {
    const response = await getClient().messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(url, products, feeds),
        },
      ],
    });

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return buildFallbackScorecard(
        url,
        products,
        feeds,
        "AI returned no text content.",
      );
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
      return buildFallbackScorecard(
        url,
        products,
        feeds,
        "AI response was not valid JSON.",
      );
    }

    // Validate with Zod
    const validated = scorecardSchema.safeParse(parsed);

    if (!validated.success) {
      console.error(
        "Scorecard validation failed:",
        validated.error.issues,
      );
      return buildFallbackScorecard(
        url,
        products,
        feeds,
        "AI response did not match expected scorecard schema.",
      );
    }

    return validated.data as Scorecard;
  } catch (error) {
    console.error("Anthropic API call failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown AI error";
    return buildFallbackScorecard(url, products, feeds, message);
  }
}
