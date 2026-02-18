"use client";

type Page = "home" | "commerce" | "pricing" | "insight" | "started" | "score";

export default function AgenticCommercePage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      {/* ── THE SHIFT ── */}
      <section className="bg-surface-inverse py-28 md:py-36">
        <div className="max-w-6xl mx-auto px-6">
          <h1
            className="font-display font-normal text-text-on-dark leading-[1.05] max-w-3xl tracking-[-0.03em]"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            The shopping funnel just collapsed.
          </h1>
          <p className="font-sans text-lg text-text-on-dark-muted mt-8 leading-relaxed max-w-xl">
            Consumers no longer browse ten tabs, compare reviews, and hunt for
            coupons. They ask an agent, get a recommendation, and buy.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px mt-20 bg-white/10 rounded-sm overflow-hidden">
            <div className="bg-surface-inverse p-8 md:p-10">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-text-on-dark-muted mb-6">
                The Old Funnel
              </p>
              <div className="space-y-0">
                {["Search", "Browse", "Compare", "Read reviews", "Find coupon", "Purchase"].map(
                  (step, i) => (
                    <div
                      key={i}
                      className="font-mono text-sm text-text-on-dark-muted py-2.5 border-b border-white/[0.06] last:border-0"
                    >
                      <span className="text-text-on-dark-muted/50 mr-3">{i + 1}</span>
                      {step}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="bg-white/[0.04] p-8 md:p-10">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-accent mb-6">
                The New Funnel
              </p>
              <div className="space-y-0">
                {["Ask agent", "Review recommendation", "Purchase"].map(
                  (step, i) => (
                    <div
                      key={i}
                      className="font-mono text-sm text-text-on-dark font-medium py-2.5 border-b border-white/[0.06] last:border-0"
                    >
                      <span className="text-accent mr-3">{i + 1}</span>
                      {step}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <p className="font-sans text-sm text-text-on-dark-muted mt-10 max-w-xl leading-relaxed">
            For brands, this means one thing: if your product data is not
            structured for agent consumption, you are invisible. Not poorly
            ranked. <span className="text-text-on-dark font-medium">Invisible.</span>
          </p>
        </div>
      </section>

      {/* ── TWO-PHASE APPROACH ── */}
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title">Two-phase approach</h2>
          <p className="section-subtitle max-w-xl">
            Get live on agent protocols, then compound your visibility week
            after week.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            {/* Phase 1 */}
            <div className="card-elevated">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-accent mb-3">
                Phase 1
              </p>
              <h3 className="font-display text-2xl font-normal text-text mb-1 tracking-tight">
                Preparedness
              </h3>
              <p className="font-sans text-sm text-text-tertiary mb-8">
                One-time. We get you live and ready for agent commerce protocols.
              </p>

              <div className="space-y-3 mb-8">
                <p className="font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                  What we do
                </p>
                {[
                  "Strategy session to align on goals and define success metrics",
                  "Education on the agentic commerce landscape for your category",
                  "Audit your current product feed against protocol requirements",
                  "Fill gaps: missing attributes, inconsistent data, incomplete descriptions",
                  "Connect your feed to OpenAI ACP and Google UCP",
                  "Validate and go live",
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-border mt-0.5 shrink-0">&mdash;</span>
                    <p className="font-sans text-sm text-text-secondary leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6">
                <p className="font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary mb-3">
                  What you get
                </p>
                <p className="font-sans text-sm text-text-secondary leading-relaxed">
                  Products purchasable inside ChatGPT and Google AI surfaces.
                  Readiness report documenting changes and current data quality score.
                </p>
              </div>
            </div>

            {/* Phase 2 */}
            <div className="card-elevated">
              <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-accent mb-3">
                Phase 2
              </p>
              <h3 className="font-display text-2xl font-normal text-text mb-1 tracking-tight">
                Optimization
              </h3>
              <p className="font-sans text-sm text-text-tertiary mb-8">
                Ongoing. We compound your visibility week after week.
              </p>

              <div className="space-y-3 mb-8">
                <p className="font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                  What we do
                </p>
                {[
                  "Pull performance data \u2014 what\u2019s being surfaced, recommended, purchased",
                  "Identify underperforming products and categories",
                  "Optimize your product feed based on what we learn",
                  "Report back with results and recommendations",
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-border mt-0.5 shrink-0">&mdash;</span>
                    <p className="font-sans text-sm text-text-secondary leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6 mb-8">
                <p className="font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary mb-3">
                  What you get
                </p>
                <p className="font-sans text-sm text-text-secondary leading-relaxed">
                  Performance report with actionable insights. Strategic review
                  of what&rsquo;s working and what to prioritize. Ongoing optimization
                  without adding headcount.
                </p>
              </div>

              <div className="bg-surface-subtle rounded-sm p-6">
                <h4 className="font-display text-base font-normal text-text mb-2 tracking-tight">
                  The compound effect
                </h4>
                <p className="font-sans text-sm text-text-secondary leading-relaxed">
                  Each optimization cycle feeds the next. As we learn what agents
                  prioritize for your category, we refine your data to match &mdash;
                  building a compounding advantage competitors without this system
                  can&rsquo;t replicate.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-12">
            <button
              onClick={() => onNavigate("pricing")}
              className="btn-primary"
            >
              View Pricing
            </button>
            <button
              onClick={() => onNavigate("insight")}
              className="btn-ghost"
            >
              Read the full story <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
