"use client";
import Header from "./Header";
import ArticleGrid from "./ArticleGrid";

export default function HomeClient() {
  return (
    <>
      <Header />
      {/* add some space between the header and the article grid */}
      <div className="h-2 lg:h-10 md:h-10 sm:h-2"></div>
      <ArticleGrid />
    </>
  );
} 