import { Suspense } from "react";
import DiscoverClient from "@/components/DiscoverClient";

function DiscoverLoading() {
  return (
    <div className="container mx-auto px-4 pt-6">
      <div className="text-center py-8">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading discover page...</p>
        </div>
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