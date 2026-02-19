"use client";

import type { ProductVertical } from "@/lib/types";

interface ScoreDisplayProps {
  score: number;
  grade: string;
  summary: string;
  productCount: number;
  feedType: string;
  llmPowered: boolean;
  topRecommendation?: { title: string; impact: number };
  vertical?: ProductVertical;
}

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-700";
  if (grade.startsWith("B")) return "text-amber-700";
  if (grade.startsWith("C")) return "text-orange-600";
  return "text-red-600";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export default function ScoreDisplay({
  score,
  grade,
  summary,
  productCount,
  feedType,
  topRecommendation,
}: ScoreDisplayProps) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated">
          <p className="section-label mb-2">Score</p>
          <p className={`font-display text-3xl font-medium tracking-tight tabular-nums ${getScoreColor(score)}`}>
            {score}
          </p>
          <p className="font-sans text-xs text-text-tertiary mt-1">out of 100</p>
        </div>

        <div className="card-elevated">
          <p className="section-label mb-2">Grade</p>
          <p className={`font-display text-3xl font-medium tracking-tight ${getGradeColor(grade)}`}>
            {grade}
          </p>
          <p className="font-sans text-xs text-text-tertiary mt-1">&nbsp;</p>
        </div>

        <div className="card-elevated">
          <p className="section-label mb-2">Products</p>
          <p className="font-display text-3xl font-medium tracking-tight text-text tabular-nums">
            {productCount.toLocaleString()}
          </p>
          <p className="font-sans text-xs text-text-tertiary mt-1">via {feedType}</p>
        </div>

        <div className="card-elevated">
          <p className="section-label mb-2">Top Issue</p>
          {topRecommendation ? (
            <>
              <p className="font-display text-lg font-medium tracking-tight text-text leading-tight">
                {topRecommendation.title}
              </p>
              <p className="font-sans text-xs text-text-tertiary mt-1 tabular-nums">
                {topRecommendation.impact}% affected
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-medium tracking-tight text-emerald-700">
                None
              </p>
              <p className="font-sans text-xs text-text-tertiary mt-1">No critical issues</p>
            </>
          )}
        </div>
      </div>

      <p className="font-sans text-text-secondary leading-relaxed mt-8">
        {summary}
      </p>
    </div>
  );
}
