
"use client";

import type { Quest, QuestObjective } from "@/types/story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // For objectives
import { Label } from "@/components/ui/label"; // For objectives
import { ScrollTextIcon, BookOpenIcon, CheckCircle2Icon, ListChecksIcon, TagIcon, TargetIcon } from "lucide-react";

interface JournalDisplayProps {
  quests: Quest[];
  worldFacts: string[];
}

const QuestItem: React.FC<{ quest: Quest }> = ({ quest }) => {
  return (
    <li className="text-sm text-foreground leading-relaxed mb-3 pb-3 border-b border-border/50 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex justify-between items-start">
        <span className={quest.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
          {quest.description}
        </span>
        {quest.category && (
          <Badge variant="secondary" className="ml-2 whitespace-nowrap text-xs">
            <TagIcon className="w-3 h-3 mr-1"/>
            {quest.category}
          </Badge>
        )}
      </div>
      {quest.objectives && quest.objectives.length > 0 && (
        <ul className="mt-1.5 pl-4 space-y-1">
          {quest.objectives.map((obj, index) => (
            <li key={index} className="flex items-center">
              <Checkbox
                id={`quest-${quest.id}-obj-${index}`}
                checked={obj.isCompleted}
                disabled // Visually represents status, not interactive here
                className={`mr-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 ${obj.isCompleted ? 'border-green-400' : 'border-muted-foreground/50'}`}
              />
              <Label
                htmlFor={`quest-${quest.id}-obj-${index}`}
                className={`text-xs ${obj.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground/80'}`}
              >
                {obj.description}
              </Label>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

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
            <ScrollArea className="h-40 rounded-md border p-3 bg-background/50">
              <ul className="space-y-1">
                {activeQuests.map((quest) => (
                  <QuestItem key={quest.id} quest={quest} />
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
                <ul className="space-y-1">
                  {completedQuests.map((quest) => (
                     <QuestItem key={quest.id} quest={quest} />
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
