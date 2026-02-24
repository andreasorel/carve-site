"use client";

import { useState } from "react";

type Page = "home" | "about" | "commerce" | "pricing" | "blog" | "score";

export default function Masthead({
  currentPage,
  onNavigate,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs: { label: string; page: Page }[] = [
    { label: "About", page: "about" },
    { label: "Agentic Commerce", page: "commerce" },
    { label: "Pricing", page: "pricing" },
    { label: "Blog", page: "blog" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate("home")}
          className="font-display text-lg text-text tracking-tight cursor-pointer"
        >
          Carve
        </button>

        <nav className="hidden md:flex items-center gap-7">
          {tabs.map((tab) => (
            <button
              key={tab.page}
              onClick={() => onNavigate(tab.page)}
              className={`font-sans text-[13px] transition-colors cursor-pointer ${
                currentPage === tab.page
                  ? "text-text"
                  : "text-text-tertiary hover:text-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          className="md:hidden text-text-secondary hover:text-text cursor-pointer p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <path d="M4 4l10 10M14 4L4 14" />
            ) : (
              <path d="M2 5.5h14M2 9h14M2 12.5h14" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden bg-surface px-6 py-5 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.page}
              onClick={() => {
                onNavigate(tab.page);
                setMobileOpen(false);
              }}
              className={`block w-full text-left font-sans text-[13px] py-2.5 transition-colors cursor-pointer ${
                currentPage === tab.page
                  ? "text-text"
                  : "text-text-tertiary hover:text-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
