import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { Product, DiscoveryResult, ReviewData } from "./types";
import { safeFetch } from "./utils";

const EMPTY_PRODUCT: Product = {
  item_id: "",
  title: "",
  description: "",
  url: "",
  brand: "",
  image_url: "",
  availability: "",
  price: "",
  group_id: "",
  listing_has_variations: false,
  target_countries: [],
  store_country: "",
  seller_name: "",
  seller_url: "",
  sale_price: "",
  variant_dict: {},
  size: "",
  reviews: null,
  review_count: 0,
  star_rating: "",
  review_list: [],
  q_and_a: [],
  age_group: "",
  gender: "",
  related_product_id: "",
  warning: "",
  warning_url: "",
  additional_images: [],
  material: "",
  condition: "",
  weight: "",
  dimensions: "",
  video_url: "",
  shipping_details: "",
  return_policy: "",
  category: "",
  structuredDataFormat: "",
};

const MAX_PRODUCTS = 1000;

/**
 * Safely parse JSON that may be malformed:
 * - strips BOM, trailing commas, JS comments
 * - handles concatenated JSON objects (takes the first one)
 * - returns null on failure instead of throwing
 */
function safeJsonParse(text: string): unknown | null {
  // Strip BOM
  let cleaned = text.replace(/^\uFEFF/, "").trim();

  // Try direct parse first (fast path)
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue to cleanup
  }

  // Strip single-line JS comments (// ...) that aren't inside strings
  cleaned = cleaned.replace(/(?<!")\/\/[^\n]*/g, "");
  // Strip trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Try to extract just the first complete JSON object/array
  // Find the opening brace/bracket and match it
  const start = cleaned.search(/[{[]/);
  if (start === -1) return null;

  const opener = cleaned[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === opener) depth++;
    else if (ch === closer) {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          // Remove trailing commas and retry
          const fixedSlice = slice.replace(/,\s*([}\]])/g, "$1");
          try {
            return JSON.parse(fixedSlice);
          } catch {
            return null;
          }
        }
      }
    }
  }

  return null;
}

// Concurrency for page-by-page scraping (sitemap strategy)
const PARALLEL_BATCH_SIZE = 10;


function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url.replace(/\/+$/, "");
}

function sellerFromUrl(baseUrl: string): { name: string; url: string } {
  try {
    const u = new URL(baseUrl);
    const host = u.hostname.replace(/^www\./, "");
    const name = host.split(".")[0];
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      url: u.origin,
    };
  } catch {
    return { name: "", url: "" };
  }
}

/** Fetch multiple URLs in parallel batches */
async function fetchInBatches<T>(
  urls: string[],
  processFn: (url: string, res: Response) => Promise<T[]>,
  batchSize: number,
  maxResults: number
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < urls.length && results.length < maxResults; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        const res = await safeFetch(url);
        if (!res) return [];
        return processFn(url, res);
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(...result.value);
        if (results.length >= maxResults) break;
      }
    }
  }

  return results.slice(0, maxResults);
}

// ─── Shopify JSON parser ─────────────────────────────────────

