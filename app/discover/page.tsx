import { Suspense } from "react";
import DiscoverClient from "@/components/DiscoverClient";

function DiscoverLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading articles...</p>
      </div>
    </div>
  );
}

export default function Discover() {
  return (
    <Suspense fallback={<DiscoverLoading />}>
      <DiscoverClient />
    </Suspense>
  );
} 