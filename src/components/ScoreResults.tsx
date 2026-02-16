"use client";

import { useState } from "react";
import type { Scorecard, DimensionScore, FieldAudit } from "@/lib/types";

interface ScoreResultsProps {
  scorecard: Scorecard;
  onReset: () => void;
}

const DIMENSION_KEYS: (keyof Scorecard["dimensions"])[] = [
  "contentCompleteness",
  "variantHandling",
  "sellerIntegrity",
  "eligibilityFlags",
  "contentQuality",
  "enrichment",
];

const DIMENSION_LABELS: Record<keyof Scorecard["dimensions"], string> = {
  contentCompleteness: "Content Completeness",
  variantHandling: "Variant Handling",
  sellerIntegrity: "Seller & Policy Integrity",
  eligibilityFlags: "Eligibility Flags",
  contentQuality: "Content Quality",
  enrichment: "Enrichment",
};

function gradeColor(grade: DimensionScore["grade"]): string {
  switch (grade) {
    case "A":
      return "text-accent";
    case "B":
      return "text-ink";
    case "C":
      return "text-ink-muted";
    case "D":
    case "F":
      return "text-accent";
    default:
      return "text-ink";
  }
}

function statusIcon(status: FieldAudit["status"]): string {
  switch (status) {
    case "present":
      return "\u2713";
    case "warn":
      return "\u26A0";
    case "partial":
      return "\u25D0";
    case "missing":
      return "\u2717";
    default:
      return "?";
  }
}

