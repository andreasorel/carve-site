import { NextRequest } from "next/server";
import type { NormalizedProduct, StoreMeta } from "@/lib/types";
import { enrichProducts } from "@/lib/enrichment";

export const maxDuration = 300;
const MAX_PRODUCTS = 10;

export async function POST(request: NextRequest) {
  // Validate API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Parse request body
  let body: {
    products: NormalizedProduct[];
    baseUrl: string;
    storeMeta: StoreMeta;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { products, baseUrl, storeMeta } = body;

  // Validate required fields
  if (!Array.isArray(products) || products.length === 0) {
    return new Response(
      JSON.stringify({ error: "Request must include a non-empty products array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!baseUrl || typeof baseUrl !== "string") {
    return new Response(
      JSON.stringify({ error: "Request must include a baseUrl string" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!storeMeta || typeof storeMeta !== "object") {
    return new Response(
      JSON.stringify({ error: "Request must include a storeMeta object" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Cap product count
  const cappedProducts = products.slice(0, MAX_PRODUCTS);

  // Create a streaming response from the enrichment async generator
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const event of enrichProducts(cappedProducts, baseUrl, storeMeta)) {
          const line = JSON.stringify(event) + "\n";
          controller.enqueue(encoder.encode(line));
        }
      } catch (err) {
        // Send an error event before closing
        const errorEvent = JSON.stringify({
          type: "error",
          error: err instanceof Error ? err.message : "Enrichment pipeline failed",
        }) + "\n";
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
