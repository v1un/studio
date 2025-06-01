
"use client";

import type { Quest, QuestObjective, QuestRewards, Item, StoryArc } from "@/types/story"; // StoryArc
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    ScrollTextIcon, BookOpenIcon, CheckCircle2Icon, ListChecksIcon, TagIcon,
    TargetIcon, GiftIcon, StarIcon, ShieldPlusIcon, PackageIcon, TrophyIcon,
    MapIcon, BookmarkIcon, ChevronRightIcon, MilestonesIcon // Using MilestonesIcon for Arcs
} from "lucide-react";

interface JournalDisplayProps {
  quests: Quest[];
  storyArcs: StoryArc[]; // Renamed from chapters
  currentStoryArcId?: string; // Renamed from currentChapterId
  worldFacts: string[];
}

const QuestRewardsDisplay: React.FC<{ rewards: QuestRewards, status: Quest['status'] }> = ({ rewards, status }) => {
  const hasXP = typeof rewards.experiencePoints === 'number' && rewards.experiencePoints > 0;
  const hasItems = rewards.items && rewards.items.length > 0;
  const hasCurrency = typeof rewards.currency === 'number' && rewards.currency > 0;

  if (!hasXP && !hasItems && !hasCurrency) {
    return null;
  }

  const rewardLabel = status === 'completed' ? "Rewards Received" : "Potential Rewards";
  const iconColor = status === 'completed' ? "text-yellow-500" : "text-yellow-400";


  return (
    <div className="mt-1.5 pl-4 pt-1 border-t border-border/30">
      <h5 className="text-xs font-semibold text-foreground/90 mb-0.5 flex items-center">
        <TrophyIcon className={`w-3.5 h-3.5 mr-1 ${iconColor}`}/> {rewardLabel}:
      </h5>
      <ul className="list-none pl-2 space-y-0.5">
        {hasXP && (
          <li className="text-xs text-muted-foreground flex items-center">
            <StarIcon className="w-3 h-3 mr-1 text-yellow-400"/>
            {rewards.experiencePoints} XP
          </li>
        )}
        {hasCurrency && (
            <li className="text-xs text-muted-foreground flex items-center">
              <ShieldPlusIcon className="w-3 h-3 mr-1 text-yellow-500" />
              {rewards.currency} Currency
            </li>
        )}
        {hasItems && rewards.items?.map((item: Item) => (
          <li key={item.id} className="text-xs text-muted-foreground flex items-center">
            <PackageIcon className="w-3 h-3 mr-1 text-orange-400"/>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

const QuestItem: React.FC<{ quest: Quest, isMain?: boolean }> = ({ quest, isMain }) => {
  const title = quest.title || quest.description;
  const description = quest.title ? quest.description : null;

  return (
    <li className={`text-sm text-foreground leading-relaxed mb-3 pb-3 border-b border-border/50 last:border-b-0 last:pb-0 last:mb-0 ${isMain ? 'bg-primary/5 p-2 rounded-md shadow-sm' : ''}`}>
      <div className="flex justify-between items-start mb-0.5">
        <span className={quest.status === 'completed' ? 'line-through text-muted-foreground font-medium' : 'font-medium'}>
          {isMain && <BookmarkIcon className="w-3.5 h-3.5 mr-1.5 inline-block text-primary/80" />}
          {title}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
            {quest.category && (
            <Badge variant="secondary" className="whitespace-nowrap text-xs">
                <TagIcon className="w-3 h-3 mr-1"/>
                {quest.category}
            </Badge>
            )}
            {quest.type === 'main' && !isMain && <Badge variant="outline" className="text-xs border-primary/50 text-primary/90">Main</Badge>}
            {quest.type === 'side' && <Badge variant="outline" className="text-xs border-accent/50 text-accent/90">Side</Badge>}
            {quest.type === 'dynamic' && <Badge variant="outline" className="text-xs">Dynamic</Badge>}
            {quest.type === 'arc_goal' && <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-600/90">Arc Goal</Badge>}
        </div>
      </div>
      {description && (
          <p className={`text-xs text-muted-foreground italic mt-0.5 mb-1 ${quest.status === 'completed' ? 'line-through' : ''}`}>
              {description}
          </p>
      )}
      {quest.objectives && quest.objectives.length > 0 && (
        <ul className="mt-1.5 pl-4 space-y-1 mb-1">
          {quest.objectives.map((obj, index) => (
            <li key={index} className="flex items-center">
              <Checkbox
                id={`quest-${quest.id}-obj-${index}`}
                checked={obj.isCompleted}
                disabled
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
      {quest.rewards && (Object.keys(quest.rewards).length > 0 && (quest.rewards.experiencePoints || (quest.rewards.items && quest.rewards.items.length > 0) || quest.rewards.currency )) && (
        <QuestRewardsDisplay rewards={quest.rewards} status={quest.status} />
      )}
    </li>
  );
};

export default function JournalDisplay({ quests, storyArcs, currentStoryArcId, worldFacts }: JournalDisplayProps) {
  const activeMainQuests = quests.filter(q => q.type === 'main' && q.status === 'active' && q.storyArcId === currentStoryArcId);
  const otherActiveQuests = quests.filter(q => (q.type === 'side' || q.type === 'dynamic' || q.type === 'arc_goal') && q.status === 'active');

  const completedMainQuests = quests.filter(q => q.type === 'main' && q.status === 'completed');
  const completedOtherQuests = quests.filter(q => (q.type === 'side' || q.type === 'dynamic' || q.type === 'arc_goal') && q.status === 'completed');

  const currentStoryArc = storyArcs.find(arc => arc.id === currentStoryArcId); // Renamed
  const completedStoryArcs = storyArcs.filter(arc => arc.isCompleted).sort((a,b) => b.order - a.order); // Renamed

  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
            <ScrollTextIcon className="w-6 h-6 mr-2 text-accent" /> Journal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {currentStoryArc && (
          <div>
            <h3 className="font-semibold mb-1 flex items-center text-xl text-primary">
                <MilestonesIcon className="w-5 h-5 mr-2" /> Current Story Arc: {currentStoryArc.title} {/* Renamed */}
            </h3>
            <p className="text-sm text-muted-foreground italic mb-3">{currentStoryArc.description}</p>
            {activeMainQuests.length > 0 ? (
              <ScrollArea className="h-auto max-h-60 rounded-md border p-3 bg-background/50">
                <ul className="space-y-1">
                  {activeMainQuests.sort((a,b) => (a.orderInStoryArc || 0) - (b.orderInStoryArc || 0)).map((quest) => ( // Renamed orderInStoryArc
                    <QuestItem key={quest.id} quest={quest} isMain={true} />
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background/50">No active main quests for this story arc. The story will unfold!</p>
            )}
          </div>
        )}

        <Separator />

        <div>
          <h4 className="font-semibold mb-2 flex items-center text-lg">
            <ListChecksIcon className="w-5 h-5 mr-2 text-accent" />
            Active Side &amp; Dynamic Quests
          </h4>
          {otherActiveQuests.length > 0 ? (
            <ScrollArea className="h-40 rounded-md border p-3 bg-background/50">
              <ul className="space-y-1">
                {otherActiveQuests.map((quest) => (
                  <QuestItem key={quest.id} quest={quest} />
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground italic p-3 border rounded-md bg-background/50">No other active quests currently.</p>
          )}
        </div>

        {(completedMainQuests.length > 0 || completedOtherQuests.length > 0 || completedStoryArcs.length > 0) && ( // Renamed
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2 flex items-center text-lg">
                <CheckCircle2Icon className="w-5 h-5 mr-2 text-green-500" />
                Completed Entries
              </h4>
              <ScrollArea className="h-48 rounded-md border p-3 bg-background/50">
                {completedStoryArcs.map(arc => ( // Renamed
                     <div key={arc.id} className="mb-3 pb-2 border-b border-border/30 last:border-b-0">
                        <h5 className="font-medium text-md text-green-600 flex items-center">
                            <ChevronRightIcon className="w-4 h-4 mr-1"/> Story Arc {arc.order}: {arc.title} (Completed) {/* Renamed */}
                        </h5>
                        <ul className="pl-4 mt-1 space-y-1">
                        {quests.filter(q => q.storyArcId === arc.id && q.status === 'completed').sort((a,b) => (a.orderInStoryArc || 0) - (b.orderInStoryArc || 0)).map(quest => ( // Renamed storyArcId, orderInStoryArc
                            <QuestItem key={quest.id} quest={quest} />
                        ))}
                        </ul>
                    </div>
                ))}
                {completedOtherQuests.length > 0 && (
                  <>
                    {completedStoryArcs.length > 0 && <Separator className="my-3" />} {/* Renamed */}
                    <h5 className="font-medium text-md text-green-600 mb-1">Other Completed Quests:</h5>
                    <ul className="space-y-1">
                      {completedOtherQuests.map((quest) => (
                        <QuestItem key={quest.id} quest={quest} />
                      ))}
                    </ul>
                  </>
                )}
              </ScrollArea>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h4 className="font-semibold mb-2 flex items-center text-lg">
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
