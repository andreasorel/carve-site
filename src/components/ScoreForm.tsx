"use client";

import { useState, FormEvent } from "react";

interface ScoreFormProps {
  onSubmit: (url: string, email: string) => void;
}

export default function ScoreForm({ onSubmit }: ScoreFormProps) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ url?: string; email?: string }>({});

  function validate(): boolean {
    const next: { url?: string; email?: string } = {};

    if (!url.trim()) {
      next.url = "Please enter your store URL.";
    } else {
      try {
        const parsed = new URL(
          url.startsWith("http") ? url : `https://${url}`
        );
        if (!parsed.hostname.includes(".")) {
          next.url = "Please enter a valid URL.";
        }
      } catch {
        next.url = "Please enter a valid URL.";
      }
    }

    if (!email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Please enter a valid email address.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    onSubmit(normalizedUrl, email);
  }

  return (
    <div className="ad-block max-w-lg mx-auto">
      <div className="ad-block-inner">
        {/* Ornamental label */}
        <div className="font-ui text-xs tracking-widest uppercase text-ink-muted mb-3">
          &mdash; Agent Readiness Score &mdash;
        </div>

        {/* Headline */}
        <h2 className="font-headline font-bold text-2xl md:text-3xl text-ink mb-2">
          How Agent-Ready Is Your Webshop?
        </h2>

        {/* Subtitle */}
        <p className="font-headline italic text-ink-light text-base mb-6">
          Enter your store URL. We will do the rest.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* URL input */}
          <div className="mb-4 text-left">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors((prev) => ({ ...prev, url: undefined }));
              }}
              placeholder="https://your-store.com"
              className="w-full border border-rule bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
              style={{ borderRadius: "1px" }}
            />
            {errors.url && (
              <p className="font-mono text-xs text-accent mt-1">{errors.url}</p>
            )}
          </div>

          {/* Email input */}
          <div className="mb-6 text-left">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="your@email.com"
              className="w-full border border-rule bg-paper px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
              style={{ borderRadius: "1px" }}
            />
            {errors.email && (
              <p className="font-mono text-xs text-accent mt-1">{errors.email}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-newspaper-accent w-full sm:w-auto"
          >
            Analyze My Store
          </button>
        </form>

        {/* Fine print */}
        <p className="font-mono text-xs text-ink-faint mt-5 leading-relaxed">
          We sample up to 10 products. No data is stored beyond this session.
          Results in ~30 seconds.
        </p>
      </div>
    </div>
  );
}