function parseShopifyProduct(
  item: Record<string, unknown>,
  baseUrl: string
): Product {
  const seller = sellerFromUrl(baseUrl);

  const images: string[] = [];
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === "string") images.push(img);
      else if (img && typeof img === "object" && "src" in img)
        images.push(String((img as Record<string, unknown>).src));
    }
  } else if (
    item.image &&
    typeof item.image === "object" &&
    "src" in item.image
  ) {
    images.push(String((item.image as Record<string, unknown>).src));
  }

  const variants = Array.isArray(item.variants) ? item.variants : [];
  const firstVariant = (variants[0] || {}) as Record<string, unknown>;
  const hasVariations = variants.length > 1;

  const variant_dict: Record<string, string> = {};
  for (let i = 1; i <= 3; i++) {
    const optName = String(item[`option${i}`] || item[`option_${i}`] || "");
    const optVal = String(firstVariant[`option${i}`] || "");
    if (optName && optVal && optName !== "Title" && optVal !== "Default Title") {
      variant_dict[optName] = optVal;
    }
  }

  const priceVal = firstVariant.price ? String(firstVariant.price) : "";
  const salePrice =
    firstVariant.compare_at_price &&
    String(firstVariant.compare_at_price) !== priceVal
      ? `${priceVal} USD`
      : "";

  const tags = typeof item.tags === "string" ? item.tags : "";

  return {
    ...EMPTY_PRODUCT,
    item_id: String(item.id || ""),
    title: String(item.title || ""),
    description: String(item.body_html || ""),
    url: item.handle ? `${baseUrl}/products/${item.handle}` : "",
    brand: String(item.vendor || ""),
    image_url: images[0] || "",
    availability: firstVariant.available ? "in_stock" : "out_of_stock",
    price: priceVal ? `${priceVal} USD` : "",
    group_id: hasVariations ? String(item.id || "") : "",
    listing_has_variations: hasVariations,
    seller_name: seller.name,
    seller_url: seller.url,
    sale_price: salePrice,
    variant_dict,
    size: variant_dict["Size"] || variant_dict["size"] || "",
    additional_images: images.slice(1),
    weight: firstVariant.weight
      ? `${firstVariant.weight} ${firstVariant.weight_unit || "g"}`
      : "",
    material: tags.toLowerCase().includes("cotton")
      ? "cotton"
      : tags.toLowerCase().includes("leather")
      ? "leather"
      : "",
    category: String(item.product_type || ""),
    structuredDataFormat: "json",
  };
}

// ─── XML / Google Shopping feed parser ───────────────────────

function parseXmlProduct(
  item: Record<string, unknown>,
  baseUrl: string
): Product {
  const seller = sellerFromUrl(baseUrl);

  const images: string[] = [];
  const primaryImage = String(
    item["g:image_link"] || item["image_link"] || ""
  );
  if (primaryImage) images.push(primaryImage);
  const additional =
    item["g:additional_image_link"] || item["additional_image_link"];
  if (Array.isArray(additional)) {
    for (const img of additional) images.push(String(img));
  } else if (additional) {
    images.push(String(additional));
  }

  const priceStr = String(item["g:price"] || item["price"] || "");
  const salePriceStr = String(
    item["g:sale_price"] || item["sale_price"] || ""
  );

  const groupId = String(
    item["g:item_group_id"] || item["item_group_id"] || ""
  );

  return {
    ...EMPTY_PRODUCT,
    item_id: String(item["g:id"] || item["id"] || ""),
    title: String(item["g:title"] || item["title"] || ""),
    description: String(
      item["g:description"] || item["description"] || ""
    ),
    url: String(item["g:link"] || item["link"] || ""),
    brand: String(item["g:brand"] || item["brand"] || ""),
    image_url: images[0] || "",
    availability: String(
      item["g:availability"] || item["availability"] || ""
    ),
    price: priceStr,
    group_id: groupId,
    listing_has_variations: groupId.length > 0,
    seller_name: seller.name,
    seller_url: seller.url,
    sale_price: salePriceStr,
    size: String(item["g:size"] || item["size"] || ""),
    additional_images: images.slice(1),
    material: String(item["g:material"] || item["material"] || ""),
    condition: String(item["g:condition"] || item["condition"] || ""),
    weight: String(
      item["g:shipping_weight"] || item["shipping_weight"] || ""
    ),
    shipping_details: String(item["g:shipping"] || ""),
    category: String(
      item["g:product_type"] ||
        item["g:google_product_category"] ||
        item["product_type"] ||
        ""
    ),
    structuredDataFormat: "xml",
  };
}

// ─── Schema.org JSON-LD parser ───────────────────────────────

