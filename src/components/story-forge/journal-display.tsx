
"use client";

import type { Quest } from "@/types/story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ScrollTextIcon, BookOpenIcon, CheckCircle2Icon, ListChecksIcon } from "lucide-react";

interface JournalDisplayProps {
  quests: Quest[];
  worldFacts: string[];
}

export default function JournalDisplay({ quests, worldFacts }: JournalDisplayProps) {
  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed');

  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2 flex items-center text-xl">
            <ListChecksIcon className="w-5 h-5 mr-2 text-accent" />
            Active Quests
          </h4>
          {activeQuests.length > 0 ? (
            <ScrollArea className="h-32 rounded-md border p-3 bg-background/50">
              <ul className="space-y-1.5">
                {activeQuests.map((quest) => (
                  <li key={quest.id} className="text-sm text-foreground leading-relaxed">
                    {quest.description}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background/50">No active quests.</p>
          )}
        </div>

        {completedQuests.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2 flex items-center text-xl">
                <CheckCircle2Icon className="w-5 h-5 mr-2 text-green-500" />
                Completed Quests
              </h4>
              <ScrollArea className="h-32 rounded-md border p-3 bg-background/50">
                <ul className="space-y-1.5">
                  {completedQuests.map((quest) => (
                    <li key={quest.id} className="text-sm text-muted-foreground line-through leading-relaxed">
                      {quest.description}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h4 className="font-semibold mb-2 flex items-center text-xl">
            <BookOpenIcon className="w-5 h-5 mr-2 text-accent" />
            World Facts
          </h4>
          {worldFacts.length > 0 ? (
            <ScrollArea className="h-32 rounded-md border p-3 bg-background/50">
              <ul className="space-y-1.5">
                {worldFacts.map((fact, index) => (
                  <li key={index} className="text-sm text-foreground leading-relaxed">
                    {fact}
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
