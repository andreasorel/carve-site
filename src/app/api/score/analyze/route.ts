import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeProducts } from "@/lib/analyzer";

// Validate that products and feeds arrays are present
const inputSchema = z.object({
  url: z.string(),
  products: z.array(z.any()).min(0),
  feeds: z.array(z.any()).min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    const { url, products, feeds } = parsed.data;
    const scorecard = await analyzeProducts(url, products, feeds);

    return NextResponse.json({ scorecard });
  } catch (error) {
    console.error("Score analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 },
    );
  }
}
