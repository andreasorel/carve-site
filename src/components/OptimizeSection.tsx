"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Product, QAPair, ReviewItem, AnalysisResult } from "@/lib/types";

function selectWorstProducts(
  products: Product[],
  analysisResult: AnalysisResult | undefined,
  count: number = 10
): Product[] {
  const arr = [...products];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

const COMPARISON_FIELDS: { key: keyof Product; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "condition", label: "Condition" },
  { key: "material", label: "Material" },
  { key: "dimensions", label: "Dimensions" },
  { key: "weight", label: "Weight" },
  { key: "size", label: "Size" },
  { key: "age_group", label: "Age Group" },
  { key: "gender", label: "Gender" },
  { key: "q_and_a", label: "Q&A" },
  { key: "review_list", label: "Reviews" },
];

function formatFieldValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (key === "q_and_a" && Array.isArray(value)) {
    const pairs = value as QAPair[];
    if (pairs.length === 0) return "";
    return pairs.map((p) => `Q: ${p.q}\nA: ${p.a}`).join("\n\n");
  }
  if (key === "review_list" && Array.isArray(value)) {
    const items = value as ReviewItem[];
    if (items.length === 0) return "";
    return items.map((r) => {
      const parts: string[] = [];
      if (r.title) parts.push(r.title);
      parts.push(r.content);
      if (r.rating) parts.push(`${r.rating}/${r.maxRating}`);
      return parts.join("\n");
    }).join("\n\n");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const COLLAPSED_HEIGHT = 120;

function ExpandableText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (ref.current) {
      setNeedsExpand(ref.current.scrollHeight > COLLAPSED_HEIGHT + 8);
    }
  }, [text]);

  return (
    <div>
      <div
        ref={ref}
        className={`text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden transition-[max-height] duration-300 ${className ?? ""}`}
        style={{ maxHeight: expanded ? `${ref.current?.scrollHeight ?? 9999}px` : `${COLLAPSED_HEIGHT}px` }}
      >
        {text}
      </div>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs uppercase text-accent hover:text-accent-hover transition-colors tracking-wide font-medium"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

type FieldStatus = "unchanged" | "added" | "improved";

function getFieldStatus(before: string, after: string): FieldStatus {
  if (before === after) return "unchanged";
  if (!before && after) return "added";
  return "improved";
}

function FieldBadge({ status }: { status: FieldStatus }) {
  if (status === "added") {
    return (
      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
        Added
      </span>
    );
  }
  if (status === "improved") {
    return (
      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
        Enriched
      </span>
    );
  }
  return null;
}

interface ComparisonCardProps {
  original: Product;
  optimized: Product;
  defaultOpen: boolean;
}

function ComparisonCard({ original, optimized, defaultOpen }: ComparisonCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const visibleFields = COMPARISON_FIELDS.filter(({ key }) => {
    const before = formatFieldValue(original[key], key);
    const after = formatFieldValue(optimized[key], key);
    return before || after;
  });

  const changedCount = visibleFields.filter(({ key }) => {
    const before = formatFieldValue(original[key], key);
    const after = formatFieldValue(optimized[key], key);
    return getFieldStatus(before, after) !== "unchanged";
  }).length;

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-surface-elevated">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-subtle/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-text-tertiary shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-sans font-medium text-sm text-text truncate">
            {optimized.title || original.title}
          </span>
        </div>
        {changedCount > 0 && (
          <span className="ml-3 shrink-0 text-[10px] uppercase tracking-wider text-accent font-medium">
            {changedCount} enriched
          </span>
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {visibleFields.map(({ key, label }) => {
            const before = formatFieldValue(original[key], key);
            const after = formatFieldValue(optimized[key], key);
            const status = getFieldStatus(before, after);

            return (
              <div key={key} className="px-6 py-5 border-b border-border/50 last:border-b-0">
                <div className="flex items-center mb-3">
                  <span className="section-label mb-0">{label}</span>
                  <FieldBadge status={status} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-sm bg-surface-subtle p-4">
                    <p className="section-label mb-2">Before</p>
                    {before ? (
                      <ExpandableText text={before} className="text-text-secondary" />
                    ) : (
                      <p className="text-sm text-text-tertiary italic">Empty</p>
                    )}
                  </div>
                  <div className={`rounded-sm p-4 ${
                    status === "added"
                      ? "bg-emerald-50 ring-1 ring-emerald-200"
                      : status === "improved"
                        ? "bg-accent/[0.04] ring-1 ring-accent/10"
                        : "bg-surface-subtle"
                  }`}>
                    <p className="section-label mb-2">After</p>
                    {after ? (
                      <ExpandableText text={after} className="text-text" />
                    ) : (
                      <p className="text-sm text-text-tertiary italic">Empty</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type OptState = "idle" | "optimizing" | "complete" | "error";

interface Props {
  products: Product[];
  analyzedUrl: string;
  analysisResult?: AnalysisResult;
}

export default function OptimizeSection({ products, analyzedUrl, analysisResult }: Props) {
  const [state, setState] = useState<OptState>("idle");
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  const handleOptimize = useCallback(async () => {
    setState("optimizing");
    setCurrentBatch(0);
    setTotalBatches(0);
    setPhaseLabel("Initializing");
    setOptimizedProducts([]);
    setError("");

    const sampled = selectWorstProducts(products, analysisResult, 10);
    setOriginalProducts(sampled);

    const baseUrl = analyzedUrl.startsWith("http")
      ? analyzedUrl
      : `https://${analyzedUrl}`;

    const analysisContext = analysisResult
      ? { categories: analysisResult.categories, recommendations: analysisResult.recommendations }
      : undefined;

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: sampled, baseUrl, analysisContext }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Optimization failed");
        setState("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Streaming not supported");
        setState("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      const accumulated: Product[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "phase") {
            setPhaseLabel(event.phaseLabel || "Processing");
          } else if (event.type === "progress") {
            setCurrentBatch(event.batch);
            setTotalBatches(event.total);
            accumulated.push(...event.products);
            setOptimizedProducts([...accumulated]);
          } else if (event.type === "complete") {
            setState("complete");
          } else if (event.type === "error") {
            setError(event.error);
            setState("error");
          }
        }
      }

      let hadError = false;
      if (buffer.trim()) {
        const event = JSON.parse(buffer);
        if (event.type === "complete") setState("complete");
        if (event.type === "error") {
          setError(event.error);
          setState("error");
          hadError = true;
        }
      }

      if (accumulated.length > 0 && !hadError) {
        setState("complete");
      }
    } catch {
      setError("Connection failed. Check your network and try again.");
      setState("error");
    }
  }, [products, analyzedUrl, analysisResult]);

  if (state === "idle") {
    return (
      <div className="py-8">
        <p className="section-label mb-6">Enrichment</p>
        <div className="card-elevated max-w-xl">
          <h3 className="font-display font-medium text-lg text-text mb-3">
            Enrich product data
          </h3>
          <p className="font-sans text-sm leading-relaxed text-text-secondary mb-8">
            Using the analysis findings above, scrape product pages and generate
            agent-ready descriptions and Q&A &mdash; targeting the specific weaknesses
            in your data. Before/after comparison across 10 products.
          </p>
          <button onClick={handleOptimize} className="btn-accent inline-flex items-center gap-2.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run Enrichment
          </button>
        </div>
      </div>
    );
  }

  if (state === "optimizing") {
    const progress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0;
    return (
      <div className="py-8">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h3 className="font-sans text-sm font-medium tracking-tight text-text">
              {phaseLabel}
            </h3>
          </div>
          <div className="w-full bg-surface-subtle rounded-full h-1.5 mb-4 overflow-hidden">
            <div
              className="bg-accent h-1.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progress, 3)}%` }}
            />
          </div>
          <div className="flex items-center justify-between section-label">
            {totalBatches > 0 ? (
              <span>Batch {currentBatch}/{totalBatches}</span>
            ) : (
              <span>Preparing</span>
            )}
            {optimizedProducts.length > 0 && (
              <span>{optimizedProducts.length} products enriched</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="py-8">
        <div className="max-w-md">
          <p className="font-sans text-sm font-medium text-text mb-2">
            Enrichment failed
          </p>
          <p className="font-sans text-sm text-text-tertiary mb-6">{error}</p>
          <button onClick={() => setState("idle")} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalChanged = optimizedProducts.reduce((sum, opt, i) => {
    const orig = originalProducts.find((p) => p.item_id === opt.item_id) || originalProducts[i] || opt;
    return sum + COMPARISON_FIELDS.filter(({ key }) => {
      const before = formatFieldValue(orig[key], key);
      const after = formatFieldValue(opt[key], key);
      return getFieldStatus(before, after) !== "unchanged";
    }).length;
  }, 0);

  return (
    <div className="py-8">
      <p className="section-label mb-6">Enrichment</p>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h3 className="font-display font-medium text-lg text-text mb-2">
            Enrichment complete
          </h3>
          <p className="font-sans text-sm text-text-secondary">
            {optimizedProducts.length} products processed. {totalChanged} fields enriched across the sample.
          </p>
        </div>
        <button onClick={() => setState("idle")} className="btn-secondary shrink-0">
          Run again
        </button>
      </div>

      <div className="space-y-3">
        {optimizedProducts.map((optimized, i) => {
          const original =
            originalProducts.find((p) => p.item_id === optimized.item_id) ||
            originalProducts[i] ||
            optimized;

          return (
            <ComparisonCard
              key={optimized.item_id || i}
              original={original}
              optimized={optimized}
              defaultOpen={i === 0}
            />
          );
        })}
      </div>
    </div>
  );
}
