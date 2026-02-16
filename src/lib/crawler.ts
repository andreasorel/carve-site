import * as cheerio from "cheerio";
import type { NormalizedProduct, DiscoveredFeed } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT = "CarveBot/1.0 (+https://carve.co)";
const FETCH_TIMEOUT_MS = 4_000;
const MAX_REDIRECTS = 3;
const MAX_PRODUCTS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a URL with a timeout, custom User-Agent, and manual redirect handling.
 * Returns the response body as a string, or null on any failure.
 */
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

/**
 * Safely parse a JSON string, returning null on failure.
 */
function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Coerce a value to a trimmed string, or return undefined.
 */
function str(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined;
  const s = String(val).trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Resolve a potentially relative URL against a base.
 */
function resolveUrl(href: unknown, base: string): string | undefined {
  const raw = str(href);
  if (!raw) return undefined;
  try {
    return new URL(raw, base).href;
  } catch {
    return raw.startsWith("//") ? `https:${raw}` : undefined;
  }
}

// ---------------------------------------------------------------------------
// Strategy 1: JSON-LD extraction
// ---------------------------------------------------------------------------

function normalizeJsonLdProduct(
  data: Record<string, unknown>,
  baseUrl: string,
): NormalizedProduct {
  const offers = data.offers as Record<string, unknown> | undefined;
  // offers can be a single object or an array
  const offerList = Array.isArray(offers)
    ? offers
    : offers
      ? [offers]
      : [];
  const firstOffer = (offerList[0] ?? {}) as Record<string, unknown>;

  const reviews = data.aggregateRating as
    | Record<string, unknown>
    | undefined;

  return {
    source: "json-ld",
    title: str(data.name),
    description: str(data.description),
    url: resolveUrl(data.url, baseUrl),
    imageUrl: resolveUrl(
      Array.isArray(data.image) ? data.image[0] : data.image,
      baseUrl,
    ),
    price:
      str(firstOffer.price) ??
      str(firstOffer.lowPrice),
    currency: str(firstOffer.priceCurrency),
    availability: str(firstOffer.availability),
    brand: str(
      typeof data.brand === "object" && data.brand !== null
        ? (data.brand as Record<string, unknown>).name
        : data.brand,
    ),
    sku: str(data.sku),
    gtin:
      str(data.gtin) ??
      str(data.gtin13) ??
      str(data.gtin12) ??
      str(data.gtin14) ??
      str(data.gtin8),
    variants:
      offerList.length > 1
        ? offerList.map((o) => o as Record<string, unknown>)
        : undefined,
    reviews: reviews
      ? {
          average: Number(reviews.ratingValue) || undefined,
          count: Number(reviews.reviewCount ?? reviews.ratingCount) || undefined,
        }
      : undefined,
    rawData: data,
  };
}

/**
 * Find all Product-type JSON-LD objects in an HTML page.
 */
function extractJsonLd(
  html: string,
  baseUrl: string,
): { products: NormalizedProduct[]; feed: DiscoveredFeed | null } {
  const $ = cheerio.load(html);
  const products: NormalizedProduct[] = [];
  const candidates: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    const parsed = safeJsonParse(raw);
    if (!parsed) return;

    // Collect all objects to search through
    const objects: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    for (const obj of objects) {
      if (typeof obj !== "object" || obj === null) continue;
      const record = obj as Record<string, unknown>;

      // Check @graph arrays
      if (Array.isArray(record["@graph"])) {
        for (const item of record["@graph"]) {
          if (typeof item === "object" && item !== null) {
            candidates.push(item as Record<string, unknown>);
          }
        }
      } else {
        candidates.push(record);
      }
    }
  });

  for (const candidate of candidates) {
    const type = str(candidate["@type"]);
    if (
      type === "Product" ||
      type === "IndividualProduct" ||
      type === "ProductGroup"
    ) {
      products.push(normalizeJsonLdProduct(candidate, baseUrl));
    }
  }

  const feed: DiscoveredFeed | null =
    products.length > 0
      ? {
          type: "json-ld",
          url: baseUrl,
          productCount: products.length,
        }
      : null;

  return { products, feed };
}

// ---------------------------------------------------------------------------
// Strategy 2: Sitemap discovery
// ---------------------------------------------------------------------------

const PRODUCT_URL_PATTERNS = [
  /\/products?\//i,
  /\/p\//i,
  /\/item\//i,
  /\/dp\//i,
  /\/product-/i,
];

function isProductUrl(url: string): boolean {
  return PRODUCT_URL_PATTERNS.some((pattern) => pattern.test(url));
}

