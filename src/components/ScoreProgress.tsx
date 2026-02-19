"use client";

import { useState, useEffect } from "react";

interface ScoreProgressProps {
  currentStep: number;
}

const steps = [
  {
    label: "Discovered feed",
    activeLabel: "Discovering feed",
    detail: "JSON-LD via sitemap",
  },
  {
    label: "Crawled catalog",
    activeLabel: "Crawling catalog",
    detail: "Fetching products",
  },
  {
    label: "Scored against ACP",
    activeLabel: "Scoring against ACP",
    detail: "Evaluating field coverage",
  },
];

export default function ScoreProgress({ currentStep }: ScoreProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto py-16">
      <p className="section-label mb-6">Analyzing Feed</p>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isPending = i > currentStep;

          if (isPending) {
            return (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-border-strong" />
                </div>
                <span className="font-sans text-sm text-text-tertiary">{step.activeLabel}</span>
              </div>
            );
          }

          if (isDone) {
            return (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-sans text-sm text-text-secondary flex-1">{step.label}</span>
                <span className="font-sans text-xs text-text-tertiary">{step.detail}</span>
              </div>
            );
          }

          return (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="font-sans text-sm font-medium text-text flex-1">{step.activeLabel}</span>
              <span className="font-sans text-xs text-text-tertiary">{step.detail}...</span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <span className="font-sans text-xs text-text-tertiary tabular-nums">
          Elapsed: {elapsed.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
