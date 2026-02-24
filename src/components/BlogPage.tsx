"use client";

type Page = "home" | "about" | "commerce" | "pricing" | "blog" | "score";

export default function BlogPage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      <section className="section">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1
            className="font-display text-text leading-[1.05] tracking-[-0.03em]"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Blog
          </h1>
          <p className="font-sans text-lg text-text-secondary mt-6 leading-relaxed max-w-md mx-auto">
            Blog posts coming soon.
          </p>
          <button
            onClick={() => onNavigate("home")}
            className="btn-ghost mt-10"
          >
            Back to home <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </section>
    </div>
  );
}
