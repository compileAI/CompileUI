"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9 p-0 flex items-center justify-center">
        <div className="h-4 w-4 opacity-0" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-9 h-9 p-0 relative overflow-hidden group hover:bg-accent hover:text-accent-foreground transition-all duration-300 flex items-center justify-center"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon */}
        <Sun 
          className={`absolute w-4 h-4 transition-all duration-500 ease-in-out transform ${
            theme === "light" 
              ? "rotate-0 scale-100 opacity-100" 
              : "rotate-90 scale-0 opacity-0"
          }`} 
        />
        {/* Moon Icon */}
        <Moon 
          className={`absolute w-4 h-4 transition-all duration-500 ease-in-out transform ${
            theme === "dark" 
              ? "rotate-0 scale-100 opacity-100" 
              : "-rotate-90 scale-0 opacity-0"
          }`} 
        />
      </div>
      <span className="sr-only">Toggle theme</span>
      
      {/* Animated background effect */}
      <div className={`absolute inset-0 rounded-md transition-all duration-300 ease-in-out transform ${
        theme === "light" 
          ? "bg-yellow-400/20 scale-0 group-hover:scale-100" 
          : "bg-blue-600/20 scale-0 group-hover:scale-100"
      }`} />
    </Button>
  )
} 