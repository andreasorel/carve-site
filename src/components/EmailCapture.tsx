"use client";

import { useState } from "react";

interface EmailCaptureProps {
  url: string;
  score: number;
}

export default function EmailCapture({ url, score }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, url, score }),
      });

      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="border-t border-border pt-8">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-4 h-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Report sent
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-8">
      <p className="section-label">Export</p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="px-4 py-2.5 rounded-sm bg-surface border border-border text-text text-sm font-sans placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors w-64"
          />
          <button
            type="submit"
            className="btn-accent whitespace-nowrap"
          >
            Send report
          </button>
        </form>
        <a
          href="mailto:hello@carve.co"
          className="text-sm text-text-tertiary hover:text-text transition-colors"
        >
          Contact us
        </a>
      </div>
      {error && (
        <p className="font-sans text-xs text-accent mt-3">{error}</p>
      )}
    </div>
  );
}
