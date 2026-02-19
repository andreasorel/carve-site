"use client";

import { useState } from "react";
import type { CategoryScore, CheckDetail } from "@/lib/types";

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

function getPercentageColor(pct: number): string {
  if (pct >= 80) return "text-emerald-700";
  if (pct >= 60) return "text-amber-700";
  if (pct >= 40) return "text-orange-600";
  return "text-red-600";
}

function DetailRow({ detail, isLLM }: { detail: CheckDetail; isLLM: boolean }) {
  if (detail.notApplicable) {
    return (
      <div className="pl-10 pr-5 py-2 text-sm flex items-center justify-between">
        <span className="text-text-tertiary">{detail.name}</span>
        <span className="text-text-tertiary text-xs font-sans">N/A</span>
      </div>
    );
  }

  const pct = detail.total > 0 ? detail.passed / detail.total : 0;
  const colorClass =
    pct >= 0.8 ? "text-emerald-700" : pct > 0.5 ? "text-amber-700" : "text-red-600";

  return (
    <div className="pl-10 pr-5 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary">{detail.name}</span>
        <span className={`font-sans tabular-nums ${colorClass}`}>
          {detail.passed}/{detail.total}
          {isLLM ? " pts" : ""}
        </span>
      </div>
      {isLLM && detail.description && (
        <p className="text-xs text-text-tertiary leading-relaxed mt-1">
          {detail.description}
        </p>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  defaultExpanded,
}: {
  category: CategoryScore;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const pct = Math.round((category.score / category.maxScore) * 100);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 cursor-pointer hover:bg-surface-subtle/50 transition-colors flex items-center gap-3 text-left"
      >
        <svg
          className={`w-3.5 h-3.5 text-text-tertiary shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-sans font-medium text-sm text-text flex-1 min-w-0 truncate">
          {category.name}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-32 h-1.5 bg-surface-subtle rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm text-text-secondary font-sans tabular-nums w-12 text-right">
            {category.score}/{category.maxScore}
          </span>
          <span className={`text-sm font-sans tabular-nums w-10 text-right ${getPercentageColor(pct)}`}>
            {pct}%
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 pb-2">
          {category.details.map((detail) => (
            <DetailRow
              key={detail.name}
              detail={detail}
              isLLM={!!category.llmPowered}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const lowestIdx = categories.reduce(
    (minIdx, cat, i, arr) => {
      const pct = cat.score / cat.maxScore;
      const minPct = arr[minIdx].score / arr[minIdx].maxScore;
      return pct < minPct ? i : minIdx;
    },
    0
  );

  return (
    <div>
      <p className="section-label mb-6">Category Breakdown</p>
      <div className="border border-border rounded-sm divide-y divide-border bg-surface-elevated">
        {categories.map((cat, i) => (
          <CategoryRow
            key={cat.name}
            category={cat}
            defaultExpanded={i === lowestIdx}
          />
        ))}
      </div>
    </div>
  );
}
