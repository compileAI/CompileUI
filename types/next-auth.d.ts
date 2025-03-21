import NextAuth from "next-auth";

declare module 'next-auth' {
    interface User {
        id: string;
    }

    interface Session {
        user: User;
    }


    type CustomFeed = { title: string };
    type CustomItem = { title: string; pubDate: Date; description: string };
    
}

