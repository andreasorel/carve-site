"use client";

type Page = "home" | "commerce" | "pricing" | "insight" | "started" | "score";

export default function HomePage({
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
            className="font-display text-text leading-[1.05] tracking-[-0.03em] max-w-4xl"
            style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
          >
            Making your products{" "}
            <span className="italic text-accent">visible</span> and{" "}
            <span className="italic text-accent">purchasable</span>{" "}
            through ChatGPT.
          </h1>
          <p className="font-sans text-lg md:text-xl text-text-secondary mt-8 leading-relaxed max-w-xl">
            A dedicated team that connects your catalog to OpenAI, Google,
            and every emerging agent commerce protocol.
          </p>
          <div className="flex flex-wrap items-stretch gap-3 mt-12">
            <button
              onClick={() => onNavigate("score")}
              className="btn-primary h-11"
            >
              Get Your Score
            </button>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const btn = form.querySelector("button") as HTMLButtonElement;
                const email = new FormData(form).get("email") as string;
                if (!email) return;
                btn.disabled = true;
                btn.textContent = "Sending…";
                try {
                  const res = await fetch("/api/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  if (res.ok) {
                    form.reset();
                    btn.textContent = "Subscribed!";
                    setTimeout(() => { btn.textContent = "Stay up to date"; btn.disabled = false; }, 2500);
                  } else {
                    btn.textContent = "Try again";
                    setTimeout(() => { btn.textContent = "Stay up to date"; btn.disabled = false; }, 2500);
                  }
                } catch {
                  btn.textContent = "Try again";
                  setTimeout(() => { btn.textContent = "Stay up to date"; btn.disabled = false; }, 2500);
                }
              }}
              className="flex items-center border border-border rounded-sm overflow-hidden bg-surface-elevated/60 h-11"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="Email for updates"
                className="font-sans text-[13px] text-text bg-transparent px-4 h-full w-44 md:w-52 outline-none placeholder:text-text-tertiary"
              />
              <button
                type="submit"
                className="font-sans text-[13px] font-medium text-text-secondary hover:text-text px-4 h-full border-l border-border transition-colors cursor-pointer whitespace-nowrap"
              >
                Stay up to date
              </button>
            </form>
          </div>

          {/* ── Integration logos ── */}
          <div className="mt-16 pt-10 border-t border-text/[0.06]">
            <p className="font-sans text-[11px] font-medium uppercase tracking-[0.15em] text-text-tertiary mb-6">
              Integrates with
            </p>
            <div className="flex flex-wrap items-center gap-8 md:gap-12 opacity-40">
              {/* OpenAI */}
              <svg
                viewBox="-8.1 0.8 1564.3 428.4"
                className="h-6 md:h-7"
                fill="currentColor"
                aria-label="OpenAI"
              >
                <path d="m597.3 88c62.4 0 107.4 48.8 107.4 118.8 0 69.9-45 118.7-107.4 118.7-62.3 0-107.3-48.8-107.3-118.7 0-70 45-118.8 107.3-118.8zm0 36.3c-38.9 0-66.2 32.4-66.2 82.5 0 50 27.3 82.5 66.2 82.5s66.2-32.5 66.2-82.5c0-50.1-27.3-82.5-66.2-82.5zm174.7 180v75.5h-38.6v-226.3h38.6v18c10.6-12.6 26.6-21.2 48.5-21.2 47.2 0 74.2 39.8 74.2 87.6s-27 87.6-74.2 87.6c-21.9 0-37.9-8.6-48.5-21.2zm-1-61.3c0 31.2 18 48.8 41.8 48.8 27.9 0 43-21.8 43-53.9s-15.1-53.9-43-53.9c-23.8 0-41.8 17.3-41.8 49.1zm146.1-5.2c0-49.4 31.5-87.6 80.4-87.6 48.8 0 74.9 36.9 74.9 83.2v12.8h-118.3c2.9 28.9 20.2 46.5 45 46.5 19 0 34.1-9.6 39.2-26.9l33.1 12.5c-11.9 29.5-38.6 47.2-72.3 47.2-48.2 0-82-35.7-82-87.7zm38.9-20.5h77.5c-.3-18.6-11.9-34.7-36.3-34.7-20 0-35.4 11.9-41.2 34.7zm145.3-63.9h38.6v18c9.6-11.2 24.7-21.2 46.6-21.2 35.3 0 56.5 24.4 56.5 60.7v111h-38.5v-99.8c0-20.8-8.4-35.9-29.6-35.9-17.4 0-35 12.8-35 36.9v98.8h-38.6zm301.3-61.9 87.4 230.5h-41.5l-19.9-52.7h-99.6l-19.6 52.7h-40.9l87.5-230.5zm-60.1 141.9h72.6l-36.6-96.3zm172.5-141.2h41.2v230.4h-41.2zm-1119.2 83.9c31.4 34.8 36.8 85.9 13.3 126.5-15.2 26.7-41.3 45.5-71.4 51.7-14.4 44.6-56.1 74.8-103 74.7-30.8.2-60.1-12.9-80.5-35.9-45.9 9.9-92.9-11-116.3-51.7-15.6-26.5-18.9-58.4-9.2-87.6-31.4-34.7-36.8-85.9-13.3-126.4 15.3-26.7 41.3-45.6 71.4-51.7 14.4-44.6 56.1-74.8 103-74.7 30.8-.2 60.1 12.9 80.5 35.9 45.9-9.9 92.9 11 116.3 51.7 15.5 26.5 18.9 58.4 9.2 87.6zm-80.9 144.6v-99.5c0-.4-.3-.8-.7-.9l-36-20.8v120.1c0 5-2.7 9.7-7.1 12.1l-85.3 49.3c-.7.4-1.9 1-2.5 1.4 14.4 12 32.6 18.6 51.4 18.5 44.3 0 80.2-35.9 80.2-80.2zm-252.7 6.6c22.2 38.4 71.3 51.5 109.7 29.4l86.2-49.7c.4-.3.6-.7.5-1.1v-41.6l-104.1 60c-4.4 2.6-9.7 2.6-14 0l-85.4-49.2c-.8-.4-1.9-1.1-2.5-1.5-3.2 18.5.2 37.5 9.6 53.7zm-22.5-186c-22.1 38.4-8.9 87.4 29.4 109.6l86.2 49.7c.4.2.9.2 1.3-.1l36-20.8-104.1-60c-4.4-2.5-7.1-7.2-7-12.2v-98.4-3c-17.6 6.5-32.4 18.9-41.8 35.2zm296.3 68.9c4.3 2.5 7 7.1 7 12.1v101.4c17.6-6.5 32.4-18.9 41.7-35.2 22.2-38.3 9.1-87.4-29.3-109.6l-86.3-49.7c-.4-.2-.9-.1-1.2.1l-36.1 20.8zm35.9-54h-.1zm0 0c3.2-18.4-.2-37.4-9.6-53.6-22.1-38.4-71.2-51.6-109.6-29.4l-86.3 49.7c-.3.2-.5.6-.5 1.1v41.6l104.2-60.1c4.3-2.5 9.7-2.5 14 0l85.3 49.2c.8.4 1.9 1.1 2.5 1.5zm-225.6 74.1.1-120.1c-.1-5 2.6-9.6 7-12.1l85.3-49.2c.7-.5 1.9-1.1 2.5-1.4-14.4-12-32.6-18.6-51.3-18.6-44.4 0-80.3 35.9-80.4 80.2v99.5c.1.4.3.8.7 1zm19.6 11.4 46.4 26.7 46.4-26.7v-53.5l-46.4-26.8-46.4 26.8z" fillRule="evenodd" />
              </svg>

              {/* Google Gemini — sparkle mark only */}
              <div className="flex items-center gap-1.5" aria-label="Google Gemini">
                <svg viewBox="0 0 65 65" className="h-5 md:h-6" fill="currentColor">
                  <path d="M57.86 29.01C52.87 26.86 48.49 23.91 44.74 20.16C40.99 16.41 38.04 12.03 35.89 7.03C35.06 5.12 34.4 3.15 33.89 1.13C33.72.47 33.13 0 32.45 0C31.77 0 31.17.47 31.01 1.13C30.5 3.15 29.84 5.11 29.01 7.03C26.86 12.03 23.91 16.41 20.16 20.16C16.41 23.91 12.03 26.86 7.03 29.01C5.11 29.84 3.14 30.5 1.12 31.01C.46 31.18 0 31.77 0 32.45C0 33.13.46 33.72 1.12 33.89C3.14 34.4 5.11 35.06 7.03 35.89C12.03 38.04 16.4 40.99 20.16 44.74C23.91 48.49 26.86 52.87 29.01 57.87C29.84 59.78 30.5 61.75 31.01 63.77C31.17 64.43 31.77 64.9 32.45 64.9C33.13 64.9 33.72 64.43 33.89 63.77C34.4 61.75 35.06 59.78 35.89 57.87C38.04 52.87 40.99 48.49 44.74 44.74C48.49 40.99 52.87 38.04 57.86 35.89C59.78 35.06 61.75 34.4 63.77 33.89C64.43 33.72 64.89 33.13 64.89 32.45C64.89 31.77 64.43 31.18 63.77 31.01C61.75 30.5 59.78 29.84 57.86 29.01Z" />
                </svg>
                <span className="font-sans text-[15px] font-normal tracking-tight">Gemini</span>
              </div>

              {/* Shopify */}
              <svg
                viewBox="0 302.1 612 192"
                className="h-6 md:h-7"
                fill="currentColor"
                aria-label="Shopify"
              >
                <path d="M131.5 341.9c-.1-.9-.9-1.3-1.5-1.3s-13.7-1-13.7-1-9.1-9.1-10.2-10c-1-1-2.9-.7-3.7-.5-.1 0-2 .6-5.1 1.6-3.1-8.9-8.4-17-17.9-17h-.9c-2.6-3.4-6-5-8.8-5-22 0-32.6 27.5-35.9 41.5-8.6 2.7-14.7 4.5-15.4 4.8-4.8 1.5-4.9 1.6-5.5 6.1-.5 3.4-13 100.1-13 100.1l97.3 18.2L150 468c.1-.2-18.4-125.2-18.5-126.1zm-39.6-9.8c-2.4.7-5.3 1.6-8.2 2.6v-1.8c0-5.4-.7-9.8-2-13.3 5 .6 8.1 6.1 10.2 12.5zm-16.3-11.4c1.3 3.4 2.2 8.2 2.2 14.8v1c-5.4 1.7-11.1 3.4-17 5.3 3.3-12.6 9.6-18.8 14.8-21.1zm-6.4-6.2c1 0 2 .4 2.8 1-7.1 3.3-14.6 11.6-17.7 28.4-4.7 1.5-9.2 2.8-13.5 4.2 3.6-12.8 12.6-33.6 28.4-33.6z" />
                <path d="M130 340.4c-.6 0-13.7-1-13.7-1s-9.1-9.1-10.2-10c-.4-.4-.9-.6-1.3-.6l-7.3 150.6 52.8-11.4s-18.5-125.2-18.6-126.1c-.4-.9-1.1-1.3-1.7-1.5z" />
                <path d="M79.4 369.6L73 388.9s-5.8-3.1-12.7-3.1c-10.3 0-10.8 6.5-10.8 8.1 0 8.8 23 12.2 23 32.9 0 16.3-10.3 26.8-24.2 26.8-16.8 0-25.2-10.4-25.2-10.4l4.5-14.8s8.8 7.6 16.2 7.6c4.9 0 6.9-3.8 6.9-6.6 0-11.5-18.8-12-18.8-31 0-15.9 11.4-31.3 34.5-31.3 8.6-.1 13 2.5 13 2.5z" />
                <path d="M211.6 405.9c-5.3-2.8-8-5.3-8-8.6 0-4.2 3.8-6.9 9.7-6.9 6.9 0 13 2.8 13 2.8l4.8-14.7s-4.4-3.4-17.4-3.4c-18.1 0-30.7 10.4-30.7 25 0 8.3 5.9 14.6 13.7 19.1 6.4 3.5 8.6 6.1 8.6 9.9 0 3.9-3.2 7.1-9.1 7.1-8.7 0-17-4.5-17-4.5l-5.1 14.7s7.6 5.1 20.4 5.1c18.6 0 32.1-9.2 32.1-25.7-.2-9-6.9-15.2-15-19.9zM285.8 374.9c-9.2 0-16.4 4.4-21.9 11l-.2-.1 8-41.6H251l-20.2 106h20.7l6.9-36.2c2.7-13.7 9.8-22.2 16.4-22.2 4.7 0 6.5 3.2 6.5 7.7 0 2.8-.2 6.4-.9 9.2l-7.8 41.5h20.7l8.1-42.8c.9-4.5 1.5-9.9 1.5-13.6-.1-11.9-6.2-18.9-17.1-18.9zM349.7 374.9c-25 0-41.5 22.5-41.5 47.6 0 16 9.9 29 28.5 29 24.5 0 41-21.9 41-47.6.1-14.9-8.5-29-28-29zm-10.2 60.8c-7.1 0-10-6-10-13.6 0-11.9 6.1-31.2 17.4-31.2 7.3 0 9.8 6.4 9.8 12.5 0 12.7-6.3 32.3-17.2 32.3zM430.8 374.9c-14 0-21.9 12.4-21.9 12.4h-.2l1.2-11.1h-18.4c-.9 7.5-2.6 19-4.2 27.5L373 479.6h20.7l5.8-30.7h.5s4.3 2.7 12.1 2.7c24.4 0 40.3-25 40.3-50.2-.1-14-6.4-26.5-21.6-26.5zm-19.8 61c-5.4 0-8.6-3.1-8.6-3.1l3.4-19.3c2.4-13 9.2-21.5 16.4-21.5 6.4 0 8.3 5.9 8.3 11.4.1 13.4-7.9 32.5-19.5 32.5zM481.9 345.2c-6.6 0-11.9 5.3-11.9 12 0 6.1 3.9 10.4 9.8 10.4h.2c6.5 0 12-4.4 12.1-12 .1-6.1-4-10.4-10.2-10.4zM452.9 450.1h20.7l14-73.6h-20.8M540.4 376.4H526l.7-3.4c1.2-7.1 5.4-13.3 12.4-13.3 3.7 0 6.6 1.1 6.6 1.1l4-16.3s-3.5-1.8-11.3-1.8c-7.3 0-14.7 2.1-20.3 6.9-7.1 6-10.4 14.7-12 23.5l-.6 3.4h-9.7l-3.1 15.7h9.7l-11 58h20.7l11-58h14.3l3-15.8zM590.3 376.5s-13 32.7-18.7 50.6h-.2c-.4-5.8-5.1-50.6-5.1-50.6h-21.8l12.5 67.4c.2 1.5.1 2.4-.5 3.4-2.4 4.7-6.5 9.2-11.3 12.5-3.9 2.8-8.3 4.7-11.8 5.9l5.8 17.6c4.2-.9 13-4.4 20.3-11.3 9.4-8.8 18.2-22.5 27.2-41.1l25.3-54.5h-21.7z" />
              </svg>

            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="bg-surface-inverse py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-start">
            <div>
              <h2
                className="font-display font-normal text-text-on-dark leading-[1.1] tracking-[-0.025em]"
                style={{ fontSize: "clamp(26px, 3.5vw, 38px)" }}
              >
                Shopping is changing faster than your product feed.
              </h2>
              <p className="font-sans text-base text-text-on-dark-muted mt-6 leading-relaxed">
                Consumers are shifting from search-and-browse to ask-and-buy.
                AI agents now research, compare, and purchase on their behalf —
                collapsing the traditional funnel into a single conversation.
              </p>
              <p className="font-sans text-base text-text-on-dark-muted mt-4 leading-relaxed">
                If your catalog is not structured for agent consumption, you
                are not poorly ranked. You are{" "}
                <span className="text-text-on-dark font-medium">invisible</span>.
              </p>
            </div>

            <div className="space-y-8">
              {[
                {
                  stat: "70%",
                  label:
                    "of product data fails basic agent-readiness checks across categories we audit.",
                },
                {
                  stat: "3→1",
                  label:
                    "steps. The traditional six-step funnel has collapsed to: ask, review, buy.",
                },
                {
                  stat: "0",
                  label:
                    "second chances. Agents don't browse. If your data is incomplete, they skip you entirely.",
                },
              ].map((item) => (
                <div key={item.stat}>
                  <p className="font-display text-3xl md:text-4xl font-normal text-accent tracking-tight">
                    {item.stat}
                  </p>
                  <p className="font-sans text-sm text-text-on-dark-muted mt-1.5 leading-relaxed">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT CARVE DOES ── */}
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            We make your entire catalog agent-ready — then keep it there.
          </h2>
          <p className="section-subtitle max-w-xl">
            Carve is a managed service. We handle the strategy, the data work,
            the protocol connections, and the ongoing optimization — so you
            don&apos;t have to build an internal team around a moving target.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
            {[
              {
                num: "01",
                title: "Connection",
                desc: "We connect your product catalog to every major agent commerce protocol — OpenAI's ACP, Google's UCP, and more — so your products are live where agents shop.",
              },
              {
                num: "02",
                title: "Optimization",
                desc: "We restructure your product data so AI agents understand, recommend, and choose you. Attributes, descriptions, categorization — every detail tuned for agent consumption.",
              },
              {
                num: "03",
                title: "Performance",
                desc: "We run continuous optimization cycles, measuring what agents surface, what they skip, and why — then refine your feed to compound visibility over time.",
              },
            ].map((pillar) => (
              <div key={pillar.num} className="group py-8 md:py-10 md:px-1">
                <span className="font-mono text-xs text-accent">{pillar.num}</span>
                <h3 className="font-display text-xl font-normal text-text mt-4 mb-3 tracking-tight">
                  {pillar.title}
                </h3>
                <p className="font-sans text-sm text-text-secondary leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate("commerce")}
            className="btn-ghost mt-6"
          >
            See how it works in detail <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </section>

      {/* ── WHY NOW ── */}
      <section className="section-alt">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-start">
            <div>
              <h2 className="section-title max-w-md">
                The window to lead is narrow.
              </h2>
              <p className="font-sans text-base text-text-secondary mt-6 leading-relaxed">
                Agent commerce protocols are being adopted right now. The brands
                that connect early will define the defaults agents learn from —
                and once those patterns are set, displacing an incumbent becomes
                exponentially harder.
              </p>
              <p className="font-sans text-base text-text-secondary mt-4 leading-relaxed">
                This is not a feature to ship next quarter. It is a channel that
                compounds — and every week without presence is market share you
                won&apos;t recover.
              </p>
            </div>

            <div className="space-y-5">
              {[
                {
                  title: "First-mover advantage",
                  desc: "Agents learn from early data. Being first means shaping how your category gets recommended.",
                },
                {
                  title: "Compounding returns",
                  desc: "Each optimization cycle builds on the last. Brands that start now pull further ahead with every week.",
                },
                {
                  title: "No internal team required",
                  desc: "The protocol landscape moves weekly. Carve tracks it, adapts to it, and keeps your data current — so your team can focus on product.",
                },
                {
                  title: "Full protocol coverage",
                  desc: "We integrate with ACP, UCP, AP2, and MCP — today. As new protocols emerge, your catalog is automatically extended.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="py-5 border-b border-border last:border-0"
                >
                  <h3 className="font-sans text-sm font-medium text-text">
                    {item.title}
                  </h3>
                  <p className="font-sans text-sm text-text-secondary mt-1.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO-PHASE OVERVIEW ── */}
      <section className="section">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title max-w-2xl">
            From zero to compounding in two phases.
          </h2>
          <p className="section-subtitle max-w-xl">
            A one-time preparedness setup followed by ongoing optimization — no
            long-term commitment to get started.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            <div className="card">
              <span className="font-mono text-xs text-accent">Phase 1</span>
              <h3 className="font-display text-2xl font-normal text-text mt-3 mb-2 tracking-tight">
                Preparedness
              </h3>
              <p className="font-sans text-sm text-text-secondary leading-relaxed mb-6">
                We audit your product data, fill gaps, and connect your catalog
                to agent commerce protocols. When we are done, your products are
                live and purchasable inside ChatGPT, Google AI, and every major
                agent surface.
              </p>
              <p className="font-mono text-xs text-text-tertiary">
                One-time &middot; From $2,000 bundled
              </p>
            </div>

            <div className="card">
              <span className="font-mono text-xs text-accent">Phase 2</span>
              <h3 className="font-display text-2xl font-normal text-text mt-3 mb-2 tracking-tight">
                Optimization
              </h3>
              <p className="font-sans text-sm text-text-secondary leading-relaxed mb-6">
                We pull performance data, identify what agents are surfacing and
                what they are skipping, then optimize your feed to compound
                visibility. Each cycle builds on the last, creating an advantage
                competitors cannot easily replicate.
              </p>
              <p className="font-mono text-xs text-text-tertiary">
                Monthly or weekly cycles &middot; From $1,500/mo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-12">
            <button
              onClick={() => onNavigate("commerce")}
              className="btn-secondary"
            >
              Full Service Details
            </button>
            <button
              onClick={() => onNavigate("pricing")}
              className="btn-ghost"
            >
              View pricing <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── SCORE CTA ── */}
      <section className="section-alt">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="section-title mx-auto" style={{ maxWidth: "520px" }}>
            How agent-ready is your product feed?
          </h2>
          <p className="font-sans text-base text-text-secondary mt-5 max-w-md mx-auto leading-relaxed">
            Get scored across six dimensions in under a minute.
            No commitment, no credit card.
          </p>
          <button
            onClick={() => onNavigate("score")}
            className="btn-accent mt-10"
          >
            Check Your Score
          </button>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="bg-surface-inverse py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2
            className="font-display font-normal text-text-on-dark leading-[1.1] tracking-[-0.025em] max-w-2xl mx-auto"
            style={{ fontSize: "clamp(26px, 3.5vw, 38px)" }}
          >
            Ready to make your products visible to AI agents?
          </h2>
          <p className="font-sans text-base text-text-on-dark-muted mt-6 leading-relaxed max-w-md mx-auto">
            Start with a free diagnostic, or reach out to discuss how Carve
            fits your catalog.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <button
              onClick={() => onNavigate("score")}
              className="btn-accent"
            >
              Get Your Score
            </button>
            <button
              onClick={() => onNavigate("started")}
              className="inline-flex items-center justify-center px-7 py-3 border border-white/15 text-text-on-dark font-sans text-[13px] font-medium tracking-wide rounded-sm bg-transparent transition-all duration-200 hover:border-white/30 cursor-pointer"
            >
              Get in Touch
            </button>
          </div>

          <a
            href="mailto:william@usecarve.com"
            className="inline-block font-sans text-sm text-text-on-dark-muted hover:text-accent transition-colors mt-8"
          >
            william@usecarve.com
          </a>
        </div>
      </section>
    </div>
  );
}
