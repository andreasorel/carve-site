"use client";

import { useState } from "react";
import Masthead from "@/components/Masthead";
import HomePage from "@/components/HomePage";
import ServicesPage from "@/components/ServicesPage";
import InsightPage from "@/components/InsightPage";
import ScorePage from "@/components/ScorePage";

type Page = "home" | "services" | "insight" | "score";

export default function Root() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pb-12">
      <Masthead currentPage={currentPage} onNavigate={navigate} />

      <main className="mt-4">
        {currentPage === "home" && <HomePage onNavigate={navigate} />}
        {currentPage === "services" && <ServicesPage onNavigate={navigate} />}
        {currentPage === "insight" && <InsightPage onNavigate={navigate} />}
        {currentPage === "score" && <ScorePage />}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center">
        <div className="ornament">{"\u2726 \u2726 \u2726"}</div>
        <p className="font-ui text-xs text-ink-faint">
          &copy; 2026 Carve. All rights reserved. Oslo, Norway.
        </p>
      </footer>
    </div>
  );
}
