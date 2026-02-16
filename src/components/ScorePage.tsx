"use client";

import { useState } from "react";
import type { PipelineStage, Scorecard } from "@/lib/types";
import ScoreForm from "@/components/ScoreForm";
import ScoreProgress from "@/components/ScoreProgress";
import ScoreResults from "@/components/ScoreResults";

type PageState = "form" | "analyzing" | "results" | "error";

export default function ScorePage() {
  const [state, setState] = useState<PageState>("form");
  const [stage, setStage] = useState<PipelineStage>("connecting");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(url: string, email: string) {
    setState("analyzing");
    setStage("connecting");
    setProgress(5);
    setMessage("Connecting to your site\u2026");

    try {
      // --- Phase 1: Fetch site data + store metadata ---
      await delay(500);
      setStage("fetching_homepage");
      setProgress(12);
      setMessage("Fetching homepage\u2026");

      const phase1Res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email }),
      });

      if (!phase1Res.ok) {
        const errorData = await phase1Res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch site data (${phase1Res.status})`
        );
      }

      const { products, feeds, storeMeta, url: normalizedUrl } = await phase1Res.json();

      await delay(400);
      setStage("discovering_feeds");
      setProgress(28);
      setMessage("Discovering product feeds\u2026");

      await delay(400);
      setStage("extracting_store_meta");
      setProgress(38);
      setMessage("Extracting store metadata\u2026");

      await delay(500);
      setStage("sampling_products");
      setProgress(48);
      setMessage(`Found ${products.length} products\u2026`);

      // --- Phase 2: Field mapping + scoring + AI commentary ---
      await delay(400);
      setStage("scoring_fields");
      setProgress(58);
      setMessage("Scoring against ACP fields\u2026");

      await delay(300);
      setStage("analyzing_acp");
      setProgress(68);
      setMessage("AI analysis & commentary\u2026");

      const phase2Res = await fetch("/api/score/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizedUrl,
          products,
          feeds,
          storeMeta,
        }),
      });

      if (!phase2Res.ok) {
        const errorData = await phase2Res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Analysis failed (${phase2Res.status})`
        );
      }

      // Midway progress update while awaiting parse
      setStage("generating_scorecard");
      setProgress(88);
      setMessage("Generating your scorecard\u2026");

      const { scorecard: result } = await phase2Res.json();

      await delay(400);
      setScorecard(result);
      setProgress(100);
      setState("results");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setState("error");
    }
  }

  function handleReset() {
    setState("form");
    setScorecard(null);
    setStage("connecting");
    setProgress(0);
    setMessage("");
    setErrorMessage("");
  }

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Page header */}
      <div className="text-center py-8 md:py-10">
        <p className="font-ui text-xs tracking-widest uppercase text-ink-muted mb-2">
          Free Diagnostic
        </p>
        <h1
          className="font-headline font-bold text-ink leading-tight"
          style={{ fontSize: "clamp(1.8rem, 5vw, 3rem)" }}
        >
          Agent Readiness Score
        </h1>
        <p className="font-headline italic text-ink-light text-base md:text-lg mt-2 max-w-xl mx-auto">
          See how visible your products are to AI shopping agents.
        </p>
      </div>

      {/* Thick-thin rule */}
      <div className="border-t-[3px] border-ink" />
      <div className="border-t border-rule mt-1 mb-8" />

      {/* State-based content */}
      {state === "form" && <ScoreForm onSubmit={handleSubmit} />}

      {state === "analyzing" && (
        <ScoreProgress stage={stage} message={message} progress={progress} />
      )}

      {state === "results" && scorecard && (
        <ScoreResults scorecard={scorecard} onReset={handleReset} />
      )}

      {state === "error" && (
        <div className="max-w-lg mx-auto text-center">
          <div className="border border-rule p-6 md:p-8">
            <div className="font-ui text-xs uppercase tracking-wider text-accent mb-3">
              Analysis Error
            </div>
            <p className="font-headline font-bold text-lg text-ink mb-3">
              Something went wrong.
            </p>
            <p className="font-body text-sm text-ink-light mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button onClick={handleReset} className="btn-newspaper">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Bottom ornament */}
      <div className="ornament">{"\u2726 \u2726 \u2726"}</div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
