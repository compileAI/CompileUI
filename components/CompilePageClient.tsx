"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

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
                  <Accordion.Item
                    key={item.article_id}
                    value={item.article_id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900"
                  >
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-t-lg flex items-center justify-between group">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold leading-tight text-foreground mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {formattedDate}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="p-4 pt-0 text-sm text-muted-foreground border-t border-gray-100 dark:border-gray-800">
                      <div className="space-y-3">
                        <p className="leading-relaxed">{item.content}</p>
                        {item.citations && item.citations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Sources:</h4>
                            <ul className="space-y-1">
                              {item.citations.map((citation, index) => (
                                <li key={index} className="text-xs">
                                  <a 
                                    href={citation.url || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {citation.sourceName}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          ) : (
            <p className="text-sm text-muted-foreground">
              No items found for &ldquo;{lookupLabel(selectedTab)}&rdquo;.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
