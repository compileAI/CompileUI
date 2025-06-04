"use client";

import DemoHeader from "./DemoHeader";
import ArticleGrid from "./ArticleGrid";

export default function DemoHomeClient() {
  return (
    <div className="min-h-screen bg-background">
      <DemoHeader />
      <ArticleGrid />
    </div>
  );
}