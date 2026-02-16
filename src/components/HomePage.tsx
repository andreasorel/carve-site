"use client";

type Page = "home" | "services" | "insight";

export default function HomePage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* 1. HEADLINE */}
      <section className="py-10 md:py-14 text-center">
        <h2
          className="font-headline font-bold text-ink leading-tight max-w-3xl mx-auto"
          style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)" }}
        >
          AI Agents Will Control $5 Trillion in Commerce.
          <br />
          Are Your Products Visible?
        </h2>
        <p className="font-headline italic text-ink-light text-base md:text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
          The shopping funnel just compressed to three steps.
          Your website disappeared from the journey.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <a href="#cta" className="btn-newspaper-accent">
            Get Your Agent Score
          </a>
          <a href="#cta" className="btn-newspaper">
            Book a Call
          </a>
        </div>
      </section>

      {/* 2. STATS STRIP */}
      <div className="border-t-2 border-ink" />
      <section className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule py-6">
        {[
          { stat: "$5T", label: "Projected agentic commerce market by 2030" },
          { stat: "800M+", label: "Monthly users on ChatGPT, Perplexity, and peers" },
          { stat: "17%", label: "Of consumers have used AI to shop this year" },
          { stat: "50M+", label: "Products already indexed by AI shopping agents" },
        ].map((item, i) => (
          <div key={i} className="text-center px-3 py-2">
            <div className="font-headline font-bold text-2xl md:text-3xl text-ink">
              {item.stat}
            </div>
            <div className="font-ui text-xs text-ink-muted mt-1 leading-snug">
              {item.label}
            </div>
          </div>
        ))}
      </section>
      <div className="border-t-2 border-ink" />

      {/* 3. THE SHIFT */}
      <section className="py-10">
        <h3 className="font-headline font-bold text-2xl md:text-3xl text-center mb-8">
          The Shift
        </h3>
        <div className="md:flex gap-8">
          <div className="md:w-3/5 text-justify-newspaper text-ink-light leading-relaxed">
            <p className="drop-cap mb-4">
              Commerce is being rewritten by AI agents. Consumers no longer
              browse ten tabs, compare reviews, and hunt for coupons. They ask an
              agent, get a recommendation, and buy. The entire discovery and
              evaluation layer is collapsing into a single conversational
              interface.
            </p>
            <p className="mb-4">
              For brands, this means one thing: if your product data is not
              structured for agent consumption, you are invisible. Not poorly
              ranked. Invisible. The rules of search engine optimization are
              giving way to agent optimization, and most retailers have not even
              started.
            </p>
          </div>
          <div className="md:w-2/5 column-rule mt-6 md:mt-0 space-y-4">
            <div className="border border-rule p-4">
              <div className="font-ui text-xs uppercase tracking-wider text-ink-muted mb-3">
                The Old Funnel
              </div>
              {["Search", "Browse", "Compare", "Read reviews", "Find coupon", "Purchase"].map(
                (step, i) => (
                  <div
                    key={i}
                    className="font-mono text-sm text-ink-muted py-1 border-b border-rule last:border-0"
                  >
                    {i + 1}. {step}
                  </div>
                )
              )}
            </div>
            <div className="border-2 border-accent p-4">
              <div className="font-ui text-xs uppercase tracking-wider text-accent mb-3">
                The New Funnel
              </div>
              {["Ask agent", "Review recommendation", "Purchase"].map(
                (step, i) => (
                  <div
                    key={i}
                    className="font-mono text-sm text-ink font-medium py-1 border-b border-accent/30 last:border-0"
                  >
                    {i + 1}. {step}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate("insight")}
            className="font-ui text-sm text-accent hover:underline cursor-pointer"
          >
            Read the full story in Insight &rarr;
          </button>
        </div>
      </section>

      <div className="ornament">{"\u2726 \u2726 \u2726"}</div>

      {/* 4. DISPLAY AD BANNER */}
      <section className="ad-block my-2">
        <div className="ad-block-inner">
          <div className="font-ui text-xs tracking-widest uppercase text-ink-muted mb-2">
            &mdash; Free Diagnostic &mdash;
          </div>
          <h3 className="font-headline font-bold text-xl md:text-2xl text-ink mb-2">
            How Agent-Ready Is Your Product Feed?
          </h3>
          <p className="font-body text-sm text-ink-light max-w-lg mx-auto mb-4">
            Upload your feed. Get scored across six dimensions in 30 seconds.
          </p>
          <a href="#cta" className="btn-newspaper-accent">
            Check Your Score
          </a>
        </div>
      </section>

      <div className="ornament">{"\u2726 \u2726 \u2726"}</div>

      {/* 5. WHAT CARVE DOES */}
      <section className="py-8">
        <h3 className="font-headline font-bold text-2xl md:text-3xl text-center mb-8">
          What Carve Does
        </h3>
        <div className="md:flex gap-8">
          <div className="md:w-3/5 text-justify-newspaper text-ink-light leading-relaxed">
            <p className="drop-cap mb-4">
              Carve is not an agency and not a SaaS tool. We are commerce
              engineers who embed with your team to make your products visible to
              AI agents. We audit your product feeds, optimize structured data,
              and build the integrations that put your catalog in front of every
              major shopping agent.
            </p>
            <p>
              Our model is partnership, not projects. We start with a free
              readiness score, then work alongside your team on a monthly
              retainer. From feed optimization to forward-deployed engineering,
              we scale with your ambition.
            </p>
          </div>
          <div className="md:w-2/5 column-rule mt-6 md:mt-0">
            <div className="font-ui text-xs uppercase tracking-widest text-ink-muted mb-4">
              Classified: Services
            </div>
            {[
              {
                name: "Score",
                price: "Free",
                desc: "Agent readiness audit for your product feed.",
              },
              {
                name: "Optimize",
                price: "$1-3k/mo",
                desc: "AI-powered feed optimization and structured data.",
              },
              {
                name: "Perform",
                price: "$3-5k/mo",
                desc: "Continuous optimization with analytics dashboard.",
              },
              {
                name: "Embed",
                price: "$5-10k/mo",
                desc: "Forward-deployed commerce engineer on your team.",
              },
            ].map((tier, i) => (
              <div key={i} className="border-b border-rule py-3 last:border-0">
                <div className="flex items-baseline justify-between">
                  <span className="font-headline font-bold text-sm uppercase">
                    {tier.name}
                  </span>
                  <span className="font-mono text-xs text-accent">
                    {tier.price}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-1">{tier.desc}</p>
                <button
                  onClick={() => onNavigate("services")}
                  className="text-xs text-accent hover:underline mt-1 cursor-pointer"
                >
                  Learn more &rarr;
                </button>
              </div>
            ))}
            <div className="mt-4">
              <button
                onClick={() => onNavigate("services")}
                className="font-ui text-sm text-accent hover:underline cursor-pointer"
              >
                See all services and pricing &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="ornament">{"\u2726 \u2726 \u2726"}</div>

      {/* 6. PROTOCOLS */}
      <section className="my-2">
        <div className="border-t-2 border-ink" />
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule">
          {[
            { name: "ACP", status: "LIVE", desc: "Agent Commerce Protocol" },
            { name: "UCP", status: "LIVE", desc: "Unified Commerce Protocol" },
            { name: "AP2", status: "LIVE", desc: "Agent Product Protocol" },
            { name: "MCP", status: "GROWING", desc: "Model Context Protocol" },
          ].map((proto, i) => (
            <div key={i} className="text-center py-5 px-3">
              <div className="font-mono font-medium text-lg text-ink">
                {proto.name}
              </div>
              <div
                className={`font-mono text-xs mt-1 ${
                  proto.status === "LIVE" ? "text-accent" : "text-ink-muted"
                }`}
              >
                {proto.status}
              </div>
              <div className="font-ui text-xs text-ink-faint mt-1">
                {proto.desc}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-ink" />
      </section>

      <div className="ornament">{"\u2726 \u2726 \u2726"}</div>

      {/* 7. THE CARVERS */}
      <section className="py-8">
        <h3 className="font-headline font-bold text-2xl md:text-3xl text-center mb-8">
          The Carvers
        </h3>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              name: "William St\u00F6rtebecker",
              initial: "W",
              linkedin: "https://linkedin.com/in/william-stortebecker",
              bio: "First commercial hire at Riff. $2M+ ARR from zero, $16M Series A from Northzone. Built Riff\u2019s service delivery model. Retail is in his DNA.",
              gradient: "from-ink to-ink-light",
            },
            {
              name: "Andreas Ore Larssen",
              initial: "A",
              linkedin: "https://linkedin.com/in/andreasol",
              bio: "Built Norway\u2019s #1 consumer app at 15. Founded Naer, Meta\u2019s top-rated productivity app. Scaled Skyfri across US and Europe.",
              gradient: "from-accent to-ink",
            },
          ].map((founder, i) => (
            <div key={i} className="flex gap-5">
              <div
                className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${founder.gradient} flex items-center justify-center`}
              >
                <span className="font-headline font-bold text-2xl text-paper">
                  {founder.initial}
                </span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-lg">{founder.name}</h4>
                <a
                  href={founder.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-accent hover:underline"
                >
                  LinkedIn &rarr;
                </a>
                <p className="text-sm text-ink-light mt-2 leading-relaxed text-justify-newspaper">
                  {founder.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CLOSING CTA */}
      <div id="cta">
        <div className="border-t-[3px] border-ink" />
        <div className="border-t border-rule mt-1" />
      </div>
      <section className="py-10 text-center">
        <p className="font-headline italic text-ink-light text-lg mb-3">
          You&rsquo;ve read enough.
        </p>
        <h3 className="font-headline font-bold text-xl md:text-2xl text-ink mb-6">
          The race has started. See where your products stand.
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#cta" className="btn-newspaper-accent">
            Get Your Score
          </a>
          <a href="#cta" className="btn-newspaper">
            Book a Call
          </a>
        </div>
      </section>
      <div className="border-t border-rule" />
    </div>
  );
}
