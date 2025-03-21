import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { CustomFeed, CustomItem } from '@/types/rss-parser';

const parser = new Parser<CustomFeed, CustomItem>();

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    try {
        const feed = await parser.parseURL(url);
        console.log(feed.title);
        return NextResponse.json({ message: feed }, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching RSS feed:", error);
        return NextResponse.json({ error: 'Error fetching RSS feed' }, { status: 500 });
    }

};