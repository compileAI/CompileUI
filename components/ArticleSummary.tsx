'use client';
import { Suspense, useState } from "react";
import { Button } from './ui/button';
import { createSummaryResource } from '@/lib/fetchSummaryResource';

const fetchSummary = async () => {
    const rssResponse = await fetch('/api/rss?url=https://www.artificialintelligence-news.com/feed/rss/');
    if (!rssResponse.ok) {
        throw new Error('Failed to fetch RSS feed');
    }
    const feed = await rssResponse.json();

    const jsonArticles = feed.message.items.map((item: any) =>{
        return {
            title: item.title,
            content: item.content
        }
    });

    const cohereResponse = await fetch('/api/cohere', {
        method: "POST",
        body: JSON.stringify(jsonArticles)
    });

    if (!cohereResponse.ok) {
        throw new Error('Failed to retrieve response from Cohere');
    }
    else{
        const summary = await cohereResponse.json();
        return summary.message[0].text;
    }
}

function SummaryResult({ resource }: { resource: any }) {
    let summary = resource.read();
    return (
        <div>
            {summary && <p>{summary}</p>}
        </div>
    )
}

export default function ArticleSummary() {
    const [showSummary, setShowSummary] = useState(false);
    const [resource, setResource] = useState<any | null>(null);

    const handleCohere = () => {
        setShowSummary(false);
        try {
            setResource(createSummaryResource(fetchSummary));
            setShowSummary(true);
        }
        catch (err) {
            console.error(err);
        }
    }

    return (
        <div>
            <h1>Article Summary</h1>
            <Button onClick={handleCohere}>Generate Summary With RSS Articles</Button>
            {showSummary && (
                <Suspense fallback={<p>Loading...</p>}>
                    <SummaryResult resource={resource} />
                </Suspense>
            )}
        </div>
    )
}