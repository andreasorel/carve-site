/**
 * OpenAI Agent Commerce Protocol (ACP) specification data.
 *
 * These constants describe the required, conditional, and recommended product
 * fields, as well as the scoring dimensions used to evaluate how well a
 * webshop's product data aligns with the ACP standard.
 */

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

export const ACP_REQUIRED_FIELDS: Array<{ name: string; description: string }> =
  [
    {
      name: "is_eligible_search",
      description:
        "Boolean flag indicating whether the product should surface in agent-powered search results.",
    },
    {
      name: "is_eligible_checkout",
      description:
        "Boolean flag indicating whether the product can be purchased through an agent-powered checkout flow.",
    },
    {
      name: "item_id",
      description:
        "Unique identifier for the product item within the seller's catalog.",
    },
    {
      name: "title",
      description:
        "Human-readable product title, concise and descriptive (recommended < 150 characters).",
    },
    {
      name: "description",
      description:
        "Detailed product description covering features, materials, dimensions, and use cases.",
    },
    {
      name: "url",
      description:
        "Canonical URL of the product detail page on the seller's site.",
    },
    {
      name: "brand",
      description: "Brand or manufacturer name associated with the product.",
    },
    {
      name: "image_url",
      description:
        "Primary product image URL. Should be high-resolution and on a clean background.",
    },
    {
      name: "price",
      description:
        "Current selling price in decimal format (e.g. '29.99') paired with a currency code.",
    },
    {
      name: "availability",
      description:
        "Stock status using a controlled vocabulary: in_stock, out_of_stock, preorder, backorder.",
    },
    {
      name: "group_id",
      description:
        "Shared identifier that groups all variants (size, color, etc.) of the same parent product.",
    },
    {
      name: "listing_has_variations",
      description:
        "Boolean indicating whether this listing contains multiple variants (sizes, colors, etc.).",
    },
    {
      name: "seller_name",
      description:
        "Legal or display name of the entity selling the product.",
    },
    {
      name: "seller_url",
      description:
        "URL of the seller's storefront or company homepage.",
    },
    {
      name: "return_policy",
      description:
        "Summary or link to the seller's return / refund policy.",
    },
    {
      name: "target_countries",
      description:
        "ISO 3166-1 alpha-2 country codes where the product is available for purchase.",
    },
    {
      name: "store_country",
      description:
        "ISO 3166-1 alpha-2 code of the country where the seller's store is based.",
    },
  ];

// ---------------------------------------------------------------------------
// Conditional fields (required when the specified condition is true)
// ---------------------------------------------------------------------------

export const ACP_CONDITIONAL_FIELDS: Record<
  string,
  Array<{ name: string; description: string }>
> = {
  "listing_has_variations === true": [
    {
      name: "variant_dict",
      description:
        "Structured dictionary mapping variant attributes (e.g. size, color) to their available values.",
    },
    {
      name: "variant_attributes",
      description:
        "List of attribute names that distinguish variants (e.g. ['size', 'color']).",
    },
    {
      name: "variant_specific_title",
      description:
        "Variant-specific title incorporating the selected attribute values.",
    },
    {
      name: "variant_specific_image_url",
      description:
        "Image URL specific to the selected variant combination.",
    },
    {
      name: "variant_specific_price",
      description:
        "Price specific to the selected variant, which may differ from the base price.",
    },
    {
      name: "variant_specific_availability",
      description:
        "Availability status specific to the selected variant.",
    },
  ],
  "product has sale / discount pricing": [
    {
      name: "sale_price",
      description:
        "Discounted price currently active for the product.",
    },
    {
      name: "sale_price_effective_date",
      description:
        "ISO 8601 date range during which the sale price is valid.",
    },
  ],
  "product has a GTIN / UPC / EAN": [
    {
      name: "gtin",
      description:
        "Global Trade Item Number (UPC, EAN, ISBN, etc.) for the product.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Recommended (optional but beneficial) fields
// ---------------------------------------------------------------------------

export const ACP_RECOMMENDED_FIELDS: Array<{
  name: string;
  description: string;
}> = [
  {
    name: "additional_image_urls",
    description: "Array of additional product image URLs beyond the primary.",
  },
  {
    name: "product_type",
    description:
      "Seller-defined product category or taxonomy path (e.g. 'Apparel > Shoes > Sneakers').",
  },
  {
    name: "google_product_category",
    description:
      "Google Product Taxonomy ID or path for standardized categorization.",
  },
  {
    name: "condition",
    description:
      "Product condition: new, refurbished, or used.",
  },
  {
    name: "age_group",
    description:
      "Target age group: newborn, infant, toddler, kids, adult.",
  },
  {
    name: "gender",
    description:
      "Target gender: male, female, unisex.",
  },
  {
    name: "color",
    description: "Primary color of the product.",
  },
  {
    name: "size",
    description: "Size of the product (apparel, shoes, etc.).",
  },
  {
    name: "material",
    description: "Primary material composition.",
  },
  {
    name: "pattern",
    description: "Pattern or print (e.g. striped, floral).",
  },
  {
    name: "shipping_weight",
    description: "Product weight used for shipping cost estimation.",
  },
  {
    name: "shipping_dimensions",
    description: "Package dimensions (L x W x H) for shipping estimation.",
  },
  {
    name: "tax_category",
    description: "Tax classification for the product.",
  },
  {
    name: "reviews_summary",
    description:
      "Aggregate review data including average rating and total count.",
  },
  {
    name: "qa_pairs",
    description:
      "Array of question-and-answer pairs related to the product.",
  },
  {
    name: "related_products",
    description:
      "Array of related / frequently-bought-together product IDs.",
  },
  {
    name: "warnings",
    description:
      "Safety warnings, legal disclaimers, or age-restriction notices.",
  },
  {
    name: "privacy_policy_url",
    description: "URL of the seller's privacy policy.",
  },
  {
    name: "terms_of_service_url",
    description: "URL of the seller's terms of service.",
  },
];

// ---------------------------------------------------------------------------
// Scoring dimensions
// ---------------------------------------------------------------------------

export interface AcpDimension {
  key: string;
  label: string;
  weight: number;
  description: string;
}

export const ACP_QUALITY_DIMENSIONS: AcpDimension[] = [
  {
    key: "contentCompleteness",
    label: "Content Completeness",
    weight: 0.25,
    description:
      "Coverage of the 17 required ACP fields. Measures what percentage of required fields can be populated from the store's existing product data.",
  },
  {
    key: "variantHandling",
    label: "Variant Handling",
    weight: 0.15,
    description:
      "Quality of variant data including group_id, variant_dict, variant-specific titles, images, prices, and availability for multi-variant products.",
  },
  {
    key: "sellerIntegrity",
    label: "Seller & Policy Integrity",
    weight: 0.2,
    description:
      "Presence and quality of seller_name, seller_url, return_policy, privacy_policy, and terms of service information.",
  },
  {
    key: "eligibilityFlags",
    label: "Eligibility Flags",
    weight: 0.1,
    description:
      "Readiness of is_eligible_search and is_eligible_checkout flags, and whether the data quality supports enabling them.",
  },
  {
    key: "contentQuality",
    label: "Content Quality",
    weight: 0.2,
    description:
      "Richness and quality of descriptions, image resolution and variety, proper price formatting with currency, and overall data hygiene.",
  },
  {
    key: "enrichment",
    label: "Enrichment",
    weight: 0.1,
    description:
      "Availability of enrichment data: Q&A pairs, customer reviews, related products, safety warnings, and other supplementary content.",
  },
];
