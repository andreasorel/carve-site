"use client";

import type { Recommendation } from "@/lib/types";

interface ScoreRecommendationsProps {
  recommendations: Recommendation[];
}

function getSeverity(impact: number): { label: string; className: string } {
  if (impact >= 60) return { label: "Critical", className: "bg-red-50 text-red-700 border-red-200" };
  if (impact >= 40) return { label: "High", className: "bg-orange-50 text-orange-700 border-orange-200" };
  if (impact >= 20) return { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Low", className: "bg-surface-subtle text-text-tertiary border-border" };
}

export default function ScoreRecommendations({
  recommendations,
}: ScoreRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <div>
        <p className="section-label mb-6">Recommendations</p>
        <div className="border border-border rounded-sm px-5 py-8 flex items-center gap-3 bg-surface-elevated">
          <svg className="w-4 h-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-text-secondary">No critical issues found</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="section-label mb-6">Recommendations</p>
      <div className="border border-border rounded-sm divide-y divide-border bg-surface-elevated">
        {recommendations.map((rec, i) => {
          const severity = getSeverity(rec.impact);

          return (
            <div key={i} className="px-5 py-4 flex items-start gap-4">
              <span
                className={`shrink-0 inline-flex items-center justify-center w-20 px-2 py-1 rounded-sm text-[11px] font-medium uppercase tracking-wider border ${severity.className}`}
              >
                {severity.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-medium text-sm text-text">{rec.title}</p>
                <p className="text-sm text-text-tertiary mt-0.5">{rec.description}</p>
              </div>
              <span className="shrink-0 text-sm font-sans tabular-nums text-text-secondary w-12 text-right">
                {rec.impact}%
              </span>
              <span className="shrink-0 hidden sm:inline-block text-xs px-2 py-1 rounded-sm bg-surface-subtle text-text-tertiary border border-border">
                {rec.category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
