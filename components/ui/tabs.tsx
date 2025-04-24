"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // make the list a touch-scrollable, centered snap container
        "bg-muted text-muted-foreground " +
          "overflow-x-auto no-scrollbar snap-x snap-mandatory " +
          "flex items-center space-x-2 px-4 py-2 " +
          "rounded-lg",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // base active/focus states
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground " +
          "dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 " +
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring " +
          "data-[state=active]:shadow-sm " +
        // layout tweaks for scroll + snap
        "inline-flex flex-shrink-0 snap-start items-center justify-center gap-1.5 " +
        // typography & spacing (small on mobile, larger on sm+)
        "whitespace-nowrap px-2 py-1 text-xs font-medium transition-[color,box-shadow] " +
        "sm:px-4 sm:py-2 sm:text-sm " +
        // disabled & svg reset
        "disabled:pointer-events-none disabled:opacity-50 " +
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none px-4 sm:px-0", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
