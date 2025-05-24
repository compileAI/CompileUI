// No import needed from CompilePageClient anymore

export const tabs = [
    { value: "all", label: "All" },
    { value: "model_releases", label: "Model Releases" },
    { value: "deals_investments_policy", label: "Deals & Investments" },
    { value: "research_blogs_papers", label: "Research & Blogs" },
    { value: "socials", label: "Socials" },
    { value: "Gemini", label: "Gemini" },
    { value: "VDB", label: "General Vector" },
    { value: "VDB_IMPROVED", label: "Improved Vector" },
  ] as const;
  
// Generate a type for a union of all the possible raw tab values
export type TabValue = typeof tabs[number]["value"];

export const lookupLabel = (value: string): string =>
    // The find will correctly compare string with TabValue.
    // If not found, it returns the original string `value`.
    // If found, it returns the label which is also a string.
    tabs.find((t) => t.value === value)?.label ?? value; 