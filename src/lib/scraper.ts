import * as cheerio from "cheerio";
import { Product, ReviewData, ReviewItem, QAPair } from "./types";
import { safeFetch } from "./utils";

// ─── Types ───────────────────────────────────────────────────

export interface StoreContext {
  shipping_details: string;
  return_policy: string;
  seller_name: string;
  store_country: string;
  target_countries: string[];
}

export interface ScrapedProductData {
  reviews: ReviewData | null;
  additional_images: string[];
  video_url: string;
  q_and_a: QAPair[];
  condition: string;
  material: string;
  weight: string;
  dimensions: string;
  pageText: string;
  reviewItems: ReviewItem[];
  age_group: string;
  gender: string;
}

// ─── Country inference ───────────────────────────────────────

const TLD_COUNTRY_MAP: Record<string, string> = {
  ".co.uk": "GB", ".uk": "GB",
  ".de": "DE", ".fr": "FR", ".it": "IT", ".es": "ES",
  ".nl": "NL", ".be": "BE", ".at": "AT", ".ch": "CH",
  ".se": "SE", ".no": "NO", ".dk": "DK", ".fi": "FI",
  ".pl": "PL", ".pt": "PT", ".ie": "IE",
  ".ca": "CA", ".au": "AU", ".nz": "NZ",
  ".jp": "JP", ".kr": "KR", ".in": "IN",
  ".br": "BR", ".mx": "MX",
  ".com": "US", ".us": "US",
};

const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  GBP: "GB", EUR: "DE", CAD: "CA", AUD: "AU", NZD: "NZ",
  JPY: "JP", KRW: "KR", INR: "IN", BRL: "BR", MXN: "MX",
  SEK: "SE", NOK: "NO", DKK: "DK", CHF: "CH", PLN: "PL",
  USD: "US",
};

function inferCountryFromDomain(baseUrl: string): string {
  try {
    const hostname = new URL(baseUrl).hostname;
    // Check longest TLDs first (e.g. .co.uk before .uk)
    const sorted = Object.keys(TLD_COUNTRY_MAP).sort((a, b) => b.length - a.length);
    for (const tld of sorted) {
      if (hostname.endsWith(tld)) return TLD_COUNTRY_MAP[tld];
    }
  } catch { /* ignore */ }
  return "US";
}

function inferCountryFromCurrency(text: string): string | null {
  for (const [code, country] of Object.entries(CURRENCY_COUNTRY_MAP)) {
    if (text.includes(code)) return country;
  }
  return null;
}

function inferTargetCountries(storeCountry: string, shippingText: string): string[] {
  const countries = new Set<string>([storeCountry]);
  const lower = shippingText.toLowerCase();

  if (lower.includes("worldwide") || lower.includes("international") || lower.includes("global")) {
    countries.add("US");
    countries.add("GB");
    countries.add("CA");
    countries.add("AU");
    countries.add("DE");
  }
  if (lower.includes("united states") || lower.includes("usa") || lower.includes("u.s.")) countries.add("US");
  if (lower.includes("canada")) countries.add("CA");
  if (lower.includes("united kingdom") || lower.includes("uk")) countries.add("GB");
  if (lower.includes("australia")) countries.add("AU");
  if (lower.includes("europe")) {
    countries.add("DE");
    countries.add("FR");
    countries.add("IT");
    countries.add("ES");
    countries.add("NL");
  }

  return Array.from(countries);
}

// ─── Store Context Scraping ──────────────────────────────────

function extractTextContent($: cheerio.CheerioAPI, maxLen = 2000): string {
  // Remove nav, header, footer, script, style elements
  $("nav, header, footer, script, style, noscript, iframe").remove();
  const text = $("main, article, .page-content, .rte, [role='main'], body")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLen);
}

