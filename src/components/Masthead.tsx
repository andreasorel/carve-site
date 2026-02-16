"use client";

type Page = "home" | "services" | "insight" | "score";

export default function Masthead({
  currentPage,
  onNavigate,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}) {
  const tabs: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Services", page: "services" },
    { label: "Insight", page: "insight" },
  ];

  return (
    <header className="max-w-5xl mx-auto px-4">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3 text-xs font-ui tracking-wider">
        <span className="text-ink-muted uppercase">Est. 2026 &middot; Oslo</span>
        <div className="flex items-center gap-6">
          <nav className="hidden sm:flex items-center gap-5">
            {tabs.map((tab) => (
              <button
                key={tab.page}
                onClick={() => onNavigate(tab.page)}
                className={`uppercase tracking-widest transition-colors ${
                  currentPage === tab.page
                    ? "text-ink font-bold"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => onNavigate("score")}
            className="btn-newspaper text-xs py-1.5 px-4"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Thick-thin double rule */}
      <div className="border-t-[3px] border-ink" />
      <div className="border-t border-rule mt-1" />

      {/* Mobile nav */}
      <nav className="sm:hidden flex items-center justify-center gap-5 py-2 text-xs font-ui">
        {tabs.map((tab) => (
          <button
            key={tab.page}
            onClick={() => onNavigate(tab.page)}
            className={`uppercase tracking-widest transition-colors ${
              currentPage === tab.page
                ? "text-ink font-bold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Masthead title */}
      <div className="text-center py-4 md:py-6">
        <h1
          className="font-headline font-black text-ink leading-none"
          style={{ fontSize: "clamp(3.5rem, 10vw, 6rem)" }}
        >
          Carve
        </h1>
        <p className="font-ui text-xs md:text-sm tracking-[0.35em] uppercase text-ink-muted mt-2">
          Agentic Commerce Partners
        </p>
      </div>

      {/* Thin-thick-thin triple rule */}
      <div className="border-t border-rule" />
      <div className="border-t-[3px] border-ink mt-1" />
      <div className="border-t border-rule mt-1" />

      {/* Dateline */}
      <div className="flex items-center justify-between py-2 text-xs font-mono text-ink-muted">
        <span>Vol. I &middot; No. 1</span>
        <span className="hidden sm:inline">Sunday, February 16, 2026</span>
        <span className="sm:hidden">Feb 16, 2026</span>
        <span>Price: Your Attention</span>
      </div>

      <div className="border-t border-rule" />
    </header>
  );
}
