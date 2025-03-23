import Parser from "rss-parser";

//Exporting this way allows server components to use these types
export type CustomFeed = { title: string };
export type CustomItem = { title: string; pubDate: Date; description: string };