export async function scrapeStoreContext(baseUrl: string): Promise<StoreContext> {
  const context: StoreContext = {
    shipping_details: "",
    return_policy: "",
    seller_name: "",
    store_country: "",
    target_countries: [],
  };

  const shippingPaths = [
    "/policies/shipping-policy",
    "/pages/shipping",
    "/shipping",
    "/pages/shipping-policy",
  ];
  const returnPaths = [
    "/policies/refund-policy",
    "/pages/returns",
    "/returns",
    "/pages/refund-policy",
    "/pages/return-policy",
  ];
  const aboutPaths = ["/pages/about", "/about", "/pages/about-us"];

  // Fetch homepage + policy pages in parallel
  const [homepageRes, ...policyResults] = await Promise.allSettled([
    safeFetch(baseUrl, 10000),
    ...shippingPaths.map((p) => safeFetch(baseUrl + p, 10000)),
    ...returnPaths.map((p) => safeFetch(baseUrl + p, 10000)),
    ...aboutPaths.map((p) => safeFetch(baseUrl + p, 10000)),
  ]);

  // Extract seller name from homepage
  if (homepageRes.status === "fulfilled" && homepageRes.value) {
    try {
      const html = await homepageRes.value.text();
      const $ = cheerio.load(html);
      context.seller_name =
        $('meta[property="og:site_name"]').attr("content") ||
        $("title").first().text().split(/[|\-–]/).pop()?.trim() ||
        "";
    } catch { /* ignore */ }
  }

  // Extract shipping details (first successful page)
  const shippingResults = policyResults.slice(0, shippingPaths.length);
  for (const result of shippingResults) {
    if (result.status === "fulfilled" && result.value) {
      try {
        const html = await result.value.text();
        const $ = cheerio.load(html);
        context.shipping_details = extractTextContent($, 1500);
        if (context.shipping_details.length > 50) break;
      } catch { /* ignore */ }
    }
  }

  // Extract return policy (first successful page)
  const returnResults = policyResults.slice(shippingPaths.length, shippingPaths.length + returnPaths.length);
  for (const result of returnResults) {
    if (result.status === "fulfilled" && result.value) {
      try {
        const html = await result.value.text();
        const $ = cheerio.load(html);
        context.return_policy = extractTextContent($, 1500);
        if (context.return_policy.length > 50) break;
      } catch { /* ignore */ }
    }
  }

  // Infer country
  context.store_country = inferCountryFromDomain(baseUrl);
  const currencyCountry = inferCountryFromCurrency(
    context.shipping_details + " " + context.return_policy
  );
  if (currencyCountry) context.store_country = currencyCountry;

  // Infer target countries from shipping text
  context.target_countries = inferTargetCountries(
    context.store_country,
    context.shipping_details
  );

  return context;
}

// ─── Product Page Scraping ───────────────────────────────────

function parseJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
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
    } catch { /* ignore malformed JSON-LD */ }
  });
  return product;
}

