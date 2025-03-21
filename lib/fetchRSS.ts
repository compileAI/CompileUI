import Parser from 'rss-parser';

type CustomFeed = {title: string };
type CustomItem = {title: string, pubDate: Date, description: string };

const parser = new Parser<CustomFeed, CustomItem>();

export const fetchRSS = async (url: string) => {
  try {
    const feed = await parser.parseURL(url);
    console.log(feed.title);
    return feed;
  }
  catch (error) {
    console.error("Error fetching RSS feed:", error);
    return null;
  }
};