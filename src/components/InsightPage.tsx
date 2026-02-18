"use client";

import { useState } from "react";

type Page = "home" | "commerce" | "pricing" | "insight" | "started" | "score";

const faqItems = [
  {
    q: "What is agentic commerce?",
    a: "Agentic commerce is the emerging paradigm where AI agents, not human consumers, drive product discovery, evaluation, and purchase decisions. Instead of browsing websites, consumers delegate shopping to AI assistants that query structured data, compare options, and execute transactions autonomously.",
  },
  {
    q: "How is this different from traditional SEO?",
    a: "Traditional SEO optimizes for search engine crawlers that index web pages. Agentic commerce optimization structures your product data for AI agents that consume feeds, APIs, and protocols. The ranking factors are completely different: schema completeness, attribute richness, and protocol compliance matter more than backlinks or keyword density.",
  },
  {
    q: "Which AI agents are shopping for consumers today?",
    a: "ChatGPT with browsing and plugins, Google Gemini with Shopping Graph, Perplexity with product search, Amazon Rufus, and dozens of vertical-specific agents. The landscape is expanding rapidly, with new agents launching every week.",
  },
  {
    q: "How do I know if my products are agent-visible?",
    a: "Start with Carve\u2019s free Agent Readiness Score. We test your product feed against every major AI shopping agent and score you across six dimensions. Most brands discover they are invisible to at least half of active agents.",
  },
  {
    q: "When should we start preparing for agentic commerce?",
    a: "Now. The brands that structure their data and integrate with agent protocols today will have a compounding advantage as agent adoption accelerates. Waiting until agents dominate commerce means competing from behind against brands that have been optimizing for months or years.",
  },
];

