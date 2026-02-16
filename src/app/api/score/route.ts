import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { discoverProducts } from "@/lib/crawler";

const inputSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  email: z.string().email("Please enter a valid email"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    let { url } = parsed.data;
    const { email } = parsed.data;

    // Normalize URL
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    url = url.replace(/\/+$/, "");

    // Lead capture (console log for now — replace with DB/CRM write later)
    console.log(
      "LEAD_CAPTURE:",
      JSON.stringify({ email, url, timestamp: new Date().toISOString() }),
    );

    // Crawl the site and discover product data
    const { products, feeds } = await discoverProducts(url);

    return NextResponse.json({ products, feeds, url });
  } catch (error) {
    console.error("Score crawl error:", error);
    return NextResponse.json(
      { error: "Failed to analyze site. Please try again." },
      { status: 500 },
    );
  }
}