function statusColor(status: FieldAudit["status"]): string {
  switch (status) {
    case "present":
      return "text-accent";
    case "warn":
      return "text-ink-muted";
    case "partial":
      return "text-ink-muted";
    case "missing":
      return "text-ink-faint";
    default:
      return "text-ink";
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Field Breakdown sub-component
// ---------------------------------------------------------------------------

function FieldBreakdown({ fields }: { fields: FieldAudit[] }) {
  if (!fields || fields.length === 0) return null;

  const missingFields = fields.filter(
    (f) => f.status === "missing" || f.status === "partial" || f.status === "warn"
  );

  return (
    <div className="mt-3">
      {/* Field table */}
      <div className="border-t border-rule/50 pt-2">
        <table className="w-full">
          <tbody>
            {fields.map((field) => (
              <tr key={field.fieldName} className="border-b border-rule/30 last:border-0">
                <td className="py-1 pr-2">
                  <span className={`font-mono text-sm ${statusColor(field.status)}`}>
                    {statusIcon(field.status)}
                  </span>
                </td>
                <td className="py-1 pr-3">
                  <span className="font-mono text-xs text-ink">
                    {field.fieldName}
                  </span>
                  {field.qualityNote && (
                    <span className="font-mono text-xs text-ink-faint ml-1">
                      &mdash; {field.qualityNote}
                    </span>
                  )}
                </td>
                <td className="py-1 text-right">
                  <span className="font-mono text-xs text-ink-muted">
                    {field.coverage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fix hints for missing/warn fields */}
      {missingFields.length > 0 && (
        <div className="mt-2 space-y-1">
          {missingFields
            .filter((f) => f.fixHint)
            .map((f) => (
              <div key={f.fieldName} className="font-mono text-xs text-accent leading-snug">
                <span className="mr-1">&rarr;</span>
                <span className="text-ink-muted">{f.fieldName}:</span>{" "}
                {f.fixHint}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ScoreResults({
  scorecard,
  onReset,
}: ScoreResultsProps) {
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(
    new Set()
  );

  function toggleDimension(key: string) {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* ===== Section 1: Headline & Overall Score ===== */}
      <div>
        {/* Thick-thin double rule */}
        <div className="border-t-[3px] border-ink" />
        <div className="border-t border-rule mt-1" />

        {/* AI-generated headline */}
        <h2
          className="font-headline font-bold text-ink mt-6 mb-4 leading-tight"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}
        >
          {scorecard.headline}
        </h2>

        {/* Score + Summary row */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
          {/* Left: score + grade */}
          <div className="flex items-baseline gap-2 flex-shrink-0">
            <span className="font-headline text-6xl font-black text-ink leading-none">
              {scorecard.overallScore}
            </span>
            <span className="font-headline text-4xl font-bold text-accent leading-none">
              {scorecard.overallGrade}
            </span>
          </div>

          {/* Right: summary */}
          <p className="font-body italic text-ink-light text-sm leading-relaxed">
            {scorecard.summary}
          </p>
        </div>

        {/* Context banner */}
        <div className="border border-rule/50 px-4 py-2 mb-4">
          <p className="font-mono text-xs text-ink-faint italic text-center">
            Scores computed deterministically from crawled data against the Agent
            Commerce Protocol. AI provides editorial commentary only.
          </p>
        </div>

        {/* Thin rule */}
        <div className="border-t border-rule" />
      </div>

      {/* ===== Section 2: Dimensions Grid ===== */}
      <div className="mt-8">
        <h3 className="font-headline font-bold text-xl md:text-2xl text-ink mb-6">
          Scorecard
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          {DIMENSION_KEYS.map((key) => {
            const dim = scorecard.dimensions[key];
            const isExpanded = expandedDimensions.has(key);
            const hasFields = dim.fields && dim.fields.length > 0;

            return (
              <div key={key} className="border border-rule p-4">
                {/* Dimension name */}
                <div className="font-ui text-xs uppercase tracking-wider text-ink-muted mb-2">
                  {DIMENSION_LABELS[key]}
                </div>

                {/* Score bar */}
                <div className="w-full h-2 bg-rule/30 mb-2">
                  <div
                    className={`h-2 transition-all duration-500 ${
                      dim.score >= 60 ? "bg-accent" : "bg-ink-muted"
                    }`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>

                {/* Score number + grade */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-mono text-sm text-ink">
                    {dim.score}/100
                  </span>
                  <span
                    className={`font-mono text-sm font-medium ${gradeColor(
                      dim.grade
                    )}`}
                  >
                    {dim.grade}
                  </span>
                </div>

                {/* Findings */}
                {dim.findings.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {dim.findings.map((f, i) => (
                      <li
                        key={i}
                        className="font-mono text-xs text-ink-light leading-snug"
                      >
                        <span className="text-ink-muted mr-1">&bull;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Recommendations */}
                {dim.recommendations.length > 0 && (
                  <ul className="space-y-1">
                    {dim.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="font-mono text-xs text-accent leading-snug"
                      >
                        <span className="mr-1">&rarr;</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Field breakdown toggle */}
                {hasFields && (
                  <>
                    <button
                      onClick={() => toggleDimension(key)}
                      className="mt-3 font-mono text-xs text-ink-muted hover:text-ink transition-colors underline underline-offset-2"
                    >
                      {isExpanded
                        ? "Hide field details"
                        : `View ${dim.fields.length} ACP fields \u2192`}
                    </button>

                    {isExpanded && <FieldBreakdown fields={dim.fields} />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Section 3: Discovered Feeds ===== */}
      <div className="mt-8">
        <div className="border-t border-rule pt-6">
          <h4 className="font-ui text-xs uppercase tracking-wider text-ink-muted mb-3">
            Discovered Data Sources
          </h4>

          {scorecard.discoveredFeeds.length > 0 ? (
            <ul className="space-y-2">
              {scorecard.discoveredFeeds.map((feed, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent font-mono text-sm flex-shrink-0">
                    &#10003;
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-ink font-medium uppercase">
                      {feed.type}
                    </span>
                    <span className="font-mono text-xs text-ink-muted ml-2 break-all">
                      {feed.url}
                    </span>
                    {feed.productCount !== null && (
                      <span className="font-mono text-xs text-ink-faint ml-2">
                        ({feed.productCount} products)
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-xs text-ink-faint italic">
              No structured product feeds were discovered. This site may rely on
              client-side rendering or non-standard data formats.
            </p>
          )}

          <p className="font-mono text-xs text-ink-faint mt-3">
            {scorecard.sampleSize} products sampled for analysis.
          </p>
        </div>
      </div>

      {/* ===== Section 4: Store Metadata ===== */}
      {scorecard.storeMeta && (
        <div className="mt-8">
          <div className="border-t border-rule pt-6">
            <h4 className="font-ui text-xs uppercase tracking-wider text-ink-muted mb-3">
              Store Metadata
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {scorecard.storeMeta.sellerName && (
                <>
                  <span className="font-mono text-xs text-ink-muted">Seller</span>
                  <span className="font-mono text-xs text-ink">{scorecard.storeMeta.sellerName}</span>
                </>
              )}
              {scorecard.storeMeta.platform && (
                <>
                  <span className="font-mono text-xs text-ink-muted">Platform</span>
                  <span className="font-mono text-xs text-ink capitalize">{scorecard.storeMeta.platform}</span>
                </>
              )}
              {scorecard.storeMeta.storeCountry && (
                <>
                  <span className="font-mono text-xs text-ink-muted">Country</span>
                  <span className="font-mono text-xs text-ink">{scorecard.storeMeta.storeCountry}</span>
                </>
              )}
              {scorecard.storeMeta.targetCountries.length > 0 && (
                <>
                  <span className="font-mono text-xs text-ink-muted">Target Markets</span>
                  <span className="font-mono text-xs text-ink">{scorecard.storeMeta.targetCountries.join(", ")}</span>
                </>
              )}
              <span className="font-mono text-xs text-ink-muted">Return Policy</span>
              <span className="font-mono text-xs text-ink">
                {scorecard.storeMeta.returnPolicy ? "\u2713 Found" : "\u2717 Not found"}
              </span>
              <span className="font-mono text-xs text-ink-muted">Privacy Policy</span>
              <span className="font-mono text-xs text-ink">
                {scorecard.storeMeta.privacyPolicyUrl ? "\u2713 Found" : "\u2717 Not found"}
              </span>
              <span className="font-mono text-xs text-ink-muted">Terms of Service</span>
              <span className="font-mono text-xs text-ink">
                {scorecard.storeMeta.termsOfServiceUrl ? "\u2713 Found" : "\u2717 Not found"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== Section 5: CTA ===== */}
      <div className="mt-8">
        <div className="ad-block">
          <div className="ad-block-inner">
            <h4 className="font-headline font-bold text-xl md:text-2xl text-ink mb-2">
              Want to improve your score?
            </h4>
            <p className="font-headline italic text-ink-light text-base mb-6">
              Carve can help you go from {scorecard.overallGrade} to A.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="#cta" className="btn-newspaper-accent">
                Book a Call
              </a>
              <button onClick={onReset} className="btn-newspaper">
                Score Another Site
              </button>
            </div>
          </div>
        </div>

        {/* Date line */}
        <p className="font-mono text-xs text-ink-faint text-center mt-4">
          Analyzed {formatDate(scorecard.analyzedAt)}
        </p>
      </div>
    </div>
  );
}
