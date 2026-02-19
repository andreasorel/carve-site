"use client";

import { useState, FormEvent } from "react";

interface ScoreFormProps {
  onSubmit: (url: string) => void;
}

export default function ScoreForm({ onSubmit }: ScoreFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function validate(): boolean {
    if (!url.trim()) {
      setError("Please enter your store URL.");
      return false;
    }
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      if (!parsed.hostname.includes(".")) {
        setError("Please enter a valid URL.");
        return false;
      }
    } catch {
      setError("Please enter a valid URL.");
      return false;
    }
    setError("");
    return true;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    onSubmit(normalizedUrl);
  }

  return (
    <div className="card-elevated max-w-lg mx-auto">
      <p className="font-sans text-xs font-medium uppercase tracking-[0.1em] text-accent mb-3">
        Agent Readiness Score
      </p>

      <h2 className="font-display font-medium text-2xl md:text-3xl text-text mb-2">
        How Agent-Ready Is Your Store?
      </h2>

      <p className="font-sans text-text-secondary text-sm leading-relaxed mb-6">
        Enter your store URL. We&apos;ll analyze your product data quality, trust signals,
        and feed completeness.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            placeholder="your-store.com"
            className="flex-1 border border-border bg-surface px-4 py-3 font-sans text-sm text-text placeholder:text-text-tertiary rounded-sm focus:border-text focus:outline-none transition-colors"
          />
          <button type="submit" className="btn-accent whitespace-nowrap">
            Analyze Feed
          </button>
        </div>
        {error && (
          <p className="font-sans text-xs text-accent mt-2">{error}</p>
        )}
      </form>

      <p className="font-sans text-xs text-text-tertiary mt-5 leading-relaxed">
        Analyzes up to 1,000 products. Checks data quality, trust signals,
        media coverage, and feed completeness. Results in ~30 seconds.
      </p>
    </div>
  );
}