export async function scrapeProductPage(url: string): Promise<ScrapedProductData | null> {
  const res = await safeFetch(url, 12000);
  if (!res) return null;

  try {
    const html = await res.text();
    const $ = cheerio.load(html);
    const jsonLd = parseJsonLd($);

    const data: ScrapedProductData = {
      reviews: null,
      additional_images: [],
      video_url: "",
      q_and_a: [],
      condition: "",
      material: "",
      weight: "",
      dimensions: "",
      pageText: "",
      reviewItems: [],
      age_group: "",
      gender: "",
    };

    // Extract main page text content for LLM grounding (use a clone to avoid mutating the DOM)
    try {
      const $clone = cheerio.load($.html());
      data.pageText = extractTextContent($clone, 5000);
    } catch { /* ignore */ }

    // Extract structured review items from DOM
    const reviewSelectors = [
      ".review-text", ".review-body", ".spr-review-content-body",
      "[data-review-body]", ".yotpo-review-content", ".review__body",
      ".product-review-body", ".cr-review-text",
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
    // Also extract review items from JSON-LD review array
    if (data.reviewItems.length < 5 && jsonLd) {
      const reviews = Array.isArray(jsonLd.review) ? jsonLd.review
        : (jsonLd as Record<string, unknown>)["@graph"] && Array.isArray((jsonLd as Record<string, unknown>)["@graph"])
          ? ((jsonLd as Record<string, unknown>)["@graph"] as Record<string, unknown>[]).filter((n) => n["@type"] === "Review")
          : [];
      for (const rev of reviews as Record<string, unknown>[]) {
        if (data.reviewItems.length >= 5) break;
        const body = typeof rev.reviewBody === "string" ? rev.reviewBody
          : typeof rev.description === "string" ? rev.description : "";
        if (body.length > 10) {
          const reviewRating = rev.reviewRating as Record<string, unknown> | undefined;
          const ratingValue = reviewRating ? Number(reviewRating.ratingValue || 0) : 0;
          data.reviewItems.push({
            title: typeof rev.name === "string" ? rev.name.slice(0, 100) : "",
            content: body.replace(/\s+/g, " ").trim().slice(0, 200),
            minRating: 0,
            maxRating: 5,
            rating: ratingValue,
          });
        }
      }
    }

    // Reviews from JSON-LD aggregateRating
    if (jsonLd?.aggregateRating && typeof jsonLd.aggregateRating === "object") {
      const ar = jsonLd.aggregateRating as Record<string, unknown>;
      const rating = Number(ar.ratingValue || 0);
      const count = Number(ar.reviewCount || ar.ratingCount || 0);
      if (rating > 0 && count > 0) {
        data.reviews = { rating, count };
      }
    }

    // Additional images from JSON-LD
    if (jsonLd?.image) {
      const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
      for (const img of images) {
        const imgUrl = typeof img === "string" ? img : (img as Record<string, unknown>)?.url;
        if (typeof imgUrl === "string" && imgUrl.startsWith("http")) {
          data.additional_images.push(imgUrl);
        }
      }
    }
    // Also collect from og:image and product gallery
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content && content.startsWith("http") && !data.additional_images.includes(content)) {
        data.additional_images.push(content);
      }
    });
    // Gallery images from common selectors
    $(".product-gallery img, .product-images img, [data-product-image] img, .product__media img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && src.startsWith("http") && !data.additional_images.includes(src)) {
        data.additional_images.push(src);
      }
    });
    data.additional_images = data.additional_images.slice(0, 10);

    // Video URL
    const videoEl = $("video source").first().attr("src") || $("video").first().attr("src");
    if (videoEl) {
      data.video_url = videoEl;
    } else {
      // Check for YouTube/Vimeo iframes
      $("iframe").each((_, el) => {
        if (data.video_url) return;
        const src = $(el).attr("src") || "";
        if (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com")) {
          data.video_url = src;
        }
      });
    }

    // Q&A / FAQ sections — parse into QAPair[]
    // Check JSON-LD for FAQPage first (structured data is more reliable)
    $('script[type="application/ld+json"]').each((_, el) => {
      if (data.q_and_a.length > 0) return;
      try {
        const json = JSON.parse($(el).html() || "{}");
        const schemas = Array.isArray(json) ? json : [json];
        for (const schema of schemas) {
          if (schema["@type"] === "FAQPage" && Array.isArray(schema.mainEntity)) {
            data.q_and_a = schema.mainEntity.slice(0, 5).map((qa: Record<string, unknown>) => ({
              q: String(qa.name || ""),
              a: String((qa.acceptedAnswer as Record<string, unknown>)?.text || ""),
            }));
          }
        }
      } catch { /* ignore */ }
    });

    // Demographics from JSON-LD
    if (jsonLd) {
      const audience = jsonLd.audience as Record<string, unknown> | undefined;
      if (audience) {
        const suggestedGender = audience.suggestedGender;
        if (typeof suggestedGender === "string") {
          data.gender = suggestedGender.toLowerCase();
        }
        const minAge = Number(audience.suggestedMinAge || 0);
        const maxAge = Number(audience.suggestedMaxAge || 0);
        if (minAge > 0 || maxAge > 0) {
          if (maxAge <= 1) data.age_group = "newborn";
          else if (maxAge <= 3) data.age_group = "infant";
          else if (maxAge <= 5) data.age_group = "toddler";
          else if (maxAge <= 13) data.age_group = "kids";
          else data.age_group = "adult";
        }
      }
      // Also check top-level gender field
      if (!data.gender && typeof jsonLd.gender === "string") {
        data.gender = (jsonLd.gender as string).toLowerCase();
      }
    }

    // Condition from JSON-LD
    if (jsonLd?.itemCondition) {
      const cond = String(jsonLd.itemCondition).toLowerCase();
      if (cond.includes("new")) data.condition = "new";
      else if (cond.includes("refurbished")) data.condition = "refurbished";
      else if (cond.includes("used")) data.condition = "used";
    }

    // Material, weight, dimensions from JSON-LD
    if (jsonLd?.material) {
      data.material = String(jsonLd.material);
    }
    if (jsonLd?.weight) {
      if (typeof jsonLd.weight === "object") {
        const w = jsonLd.weight as Record<string, unknown>;
        data.weight = `${w.value || ""} ${w.unitCode || w.unitText || ""}`.trim();
      } else {
        data.weight = String(jsonLd.weight);
      }
    }
    if (jsonLd?.depth || jsonLd?.width || jsonLd?.height) {
      const parts: string[] = [];
      for (const dim of ["width", "height", "depth"] as const) {
        const val = jsonLd[dim];
        if (val) {
          if (typeof val === "object") {
            const d = val as Record<string, unknown>;
            parts.push(`${dim}: ${d.value || ""} ${d.unitCode || d.unitText || ""}`);
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

export async function scrapeProductPages(
  products: Product[],
  batchSize = 10
): Promise<Map<string, ScrapedProductData>> {
  const results = new Map<string, ScrapedProductData>();
  const productsWithUrls = products.filter((p) => p.url && p.url.startsWith("http"));

  for (let i = 0; i < productsWithUrls.length; i += batchSize) {
    const batch = productsWithUrls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (product) => {
        const scraped = await scrapeProductPage(product.url);
        return { id: product.item_id, scraped };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.scraped) {
        results.set(result.value.id, result.value.scraped);
      }
    }
  }

  return results;
}
