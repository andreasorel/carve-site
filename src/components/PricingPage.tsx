"use client";

type Page = "home" | "about" | "commerce" | "pricing" | "blog" | "score";

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
            We work as your embedded team for agentic commerce, ensuring you
            win.
          </h1>

          {/* All plans include */}
          <div className="mt-16">
            <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-text-tertiary mb-5">
              All plans include
            </p>
            <div className="flex flex-wrap gap-3">
              {["Reporting", "Optimization", "Strategy", "Education"].map(
                (item) => (
                  <span
                    key={item}
                    className="font-sans text-sm text-text-secondary border border-border rounded-sm px-4 py-2"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

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
                One-time setup. Audit, data optimization, and connection.
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
            <a
              href="mailto:william@usecarve.com"
              className="btn-primary"
            >
              Talk to sales
            </a>
            <button
              onClick={() => onNavigate("commerce")}
              className="btn-ghost"
            >
              What is agentic commerce? <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
