"use client";

import * as Accordion from "@radix-ui/react-accordion";
import DemoArticleAccordionItem from "@/components/DemoArticleAccordionItem";
import { Article } from "../types";
import { NavigationDropdown } from "./ui/navigation-dropdown";

interface Props {
  cardsData: Article[];
}

export default function DemoPageClient({ cardsData }: Props) {

  return (
    <div className="pb-6">
      <div className="sticky border-b border-zinc-200 dark:border-zinc-800 top-0 z-50 bg-white dark:bg-zinc-900 py-4 lg:px-8 px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Compile.</h1>
          <NavigationDropdown />
        </div>
      </div>

      <div className="mt-6 px-2 sm:px-4 lg:px-8">
        {cardsData.length > 0 ? (
          <Accordion.Root type="multiple" className="flex flex-col gap-2">
            {cardsData.map((item) => {
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
                  lookupLabel={() => ""}
                  onTagClick={() => {}}
                  onOpenChat={() => {}}
                />
              );
            })}
          </Accordion.Root>
        ) : (
          <p className="text-sm text-muted-foreground">
            No items found.
          </p>
        )}
      </div>
    </div>
  );
} 