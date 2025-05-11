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
import { MessageCircleMore } from "lucide-react";

import ArticleCard from "@/components/ArticleCard";

export interface Article {
  article_id: number;
  date: Date;
  title: string;
  content: string;
  fingerprint: string;
  tag: string;
}

interface Props {
  cardsData: Article[];
}

// Mapping of from raw tags to nicer-formatted labels
const tabs = [
  { value: "all",                       label: "All" },
  { value: "model_releases",            label: "Model Releases" },
  { value: "deals_investments_policy",  label: "Deals & Investments" },
  { value: "research_blogs_papers",     label: "Research & Blogs" },
  { value: "socials",                   label: "Socials" },
  { value: "Gemini",                    label: "Gemini" },
  { value: "VDB",                       label: "General Vector" },
  { value: "VDB_IMPROVED",              label: "Improved Vector" },
] as const;

// Generate a type for a union of all the possible raw tab values
export type TabValue = typeof tabs[number]["value"];

export default function CompilePageClient({ cardsData }: Props) {
  // Manages the currently selected tab
  const [selectedTab, setSelectedTab] = useState<TabValue>("all");
  // Manages the filter to show only today's articles
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  // Stores whether we are in the full-page chat view
  const [isFullPage, setIsFullPage] = useState(false);
  // Stores the chat input for the full-page chat view
  const [chatInput, setChatInput] = useState("");
  // Manages the open dialog id for the full-page chat view
  const [openDialogId, setOpenDialogId] = useState<number | null>(null);

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

  // Helper to look up a label by value (e.g. "model_releases" -> "Model Releases")
  const lookupLabel = (value: TabValue) =>
    tabs.find((t) => t.value === value)?.label ?? value;

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
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1">
              {filtered.map((item) => {
                const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <Dialog key={item.article_id} open={isFullPage && openDialogId === item.article_id ? true : undefined} onOpenChange={(open) => {
                    if (!open) {
                      setIsFullPage(false);
                      setOpenDialogId(null);
                    }
                  }}>
                    <DialogTrigger onClick={() => setOpenDialogId(item.article_id)}>
                      <ArticleCard
                        cardData={item}
                        formattedDate={formattedDate}
                        onTagClick={(tag) =>
                          setSelectedTab((prev) => (prev === tag ? "all" : (tag as TabValue)))
                        }
                        lookupLabel={lookupLabel}
                      />
                    </DialogTrigger>
                    
                    {/* if our useState isFullPage is true and the openDialogId is the same as the article_id,
                     then we render the full page chat view, otherwise we render the article card */}
                    {isFullPage && openDialogId === item.article_id ? (
                      <div className="fixed inset-0 z-50 bg-background flex flex-col p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-2xl font-semibold">{item.title}</h2>
                          <Button variant="outline" onClick={() => setIsFullPage(false)}>Back</Button>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-4">
                          {formattedDate}
                        </div>
                        
                        <div className="overflow-y-auto flex-1 space-y-4">
                          <ReactMarkdown>{item.content}</ReactMarkdown>
                        </div>
                        
                        <div className="border-t pt-4 mt-auto">
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button>Send</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Else, render the article card
                      <DialogContent className="w-full sm:max-w-screen-xl h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle className="text-left text-lg sm:text-2xl font-semibold pt-2 px-2 sm:px-4 sm:pt-4">
                            {item.title}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="text-sm text-muted-foreground px-2 sm:px-4">
                          {formattedDate} 
                        </div>

                        <div 
                          className="overflow-y-auto flex-1 px-2 sm:px-4 py-2 sm:py-4 space-y-4"
                          onDoubleClick={() => setIsFullPage(true)}
                        >
                          <ReactMarkdown>{item.content}</ReactMarkdown>
                        </div>

                        <div className="border-t pt-4 px-4">
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => setIsFullPage(true)}
                              className="bg-blue-500 hover:bg-blue-600 transition-colors px-5 py-2 rounded-md flex items-center gap-2"
                            >
                              <MessageCircleMore className="h-5 w-5" />
                              <span>Chat with this article</span>
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    )}
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
