"use client";

import * as Accordion from "@radix-ui/react-accordion";
import DemoArticleAccordionItem from "@/components/DemoArticleAccordionItem";
import { Article } from "../types";
import DemoHeader from "./DemoHeader";

interface Props {
  cardsData: Article[];
}

export default function DemoPageClient({ cardsData }: Props) {
  return (
    <div className="pb-6">
      <DemoHeader />

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