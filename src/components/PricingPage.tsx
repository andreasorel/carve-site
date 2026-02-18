"use client";

type Page = "home" | "commerce" | "pricing" | "insight" | "started" | "score";

export default function PricingPage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h1
            className="font-display text-text leading-[1.05] tracking-[-0.03em] max-w-3xl"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Investment
          </h1>
          <p className="font-sans text-lg text-text-secondary mt-6 leading-relaxed max-w-xl">
            Simple, transparent pricing.
          </p>

          {/* Preparedness */}
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-text-tertiary mt-20 mb-5">
            Preparedness &middot; One-time
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-3">
                Standalone
              </p>
              <p className="font-display text-3xl font-normal text-text tracking-tight mb-1">
                $3,000
              </p>
              <p className="font-sans text-sm text-text-secondary">
                One-time setup — audit, data optimization, and protocol connection.
              </p>
            </div>
            <div className="card">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-3">
                Bundled with Ongoing
              </p>
              <p className="font-display text-3xl font-normal text-text tracking-tight mb-1">
                $2,000
              </p>
              <p className="font-sans text-sm text-text-secondary">
                Discounted when paired with an ongoing optimization plan.
              </p>
            </div>
          </div>

          {/* Ongoing */}
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-text-tertiary mt-14 mb-5">
            Ongoing Optimization
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-dark">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-3">
                Monthly Cycles
              </p>
              <p className="font-display text-3xl font-normal text-text-on-dark tracking-tight mb-1">
                $1,500
                <span className="text-lg text-text-on-dark-muted ml-1">/mo</span>
              </p>
              <p className="font-sans text-sm text-text-on-dark-muted">
                Monthly optimization and performance reporting.
              </p>
            </div>
            <div className="card-dark">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-3">
                Weekly Cycles
              </p>
              <p className="font-display text-3xl font-normal text-text-on-dark tracking-tight mb-1">
                $4,000
                <span className="text-lg text-text-on-dark-muted ml-1">/mo</span>
              </p>
              <p className="font-sans text-sm text-text-on-dark-muted">
                Weekly optimization for maximum velocity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-14">
            <button
              onClick={() => onNavigate("started")}
              className="btn-primary"
            >
              Get Started
            </button>
            <button
              onClick={() => onNavigate("commerce")}
              className="btn-ghost"
            >
              How it works <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
