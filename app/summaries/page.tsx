"use client";

import SummariesClient from "@/components/SummariesClient";
import { Suspense } from "react";

export default function SummariesPage() {
  return (
    <Suspense fallback={null}>
      <SummariesClient />
    </Suspense>
  );
} 