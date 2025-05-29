"use client";

import DemoHeader from "./DemoHeader";
import ArticleGrid from "./ArticleGrid";

export default function DemoHomeClient() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <DemoHeader />
      <ArticleGrid />
    </div>
  );
}