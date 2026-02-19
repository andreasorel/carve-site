"use client";

import { useState, useCallback } from "react";
import ScoreForm from "@/components/ScoreForm";
import ScoreProgress from "@/components/ScoreProgress";
import ScoreDisplay from "@/components/ScoreDisplay";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import ScoreRecommendations from "@/components/ScoreRecommendations";
import OptimizeSection from "@/components/OptimizeSection";
import EmailCapture from "@/components/EmailCapture";
import type { AnalysisResult } from "@/lib/types";

type AppState = "idle" | "loading" | "results" | "error";

export default function ScorePage() {
  const [state, setState] = useState<AppState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [analyzedUrl, setAnalyzedUrl] = useState("");

  const handleAnalyze = useCallback(async (url: string) => {
    setState("loading");
    setLoadingStep(0);
    setError("");
    setAnalyzedUrl(url);

    const step1Timer = setTimeout(() => setLoadingStep(1), 3000);
    const step2Timer = setTimeout(() => setLoadingStep(2), 15000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      clearTimeout(step1Timer);
      clearTimeout(step2Timer);

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        setState("error");
        return;
      }

      setResult(data as AnalysisResult);
      setState("results");
    } catch {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      setError("Could not connect to the server. Please try again.");
      setState("error");
    }
  }, []);

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setError("");
    setAnalyzedUrl("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Page header */}
      <div className="text-center py-12 md:py-16">
        <p className="section-label">Free Diagnostic</p>
        <h1 className="section-title mx-auto">
          Agent Readiness Score
        </h1>
        <p className="section-subtitle mx-auto max-w-xl">
          Score your product feed against the Agent Commerce Protocol.
          Get field-level analysis and prioritized recommendations.
        </p>
      </div>

      <div className="border-t border-border mb-8" />

      {state === "idle" && <ScoreForm onSubmit={handleAnalyze} />}

      {state === "loading" && <ScoreProgress currentStep={loadingStep} />}

      {state === "error" && (
        <div className="max-w-lg mx-auto text-center">
          <div className="card-elevated">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.1em] text-accent mb-3">
              Analysis Error
            </p>
            <p className="font-display font-medium text-lg text-text mb-3">
              Something went wrong.
            </p>
            <p className="font-sans text-sm text-text-secondary mb-6 leading-relaxed">
              {error}
            </p>
            <button onClick={handleReset} className="btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      )}

      {state === "results" && result && (
        <div className="space-y-12">
          <div className="border-b border-border pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="section-label mb-0">Agent Readiness Report</p>
                <button onClick={handleReset} className="btn-ghost mt-2">
                  &larr; Analyze another
                </button>
              </div>
              <div className="text-right font-sans text-xs text-text-tertiary space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <span>{truncateUrl(analyzedUrl)}</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-surface-subtle border border-border text-[10px] uppercase tracking-wider">
                    {result.feedType}
                  </span>
                </div>
                <div>{formatTimestamp()}</div>
              </div>
            </div>
          </div>

          <ScoreDisplay
            score={result.overallScore}
            grade={result.grade}
            summary={result.summary}
            productCount={result.productCount}
            feedType={result.feedType}
            llmPowered={result.llmPowered}
            topRecommendation={
              result.recommendations[0]
                ? { title: result.recommendations[0].title, impact: result.recommendations[0].impact }
                : undefined
            }
            vertical={result.vertical}
          />

          <CategoryBreakdown categories={result.categories} />

          <ScoreRecommendations recommendations={result.recommendations} />

          {result.products && result.products.length > 0 && (
            <OptimizeSection
              products={result.products}
              analyzedUrl={analyzedUrl}
              analysisResult={result}
            />
          )}

          <EmailCapture url={analyzedUrl} score={result.overallScore} />
        </div>
      )}

      <div className="py-8" />
    </div>
  );
}

function formatTimestamp(): string {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} \u00b7 ${time}`;
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.length > 30 ? url.slice(0, 30) + "..." : url;
  }
}
