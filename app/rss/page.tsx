'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomItem } from '@/types/rss-parser';

const RSSPage = () => {
    const [articles, setArticles] = useState<CustomItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleRSSfetch = async () => {
        try {
            const response = await fetch('/api/rss?url=https://www.artificialintelligence-news.com/feed/rss/');
            if (!response.ok) {
                throw new Error('Failed to fetch RSS feed');
            }
            const feed = await response.json();
            console.log(feed.message);
            setArticles(feed.message.items || []);
        } catch (err) {
            console.error(err);
            setError('Error fetching RSS feed');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <h1>RSS Feed</h1>
            <Button onClick={handleRSSfetch}>Fetch RSS Feed</Button>
            {error && <p className="text-red-500">{error}</p>}
            {articles && (
            <ol>
                {articles.map((article, index) => (
                <li className="mb-2" key={index}>{article.title}</li>
                ))}
            </ol>
            )}
        </div>
    );
};

export default RSSPage;