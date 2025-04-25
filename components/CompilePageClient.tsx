"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  // CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  { value: "all",               label: "All" },
  { value: "Model Releases",    label: "Model Releases" },
  { value: "Business",          label: "Deals & Investments" },
  { value: "Research",          label: "Research & Blogs" },
  { value: "Socials",           label: "Socials" },
] as const;

type TabValue = typeof tabs[number]["value"];

export default function CompilePageClient({ cardsData }: Props) {
  const [selectedTab, setSelectedTab] = useState<TabValue>("all");

  // 2) Filter: if “all”, show everything; otherwise only items
  //    whose item.tags exactly match the selectedTab.
  const filtered = cardsData.filter((item) =>
    selectedTab === "all" ? true : item.tag === selectedTab
  );

  // 3) Helper to look up a label by value
  const lookupLabel = (value: TabValue) =>
    tabs.find((t) => t.value === value)?.label ?? value;

  return (
    <div className="px-4 py-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Compile.</h1>

      <Tabs
        value={selectedTab}
        onValueChange={(v) => setSelectedTab(v as TabValue)}
        className="mt-6"
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
          <TabsList className="bg-transparent border-none px-0 py-2 space-x-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={selectedTab} className="mt-6">
          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <Card key={item.article_id}>
                  <CardHeader className="space-y-1">
                    {/* map the raw tag to its label */}
                    <Badge variant="secondary">
                      {lookupLabel(item.tag as TabValue)}
                    </Badge>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.content}</CardDescription>
                  </CardHeader>
                  {/* {item.sources && (
                    <CardFooter className="text-sm text-muted-foreground">
                      {item.sources}
                    </CardFooter>
                  )} */}
                </Card>
              ))}
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