async function discoverSitemap(
  baseUrl: string,
): Promise<{ products: NormalizedProduct[]; feed: DiscoveredFeed | null }> {
  const products: NormalizedProduct[] = [];
  const sitemapUrls: string[] = [`${baseUrl}/sitemap.xml`];

  // Check robots.txt for additional sitemap references
  const robotsTxt = await fetchPage(`${baseUrl}/robots.txt`);
  if (robotsTxt) {
    const sitemapMatches = Array.from(robotsTxt.matchAll(
      /^Sitemap:\s*(.+)$/gim,
    ));
    for (const match of sitemapMatches) {
      const url = match[1].trim();
      if (url && !sitemapUrls.includes(url)) {
        sitemapUrls.push(url);
      }
    }
  }

  const productUrls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    if (productUrls.length >= 3) break;

    const xml = await fetchPage(sitemapUrl);
    if (!xml) continue;

    const $ = cheerio.load(xml, { xml: true });

    // Check for sitemap index -> product sitemaps
    $("sitemap loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (
        loc &&
        (loc.includes("product") || loc.includes("catalog")) &&
        !sitemapUrls.includes(loc)
      ) {
        sitemapUrls.push(loc);
      }
    });

    // Extract product URLs from urlset
    $("url loc").each((_, el) => {
      if (productUrls.length >= 3) return;
      const loc = $(el).text().trim();
      if (loc && isProductUrl(loc)) {
        productUrls.push(loc);
      }
    });
  }

  // Fetch each discovered product page and extract JSON-LD
  const fetchPromises = productUrls.slice(0, 3).map(async (productUrl) => {
    const html = await fetchPage(productUrl);
    if (!html) return [];
    const { products: pageProducts } = extractJsonLd(html, productUrl);
    // If JSON-LD didn't work, try meta tags
    if (pageProducts.length === 0) {
      const metaProduct = extractMetaTags(html, productUrl);
      return metaProduct ? [metaProduct] : [];
    }
    return pageProducts;
  });

  const results = await Promise.allSettled(fetchPromises);
  for (const result of results) {
    if (result.status === "fulfilled") {
      products.push(...result.value);
    }
  }

  const feed: DiscoveredFeed | null =
    productUrls.length > 0
      ? {
          type: "sitemap",
          url: sitemapUrls[0],
          productCount: productUrls.length,
        }
      : null;

  return { products, feed };
}

// ---------------------------------------------------------------------------
// Strategy 3: Shopify /products.json detection
// ---------------------------------------------------------------------------

async function detectShopify(
  baseUrl: string,
): Promise<{ products: NormalizedProduct[]; feed: DiscoveredFeed | null }> {
  const products: NormalizedProduct[] = [];
  const feedUrl = `${baseUrl}/products.json?limit=10`;
  const body = await fetchPage(feedUrl);
  if (!body) return { products, feed: null };

  const parsed = safeJsonParse(body);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Record<string, unknown>).products)
  ) {
    return { products, feed: null };
  }

  const shopifyProducts = (parsed as Record<string, unknown>)
    .products as Array<Record<string, unknown>>;

  for (const p of shopifyProducts) {
    const variants = Array.isArray(p.variants)
      ? (p.variants as Array<Record<string, unknown>>)
      : [];
    const firstVariant = variants[0] ?? {};
    const images = Array.isArray(p.images)
      ? (p.images as Array<Record<string, unknown>>)
      : [];

    products.push({
      source: "shopify",
      title: str(p.title),
      description: str(p.body_html),
      url: p.handle
        ? `${baseUrl}/products/${p.handle}`
        : undefined,
      imageUrl: str(
        images[0]?.src,
      ),
      price:
        str(firstVariant.price) ??
        str(p.price),
      currency: undefined, // Shopify /products.json doesn't include currency
      availability: firstVariant.available ? "in_stock" : "out_of_stock",
      brand: str(p.vendor),
      sku: str(firstVariant.sku),
      gtin: str(firstVariant.barcode),
      variants:
        variants.length > 1
          ? variants.map((v) => ({
              title: v.title,
              price: v.price,
              sku: v.sku,
              available: v.available,
            }))
          : undefined,
      rawData: p,
    });
  }

  const feed: DiscoveredFeed = {
    type: "shopify",
    url: feedUrl,
    productCount: shopifyProducts.length,
  };

  return { products, feed };
}

// ---------------------------------------------------------------------------
// Strategy 4: Meta tag extraction (OpenGraph + product meta)
// ---------------------------------------------------------------------------

function extractMetaTags(
  html: string,
  baseUrl: string,
): NormalizedProduct | null {
  const $ = cheerio.load(html);

  const getMeta = (property: string): string | undefined => {
    const content =
      $(`meta[property="${property}"]`).attr("content") ??
      $(`meta[name="${property}"]`).attr("content");
    return str(content);
  };

  const ogTitle = getMeta("og:title");
  const priceAmount = getMeta("product:price:amount");

  // Only consider this a product if we have at least a title and some product signal
  if (!ogTitle && !priceAmount) return null;

  return {
    source: "meta-tags",
    title: ogTitle,
    description: getMeta("og:description"),
    imageUrl: resolveUrl(getMeta("og:image"), baseUrl),
    url: resolveUrl(getMeta("og:url"), baseUrl) ?? baseUrl,
    price: priceAmount,
    currency: getMeta("product:price:currency"),
    availability: getMeta("product:availability"),
    rawData: {
      ogTitle,
      ogDescription: getMeta("og:description"),
      ogImage: getMeta("og:image"),
      productPrice: priceAmount,
      productCurrency: getMeta("product:price:currency"),
      productAvailability: getMeta("product:availability"),
    },
  };
}

