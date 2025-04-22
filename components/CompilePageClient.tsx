"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Article {
  id: number;
  title: string;
  body: string;
  tags: string;
  created_at: string;
  sources: string | null;
}

interface Props {
  cardsData: Article[];
}

export default function CompilePageClient({ cardsData }: Props) {
  return (
    <div className="px-4 py-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Compile.</h1>

      <Tabs defaultValue="all" className="mt-6">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
          <TabsList className="bg-transparent border-none px-0 py-2 space-x-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="modelReleases">Model Releases</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cardsData.map((item) => (
              <Card key={item.id}>
                <CardHeader className="space-y-1">
                  <Badge variant="secondary">{item.tags}</Badge>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
                {item.sources && (
                  <CardFooter className="text-sm text-muted-foreground">
                    {item.sources}
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="mt-6">
          <p className="text-sm text-muted-foreground">Trending posts go here...</p>
        </TabsContent>

        <TabsContent value="modelReleases" className="mt-6">
          <p className="text-sm text-muted-foreground">Model releases go here...</p>
        </TabsContent>

        <TabsContent value="research" className="mt-6">
          <p className="text-sm text-muted-foreground">Research posts go here...</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