function parseSchemaProduct(
  schema: Record<string, unknown>,
  baseUrl: string
): Product {
  const seller = sellerFromUrl(baseUrl);

  const images: string[] = [];
  if (Array.isArray(schema.image)) {
    for (const img of schema.image) {
      if (typeof img === "string") images.push(img);
      else if (img && typeof img === "object" && "url" in img)
        images.push(String((img as Record<string, unknown>).url));
    }
  } else if (typeof schema.image === "string") {
    images.push(schema.image);
  }

  const offersRaw = Array.isArray(schema.offers)
    ? schema.offers[0]
    : schema.offers || {};
  const offers = (offersRaw || {}) as Record<string, unknown>;

  let reviews: ReviewData | null = null;
  if (schema.aggregateRating && typeof schema.aggregateRating === "object") {
    const ar = schema.aggregateRating as Record<string, unknown>;
    reviews = {
      rating: Number(ar.ratingValue || 0),
      count: Number(ar.reviewCount || ar.ratingCount || 0),
    };
  }

  const brandRaw = schema.brand;
  const brand =
    brandRaw && typeof brandRaw === "object"
      ? String((brandRaw as Record<string, unknown>).name || "")
      : String(brandRaw || "");

  const priceCurrency = String(offers.priceCurrency || "");
  const priceVal = offers.price ? `${offers.price} ${priceCurrency}` : "";

  const offerSeller = offers.seller as Record<string, unknown> | undefined;
  const sellerName = offerSeller
    ? String(offerSeller.name || seller.name)
    : seller.name;

  return {
    ...EMPTY_PRODUCT,
    item_id: String(schema.sku || schema.productID || ""),
    title: String(schema.name || ""),
    description: String(schema.description || ""),
    url: String(schema.url || ""),
    brand,
    image_url: images[0] || "",
    availability: String(offers.availability || ""),
    price: priceVal,
    group_id: String(schema.isVariantOf || schema.inProductGroupWithID || ""),
    listing_has_variations: Boolean(
      schema.hasVariant ||
        schema.isVariantOf ||
        schema.inProductGroupWithID
    ),
    seller_name: sellerName,
    seller_url: seller.url,
    reviews,
    additional_images: images.slice(1),
    material: String(schema.material || ""),
    condition: String(schema.itemCondition || ""),
    weight:
      schema.weight && typeof schema.weight === "object"
        ? String(
            (schema.weight as Record<string, unknown>).value || ""
          )
        : String(schema.weight || ""),
    return_policy: String(schema.hasMerchantReturnPolicy ? "yes" : ""),
    category: String(schema.category || ""),
    structuredDataFormat: "json-ld",
  };
}

// ─── Discovery strategies ────────────────────────────────────

/**
 * Shopify JSON: paginate through /products.json?limit=250&page=N
 * Shopify caps at 250 per page. We fetch up to 4 pages = 1000 products.
 */
