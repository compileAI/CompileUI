"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, usePathname } from "next/navigation";

export function NavigationDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine the current value based on the pathname
  const currentValue = pathname.includes("/discover") ? "discover" : "home";

  return (
    <Select
      value={currentValue}
      onValueChange={(value) => {
        if (value === "home") {
          router.push("/demo/home");
        } else if (value === "discover") {
          router.push("/demo/discover");
        }
      }}
    >
      <SelectTrigger className="h-9 bg-transparent border-none shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 font-medium text-gray-700 dark:text-gray-200">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="home" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">Home</span>
          </div>
        </SelectItem>
        <SelectItem value="discover" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">Discover</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
} 