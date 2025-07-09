"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { EnhancedArticle } from "@/types";

interface EnhancedArticleContextType {
  lastEnhanced: EnhancedArticle | null;
  setLastEnhanced: (a: EnhancedArticle | null) => void;
}

const EnhancedArticleContext = createContext<EnhancedArticleContextType>({
  lastEnhanced: null,
  setLastEnhanced: () => {},
});

export function EnhancedArticleProvider({ children }: { children: ReactNode }) {
  const [lastEnhanced, setLastEnhanced] = useState<EnhancedArticle | null>(null);
  return (
    <EnhancedArticleContext.Provider value={{ lastEnhanced, setLastEnhanced }}>
      {children}
    </EnhancedArticleContext.Provider>
  );
}

export function useEnhancedArticle() {
  return useContext(EnhancedArticleContext);
} 