// ---------------------------------------------------------------------------
// Strategy 5: Microdata extraction
// ---------------------------------------------------------------------------

function extractMicrodata(
  html: string,
  baseUrl: string,
): { products: NormalizedProduct[]; feed: DiscoveredFeed | null } {
  const $ = cheerio.load(html);
  const products: NormalizedProduct[] = [];

  $('[itemtype*="schema.org/Product"]').each((_, el) => {
    const $product = $(el);

    const getProp = (name: string): string | undefined => {
      const $el = $product.find(`[itemprop="${name}"]`).first();
      return str(
        $el.attr("content") ?? $el.attr("href") ?? $el.text(),
      );
    };

    const getNestedProp = (
      parent: string,
      child: string,
    ): string | undefined => {
      const $parent = $product
        .find(`[itemprop="${parent}"]`)
        .first();
      const $child = $parent.find(`[itemprop="${child}"]`).first();
      return str(
        $child.attr("content") ?? $child.attr("href") ?? $child.text(),
      );
    };

    const title = getProp("name");
    if (!title) return; // Skip empty entries

    const imageUrl =
      resolveUrl(
        $product.find('[itemprop="image"]').first().attr("src") ??
          $product.find('[itemprop="image"]').first().attr("content"),
        baseUrl,
      );

    products.push({
      source: "microdata",
      title,
      description: getProp("description"),
      url: resolveUrl(getProp("url"), baseUrl) ?? baseUrl,
      imageUrl,
      price: getNestedProp("offers", "price"),
      currency: getNestedProp("offers", "priceCurrency"),
      availability: getNestedProp("offers", "availability"),
      brand: getNestedProp("brand", "name") ?? getProp("brand"),
      sku: getProp("sku"),
      gtin:
        getProp("gtin") ??
        getProp("gtin13") ??
        getProp("gtin12"),
      rawData: {},
    });
  });

  const feed: DiscoveredFeed | null =
    products.length > 0
      ? {
          type: "microdata",
          url: baseUrl,
          productCount: products.length,
        }
      : null;

  return { products, feed };
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateProducts(
  products: NormalizedProduct[],
): NormalizedProduct[] {
  const seen = new Set<string>();
  const unique: NormalizedProduct[] = [];

  for (const product of products) {
    // Build a dedup key from URL or title+price combo
    const key =
      product.url ??
      `${product.title ?? ""}::${product.price ?? ""}::${product.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(product);
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function discoverProducts(url: string): Promise<{
  products: NormalizedProduct[];
  feeds: DiscoveredFeed[];
}> {
  const allProducts: NormalizedProduct[] = [];
  const allFeeds: DiscoveredFeed[] = [];

  // Step 1: Fetch the homepage HTML (needed by several strategies)
  const homepageHtml = await fetchPage(url);

  // Step 2: Run all strategies in parallel
  const strategies = await Promise.allSettled([
    // Strategy 1: JSON-LD from homepage
    (async () => {
      if (!homepageHtml) return null;
      return extractJsonLd(homepageHtml, url);
    })(),

    // Strategy 2: Sitemap discovery
    (async () => {
      return discoverSitemap(url);
    })(),

    // Strategy 3: Shopify detection
    (async () => {
      return detectShopify(url);
    })(),

    // Strategy 4: Meta tags from homepage
    (async () => {
      if (!homepageHtml) return null;
      const product = extractMetaTags(homepageHtml, url);
      return product
        ? {
            products: [product],
            feed: {
              type: "meta-tags" as const,
              url,
              productCount: 1,
            },
          }
        : null;
    })(),

    // Strategy 5: Microdata from homepage
    (async () => {
      if (!homepageHtml) return null;
      return extractMicrodata(homepageHtml, url);
    })(),
  ]);

  // Step 3: Collect results from all strategies
  for (const result of strategies) {
    if (result.status === "rejected") {
      console.error("Crawler strategy failed:", result.reason);
      continue;
    }

    const value = result.value;
    if (!value) continue;

    if ("products" in value && Array.isArray(value.products)) {
      allProducts.push(...value.products);
    }
    if ("feed" in value && value.feed) {
      allFeeds.push(value.feed as DiscoveredFeed);
    }
  }

  // Step 4: Deduplicate and cap
  const unique = deduplicateProducts(allProducts);
  const capped = unique.slice(0, MAX_PRODUCTS);

  return {
    products: capped,
    feeds: allFeeds,
  };
}
