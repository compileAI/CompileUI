"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import ArticleCard from "@/components/ArticleCard";

export interface Article {
  article_id: number;
  date: Date;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;           // e.g. "model_releases", "deals_investments", ...
  // created_at: string;
  // sources: string | null;
}

interface Props {
  cardsData: Article[];
}

// 1) Define your tabs in one place, with the exact `value` coming from the DB,
//    and the human label to show in the UI.
const tabs = [
  { value: "all",                       label: "All" },
  { value: "model_releases",            label: "Model Releases" },
  { value: "deals_investments_policy",  label: "Deals & Investments" },
  { value: "research_blogs_papers",     label: "Research & Blogs" },
  { value: "socials",                   label: "Socials" },
  { value: "Gemini",                    label: "Gemini" },
] as const;

export type TabValue = typeof tabs[number]["value"];

export default function CompilePageClient({ cardsData }: Props) {
  const [selectedTab, setSelectedTab] = useState<TabValue>("all");
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time
  
  const filtered = cardsData.filter((item) => {
    const matchTag = selectedTab === "all" || item.tag === selectedTab;
  
    if (!showTodayOnly) return matchTag;
  
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0); // Normalize time
  
    return matchTag && itemDate.getTime() === today.getTime();
  });

  // 3) Helper to look up a label by value
  const lookupLabel = (value: TabValue) =>
    tabs.find((t) => t.value === value)?.label ?? value;

  return (
    
    <div className="pb-6">
      <Tabs
        value={selectedTab}
        onValueChange={(v) => setSelectedTab(v as TabValue)}
        className="mt-0"
      >
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


        <TabsContent value={selectedTab} className="mt-6 px-2 sm:px-4 lg:px-8">
          {filtered.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1">
              {filtered.map((item) => {
                const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <Dialog key={item.article_id}>
                    <DialogTrigger>
                      <ArticleCard
                        cardData={item}
                        formattedDate={formattedDate}
                        onTagClick={(tag) =>
                          setSelectedTab((prev) => (prev === tag ? "all" : (tag as TabValue)))
                        }
                        lookupLabel={lookupLabel}
                      />
                    </DialogTrigger>
                    <DialogContent className="w-full sm:max-w-screen-xl h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="text-left text-lg sm:text-2xl font-semibold pt-2 px-2 sm:px-4 sm:pt-4">
                          {item.title}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="text-sm text-muted-foreground px-2 sm:px-4">
                        {formattedDate} 
                      </div>

                      <div className="overflow-y-auto flex-1 px-2 sm:px-4 py-2 sm:py-4 space-y-4">
                        <ReactMarkdown>{item.content}</ReactMarkdown>
                      </div>

                      <DialogFooter className="border-t pt-4">
                        <DialogClose asChild>
                          <Button variant="secondary">Close</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
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
