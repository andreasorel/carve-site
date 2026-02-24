"use client";

type Page = "home" | "about" | "commerce" | "pricing" | "blog" | "score";

export default function AgenticCommercePage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="bg-surface-inverse py-28 md:py-36">
        <div className="max-w-6xl mx-auto px-6">
          <h1
            className="font-display font-normal text-text-on-dark leading-[1.05] max-w-3xl tracking-[-0.03em]"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            The way people buy is changing. Permanently.
          </h1>
          <p className="font-sans text-lg text-text-on-dark-muted mt-8 leading-relaxed max-w-xl">
            Discovery drives ecommerce. First it was search engines. Then it was
            social media. Now it&apos;s AI agents, and they&apos;re rewriting
            the rules of how products get found, compared, and purchased.
          </p>
        </div>
      </section>

      {/* ── COMMERCE WITHOUT THE CLICK ── */}
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            Commerce without the click.
          </h2>
          <div className="max-w-2xl mt-8 space-y-5">
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              For 20 years, the buying journey looked the same: search &rarr;
              click &rarr; website &rarr; product page &rarr; cart &rarr;
              checkout.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              Agentic commerce compresses all of that into three steps: ask
              &rarr; compare &rarr; buy.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              AI agents like ChatGPT, Google Gemini, and Perplexity are now
              researching products, comparing options, and completing purchases
              on behalf of consumers, often without ever visiting a
              retailer&apos;s website. Your website disappears from the journey
              entirely.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              This isn&apos;t a future scenario. ChatGPT already processes over
              50 million shopping queries every day. Google&apos;s AI Overviews
              reach 1.5 billion people monthly. During the 2025 Thanksgiving
              weekend, AI agents influenced 17% of all holiday orders.
            </p>
          </div>
        </div>
      </section>

      {/* ── THE NEW INVISIBLE ── */}
      <section className="section-alt">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            The new invisible.
          </h2>
          <div className="max-w-2xl mt-8 space-y-5">
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              AI agents don&apos;t browse websites, they consume structured
              product feeds. They parse specifications, compare attributes, and
              make recommendations based on data quality and completeness. If
              your product data isn&apos;t optimized for how agents reason, you
              simply won&apos;t be surfaced. Not ranked lower. Not shown on page
              two.{" "}
              <span className="text-text font-medium">Gone.</span>
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              McKinsey estimates that agentic commerce will represent $3&ndash;5
              trillion in revenue by 2030, between 17% and 28% of all B2C
              ecommerce.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              The retailers who move early will capture disproportionate share in
              a market that barely existed 12 months ago. The ones who wait will
              spend the next decade trying to catch up.
            </p>
          </div>
        </div>
      </section>

      {/* ── NEW PROTOCOLS ── */}
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            New protocols. New data requirements. New winners.
          </h2>
          <div className="max-w-2xl mt-8 space-y-5">
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              The infrastructure for agentic commerce is being built right now.
              OpenAI launched its Agentic Commerce Protocol (ACP). Google
              released its Universal Commerce Protocol (UCP). Both these
              protocols enable agents to not just recommend, but transact.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              These protocols require product data that traditional feeds were
              never designed to provide. Compatibility signals, Q&amp;A, raw
              review data and more. Without providing these signals, you risk
              agents choosing your competitors.
            </p>
          </div>
        </div>
      </section>

      {/* ── WINDOW WON'T STAY OPEN ── */}
      <section className="section-alt">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            This window won&apos;t stay open long.
          </h2>
          <div className="max-w-2xl mt-8 space-y-5">
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              45% of US consumers already use generative AI for product research
              and comparison. 44% of users who&apos;ve tried AI-powered search
              say it&apos;s become their primary way of searching, replacing
              Google as the default. The behavioral shift has already happened.
            </p>
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              What hasn&apos;t happened yet is most retailers responding. Massive
              consumer adoption but minimal retailer preparation is a massive
              opportunity. Early movers don&apos;t just get a head start. The
              early winners become the default recommendations.
            </p>
            <p className="font-sans text-base text-text font-medium leading-relaxed">
              The question isn&apos;t whether agentic commerce will reshape
              retail. It&apos;s whether your products will be visible when it
              does.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-12">
            <button
              onClick={() => onNavigate("pricing")}
              className="btn-primary"
            >
              View Pricing
            </button>
            <a
              href="mailto:william@usecarve.com"
              className="btn-ghost"
            >
              Talk to sales <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
