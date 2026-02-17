// ---------------------------------------------------------------------------
// Deterministic scoring engine -- NO AI anywhere. Pure computation.
// ---------------------------------------------------------------------------

import type {
  NormalizedProduct,
  StoreMeta,
  FieldAuditMap,
  FieldAudit,
  DimensionScore,
  Scorecard,
  DiscoveredFeed,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function fieldsForNames(map: FieldAuditMap, names: string[]): FieldAudit[] {
  return names.map(n => map[n]).filter((f): f is FieldAudit => f !== undefined);
}

// ---------------------------------------------------------------------------
// Dimension 1: Content Completeness
// ---------------------------------------------------------------------------

function scoreContentCompleteness(map: FieldAuditMap): DimensionScore {
  const fieldNames = [
    "title",
    "description",
    "url",
    "image_url",
    "price",
    "availability",
    "brand",
    "item_id",
    "group_id",
    "listing_has_variations",
    "is_eligible_search",
    "is_eligible_checkout",
    "seller_name",
    "seller_url",
    "return_policy",
    "target_countries",
    "store_country",
  ];

  const fields = fieldsForNames(map, fieldNames);
  const count = fields.filter(
    f => f.status === "present" || f.status === "warn",
  ).length;
  const score = Math.round((count / 17) * 100);

  return {
    name: "Content Completeness",
    score,
    grade: gradeFromScore(score),
    findings: [],
    recommendations: [],
    fields,
  };
}

// ---------------------------------------------------------------------------
// Dimension 2: Variant Handling
// ---------------------------------------------------------------------------

function scoreVariantHandling(
  map: FieldAuditMap,
  products: NormalizedProduct[],
): DimensionScore {
  const fieldNames = [
    "variant_dict",
    "variant_attributes",
    "variant_specific_title",
    "variant_specific_image_url",
    "variant_specific_price",
    "variant_specific_availability",
  ];

  const fields = fieldsForNames(map, fieldNames);

  const hasVariants = products.some(
    p =>
      (p.variants && p.variants.length > 1) ||
      (p.options && p.options.length > 0),
  );

  let score: number;
  if (!hasVariants) {
    score = 70; // neutral -- no variants detected
  } else {
    // For variant handling, use coverage-weighted scoring instead of binary.
    // A field with 90% coverage should still contribute substantially.
    const totalWeight = fields.length > 0 ? fields.length : 1;
    const weightedSum = fields.reduce((sum, f) => sum + f.coverage / 100, 0);
    score = Math.round((weightedSum / totalWeight) * 100);
  }

  return {
    name: "Variant Handling",
    score,
    grade: gradeFromScore(score),
    findings: [],
    recommendations: [],
    fields,
  };
}

// ---------------------------------------------------------------------------
// Dimension 3: Seller & Policy Integrity
// ---------------------------------------------------------------------------

function scoreSellerIntegrity(map: FieldAuditMap): DimensionScore {
  const fieldNames = [
    "seller_name",
    "seller_url",
    "return_policy",
    "privacy_policy_url",
    "terms_of_service_url",
  ];

  const fields = fieldsForNames(map, fieldNames);
  const count = fields.filter(
    f => f.status === "present" || f.status === "warn",
  ).length;
  const score = Math.round((count / 5) * 100);

  return {
    name: "Seller & Policy Integrity",
    score,
    grade: gradeFromScore(score),
    findings: [],
    recommendations: [],
    fields,
  };
}

// ---------------------------------------------------------------------------
// Dimension 4: Eligibility Flags
// ---------------------------------------------------------------------------

function scoreEligibilityFlags(map: FieldAuditMap): DimensionScore {
  const fields = fieldsForNames(map, [
    "is_eligible_search",
    "is_eligible_checkout",
  ]);

  let score = 0;
  const searchField = map["is_eligible_search"];
  const checkoutField = map["is_eligible_checkout"];

  if (
    searchField &&
    (searchField.status === "present" || searchField.status === "warn")
  ) {
    score += 50;
  }
  if (
    checkoutField &&
    (checkoutField.status === "present" || checkoutField.status === "warn")
  ) {
    score += 50;
  }

  return {
    name: "Eligibility Flags",
    score,
    grade: gradeFromScore(score),
    findings: [],
    recommendations: [],
    fields,
  };
}

// ---------------------------------------------------------------------------
// Dimension 5: Content Quality
// ---------------------------------------------------------------------------

function scoreContentQuality(
  map: FieldAuditMap,
  products: NormalizedProduct[],
): DimensionScore {
  const relevantFieldNames = [
    "title",
    "description",
    "image_url",
    "price",
    "availability",
    "currency",
  ];
  const fields = fieldsForNames(map, relevantFieldNames);

  if (products.length === 0) {
    return {
      name: "Content Quality",
      score: 0,
      grade: gradeFromScore(0),
      findings: [],
      recommendations: [],
      fields,
    };
  }

  let passing = 0;
  const total = 6 * products.length;

  for (const product of products) {
    // 1. Description length: strip HTML, pass if >= 100 chars
    if (product.description) {
      const plain = product.description.replace(/<[^>]*>/g, "").trim();
      if (plain.length >= 100) passing++;
    }

    // 2. Title length: pass if < 150 chars and title exists
    if (product.title && product.title.length < 150) {
      passing++;
    }

    // 3. Image HTTPS: pass if imageUrl starts with https
    if (product.imageUrl && product.imageUrl.startsWith("https")) {
      passing++;
    }

    // 4. Price format: pass if matches /^\d+(\.\d{1,2})?$/
    if (product.price && /^\d+(\.\d{1,2})?$/.test(product.price)) {
      passing++;
    }

    // 5. Availability vocabulary: normalize and check known values
    if (product.availability) {
      const normalized = product.availability
        .toLowerCase()
        .replace(/^https?:\/\/schema\.org\//, "");
      if (
        normalized.includes("instock") ||
        normalized.includes("outofstock") ||
        normalized.includes("preorder") ||
        normalized.includes("backorder")
      ) {
        passing++;
      }
    }

    // 6. Currency present: pass if currency exists and is 3 chars
    if (product.currency && product.currency.length === 3) {
      passing++;
    }
  }

  const score = Math.round((passing / total) * 100);

  return {
    name: "Content Quality",
    score,
    grade: gradeFromScore(score),
    findings: [],
    recommendations: [],
    fields,
  };
}

// ---------------------------------------------------------------------------
// Dimension 6: Enrichment
// ---------------------------------------------------------------------------

function scoreEnrichment(map: FieldAuditMap): DimensionScore {
  const fieldNames = [
    "additional_image_urls",
    "product_type",
    "reviews_summary",
    "condition",
    "gtin",
    "sale_price",
    "review_count",
    "star_rating",
    "review_list",
    "q_and_a",
    "video_url",
    "material",
    "weight",
    "dimensions",
    "age_group",
    "gender",
    "category",
  ];

  const fields = fieldsForNames(map, fieldNames);
  const total = fields.length > 0 ? fields.length : 1;
  const count = fields.filter(f => f.status !== "missing").length;
  const score = Math.round((count / total) * 100);

  return {
    name: "Enrichment",
    score,
    grade: gradeFromScore(score),
    findings: [],
    recommendations: [],
    fields,
  };
}

// ---------------------------------------------------------------------------
// Main: compute full scorecard (deterministic, no AI)
// ---------------------------------------------------------------------------

export function computeScorecard(
  url: string,
  products: NormalizedProduct[],
  feeds: DiscoveredFeed[],
  storeMeta: StoreMeta,
  fieldMap: FieldAuditMap,
): Scorecard {
  const contentCompleteness = scoreContentCompleteness(fieldMap);
  const variantHandling = scoreVariantHandling(fieldMap, products);
  const sellerIntegrity = scoreSellerIntegrity(fieldMap);
  const eligibilityFlags = scoreEligibilityFlags(fieldMap);
  const contentQuality = scoreContentQuality(fieldMap, products);
  const enrichment = scoreEnrichment(fieldMap);

  const overallScore = Math.round(
    contentCompleteness.score * 0.25 +
      variantHandling.score * 0.15 +
      sellerIntegrity.score * 0.2 +
      eligibilityFlags.score * 0.1 +
      contentQuality.score * 0.2 +
      enrichment.score * 0.1,
  );

  return {
    url,
    overallScore,
    overallGrade: gradeFromScore(overallScore),
    headline: "",
    summary: "",
    dimensions: {
      contentCompleteness,
      variantHandling,
      sellerIntegrity,
      eligibilityFlags,
      contentQuality,
      enrichment,
    },
    discoveredFeeds: feeds,
    sampleSize: products.length,
    analyzedAt: new Date().toISOString(),
    storeMeta,
  };
}
