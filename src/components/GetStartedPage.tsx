"use client";

type Page = "home" | "commerce" | "pricing" | "insight" | "started" | "score";

export default function GetStartedPage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      <section className="bg-surface-inverse py-28 md:py-40 lg:py-48">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1
            className="font-display text-text-on-dark leading-[1.05] tracking-[-0.03em] max-w-3xl mx-auto"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Ready to make your products{" "}
            <span className="italic">visible</span>?
          </h1>
          <p className="font-sans text-lg text-text-on-dark-muted mt-8 leading-relaxed max-w-lg mx-auto">
            Start with a free score, or book a call to discuss how Carve
            can connect your catalog to every AI shopping agent.
          </p>

          <div className="mt-12">
            <a
              href="mailto:william@usecarve.com"
              className="font-sans text-base text-text-on-dark hover:text-accent transition-colors"
            >
              william@usecarve.com
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <button
              onClick={() => onNavigate("score")}
              className="btn-accent"
            >
              Get Your Score
            </button>
            <a
              href="mailto:william@usecarve.com"
              className="inline-flex items-center justify-center px-7 py-3 border border-white/15 text-text-on-dark font-sans text-[13px] font-medium tracking-wide rounded-sm bg-transparent transition-all duration-200 hover:border-white/30 cursor-pointer"
            >
              Book a Call
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
