"use client";

type Page = "home" | "about" | "commerce" | "pricing" | "blog" | "score";

export default function AboutPage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="hero-grain py-28 md:py-40 lg:py-48">
        <div className="max-w-6xl mx-auto px-6">
          <h1
            className="font-display text-text leading-[1.05] tracking-[-0.03em] max-w-3xl"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Carve makes agents recommend you first.
          </h1>
          <p className="font-sans text-lg md:text-xl text-text-secondary mt-8 leading-relaxed max-w-2xl">
            Carve is your agentic commerce partner. We embed with your team to
            rebuild your product data for how AI agents actually discover,
            compare, and choose products. We handle the protocols, the data
            architecture, and the optimization — so when agents shop for your
            customers, your products surface first.
          </p>
        </div>
      </section>

      {/* ── THE TEAM ── */}
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            The team behind Carve
          </h2>
          <div className="max-w-2xl mt-8">
            <p className="font-sans text-base text-text-secondary leading-relaxed">
              Carve was founded by William St&ouml;rtebecker and Andreas Ore
              Larssen. They have been working at the frontier of AI, and
              started Carve because we saw a once-in-a-generation shift in how
              commerce works — and a market full of retailers who aren&apos;t
              ready for it. We&apos;re fixing that.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-12">
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
