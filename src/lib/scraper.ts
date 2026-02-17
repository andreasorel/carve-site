import * as cheerio from "cheerio";
import type {
  NormalizedProduct,
  ScrapedProductData,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT = "CarveBot/1.0 (+https://carve.co)";
const FETCH_TIMEOUT_MS = 12_000; // longer timeout for product pages
const MAX_REDIRECTS = 3;

// ---------------------------------------------------------------------------
// Fetch helper (self-contained, same pattern as crawler.ts but 12s timeout)
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    let currentUrl = url;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(currentUrl, {
          headers: { "User-Agent": USER_AGENT },
          redirect: "manual",
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Handle redirects manually
        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get("location");
          if (!location) return null;
          currentUrl = location.startsWith("http")
            ? location
            : new URL(location, currentUrl).href;
          continue;
        }

        if (!res.ok) return null;
        return await res.text();
      } catch {
        clearTimeout(timer);
        return null;
      }
    }
    return null; // Too many redirects
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// JSON-LD parser — finds the first Product schema in any LD+JSON block
// ---------------------------------------------------------------------------

function parseJsonLd(
  $: cheerio.CheerioAPI,
): Record<string, unknown> | null {
  let product: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    try {
      const json = JSON.parse($(el).html() || "{}");
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        if (schema["@type"] === "Product") {
          product = schema;
          return;
        }
        if (Array.isArray(schema["@graph"])) {
          for (const node of schema["@graph"]) {
            if (node["@type"] === "Product") {
              product = node;
              return;
            }
          }
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });
  return product;
}

// ---------------------------------------------------------------------------
// Text extraction helper
// ---------------------------------------------------------------------------