async function tryShopifyJson(
  baseUrl: string
): Promise<DiscoveryResult | null> {
  const endpoints = ["/products.json", "/collections/all/products.json"];

  for (const endpoint of endpoints) {
    // First page — check if this endpoint works at all
    const firstUrl = `${baseUrl}${endpoint}?limit=250&page=1`;
    const firstRes = await safeFetch(firstUrl);
    if (!firstRes) continue;

    try {
      const firstText = await firstRes.text();
      const firstData = safeJsonParse(firstText) as Record<string, unknown> | null;
      if (!firstData) continue;
      const firstItems = (firstData.products || []) as Record<string, unknown>[];
      if (firstItems.length === 0) continue;

      const allItems: Record<string, unknown>[] = [...firstItems];

      // If we got a full page, keep paginating
      if (firstItems.length >= 250) {
        const maxPages = Math.ceil(MAX_PRODUCTS / 250); // 4 pages for 1000
        for (let page = 2; page <= maxPages; page++) {
          const pageUrl = `${baseUrl}${endpoint}?limit=250&page=${page}`;
          const pageRes = await safeFetch(pageUrl);
          if (!pageRes) break;

          const pageText = await pageRes.text();
          const pageData = safeJsonParse(pageText) as Record<string, unknown> | null;
          if (!pageData) break;
          const pageItems = (pageData.products || []) as Record<string, unknown>[];
          if (pageItems.length === 0) break;

          allItems.push(...pageItems);
          if (pageItems.length < 250) break; // last page
        }
      }

      const products = allItems
        .slice(0, MAX_PRODUCTS)
        .map((p) => parseShopifyProduct(p, baseUrl));

      return {
        products,
        feedType: "Shopify JSON",
        feedUrl: `${baseUrl}${endpoint}`,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * XML feeds: parse the entire feed up to MAX_PRODUCTS.
 * XML feeds can be large but are a single file download.
 */
async function tryXmlFeeds(
  baseUrl: string
): Promise<DiscoveryResult | null> {
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

  for (const endpoint of endpoints) {
    const url = baseUrl + endpoint;
    // XML feeds can be large — allow 30s for download
    const res = await safeFetch(url, 30000);
    if (!res) continue;

    try {
      const text = await res.text();
      if (!text.includes("<")) continue;
      const xml = parser.parse(text);

      const channel = xml?.rss?.channel || xml?.feed || xml;
      const items = channel?.item || channel?.entry || [];
      const itemList = Array.isArray(items) ? items : [items];
      if (itemList.length === 0 || !itemList[0]) continue;

      const products = itemList
        .slice(0, MAX_PRODUCTS)
        .map((item: Record<string, unknown>) =>
          parseXmlProduct(item, baseUrl)
        );
      return { products, feedType: "XML Feed", feedUrl: url };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * HTML scraping: extract JSON-LD from the homepage and discovered feed links.
 * Homepage usually only has a few products, so this caps at whatever is on-page.
 */
async function tryScrapeHtml(
  baseUrl: string
): Promise<DiscoveryResult | null> {
  const res = await safeFetch(baseUrl);
  if (!res) return null;

  try {
    const html = await res.text();
    const $ = cheerio.load(html);
    const products: Product[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      const json = safeJsonParse($(el).html() || "{}");
      if (!json) return; // skip malformed JSON-LD blocks
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        if (
          schema["@type"] === "Product" ||
          schema["@type"] === "ProductGroup"
        ) {
          products.push(parseSchemaProduct(schema as Record<string, unknown>, baseUrl));
        }
        if (Array.isArray(schema["@graph"])) {
          for (const node of schema["@graph"]) {
            if (
              node["@type"] === "Product" ||
              node["@type"] === "ProductGroup"
            ) {
              products.push(parseSchemaProduct(node as Record<string, unknown>, baseUrl));
            }
          }
        }
      }
    });

    if (products.length > 0) {
      return {
        products: products.slice(0, MAX_PRODUCTS),
        feedType: "Schema.org JSON-LD",
        feedUrl: baseUrl,
      };
    }

    // Discover feed links from HTML <link> tags — these may contain full catalogs
    const feedLinks: string[] = [];
    $(
      'link[type="application/rss+xml"], link[type="application/atom+xml"], link[rel="alternate"][type*="xml"]'
    ).each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        feedLinks.push(href.startsWith("http") ? href : baseUrl + href);
      }
    });

    if (feedLinks.length > 0) {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      for (const feedUrl of feedLinks.slice(0, 3)) {
        const feedRes = await safeFetch(feedUrl, 30000);
        if (!feedRes) continue;
        try {
          const text = await feedRes.text();
          const xml = parser.parse(text);
          const channel = xml?.rss?.channel || xml?.feed || xml;
          const items = channel?.item || channel?.entry || [];
          const itemList = Array.isArray(items) ? items : [items];
          if (itemList.length > 0 && itemList[0]) {
            return {
              products: itemList
                .slice(0, MAX_PRODUCTS)
                .map((item: Record<string, unknown>) =>
                  parseXmlProduct(item, baseUrl)
                ),
              feedType: "Discovered XML Feed",
              feedUrl,
            };
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // scraping failed
  }

  return null;
}

/**
 * Sitemap crawling: find product URLs in sitemap.xml, then fetch each
 * product page in parallel batches to extract JSON-LD.
 *
 * Also follows sitemap index files to find product-specific sub-sitemaps.
 */
async function trySitemap(
  baseUrl: string
): Promise<DiscoveryResult | null> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const sitemapRes = await safeFetch(baseUrl + "/sitemap.xml", 20000);
  if (!sitemapRes) return null;

  try {
    const text = await sitemapRes.text();
    const xml = parser.parse(text);

    let productUrls: string[] = [];

    // Check if this is a sitemap index (has sub-sitemaps)
    const sitemaps = xml?.sitemapindex?.sitemap;
    if (sitemaps) {
      const sitemapList = Array.isArray(sitemaps) ? sitemaps : [sitemaps];

      // Look for product-specific sub-sitemaps first
      const productSitemapUrls = sitemapList
        .map((s: Record<string, unknown>) => String(s.loc || ""))
        .filter(
          (loc: string) =>
            loc.includes("product") || loc.includes("item")
        );

      // If no product-specific sitemaps, try all of them
      const sitemapUrlsToFetch =
        productSitemapUrls.length > 0
          ? productSitemapUrls.slice(0, 5)
          : sitemapList
              .map((s: Record<string, unknown>) => String(s.loc || ""))
              .slice(0, 3);

      for (const smUrl of sitemapUrlsToFetch) {
        if (productUrls.length >= MAX_PRODUCTS) break;
        const smRes = await safeFetch(smUrl, 20000);
        if (!smRes) continue;
        try {
          const smText = await smRes.text();
          const smXml = parser.parse(smText);
          const smUrls = smXml?.urlset?.url || [];
          const smUrlList = Array.isArray(smUrls) ? smUrls : [smUrls];
          const urls = smUrlList
            .map((u: Record<string, unknown>) => String(u.loc || ""))
            .filter(
              (loc: string) =>
                loc.includes("/product") ||
                loc.includes("/item") ||
                loc.includes("/p/")
            );
          productUrls.push(...urls);
        } catch {
          continue;
        }
      }
    } else {
      // Direct urlset
      const urls = xml?.urlset?.url || [];
      const urlList = Array.isArray(urls) ? urls : [urls];
      productUrls = urlList
        .map((u: Record<string, unknown>) => String(u.loc || ""))
        .filter(
          (loc: string) =>
            loc.includes("/product") ||
            loc.includes("/item") ||
            loc.includes("/p/")
        );
    }

    // Cap the URLs we'll actually fetch
    productUrls = productUrls.slice(0, MAX_PRODUCTS);

    if (productUrls.length === 0) return null;

    // Fetch product pages in parallel batches and extract schema.org
    const products = await fetchInBatches<Product>(
      productUrls,
      async (_url, res) => {
        const pageProducts: Product[] = [];
        const html = await res.text();
        const $ = cheerio.load(html);
        $('script[type="application/ld+json"]').each((_, el) => {
          const json = safeJsonParse($(el).html() || "{}");
          if (!json) return; // skip malformed JSON-LD blocks
          const schemas = Array.isArray(json) ? json : [json];
          for (const schema of schemas) {
            if (schema["@type"] === "Product") {
              pageProducts.push(parseSchemaProduct(schema as Record<string, unknown>, baseUrl));
            }
            if (Array.isArray(schema["@graph"])) {
              for (const node of schema["@graph"]) {
                if (node["@type"] === "Product") {
                  pageProducts.push(parseSchemaProduct(node as Record<string, unknown>, baseUrl));
                }
              }
            }
          }
        });
        return pageProducts;
      },
      PARALLEL_BATCH_SIZE,
      MAX_PRODUCTS
    );

    if (products.length > 0) {
      return {
        products,
        feedType: "Sitemap + Schema.org",
        feedUrl: baseUrl + "/sitemap.xml",
      };
    }
  } catch {
    // sitemap failed
  }

  return null;
}

// ─── Main entry ──────────────────────────────────────────────

export async function discoverFeed(
  inputUrl: string
): Promise<DiscoveryResult> {
  const baseUrl = normalizeUrl(inputUrl);

  const shopify = await tryShopifyJson(baseUrl);
  if (shopify) return shopify;

  const xml = await tryXmlFeeds(baseUrl);
  if (xml) return xml;

  const scraped = await tryScrapeHtml(baseUrl);
  if (scraped) return scraped;

  const sitemap = await trySitemap(baseUrl);
  if (sitemap) return sitemap;

  throw new Error(
    "No product feed found. We checked JSON endpoints, XML feeds, schema.org markup, and sitemaps."
  );
}
