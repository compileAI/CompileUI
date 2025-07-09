"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

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

  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-9 h-9 p-0 relative overflow-hidden group transition-all duration-300 flex items-center justify-center rounded-md"
    >
      {/* Icon Container */}
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon - Visible in light mode */}
        <Sun 
          className={`absolute w-4 h-4 transition-all duration-500 ease-in-out transform text-yellow-500 ${
            !isDark 
              ? "translate-y-0 rotate-0 scale-100 opacity-100" // Sun visible in light mode
              : "translate-y-5 rotate-45 scale-75 opacity-0"   // Sun hidden in dark mode
          }`} 
        />
        
        {/* Moon Icon - Visible in dark mode */}
        <Moon 
          className={`absolute w-4 h-4 transition-all duration-500 ease-in-out transform text-slate-600 dark:text-slate-300 ${
            isDark 
              ? "translate-y-0 rotate-0 scale-100 opacity-100" // Moon visible in dark mode
              : "translate-y-5 rotate-45 scale-75 opacity-0"   // Moon hidden in light mode
          }`} 
        />
      </div>

      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 