"use client";
import Header from "./Header";
import ArticleGrid from "./ArticleGrid";

export default function HomeClient() {
  return (
    <>
      <Header />
      {/* Main content with sidebar spacing on desktop */}
      <div className="md:ml-56 min-h-screen bg-background">
        {/* Centered content container */}
        <div className="flex flex-col items-center pt-8 lg:pt-16">
          <ArticleGrid />
        </div>
      </div>
    </>
  );
} 