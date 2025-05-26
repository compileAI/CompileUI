"use client";

import { useState } from "react";
import DemoHeader from "./DemoHeader";
// import { Article } from "@/types";
// import * as Accordion from "@radix-ui/react-accordion";
// import DemoArticleAccordionItem from "./DemoArticleAccordionItem";

export default function DemoHomeClient() {
  // const [articles, setArticles] = useState<Article[]>([]);
  const [preferences, setPreferences] = useState<string>("");

  const handlePreferenceChange = (preference: string) => {
    setPreferences(preference);
  };

  return (
    <div className="pb-6">
      <DemoHeader 
        onPreferenceChange={handlePreferenceChange}
      />

      <div className="mt-2 px-2 sm:px-4 lg:px-8">
        {preferences && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Active preference:</strong> {preferences}
            </p>
          </div>
        )}

        {/* {articles.length > 0 && (
          <div>
            <div className="mt-6 px-2 sm:px-4 lg:px-8">
              <Accordion.Root type="multiple" className="flex flex-col gap-2">
                {articles.map((item) => {
                  const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });

                  return (
                    <DemoArticleAccordionItem
                      key={item.article_id}
                      article={item}
                      formattedDate={formattedDate}
                    />
                  );
                })}
              </Accordion.Root>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}