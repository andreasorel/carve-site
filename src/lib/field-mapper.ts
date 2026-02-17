import type {
  NormalizedProduct,
  StoreMeta,
  FieldAudit,
  FieldAuditMap,
  FieldStatus,
  FieldTier,
} from "./types";

// ---------------------------------------------------------------------------
// Extractor definition
// ---------------------------------------------------------------------------

interface FieldExtractor {
  acpField: string;
  tier: FieldTier;
  extract: (p: NormalizedProduct, meta: StoreMeta) => string | null;
  qualityCheck?: (value: string) => string | null;
  fixHint: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stripHtml = (s: string): string => s.replace(/<[^>]*>/g, "");

const VALID_AVAILABILITY = ["instock", "outofstock", "preorder", "backorder"];

const normalizeAvailability = (v: string): string =>
  v.toLowerCase().replace(/^https?:\/\/schema\.org\//, "").replace(/_/g, "");

// ---------------------------------------------------------------------------
// Field extractors (44 total)
// ---------------------------------------------------------------------------

const FIELD_EXTRACTORS: FieldExtractor[] = [
  // -------------------------------------------------------------------------
  // Required fields (17)
  // -------------------------------------------------------------------------

  // 1. title
  {
    acpField: "title",
    tier: "required",
    extract: (p) => p.title ?? null,
    qualityCheck: (v) =>
      v.length > 150 ? "Title exceeds 150 characters" : null,
    fixHint:
      "Add a concise product title to your JSON-LD Product schema or og:title meta tag",
  },

  // 2. description
  {
    acpField: "description",
    tier: "required",
    extract: (p) => p.description ?? null,
    qualityCheck: (v) => {
      const plain = stripHtml(v);
      if (plain.length < 50)
        return "Description under 50 characters \u2014 too thin for agent comprehension";
      if (plain.length < 100)
        return "Description under 100 characters \u2014 agents prefer detailed descriptions";
      return null;
    },
    fixHint:
      "Add detailed product descriptions (100+ characters) covering features, materials, and use cases",
  },

  // 3. url
  {
    acpField: "url",
    tier: "required",
    extract: (p) => p.url ?? null,
    qualityCheck: (v) => {
      try {
        new URL(v);
        return null;
      } catch {
        return "Invalid URL format";
      }
    },
    fixHint:
      "Include a canonical URL in your JSON-LD Product schema or og:url meta tag",
  },

  // 4. image_url
  {
    acpField: "image_url",
    tier: "required",
    extract: (p) => p.imageUrl ?? null,
    qualityCheck: (v) => {
      try {
        const u = new URL(v);
        return u.protocol !== "https:"
          ? "Image not served over HTTPS"
          : null;
      } catch {
        return "Invalid image URL";
      }
    },
    fixHint:
      "Include a high-resolution product image in JSON-LD or og:image, served over HTTPS",
  },

  // 5. price
  {
    acpField: "price",
    tier: "required",
    extract: (p) => p.price ?? null,
    qualityCheck: (v) =>
      /^\d+(\.\d{1,2})?$/.test(v) ? null : "Price not in valid decimal format",
    fixHint:
      "Include offers.price in your JSON-LD Product schema in decimal format (e.g., 29.99)",
  },

  // 6. availability
  {
    acpField: "availability",
    tier: "required",
    extract: (p) => p.availability ?? null,
    qualityCheck: (v) => {
      const normalized = normalizeAvailability(v);
      return VALID_AVAILABILITY.includes(normalized)
        ? null
        : `Unrecognized availability value: "${v}"`;
    },
    fixHint:
      "Set offers.availability to a schema.org value (InStock, OutOfStock, PreOrder, BackOrder)",
  },

  // 7. brand
  {
    acpField: "brand",
    tier: "required",
    extract: (p) => p.brand ?? null,
    fixHint:
      "Add brand name to your JSON-LD Product schema or Shopify vendor field",
  },

  // 8. item_id
  {
    acpField: "item_id",
    tier: "required",
    extract: (p) => {
      const variantId = p.variants?.[0]?.variantId;
      if (variantId != null) return String(variantId);
      if (p.sku != null) return String(p.sku);
      if (p.productId != null) return String(p.productId);
      return null;
    },
    fixHint:
      "Expose a unique product or variant identifier (SKU, GTIN, or numeric ID) in structured data",
  },

  // 9. group_id
  {
    acpField: "group_id",
    tier: "required",
    extract: (p) => p.productId ?? null,
    fixHint:
      "Expose a parent product ID that groups all variants together (e.g., Shopify product ID in JSON-LD)",
  },

  // 10. listing_has_variations
  {
    acpField: "listing_has_variations",
    tier: "required",
    extract: (p) => {
      const hasMultipleVariants = p.variants && p.variants.length > 1;
      const hasOptions = p.options && p.options.length > 0;
      if (hasMultipleVariants || hasOptions) return "true";
      if (p.variants || p.options) return "false";
      return null;
    },
    fixHint:
      "Include variant or option data so agents can determine if a product has size/color variations",
  },

  // 11. is_eligible_search
  {
    acpField: "is_eligible_search",
    tier: "required",
    extract: (p) =>
      p.title && p.imageUrl && p.price && p.availability
        ? "derivable"
        : null,
    fixHint:
      "Ensure title, image, price, and availability are all present \u2014 agents need all four to surface products in search",
  },

  // 12. is_eligible_checkout
  {
    acpField: "is_eligible_checkout",
    tier: "required",
    extract: (p, meta) =>
      p.title && p.price && p.availability && p.url && meta.returnPolicy
        ? "derivable"
        : null,
    fixHint:
      "Agents require complete product data plus a return policy before enabling checkout \u2014 ensure all core fields and return policy are present",
  },

  // 13. seller_name
  {
    acpField: "seller_name",
    tier: "required",
    extract: (_p, meta) => meta.sellerName,
    fixHint:
      "Add an Organization or LocalBusiness JSON-LD block to your homepage with your company name",
  },

  // 14. seller_url
  {
    acpField: "seller_url",
    tier: "required",
    extract: (_p, meta) => meta.sellerUrl,
    fixHint: "Your store URL serves as seller_url",
  },

  // 15. return_policy
  {
    acpField: "return_policy",
    tier: "required",
    extract: (_p, meta) => meta.returnPolicy,
    fixHint:
      "Add a return/refund policy page and link it from your footer. Shopify stores: ensure /policies/refund-policy exists",
  },

  // 16. target_countries
  {
    acpField: "target_countries",
    tier: "required",
    extract: (_p, meta) =>
      meta.targetCountries.length > 0
        ? meta.targetCountries.join(", ")
        : null,
    fixHint:
      "Add hreflang tags to your HTML head or specify shipping countries in your structured data",
  },

  // 17. store_country
  {
    acpField: "store_country",
    tier: "required",
    extract: (_p, meta) => meta.storeCountry,
    fixHint:
      'Set the lang attribute on your <html> tag or include addressCountry in your Organization JSON-LD',
  },

  // -------------------------------------------------------------------------
  // Conditional fields (9)
  // -------------------------------------------------------------------------

  // 18. variant_dict
  {
    acpField: "variant_dict",
    tier: "conditional",
    extract: (p) =>
      p.options && p.options.length > 0
        ? JSON.stringify(
            Object.fromEntries(p.options.map((o) => [o.name, o.values])),
          )
        : null,
    fixHint:
      "Expose structured variant options (e.g., Shopify p.options) so agents know available sizes and colors",
  },

  // 19. variant_attributes
  {
    acpField: "variant_attributes",
    tier: "conditional",
    extract: (p) => p.options?.map((o) => o.name).join(", ") ?? null,
    fixHint:
      "List the attribute names that distinguish your variants (e.g., Size, Color)",
  },

  // 20. variant_specific_title
  {
    acpField: "variant_specific_title",
    tier: "conditional",
    extract: (p) => p.variants?.[0]?.title ?? null,
    fixHint:
      "Include variant-specific titles that incorporate selected options (e.g., 'Running Shoe - Size 10 / Blue')",
  },

  // 21. variant_specific_image_url
  {
    acpField: "variant_specific_image_url",
    tier: "conditional",
    extract: (p) => p.variants?.[0]?.imageUrl ?? null,
    fixHint:
      "Associate specific images with each variant so agents can show the correct color/style",
  },

  // 22. variant_specific_price
  {
    acpField: "variant_specific_price",
    tier: "conditional",
    extract: (p) => p.variants?.[0]?.price ?? null,
    fixHint:
      "Include per-variant pricing when prices differ across sizes or options",
  },

  // 23. variant_specific_availability
  {
    acpField: "variant_specific_availability",
    tier: "conditional",
    extract: (p) => {
      const v = p.variants?.[0];
      if (!v) return null;
      if (typeof v.available === "boolean")
        return v.available ? "in_stock" : "out_of_stock";
      return null;
    },
    fixHint:
      "Track and expose stock status per variant, not just per parent product",
  },

  // 24. sale_price
  {
    acpField: "sale_price",
    tier: "conditional",
    extract: (p) => p.variants?.[0]?.compareAtPrice ?? null,
    fixHint:
      "Expose compare_at_price or sale pricing in your structured data to help agents highlight deals",
  },

  // 25. gtin
  {
    acpField: "gtin",
    tier: "conditional",
    extract: (p) => p.gtin ?? null,
    fixHint:
      "Add GTIN, UPC, or EAN barcodes to your product data for better product matching",
  },

  // -------------------------------------------------------------------------
  // Recommended fields (19)
  // -------------------------------------------------------------------------

  // 26. additional_image_urls
  {
    acpField: "additional_image_urls",
    tier: "recommended",
    extract: (p) =>
      p.additionalImageUrls && p.additionalImageUrls.length > 0
        ? `${p.additionalImageUrls.length} additional images`
        : null,
    fixHint:
      "Include multiple product images showing different angles, details, and context shots",
  },

  // 27. product_type
  {
    acpField: "product_type",
    tier: "recommended",
    extract: (p) => p.productType ?? null,
    fixHint:
      "Set product_type in Shopify admin or include a category path in your JSON-LD Product schema",
  },

  // 28. reviews_summary
  {
    acpField: "reviews_summary",
    tier: "recommended",
    extract: (p) => {
      if (!p.reviews) return null;
      const { rating, count } = p.reviews;
      if (!rating && !count) return null;
      const parts: string[] = [];
      if (rating != null) parts.push(`${rating}/5`);
      if (count != null) parts.push(`(${count} reviews)`);
      return parts.join(" ");
    },
    fixHint:
      "Add AggregateRating to your JSON-LD Product schema to surface star ratings to AI agents",
  },

  // 29. privacy_policy_url
  {
    acpField: "privacy_policy_url",
    tier: "recommended",
    extract: (_p, meta) => meta.privacyPolicyUrl,
    fixHint:
      "Add a privacy policy page and link it from your site footer",
  },

  // 30. terms_of_service_url
  {
    acpField: "terms_of_service_url",
    tier: "recommended",
    extract: (_p, meta) => meta.termsOfServiceUrl,
    fixHint:
      "Add a terms of service page and link it from your site footer",
  },

  // 31. condition
  {
    acpField: "condition",
    tier: "recommended",
    extract: (p) => p.condition ?? null,
    fixHint:
      "Add itemCondition to your JSON-LD offers (NewCondition, RefurbishedCondition, UsedCondition)",
  },

  // 32. review_count
  {
    acpField: "review_count",
    tier: "recommended",
    extract: (p) => {
      if (p.reviewCount != null) return String(p.reviewCount);
      if (p.reviews?.count != null) return String(p.reviews.count);
      return null;
    },
    fixHint:
      "Add AggregateRating with reviewCount to your JSON-LD",
  },

  // 33. star_rating
  {
    acpField: "star_rating",
    tier: "recommended",
    extract: (p) => {
      if (p.starRating != null) return String(p.starRating);
      if (p.reviews?.rating != null) return String(p.reviews.rating);
      return null;
    },
    fixHint:
      "Add AggregateRating with ratingValue to your JSON-LD",
  },

  // 34. review_list
  {
    acpField: "review_list",
    tier: "recommended",
    extract: (p) =>
      p.reviewList && p.reviewList.length > 0
        ? `${p.reviewList.length} reviews`
        : null,
    fixHint:
      "Add individual Review schema objects to your JSON-LD or expose review content in your HTML",
  },

  // 35. q_and_a
  {
    acpField: "q_and_a",
    tier: "recommended",
    extract: (p) =>
      p.qAndA && p.qAndA.length > 0
        ? `${p.qAndA.length} Q&A pairs`
        : null,
    fixHint:
      "Add FAQPage JSON-LD schema with Question/Answer pairs to your product pages",
  },

  // 36. video_url
  {
    acpField: "video_url",
    tier: "recommended",
    extract: (p) => p.videoUrl ?? null,
    fixHint:
      "Add a product video and reference it in your structured data",
  },

  // 37. size
  {
    acpField: "size",
    tier: "conditional",
    extract: (p) =>
      p.size ?? p.variantDict?.Size ?? p.variantDict?.size ?? null,
    fixHint:
      "Include size information in your variant data or product attributes",
  },

  // 38. age_group
  {
    acpField: "age_group",
    tier: "recommended",
    extract: (p) => p.ageGroup ?? null,
    fixHint:
      "Add audience.suggestedMinAge/suggestedMaxAge to your JSON-LD Product schema",
  },

  // 39. gender
  {
    acpField: "gender",
    tier: "recommended",
    extract: (p) => p.gender ?? null,
    fixHint:
      "Add gender or audience.suggestedGender to your JSON-LD Product schema",
  },

  // 40. material
  {
    acpField: "material",
    tier: "recommended",
    extract: (p) => p.material ?? null,
    fixHint:
      "Add material property to your JSON-LD Product schema",
  },

  // 41. weight
  {
    acpField: "weight",
    tier: "recommended",
    extract: (p) => p.weight ?? null,
    fixHint:
      "Add weight property to your JSON-LD Product schema",
  },

  // 42. dimensions
  {
    acpField: "dimensions",
    tier: "recommended",
    extract: (p) => p.dimensions ?? null,
    fixHint:
      "Add width/height/depth properties to your JSON-LD Product schema",
  },

  // 43. shipping_details
  {
    acpField: "shipping_details",
    tier: "recommended",
    extract: (p, meta) => p.shippingDetails ?? meta.shippingDetails ?? null,
    fixHint:
      "Add shipping information to your product pages or structured data",
  },

  // 44. category
  {
    acpField: "category",
    tier: "recommended",
    extract: (p) => p.category ?? p.productType ?? null,
    fixHint:
      "Set product_type in your admin or include a category in your structured data",
  },
];

// ---------------------------------------------------------------------------
// Seller-level fields — evaluated once against meta (not per-product)
// ---------------------------------------------------------------------------

const SELLER_LEVEL_FIELDS = new Set([
  "seller_name",
  "seller_url",
  "return_policy",
  "target_countries",
  "store_country",
  "privacy_policy_url",
  "terms_of_service_url",
  "shipping_details",
]);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildFieldAuditMap(
  products: NormalizedProduct[],
  storeMeta: StoreMeta,
): FieldAuditMap {
  const total = Math.max(products.length, 1);
  const map: FieldAuditMap = {};

  const dummyProduct: NormalizedProduct = {
    source: "dummy",
    rawData: {},
  };

  for (const extractor of FIELD_EXTRACTORS) {
    const { acpField, tier, extract, qualityCheck, fixHint } = extractor;

    let presentCount = 0;
    let exampleValue: string | null = null;
    let qualityNote: string | null = null;

    if (SELLER_LEVEL_FIELDS.has(acpField)) {
      // -----------------------------------------------------------------
      // Seller-level: evaluate once, broadcast across all products
      // -----------------------------------------------------------------
      const sample = products[0] ?? dummyProduct;
      const value = extract(sample, storeMeta);

      if (value != null) {
        presentCount = products.length > 0 ? products.length : 1;
        exampleValue = value;
        if (qualityCheck) {
          qualityNote = qualityCheck(value);
        }
      }
    } else {
      // -----------------------------------------------------------------
      // Product-level: evaluate per product (includes eligibility flags)
      // -----------------------------------------------------------------
      for (const product of products) {
        const value = extract(product, storeMeta);
        if (value != null) {
          presentCount++;
          if (exampleValue == null) {
            exampleValue = value;
            if (qualityCheck) {
              qualityNote = qualityCheck(value);
            }
          }
        }
      }
    }

    // Compute coverage
    const coverage = Math.round((presentCount / total) * 100);

    // Determine status
    let status: FieldStatus;
    if (coverage === 100 && !qualityNote) {
      status = "present";
    } else if (coverage === 100 && qualityNote) {
      status = "warn";
    } else if (coverage > 0) {
      status = "partial";
    } else {
      status = "missing";
    }

    // Truncate example value
    if (exampleValue != null && exampleValue.length > 120) {
      exampleValue = exampleValue.slice(0, 120);
    }

    const audit: FieldAudit = {
      fieldName: acpField,
      tier,
      status,
      presentCount,
      totalCount: products.length,
      coverage,
      exampleValue,
      qualityNote,
      fixHint: status !== "present" ? fixHint : null,
    };

    map[acpField] = audit;
  }

  return map;
}
