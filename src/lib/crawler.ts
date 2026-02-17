import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { NormalizedProduct, DiscoveredFeed, StoreMeta, SiteData } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT = "CarveBot/1.0 (+https://carve.co)";
const FETCH_TIMEOUT_MS = 4_000;
const MAX_REDIRECTS = 3;
const MAX_PRODUCTS = 50;

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

  // Extract condition from itemCondition, stripping schema.org prefix
  const rawCondition = str(firstOffer.itemCondition);
  const condition = rawCondition
    ? rawCondition.replace(/^https?:\/\/schema\.org\//, "")
    : undefined;

  // Extract productId from productID or sku
  const productId = str(data.productID) ?? str(data.sku);

  // Extract additional images (skip the first one, which is the main image)
  const additionalImageUrls: string[] = [];
  if (Array.isArray(data.image) && data.image.length > 1) {
    for (let i = 1; i < data.image.length; i++) {
      const resolved = resolveUrl(data.image[i], baseUrl);
      if (resolved) additionalImageUrls.push(resolved);
    }
  }

  return {
    source: "json-ld",
    title: str(data.name),
    description: str(data.description),
    url: resolveUrl(data.url, baseUrl),
    imageUrl: resolveUrl(
      Array.isArray(data.image) ? data.image[0] : data.image,
      baseUrl,
    ),
    additionalImageUrls:
      additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
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
    condition,
    productId,
    variants:
      offerList.length > 1
        ? offerList.map((o) => o as Record<string, unknown>)
        : undefined,
    reviews: reviews
      ? {
          rating: Number(reviews.ratingValue) || 0,
          count: Number(reviews.reviewCount ?? reviews.ratingCount) || 0,
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
// JSON-LD Organization / Store extraction
// ---------------------------------------------------------------------------

const ORG_TYPES = new Set([
  "Organization",
  "WebSite",
  "LocalBusiness",
  "Store",
  "OnlineStore",
]);

/**
 * Search JSON-LD blocks for Organization / Store / WebSite data.
 * Returns basic seller identity info or null.
 */
function extractJsonLdOrganization(
  html: string,
  baseUrl: string,
): { name?: string; url?: string; country?: string } | null {
  const $ = cheerio.load(html);
  const candidates: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    const parsed = safeJsonParse(raw);
    if (!parsed) return;

    const objects: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    for (const obj of objects) {
      if (typeof obj !== "object" || obj === null) continue;
      const record = obj as Record<string, unknown>;

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
    if (!type || !ORG_TYPES.has(type)) continue;

    const address = candidate.address as Record<string, unknown> | undefined;
    const country =
      address && typeof address === "object"
        ? str(address.addressCountry)
        : undefined;

    return {
      name: str(candidate.name),
      url: resolveUrl(candidate.url, baseUrl),
      country,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Shopify policies fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch /policies.json from a Shopify store and extract policy URLs.
 */
async function fetchShopifyPolicies(
  baseUrl: string,
): Promise<{
  returnPolicy?: string;
  privacyPolicy?: string;
  termsOfService?: string;
}> {
  const body = await fetchPage(`${baseUrl}/policies.json`);
  if (!body) return {};

  const parsed = safeJsonParse(body);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Record<string, unknown>).policies)
  ) {
    return {};
  }

  const policies = (parsed as Record<string, unknown>).policies as Array<
    Record<string, unknown>
  >;

  const result: {
    returnPolicy?: string;
    privacyPolicy?: string;
    termsOfService?: string;
  } = {};

  for (const policy of policies) {
    const policyType = str(policy.type);
    const policyBody = str(policy.body);
    if (!policyType || !policyBody) continue;

    // Build URL from type slug: e.g. "refund_policy" → "refund-policy"
    const slug = policyType.replace(/_/g, "-");
    const policyUrl = `${baseUrl}/policies/${slug}`;

    if (policyType === "refund_policy") {
      result.returnPolicy = policyUrl;
    } else if (policyType === "privacy_policy") {
      result.privacyPolicy = policyUrl;
    } else if (policyType === "terms_of_service") {
      result.termsOfService = policyUrl;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Footer link scanner
// ---------------------------------------------------------------------------

/**
 * Scan footer (or bottom-of-page) links for policy URLs.
 */
function scanFooterLinks(
  html: string,
  baseUrl: string,
): {
  returnPolicy?: string;
  privacyPolicy?: string;
  termsOfService?: string;
} {
  const $ = cheerio.load(html);

  const links = $("footer").length > 0 ? $("footer a") : $("a").slice(-50);

  const result: {
    returnPolicy?: string;
    privacyPolicy?: string;
    termsOfService?: string;
  } = {};

  links.each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const resolved = resolveUrl(href, baseUrl);
    if (!resolved) return;

    const hrefLower = href.toLowerCase();

    if (/return|refund/i.test(hrefLower) && !result.returnPolicy) {
      result.returnPolicy = resolved;
    }
    if (/privacy/i.test(hrefLower) && !result.privacyPolicy) {
      result.privacyPolicy = resolved;
    }
    if (/terms|tos|conditions/i.test(hrefLower) && !result.termsOfService) {
      result.termsOfService = resolved;
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// Store metadata extraction
// ---------------------------------------------------------------------------

/**
 * Build store-level metadata by combining JSON-LD, footer links, HTML hints,
 * and (for Shopify) the policies.json endpoint.
 */
async function extractStoreMeta(
  html: string | null,
  baseUrl: string,
  isShopify: boolean,
): Promise<StoreMeta> {
  const meta: StoreMeta = {
    sellerName: null,
    sellerUrl: baseUrl,
    returnPolicy: null,
    privacyPolicyUrl: null,
    termsOfServiceUrl: null,
    storeCountry: null,
    targetCountries: [],
    platform: isShopify ? "shopify" : "custom",
  };

  if (html) {
    // (a) JSON-LD Organization data
    const org = extractJsonLdOrganization(html, baseUrl);
    if (org) {
      if (org.name) meta.sellerName = org.name;
      if (org.country) meta.storeCountry = org.country;
    }

    // (b) Footer link scan
    const footerLinks = scanFooterLinks(html, baseUrl);
    if (footerLinks.returnPolicy) meta.returnPolicy = footerLinks.returnPolicy;
    if (footerLinks.privacyPolicy)
      meta.privacyPolicyUrl = footerLinks.privacyPolicy;
    if (footerLinks.termsOfService)
      meta.termsOfServiceUrl = footerLinks.termsOfService;

    // (c) <html lang="xx"> as storeCountry fallback
    const $ = cheerio.load(html);
    if (!meta.storeCountry) {
      const htmlLang = $("html").attr("lang");
      if (htmlLang && htmlLang.length >= 2) {
        meta.storeCountry = htmlLang.slice(0, 2).toUpperCase();
      }
    }

    // (d) <link rel="alternate" hreflang="xx"> for targetCountries
    const hreflangs = new Set<string>();
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const hl = $(el).attr("hreflang");
      if (hl && hl !== "x-default") {
        hreflangs.add(hl.slice(0, 2).toUpperCase());
      }
    });
    if (hreflangs.size > 0) {
      meta.targetCountries = Array.from(hreflangs);
    }

    // (e) og:site_name as sellerName fallback
    if (!meta.sellerName) {
      const ogSiteName =
        $('meta[property="og:site_name"]').attr("content");
      if (ogSiteName) {
        meta.sellerName = ogSiteName.trim() || null;
      }
    }
  }

  // Shopify policies are more reliable than footer links
  if (isShopify) {
    const shopifyPolicies = await fetchShopifyPolicies(baseUrl);
    if (shopifyPolicies.returnPolicy)
      meta.returnPolicy = shopifyPolicies.returnPolicy;
    if (shopifyPolicies.privacyPolicy)
      meta.privacyPolicyUrl = shopifyPolicies.privacyPolicy;
    if (shopifyPolicies.termsOfService)
      meta.termsOfServiceUrl = shopifyPolicies.termsOfService;
  }

  return meta;
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

/**
 * Parse a single page of Shopify /products.json into NormalizedProduct[].
 */
function parseShopifyProducts(
  shopifyProducts: Array<Record<string, unknown>>,
  baseUrl: string,
): NormalizedProduct[] {
  const products: NormalizedProduct[] = [];

  for (const p of shopifyProducts) {
    const variants = Array.isArray(p.variants)
      ? (p.variants as Array<Record<string, unknown>>)
      : [];
    const firstVariant = variants[0] ?? {};
    const images = Array.isArray(p.images)
      ? (p.images as Array<Record<string, unknown>>)
      : [];

    // Extract additional images (skip the first)
    const additionalImageUrls: string[] = images
      .slice(1)
      .map((img) => str(img.src))
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    // Extract tags
    const tags: string[] | undefined = Array.isArray(p.tags)
      ? (p.tags as unknown[]).filter(
          (t): t is string => typeof t === "string",
        )
      : typeof p.tags === "string"
        ? (p.tags as string).split(", ")
        : undefined;

    // Extract options
    const options: Array<{ name: string; values: string[] }> | undefined =
      Array.isArray(p.options)
        ? (p.options as Array<Record<string, unknown>>).map((o) => ({
            name: String(o.name || ""),
            values: Array.isArray(o.values)
              ? (o.values as unknown[]).map(String)
              : [],
          }))
        : undefined;

    // Build a map of image id -> src for variant image cross-referencing
    const imageIdMap = new Map<string, string>();
    for (const img of images) {
      const imgId = str(img.id);
      const imgSrc = str(img.src);
      if (imgId && imgSrc) {
        imageIdMap.set(imgId, imgSrc);
      }
    }

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
      additionalImageUrls:
        additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
      price:
        str(firstVariant.price) ??
        str(p.price),
      currency: undefined, // Shopify /products.json doesn't include currency
      availability: firstVariant.available ? "in_stock" : "out_of_stock",
      brand: str(p.vendor),
      sku: str(firstVariant.sku),
      gtin: str(firstVariant.barcode),
      productId: str(p.id),
      productType: str(p.product_type),
      tags: tags && tags.length > 0 ? tags : undefined,
      options: options && options.length > 0 ? options : undefined,
      variants:
        variants.length > 1
          ? variants.map((v) => ({
              title: v.title as string | undefined,
              price: v.price as string | undefined,
              sku: v.sku as string | undefined,
              available: v.available as boolean | undefined,
              variantId: str(v.id),
              imageUrl: v.image_id
                ? imageIdMap.get(String(v.image_id))
                : undefined,
              option1: str(v.option1),
              option2: str(v.option2),
              option3: str(v.option3),
              compareAtPrice: str(v.compare_at_price),
            }))
          : undefined,
      rawData: p,
    });
  }

  return products;
}

async function detectShopify(
  baseUrl: string,
): Promise<{ products: NormalizedProduct[]; feed: DiscoveredFeed | null }> {
  const allProducts: NormalizedProduct[] = [];
  const maxPages = 2;
  const perPage = 50;
  let feedUrl = `${baseUrl}/products.json?limit=${perPage}`;

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl =
      page === 1
        ? `${baseUrl}/products.json?limit=${perPage}`
        : `${baseUrl}/products.json?limit=${perPage}&page=${page}`;

    const body = await fetchPage(pageUrl);
    if (!body) break;

    const parsed = safeJsonParse(body);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as Record<string, unknown>).products)
    ) {
      break;
    }

    const shopifyProducts = (parsed as Record<string, unknown>)
      .products as Array<Record<string, unknown>>;

    if (shopifyProducts.length === 0) break;

    if (page === 1) {
      feedUrl = pageUrl;
    }

    allProducts.push(...parseShopifyProducts(shopifyProducts, baseUrl));

    // If we got fewer than perPage, there are no more pages
    if (shopifyProducts.length < perPage) break;
  }

  if (allProducts.length === 0) {
    return { products: [], feed: null };
  }

  const feed: DiscoveredFeed = {
    type: "shopify",
    url: feedUrl,
    productCount: allProducts.length,
  };

  return { products: allProducts, feed };
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
// Strategy 6: XML feed discovery (Google Shopping / RSS / Atom)
// ---------------------------------------------------------------------------

/**
 * Helper: extract a field from an XML item using Google Shopping g: prefix
 * fallback. Fields may appear as "g:title" or just "title".
 */
function xmlField(item: Record<string, unknown>, field: string): string | undefined {
  return str(item[`g:${field}`]) ?? str(item[field]);
}

/**
 * Normalise a single XML feed item into a NormalizedProduct.
 */
function normalizeXmlItem(
  item: Record<string, unknown>,
  baseUrl: string,
): NormalizedProduct {
  // additional_image_link can be a string or an array
  const rawAdditional = item["g:additional_image_link"] ?? item["additional_image_link"];
  const additionalImageUrls: string[] = [];
  if (Array.isArray(rawAdditional)) {
    for (const img of rawAdditional) {
      const resolved = resolveUrl(img, baseUrl);
      if (resolved) additionalImageUrls.push(resolved);
    }
  } else if (rawAdditional) {
    const resolved = resolveUrl(rawAdditional, baseUrl);
    if (resolved) additionalImageUrls.push(resolved);
  }

  // For Atom feeds, link may be an object with @_href
  const rawLink = item["g:link"] ?? item["link"];
  let linkUrl: string | undefined;
  if (typeof rawLink === "object" && rawLink !== null && !Array.isArray(rawLink)) {
    linkUrl = resolveUrl((rawLink as Record<string, unknown>)["@_href"], baseUrl);
  } else {
    linkUrl = resolveUrl(rawLink, baseUrl);
  }

  return {
    source: "xml-feed",
    structuredDataFormat: "xml",
    itemId: xmlField(item, "id"),
    title: xmlField(item, "title"),
    description: xmlField(item, "description"),
    url: linkUrl,
    brand: xmlField(item, "brand"),
    imageUrl: resolveUrl(
      item["g:image_link"] ?? item["image_link"],
      baseUrl,
    ),
    additionalImageUrls: additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
    availability: xmlField(item, "availability"),
    price: xmlField(item, "price"),
    salePrice: str(item["g:sale_price"]),
    productId: str(item["g:item_group_id"]),
    size: str(item["g:size"]),
    material: str(item["g:material"]),
    condition: xmlField(item, "condition"),
    weight: str(item["g:shipping_weight"]),
    category:
      str(item["g:product_type"]) ?? str(item["g:google_product_category"]),
    gtin: str(item["g:gtin"]),
    rawData: item,
  };
}

/**
 * Discover XML product feeds by probing well-known endpoints and parsing
 * RSS 2.0 / Atom feeds (including Google Shopping XML).
 */
async function discoverXmlFeeds(
  baseUrl: string,
): Promise<{ products: NormalizedProduct[]; feed: DiscoveredFeed | null }> {
  const endpoints = [
    "/feed.xml",
    "/feed/products.xml",
    "/products.xml",
    "/google-shopping.xml",
    "/feeds/products.xml",
  ];

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const products: NormalizedProduct[] = [];
  let feedUrl: string | null = null;

  for (const endpoint of endpoints) {
    if (products.length >= MAX_PRODUCTS) break;

    const url = `${baseUrl}${endpoint}`;
    const body = await fetchPage(url);
    if (!body) continue;

    let xml: Record<string, unknown>;
    try {
      xml = parser.parse(body) as Record<string, unknown>;
    } catch {
      continue;
    }

    // Try RSS 2.0 path: rss > channel > item
    let items: unknown[] = [];
    const rss = xml.rss as Record<string, unknown> | undefined;
    if (rss) {
      const channel = rss.channel as Record<string, unknown> | undefined;
      if (channel) {
        const rawItems = channel.item;
        items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
      }
    }

    // Try Atom path: feed > entry
    if (items.length === 0) {
      const feed = xml.feed as Record<string, unknown> | undefined;
      if (feed) {
        const rawEntries = feed.entry;
        items = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
      }
    }

    if (items.length === 0) continue;

    feedUrl = url;
    for (const item of items) {
      if (products.length >= MAX_PRODUCTS) break;
      if (typeof item !== "object" || item === null) continue;
      products.push(normalizeXmlItem(item as Record<string, unknown>, baseUrl));
    }

    // Stop after the first successful feed
    break;
  }

  const feed: DiscoveredFeed | null = feedUrl
    ? {
        type: "xml-feed",
        url: feedUrl,
        productCount: products.length,
      }
    : null;

  return { products, feed };
}

/**
 * Look for XML feed links in the HTML <head> (RSS/Atom autodiscovery).
 * If found, fetch and parse the first discovered feed.
 */
async function discoverXmlFeedsFromHtml(
  html: string,
  baseUrl: string,
): Promise<{ products: NormalizedProduct[]; feed: DiscoveredFeed | null }> {
  const $ = cheerio.load(html);
  const feedUrls: string[] = [];

  // Standard autodiscovery selectors
  $(
    'link[type="application/rss+xml"], link[type="application/atom+xml"], link[type="application/xml"], link[type="text/xml"]',
  ).each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const resolved = resolveUrl(href, baseUrl);
      if (resolved) feedUrls.push(resolved);
    }
  });

  if (feedUrls.length === 0) return { products: [], feed: null };

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const products: NormalizedProduct[] = [];

  for (const url of feedUrls) {
    if (products.length >= MAX_PRODUCTS) break;

    const body = await fetchPage(url);
    if (!body) continue;

    let xml: Record<string, unknown>;
    try {
      xml = parser.parse(body) as Record<string, unknown>;
    } catch {
      continue;
    }

    let items: unknown[] = [];

    const rss = xml.rss as Record<string, unknown> | undefined;
    if (rss) {
      const channel = rss.channel as Record<string, unknown> | undefined;
      if (channel) {
        const rawItems = channel.item;
        items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
      }
    }

    if (items.length === 0) {
      const feed = xml.feed as Record<string, unknown> | undefined;
      if (feed) {
        const rawEntries = feed.entry;
        items = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
      }
    }

    if (items.length === 0) continue;

    // Check if this looks like a product feed (at least one item has price or g:id)
    const hasProductData = items.some((item) => {
      if (typeof item !== "object" || item === null) return false;
      const rec = item as Record<string, unknown>;
      return (
        rec["g:price"] !== undefined ||
        rec["g:id"] !== undefined ||
        rec["g:title"] !== undefined
      );
    });

    if (!hasProductData) continue;

    for (const item of items) {
      if (products.length >= MAX_PRODUCTS) break;
      if (typeof item !== "object" || item === null) continue;
      products.push(normalizeXmlItem(item as Record<string, unknown>, baseUrl));
    }

    if (products.length > 0) {
      return {
        products,
        feed: {
          type: "xml-feed",
          url,
          productCount: products.length,
        },
      };
    }
  }

  return { products: [], feed: null };
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

