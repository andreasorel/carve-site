import { NextRequest, NextResponse } from "next/server";
import { discoverFeed } from "@/lib/discovery";
import { analyzeProducts } from "@/lib/analyzer";

// Large catalogs (up to 1000 SKUs via sitemap crawling) can take time
export const maxDuration = 120; // seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid URL" },
        { status: 400 }
      );
    }

    const discovery = await discoverFeed(url);
    const result = await analyzeProducts(
      discovery.products,
      discovery.feedUrl,
      discovery.feedType
    );

    // Cap perProductMetrics to worst 50 to avoid huge payloads
    const cappedMetrics = result.perProductMetrics
      ? [...result.perProductMetrics]
          .sort((a, b) => a.productScore - b.productScore)
          .slice(0, 50)
      : undefined;

    return NextResponse.json({
      ...result,
      perProductMetrics: cappedMetrics,
      products: discovery.products,
    });
  } catch (err) {
    const raw =
      err instanceof Error ? err.message : "An unexpected error occurred";
    // Translate cryptic JSON/parsing errors into user-friendly messages
    let message = raw;
    if (raw.includes("JSON") || raw.includes("Unexpected token") || raw.includes("non-whitespace character")) {
      console.error("[Analyze] Parse error:", raw);
      message = "The product feed data could not be parsed. The site may have a non-standard feed format. Try a different URL or contact support.";
    }
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
