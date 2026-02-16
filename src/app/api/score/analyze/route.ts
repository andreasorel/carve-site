import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildFieldAuditMap } from "@/lib/field-mapper";
import { computeScorecard } from "@/lib/scorer";
import { enrichScorecardWithAI } from "@/lib/analyzer";

// Validate that products, feeds, and storeMeta are present
const storeMetaSchema = z.object({
  sellerName: z.string().nullable(),
  sellerUrl: z.string(),
  returnPolicy: z.string().nullable(),
  privacyPolicyUrl: z.string().nullable(),
  termsOfServiceUrl: z.string().nullable(),
  storeCountry: z.string().nullable(),
  targetCountries: z.array(z.string()),
  platform: z.enum(["shopify", "woocommerce", "custom"]).nullable(),
});

const inputSchema = z.object({
  url: z.string(),
  products: z.array(z.any()).min(0),
  feeds: z.array(z.any()).min(0),
  storeMeta: storeMetaSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);

    if (!parsed.success) {
      console.error("Validation errors:", parsed.error.issues);
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    const { url, products, feeds, storeMeta } = parsed.data;

    // Step 1: Deterministic field mapping — map crawled data to ACP fields
    const fieldMap = buildFieldAuditMap(products, storeMeta);

    // Step 2: Deterministic scoring — compute scores from field audit
    const precomputed = computeScorecard(url, products, feeds, storeMeta, fieldMap);

    // Step 3: AI enrichment — add editorial commentary (headline, summary, findings)
    const scorecard = await enrichScorecardWithAI(precomputed, products);

    return NextResponse.json({ scorecard });
  } catch (error) {
    console.error("Score analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}
