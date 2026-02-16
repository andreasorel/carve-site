"use client";

import type { Scorecard, DimensionScore } from "@/lib/types";

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
  sellerIntegrity: "Seller Integrity",
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

export default function ScoreResults({
  scorecard,
  onReset,
}: ScoreResultsProps) {
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
                  <span className={`font-mono text-sm font-medium ${gradeColor(dim.grade)}`}>
                    {dim.grade}
                  </span>
                </div>

                {/* Findings */}
                {dim.findings.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {dim.findings.map((f, i) => (
                      <li key={i} className="font-mono text-xs text-ink-light leading-snug">
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
                      <li key={i} className="font-mono text-xs text-accent leading-snug">
                        <span className="mr-1">&rarr;</span>
                        {r}
                      </li>
                    ))}
                  </ul>
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

      {/* ===== Section 4: CTA ===== */}
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
