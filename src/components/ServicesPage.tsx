"use client";

const tiers = [
  {
    name: "Score",
    price: "Free",
    description:
      "Your starting point. We run a full agent readiness audit on your product feed, testing it against every major AI shopping agent. You get a detailed scorecard across six dimensions: schema completeness, attribute richness, competitive positioning, agent discoverability, protocol compliance, and feed freshness. Most brands score below 40%. This tells you exactly where you stand and what to fix first.",
    cta: "Get Your Free Score",
  },
  {
    name: "Optimize",
    price: "$1,000 \u2013 $3,000/mo",
    description:
      "We take your product feed and make it agent-ready. Using proprietary AI tools, we enrich structured data, fix schema gaps, optimize product descriptions for agent consumption, and ensure your catalog meets the requirements of every major commerce protocol. You get monthly reporting on agent visibility and feed quality improvements. Ideal for brands with up to 10,000 SKUs who want to move fast.",
    cta: "Start Optimizing",
  },
  {
    name: "Perform",
    price: "$3,000 \u2013 $5,000/mo",
    description:
      "Everything in Optimize, plus continuous performance monitoring and analytics. We track how AI agents discover, rank, and recommend your products in real time. You get a live dashboard showing agent impressions, recommendation rates, and competitive benchmarks. We run ongoing A/B tests on product data to maximize agent conversion. Built for brands scaling past 10,000 SKUs or operating in competitive categories.",
    cta: "Boost Performance",
  },
  {
    name: "Embed",
    price: "$5,000 \u2013 $10,000/mo",
    description:
      "A forward-deployed Carve engineer joins your team. They work inside your systems, building custom integrations with commerce protocols, optimizing your data pipeline, and shipping agent-facing features alongside your developers. This is for enterprise brands that want to lead, not follow. You get a dedicated engineer, weekly strategy sessions, and priority access to new protocol integrations as they launch.",
    cta: "Request an Engineer",
  },
];

const protocols = [
  {
    name: "ACP",
    full: "Agent Commerce Protocol",
    status: "LIVE",
    description:
      "The open standard for AI agents to discover, evaluate, and transact with product catalogs. Carve ensures your feeds are ACP-compliant, making your products visible to any agent built on this protocol.",
  },
  {
    name: "UCP",
    full: "Unified Commerce Protocol",
    status: "LIVE",
    description:
      "A cross-platform protocol that unifies product data across marketplaces, search engines, and AI agents. We structure your data once and distribute it everywhere.",
  },
  {
    name: "AP2",
    full: "Agent Product Protocol",
    status: "LIVE",
    description:
      "Designed for rich product interactions, AP2 lets agents ask follow-up questions about your products, compare specifications, and handle complex purchase flows. We build the integration layer.",
  },
  {
    name: "MCP",
    full: "Model Context Protocol",
    status: "GROWING",
    description:
      "Anthropic\u2019s protocol for connecting AI models to external data sources. As MCP adoption grows, Carve is building tooling to expose your product catalog as a first-class MCP resource.",
  },
];

export default function ServicesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header */}
      <section className="py-10 text-center">
        <h2 className="font-headline font-bold text-3xl md:text-4xl text-ink">
          Services &amp; Pricing
        </h2>
        <p className="font-headline italic text-ink-light text-base md:text-lg mt-3 max-w-xl mx-auto">
          Four tiers of partnership. Start free, scale as you grow.
        </p>
      </section>

      <div className="border-t-[3px] border-ink" />
      <div className="border-t border-rule mt-1" />

      {/* Tiers */}
      <section className="py-6">
        {tiers.map((tier, i) => (
          <div key={i}>
            <div className="md:flex gap-8 py-8">
              <div className="md:w-1/3 mb-4 md:mb-0">
                <h3 className="font-headline font-bold text-2xl text-ink">
                  {tier.name}
                </h3>
                <div className="font-mono text-sm text-accent mt-1">
                  {tier.price}
                </div>
              </div>
              <div className="md:w-2/3 column-rule">
                <p className="text-justify-newspaper text-ink-light leading-relaxed mb-4">
                  {tier.description}
                </p>
                <a href="#cta" className="btn-newspaper-accent text-xs">
                  {tier.cta}
                </a>
              </div>
            </div>
            {i < tiers.length - 1 && <div className="border-t border-rule" />}
          </div>
        ))}
      </section>

      <div className="ornament">{"\u2726 \u2726 \u2726"}</div>

      {/* Protocols */}
      <section className="py-8">
        <h3 className="font-headline font-bold text-2xl md:text-3xl text-center mb-2">
          Protocols We Integrate
        </h3>
        <p className="font-headline italic text-ink-light text-center text-sm mb-8">
          The infrastructure layer of agentic commerce
        </p>

        <div className="border-t-2 border-ink" />
        <div className="grid md:grid-cols-2 gap-0">
          {protocols.map((proto, i) => (
            <div
              key={i}
              className={`p-6 ${
                i % 2 === 0 ? "md:border-r border-rule" : ""
              } ${i < 2 ? "border-b border-rule" : ""}`}
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono font-medium text-lg text-ink">
                  {proto.name}
                </span>
                <span className="font-ui text-xs text-ink-faint">
                  {proto.full}
                </span>
              </div>
              <span
                className={`font-mono text-xs ${
                  proto.status === "LIVE" ? "text-accent" : "text-ink-muted"
                }`}
              >
                {proto.status}
              </span>
              <p className="text-sm text-ink-light mt-3 leading-relaxed text-justify-newspaper">
                {proto.description}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-ink" />
      </section>

      {/* Closing CTA */}
      <div id="cta">
        <div className="border-t-[3px] border-ink" />
        <div className="border-t border-rule mt-1" />
      </div>
      <section className="py-10 text-center">
        <p className="font-headline italic text-ink-light text-lg mb-3">
          Ready to become agent-visible?
        </p>
        <h3 className="font-headline font-bold text-xl md:text-2xl text-ink mb-6">
          Start with a free score. No commitment required.
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#cta" className="btn-newspaper-accent">
            Get Your Free Score
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