export async function discoverSiteData(url: string): Promise<SiteData> {
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

    // Strategy 6: XML feed discovery (well-known endpoints)
    (async () => {
      return discoverXmlFeeds(url);
    })(),

    // Strategy 7: XML feeds discovered from HTML <link> tags
    (async () => {
      if (!homepageHtml) return null;
      return discoverXmlFeedsFromHtml(homepageHtml, url);
    })(),
  ]);

  // Step 3: Collect results from all strategies and determine if Shopify
  let isShopify = false;
  const SHOPIFY_STRATEGY_INDEX = 2;

  for (let i = 0; i < strategies.length; i++) {
    const result = strategies[i];
    if (result.status === "rejected") {
      console.error("Crawler strategy failed:", result.reason);
      continue;
    }

    const value = result.value;
    if (!value) continue;

    if ("products" in value && Array.isArray(value.products)) {
      allProducts.push(...value.products);
      if (i === SHOPIFY_STRATEGY_INDEX && value.products.length > 0) {
        isShopify = true;
      }
    }
    if ("feed" in value && value.feed) {
      allFeeds.push(value.feed as DiscoveredFeed);
      if (
        i === SHOPIFY_STRATEGY_INDEX &&
        value.feed &&
        (value.feed as DiscoveredFeed).type === "shopify"
      ) {
        isShopify = true;
      }
    }
  }

  // Step 4: Deduplicate and cap
  const unique = deduplicateProducts(allProducts);
  const capped = unique.slice(0, MAX_PRODUCTS);

  // Step 5: Extract store-level metadata (runs after strategies so we know isShopify)
  const storeMeta = await extractStoreMeta(homepageHtml, url, isShopify);

  return {
    products: capped,
    feeds: allFeeds,
    storeMeta,
  };
}

/** Backward-compatible alias */
export const discoverProducts = discoverSiteData;
