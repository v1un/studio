
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ScrollTextIcon, BookOpenIcon } from "lucide-react";

interface JournalDisplayProps {
  activeQuests: string[];
  worldFacts: string[];
}

export default function JournalDisplay({ activeQuests, worldFacts }: JournalDisplayProps) {
  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 flex items-center text-lg">
            <ScrollTextIcon className="w-5 h-5 mr-2 text-accent" />
            Active Quests
          </h4>
          {activeQuests.length > 0 ? (
            <ScrollArea className="h-40 rounded-md border p-3 bg-background/50">
              <ul className="space-y-1.5">
                {activeQuests.map((quest, index) => (
                  <li key={index} className="text-sm text-foreground leading-relaxed">
                    {quest}
                    {index < activeQuests.length -1 && <Separator className="my-1.5"/>}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background/50">No active quests.</p>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-2 flex items-center text-lg">
            <BookOpenIcon className="w-5 h-5 mr-2 text-accent" />
            World Facts
          </h4>
          {worldFacts.length > 0 ? (
            <ScrollArea className="h-40 rounded-md border p-3 bg-background/50">
              <ul className="space-y-1.5">
                {worldFacts.map((fact, index) => (
                  <li key={index} className="text-sm text-foreground leading-relaxed">
                    {fact}
                    {index < worldFacts.length -1 && <Separator className="my-1.5"/>}
                    </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background/50">No world facts discovered yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