function extractTextContent(
  $: cheerio.CheerioAPI,
  maxLen = 5000,
): string {
  // Remove non-content elements
  $("nav, header, footer, script, style, noscript, iframe").remove();
  const text = $("main, article, .page-content, .rte, [role='main'], body")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// scrapeProductPage — fetch a single product URL and extract enrichment data
// ---------------------------------------------------------------------------

export async function scrapeProductPage(
  url: string,
): Promise<ScrapedProductData | null> {
  const html = await fetchPage(url);
  if (!html) return null;

  try {
    const $ = cheerio.load(html);
    const jsonLd = parseJsonLd($);

    const data: ScrapedProductData = {
      reviews: null,
      additionalImages: [],
      videoUrl: "",
      qAndA: [],
      condition: "",
      material: "",
      weight: "",
      dimensions: "",
      pageText: "",
      reviewItems: [],
      ageGroup: "",
      gender: "",
    };

    // ── Page text for LLM grounding (clone to avoid mutating the DOM) ──
    try {
      const $clone = cheerio.load($.html());
      data.pageText = extractTextContent($clone, 5000);
    } catch {
      /* ignore */
    }

    // ── Review items from DOM selectors ─────────────────────────────────
    const reviewSelectors = [
      ".review-text",
      ".review-body",
      ".spr-review-content-body",
      "[data-review-body]",
      ".yotpo-review-content",
      ".review__body",
      ".product-review-body",
      ".cr-review-text",
    ];
    for (const sel of reviewSelectors) {
      $(sel).each((_, el) => {
        if (data.reviewItems.length >= 5) return;
        const content = $(el).text().replace(/\s+/g, " ").trim();
        if (content.length > 10) {
          data.reviewItems.push({
            title: "",
            content: content.slice(0, 200),
            minRating: 0,
            maxRating: 5,
            rating: 0,
          });
        }
      });
      if (data.reviewItems.length >= 5) break;
    }

    // ── Review items from JSON-LD review array ──────────────────────────
    if (data.reviewItems.length < 5 && jsonLd) {
      const reviews = Array.isArray(jsonLd.review)
        ? jsonLd.review
        : Array.isArray((jsonLd as Record<string, unknown>)["@graph"])
          ? (
              (jsonLd as Record<string, unknown>)["@graph"] as Record<
                string,
                unknown
              >[]
            ).filter((n) => n["@type"] === "Review")
          : [];
      for (const rev of reviews as Record<string, unknown>[]) {
        if (data.reviewItems.length >= 5) break;
        const body =
          typeof rev.reviewBody === "string"
            ? rev.reviewBody
            : typeof rev.description === "string"
              ? rev.description
              : "";
        if (body.length > 10) {
          const reviewRating = rev.reviewRating as
            | Record<string, unknown>
            | undefined;
          const ratingValue = reviewRating
            ? Number(reviewRating.ratingValue || 0)
            : 0;
          data.reviewItems.push({
            title:
              typeof rev.name === "string" ? rev.name.slice(0, 100) : "",
            content: body.replace(/\s+/g, " ").trim().slice(0, 200),
            minRating: 0,
            maxRating: 5,
            rating: ratingValue,
          });
        }
      }
    }

    // ── Aggregate rating from JSON-LD ───────────────────────────────────
    if (
      jsonLd?.aggregateRating &&
      typeof jsonLd.aggregateRating === "object"
    ) {
      const ar = jsonLd.aggregateRating as Record<string, unknown>;
      const rating = Number(ar.ratingValue || 0);
      const count = Number(ar.reviewCount || ar.ratingCount || 0);
      if (rating > 0 && count > 0) {
        data.reviews = { rating, count };
      }
    }

    // ── Additional images from JSON-LD ──────────────────────────────────
    if (jsonLd?.image) {
      const images = Array.isArray(jsonLd.image)
        ? jsonLd.image
        : [jsonLd.image];
      for (const img of images) {
        const imgUrl =
          typeof img === "string"
            ? img
            : (img as Record<string, unknown>)?.url;
        if (typeof imgUrl === "string" && imgUrl.startsWith("http")) {
          data.additionalImages.push(imgUrl);
        }
      }
    }

    // ── Additional images from og:image meta tags ───────────────────────
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (
        content &&
        content.startsWith("http") &&
        !data.additionalImages.includes(content)
      ) {
        data.additionalImages.push(content);
      }
    });

    // ── Gallery images from common DOM selectors ────────────────────────
    $(
      ".product-gallery img, .product-images img, [data-product-image] img, .product__media img",
    ).each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        src.startsWith("http") &&
        !data.additionalImages.includes(src)
      ) {
        data.additionalImages.push(src);
      }
    });
    data.additionalImages = data.additionalImages.slice(0, 10);

    // ── Video URL from <video> elements and YouTube/Vimeo iframes ───────
    const videoEl =
      $("video source").first().attr("src") || $("video").first().attr("src");
    if (videoEl) {
      data.videoUrl = videoEl;
    } else {
      $("iframe").each((_, el) => {
        if (data.videoUrl) return;
        const src = $(el).attr("src") || "";
        if (
          src.includes("youtube.com") ||
          src.includes("youtu.be") ||
          src.includes("vimeo.com")
        ) {
          data.videoUrl = src;
        }
      });
    }

    // ── Q&A from FAQPage JSON-LD schema ─────────────────────────────────
    $('script[type="application/ld+json"]').each((_, el) => {
      if (data.qAndA.length > 0) return;
      try {
        const json = JSON.parse($(el).html() || "{}");
        const schemas = Array.isArray(json) ? json : [json];
        for (const schema of schemas) {
          if (
            schema["@type"] === "FAQPage" &&
            Array.isArray(schema.mainEntity)
          ) {
            data.qAndA = schema.mainEntity
              .slice(0, 5)
              .map((qa: Record<string, unknown>) => ({
                q: String(qa.name || ""),
                a: String(
                  (qa.acceptedAnswer as Record<string, unknown>)?.text || "",
                ),
              }));
          }
        }
      } catch {
        /* ignore */
      }
    });

    // ── Demographics from JSON-LD audience ───────────────────────────────
    if (jsonLd) {
      const audience = jsonLd.audience as
        | Record<string, unknown>
        | undefined;
      if (audience) {
        const suggestedGender = audience.suggestedGender;
        if (typeof suggestedGender === "string") {
          data.gender = suggestedGender.toLowerCase();
        }
        const minAge = Number(audience.suggestedMinAge || 0);
        const maxAge = Number(audience.suggestedMaxAge || 0);
        if (minAge > 0 || maxAge > 0) {
          if (maxAge <= 1) data.ageGroup = "newborn";
          else if (maxAge <= 3) data.ageGroup = "infant";
          else if (maxAge <= 5) data.ageGroup = "toddler";
          else if (maxAge <= 13) data.ageGroup = "kids";
          else data.ageGroup = "adult";
        }
      }
      // Also check top-level gender field
      if (!data.gender && typeof jsonLd.gender === "string") {
        data.gender = (jsonLd.gender as string).toLowerCase();
      }
    }

    // ── Condition from JSON-LD itemCondition ─────────────────────────────
    if (jsonLd?.itemCondition) {
      const cond = String(jsonLd.itemCondition).toLowerCase();
      if (cond.includes("new")) data.condition = "new";
      else if (cond.includes("refurbished")) data.condition = "refurbished";
      else if (cond.includes("used")) data.condition = "used";
    }

    // ── Material from JSON-LD ───────────────────────────────────────────
    if (jsonLd?.material) {
      data.material = String(jsonLd.material);
    }

    // ── Weight from JSON-LD (handles object and string forms) ───────────
    if (jsonLd?.weight) {
      if (typeof jsonLd.weight === "object") {
        const w = jsonLd.weight as Record<string, unknown>;
        data.weight =
          `${w.value || ""} ${w.unitCode || w.unitText || ""}`.trim();
      } else {
        data.weight = String(jsonLd.weight);
      }
    }

    // ── Dimensions from JSON-LD width/height/depth ──────────────────────
    if (jsonLd?.depth || jsonLd?.width || jsonLd?.height) {
      const parts: string[] = [];
      for (const dim of ["width", "height", "depth"] as const) {
        const val = jsonLd[dim];
        if (val) {
          if (typeof val === "object") {
            const d = val as Record<string, unknown>;
            parts.push(
              `${dim}: ${d.value || ""} ${d.unitCode || d.unitText || ""}`,
            );
          } else {
            parts.push(`${dim}: ${val}`);
          }
        }
      }
      data.dimensions = parts.join(", ");
    }

    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// scrapeProductPages — batch scraper with parallel processing
// ---------------------------------------------------------------------------

export async function scrapeProductPages(
  products: NormalizedProduct[],
  batchSize = 10,
): Promise<Map<string, ScrapedProductData>> {
  const results = new Map<string, ScrapedProductData>();
  const productsWithUrls = products.filter(
    (p) => p.url && p.url.startsWith("http"),
  );

  for (let i = 0; i < productsWithUrls.length; i += batchSize) {
    const batch = productsWithUrls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (product) => {
        const scraped = await scrapeProductPage(product.url!);
        const key =
          product.itemId ||
          product.productId ||
          product.sku ||
          product.url ||
          "";
        return { key, scraped };
      }),
    );

    for (const result of batchResults) {
      if (
        result.status === "fulfilled" &&
        result.value.scraped &&
        result.value.key
      ) {
        results.set(result.value.key, result.value.scraped);
      }
    }
  }

  return results;
}