export default function InsightPage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header */}
      <section className="section text-center">
        <p className="section-label">Intelligence Briefing</p>
        <h2 className="section-title mx-auto">Insight</h2>
        <p className="section-subtitle mx-auto max-w-xl">
          The intelligence briefing on agentic commerce
        </p>
      </section>

      <div className="border-t border-border" />

      {/* Article 1: The Rise of Ecommerce */}
      <article className="py-12">
        <h3 className="font-display font-medium text-2xl md:text-3xl text-center mb-8">
          The Rise of Ecommerce
        </h3>
        <div className="max-w-2xl mx-auto space-y-5">
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            Twenty-five years ago, commerce moved online and everything changed.
            Retailers who adapted early built empires. Those who dismissed the
            internet as a fad became case studies in disruption. The playbook was
            simple in retrospect: meet customers where they are, reduce friction,
            and win on convenience.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            The first wave rewarded those who built websites. The second wave
            rewarded those who mastered search engines. The third wave rewarded
            those who cracked social commerce. Each transition created new winners
            and destroyed incumbents who moved too slowly.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            We are now entering the fourth wave. It is not incremental. It is not
            an extension of the previous playbook. The fourth wave eliminates the
            interface between consumer and commerce entirely, replacing it with
            an intelligent agent that handles the entire journey.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            This is not a prediction about what might happen in a decade. It is
            happening right now. AI agents with shopping capabilities launched in
            2024 and 2025. Consumer adoption is accelerating. The infrastructure
            is being built in real time. The question is not whether agentic
            commerce will reshape retail, but whether your brand will be part of
            the new landscape or invisible within it.
          </p>
        </div>
      </article>

      <div className="border-t border-border" />

      {/* Article 2: AI Escapes the Lab */}
      <article className="py-12">
        <h3 className="font-display font-medium text-2xl md:text-3xl text-center mb-8">
          AI Escapes the Lab
        </h3>
        <div className="max-w-2xl mx-auto space-y-5">
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            For years, artificial intelligence was confined to research papers
            and enterprise software. It optimized ad bids, predicted demand, and
            personalized recommendations behind the scenes. Consumers never
            interacted with it directly. That changed when large language models
            became conversational, capable, and connected to the internet.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            The moment AI could browse the web, read product pages, compare
            specifications, and make purchase recommendations, it became a
            commerce agent. Not in theory. In practice. Today, millions of
            consumers ask ChatGPT what laptop to buy, ask Perplexity to find the
            best running shoes, and ask Google Gemini to compare meal kit
            subscriptions.
          </p>

          <blockquote className="border-l-2 border-accent pl-6 py-3 my-6">
            <p className="font-display italic text-lg text-text-secondary">
              &ldquo;The winners won&rsquo;t be the biggest retailers.
              It will be the fastest.&rdquo;
            </p>
          </blockquote>

          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            These agents do not see your beautiful website design, your brand
            story video, or your carefully crafted banner ads. They see data.
            Structured product data, schema markup, feed attributes, and protocol
            endpoints. If your data is clean, complete, and accessible, agents
            will recommend your products. If it is messy, incomplete, or locked
            behind authentication walls, they will recommend your competitor.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            The implications are profound. Brand equity built on visual identity
            and emotional marketing must now be complemented by data excellence.
            The brands that win in agentic commerce will be those that treat
            their product data as a first-class product in its own right.
          </p>
        </div>
      </article>

      <div className="border-t border-border" />

      {/* Article 3: When the Agent Becomes the Storefront */}
      <article className="py-12">
        <h3 className="font-display font-medium text-2xl md:text-3xl text-center mb-8">
          When the Agent Becomes the Storefront
        </h3>
        <div className="max-w-2xl mx-auto space-y-5">
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            Consider what happens when the majority of product discovery shifts
            to AI agents. The traditional storefront, whether physical or
            digital, becomes a fulfillment endpoint rather than a discovery
            channel. Consumers will not browse your homepage. They will not
            scroll your category pages. They will not read your blog posts. An
            agent will surface your product as a recommendation, the consumer
            will approve the purchase, and the transaction will complete.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            In this world, the agent is the storefront. Your product feed is
            your shop window. Your structured data is your sales pitch. And the
            protocols you integrate with determine which agents can even find
            you. This is a fundamental shift in how commerce operates, and it
            requires a fundamentally different approach to winning.
          </p>
          <p className="font-sans text-sm text-text-secondary leading-relaxed">
            That approach is what Carve was built to deliver. We combine deep
            commerce expertise with AI-native tooling to ensure your products
            are not just visible, but preferred, by every agent that matters. The
            race has started. The early movers are already building their
            advantage. The question is whether you will be among them.
          </p>
        </div>
      </article>

      <div className="border-t border-border" />

      {/* FAQ */}
      <section className="py-12">
        <h3 className="font-display font-medium text-2xl md:text-3xl text-center mb-8">
          Frequently Asked Questions
        </h3>
        <div className="max-w-2xl mx-auto">
          {faqItems.map((item, i) => (
            <div key={i} className="border-b border-border">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-start justify-between py-4 text-left cursor-pointer group"
              >
                <span className="font-display font-medium text-text pr-4 group-hover:text-accent transition-colors">
                  {item.q}
                </span>
                <span className="font-mono text-text-secondary flex-shrink-0 mt-1">
                  {openFaq === i ? "\u2212" : "+"}
                </span>
              </button>
              {openFaq === i && (
                <div className="pb-4 pr-8">
                  <p className="font-sans text-sm text-text-secondary leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Link to Services */}
      <div className="text-center py-4">
        <button
          onClick={() => onNavigate("commerce")}
          className="btn-ghost"
        >
          See how Carve helps <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      {/* Closing CTA */}
      <div id="cta" className="border-t border-border" />
      <section className="section text-center">
        <p className="font-display italic text-text-secondary text-lg mb-3">
          Knowledge without action is just noise.
        </p>
        <h3 className="font-display font-medium text-xl md:text-2xl text-text mb-6">
          See where your products stand today.
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button onClick={() => onNavigate("score")} className="btn-accent">
            Get Your Free Score
          </button>
          <a href="mailto:william@usecarve.com" className="btn-secondary">
            Book a Call
          </a>
        </div>
      </section>
      <div className="border-t border-border" />
    </div>
  );
}
