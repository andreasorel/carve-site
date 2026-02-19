import { NextRequest } from "next/server";
import { Product } from "@/lib/types";
import { enrichProducts } from "@/lib/enrichment";
import { AnalysisContext } from "@/lib/optimizer";

export const maxDuration = 300;

const MAX_PRODUCTS = 10;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.CARVE_ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "ANTHROPIC_API_KEY is not configured. An API key is required to optimize product data.",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const products: Product[] = body.products;
    const baseUrl: string = body.baseUrl || "";
    const analysisContext: AnalysisContext | undefined = body.analysisContext;

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a non-empty products array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cap at MAX_PRODUCTS
    const capped = products.slice(0, MAX_PRODUCTS);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of enrichProducts(capped, baseUrl, analysisContext)) {
            const eventStr = JSON.stringify(event);
            controller.enqueue(encoder.encode(eventStr + "\n"));
          }
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Optimization failed";
          const errorEvent = JSON.stringify({ type: "error", error: message });
          controller.enqueue(encoder.encode(errorEvent + "\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }
}
