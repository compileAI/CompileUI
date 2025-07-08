"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { EnhancedArticleProvider } from "@/context/EnhancedArticleContext"

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <EnhancedArticleProvider>
      <NextThemesProvider 
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </EnhancedArticleProvider>
  )
} 