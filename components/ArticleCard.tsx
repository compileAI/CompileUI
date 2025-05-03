import {
    Card,
    CardHeader,
    CardTitle,
    // CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { Article } from "./CompilePageClient";
import { TabValue } from "./CompilePageClient";

interface Props {
    cardData: Article;
    onTagClick: (tag: string) => void;
    lookupLabel: (tag: TabValue) => string;
}
export default function ArticleCard({ cardData, onTagClick, lookupLabel }: Props) {

    const formattedDate = new Date(cardData.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <Card className="transition-all duration-200 hover:shadow-md hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800" key={cardData.article_id}>
            <CardHeader className="space-y-1">
                <div className="flex flex-row text-left">
                    <Badge
                    variant="secondary"
                    onClick={() => onTagClick(cardData.tag)}
                    className="cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                    {lookupLabel(cardData.tag as TabValue)}
                    </Badge>
                    <p className="text-sm text-muted-foreground ml-2">{formattedDate}</p>
                </div>
                <CardTitle className="text-left">
                    <ReactMarkdown>{cardData.title}</ReactMarkdown>
                </CardTitle>
            </CardHeader>
        </Card>
    );
}