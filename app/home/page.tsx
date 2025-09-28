import HomeClient from "@/components/HomeClient";
import { Suspense } from "react";

export default function Home() {
    return (
        <Suspense fallback={null}>
            <HomeClient />
        </Suspense>
    );
}