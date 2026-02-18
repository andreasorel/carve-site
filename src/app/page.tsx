"use client";

import { useState } from "react";
import Masthead from "@/components/Masthead";
import HomePage from "@/components/HomePage";
import AgenticCommercePage from "@/components/AgenticCommercePage";
import PricingPage from "@/components/PricingPage";
import InsightPage from "@/components/InsightPage";
import GetStartedPage from "@/components/GetStartedPage";
import ScorePage from "@/components/ScorePage";

type Page = "home" | "commerce" | "pricing" | "insight" | "started" | "score";

export default function Root() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <Masthead currentPage={currentPage} onNavigate={navigate} />

      <main>
        {currentPage === "home" && <HomePage onNavigate={navigate} />}
        {currentPage === "commerce" && <AgenticCommercePage onNavigate={navigate} />}
        {currentPage === "pricing" && <PricingPage onNavigate={navigate} />}
        {currentPage === "insight" && <InsightPage onNavigate={navigate} />}
        {currentPage === "started" && <GetStartedPage onNavigate={navigate} />}
        {currentPage === "score" && <ScorePage />}
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <span className="font-display text-sm text-text-tertiary tracking-tight">Carve</span>
              <span className="font-sans text-[11px] text-text-tertiary">
                &copy; 2026
              </span>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const btn = form.querySelector("button") as HTMLButtonElement;
                const email = new FormData(form).get("footer-email") as string;
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
              className="flex items-center border border-border rounded-sm overflow-hidden bg-surface-elevated/60 h-10"
            >
              <input
                type="email"
                name="footer-email"
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
        </div>
      </footer>
    </div>
  );
}
