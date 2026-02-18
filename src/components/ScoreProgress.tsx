"use client";

import type { PipelineStage } from "@/lib/types";

interface ScoreProgressProps {
  stage: PipelineStage;
  message: string;
  progress: number;
}

const STAGES: { label: string; maps: PipelineStage[] }[] = [
  { label: "Connecting to site", maps: ["connecting", "fetching_homepage"] },
  { label: "Discovering product feeds", maps: ["discovering_feeds"] },
  { label: "Extracting store metadata", maps: ["extracting_store_meta"] },
  { label: "Sampling product catalog", maps: ["sampling_products"] },
  { label: "Scoring against ACP fields", maps: ["scoring_fields"] },
  { label: "AI analysis & commentary", maps: ["analyzing_acp"] },
  { label: "Generating scorecard", maps: ["generating_scorecard"] },
];

function getActiveIndex(stage: PipelineStage): number {
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].maps.includes(stage)) return i;
  }
  if (stage === "complete") return STAGES.length;
  return 0;
}

export default function ScoreProgress({
  stage,
  message,
  progress,
}: ScoreProgressProps) {
  const activeIndex = getActiveIndex(stage);

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="border border-border rounded-sm overflow-hidden">
        <div
          className="h-[3px] bg-accent transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Stage timeline */}
      <div className="mt-8 space-y-4">
        {STAGES.map((s, i) => {
          const isCompleted = i < activeIndex;
          const isActive = i === activeIndex;

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-text animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full border border-border bg-transparent" />
                )}
              </div>

              <span
                className={`font-mono text-xs w-4 ${
                  isCompleted
                    ? "text-accent"
                    : isActive
                    ? "text-text"
                    : "text-text-tertiary"
                }`}
              >
                {i + 1}
              </span>

              <span
                className={`font-sans text-sm ${
                  isCompleted
                    ? "text-text-tertiary line-through"
                    : isActive
                    ? "text-text font-medium"
                    : "text-text-tertiary"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current message */}
      <div className="mt-8 border-l-2 border-r-2 border-accent px-6 py-4 text-center">
        <p className="font-display italic text-text-secondary text-base md:text-lg">
          {message}
        </p>
      </div>
    </div>
  );
}
