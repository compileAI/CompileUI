"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import * as Accordion from "@radix-ui/react-accordion";
import ArticleAccordionItem from "@/components/ArticleAccordionItem";

import FullPageChatView from "./FullPageChatView";
import { Article } from "../types";
import { tabs, TabValue, lookupLabel } from "../lib/tabUtils";

interface Props {
  cardsData: Article[];
}

export default function CompilePageClient({ cardsData }: Props) {
  // Manages the currently selected tab
  const [selectedTab, setSelectedTab] = useState<TabValue>("all");
  // Manages the filter to show only today's articles
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  // isFullPage state will now be managed by the presence of openDialogId and a new state for chat mode
  const [chatModeArticleId, setChatModeArticleId] = useState<number | null>(null);

  // Store current date to allow filtering by only today's articles
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time
  
  const filtered = cardsData.filter((item) => {
    const matchTag = selectedTab === "all" || item.tag === selectedTab;
  
    if (!showTodayOnly) return matchTag;
  
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0); // Normalize time to align with our format for today's date
  
    return matchTag && itemDate.getTime() === today.getTime();
  });

  const handleOpenChat = (articleId: number) => {
    setChatModeArticleId(articleId);
  };

  const handleCloseChat = () => {
    setChatModeArticleId(null);
    // We don't necessarily close the dialog here, just exit chat mode.
    // The dialog's onOpenChange will handle closing it if the user clicks outside or hits Esc.
  };

  return (
    // Main container
    <div className="pb-6">
      {/* Tabs component (wraps all the content) */}
      <Tabs
        value={selectedTab}
        onValueChange={(v) => setSelectedTab(v as TabValue)}
        className="mt-0"
      >
        {/* Header section with title and filters */}
        <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900 pt-6 pb-2 lg:px-8 px-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compile.</h1>
          </div>
        <div className="mt-4 flex items-center space-x-2">
          <input
            type="checkbox"
            id="today-only"
            checked={showTodayOnly}
            onChange={() => setShowTodayOnly((prev) => !prev)}
            className="accent-gray-600 w-4 h-4"
          />
          <label htmlFor="today-only" className="text-sm text-muted-foreground">
            Show today only
          </label>
        </div>
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
            <TabsList className="bg-transparent border-none px-0 py-2 space-x-4">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Main content area with article cards */}
        <TabsContent value={selectedTab} className="mt-6 px-2 sm:px-4 lg:px-8">
          {filtered.length > 0 ? (
            <Accordion.Root type="multiple" className="flex flex-col gap-2">
              {filtered.map((item) => {
                const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                // Optional: full-page chat view
                if (chatModeArticleId === parseInt(item.article_id)) {
                  return (
                    <FullPageChatView
                      key={item.article_id}
                      article={item}
                      formattedDate={formattedDate}
                      onClose={handleCloseChat}
                    />
                  );
                }

                return (
                  <ArticleAccordionItem
                    key={item.article_id}
                    article={item}
                    formattedDate={formattedDate}
                    lookupLabel={lookupLabel}
                    onTagClick={(tag) =>
                      setSelectedTab((prev) =>
                        prev === tag ? "all" : (tag as TabValue)
                      )
                    }
                    onOpenChat={() => handleOpenChat(parseInt(item.article_id))}
                  />
                );
              })}
            </Accordion.Root>
          ) : (
            <p className="text-sm text-muted-foreground">
              No items found for “{lookupLabel(selectedTab)}.”
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
