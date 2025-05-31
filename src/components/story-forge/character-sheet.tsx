
"use client";

import * as React from "react";
import type { CharacterProfile, StructuredStoryState, Item } from "@/types/story";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PackageIcon, MapPinIcon, ScrollTextIcon, BookOpenIcon, HeartIcon, ZapIcon, DumbbellIcon, VenetianMaskIcon, BrainIcon, EyeIcon, SparklesIcon } from "lucide-react";

interface CharacterSheetProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
}

const StatDisplay: React.FC<{ icon: React.ElementType, label: string, value?: number, colorClass?: string }> = ({ icon: Icon, label, value, colorClass }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <Icon className={`w-4 h-4 mr-1.5 ${colorClass || 'text-primary'}`} />
      <Label className="text-sm font-medium">{label}</Label>
    </div>
    <span className="text-sm text-muted-foreground">{value ?? 'N/A'}</span>
  </div>
);


export default function CharacterSheet({ character, storyState }: CharacterSheetProps) {
  const healthPercentage = character.maxHealth > 0 ? (character.health / character.maxHealth) * 100 : 0;
  const manaPercentage = (character.maxMana ?? 0) > 0 ? ((character.mana ?? 0) / (character.maxMana ?? 1)) * 100 : 0;

  return (
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-headline text-3xl flex items-center justify-between">
          {character.name}
          <Badge variant="secondary" className="text-sm">{character.class}</Badge>
        </CardTitle>
        <CardDescription className="text-sm italic">{character.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label className="text-sm font-medium flex items-center">
              <HeartIcon className="w-4 h-4 mr-1.5 text-red-500" />
              Health
            </Label>
            <span className="text-sm text-muted-foreground">{character.health} / {character.maxHealth}</span>
          </div>
          <Progress value={healthPercentage} aria-label={`${healthPercentage}% health`} className="h-3 [&>div]:bg-red-500" />
        </div>
        {(character.maxMana ?? 0) > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-sm font-medium flex items-center">
                <ZapIcon className="w-4 h-4 mr-1.5 text-blue-500" />
                Mana
              </Label>
              <span className="text-sm text-muted-foreground">{character.mana ?? 0} / {character.maxMana ?? 0}</span>
            </div>
            <Progress value={manaPercentage} aria-label={`${manaPercentage}% mana`} className="h-3 [&>div]:bg-blue-500" />
          </div>
        )}

        <Separator />

        <div>
          <h4 className="font-semibold mb-2 text-md">Core Stats</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            <StatDisplay icon={DumbbellIcon} label="Strength" value={character.strength} colorClass="text-orange-500" />
            <StatDisplay icon={VenetianMaskIcon} label="Dexterity" value={character.dexterity} colorClass="text-green-500" />
            <StatDisplay icon={HeartIcon} label="Constitution" value={character.constitution} colorClass="text-red-600" />
            <StatDisplay icon={BrainIcon} label="Intelligence" value={character.intelligence} colorClass="text-purple-500" />
            <StatDisplay icon={EyeIcon} label="Wisdom" value={character.wisdom} colorClass="text-sky-500" />
            <StatDisplay icon={SparklesIcon} label="Charisma" value={character.charisma} colorClass="text-pink-500" />
          </div>
        </div>
        
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-1">
          <div>
            <h4 className="font-semibold mb-1 flex items-center"><MapPinIcon className="w-4 h-4 mr-1.5 text-primary" />Location</h4>
            <p className="text-muted-foreground">{storyState.currentLocation}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1 flex items-center"><PackageIcon className="w-4 h-4 mr-1.5 text-primary" />Inventory</h4>
            {storyState.inventory.length > 0 ? (
              <ScrollArea className="h-20 rounded-md border p-2">
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {storyState.inventory.map((item: Item) => (
                    <li key={item.id} className="text-muted-foreground">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help font-medium text-foreground hover:text-primary transition-colors">{item.name}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <p className="text-sm max-w-xs">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground italic">Empty</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-1 flex items-center"><ScrollTextIcon className="w-4 h-4 mr-1.5 text-primary" />Active Quests</h4>
            {storyState.activeQuests.length > 0 ? (
               <ScrollArea className="h-20 rounded-md border p-2">
                <ul className="list-disc list-inside pl-2">
                  {storyState.activeQuests.map((quest, index) => (
                    <li key={index} className="text-muted-foreground">{quest}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground italic">None</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-1 flex items-center"><BookOpenIcon className="w-4 h-4 mr-1.5 text-primary" />World Facts</h4>
             {storyState.worldFacts.length > 0 ? (
               <ScrollArea className="h-20 rounded-md border p-2">
                <ul className="list-disc list-inside pl-2">
                  {storyState.worldFacts.map((fact, index) => (
                    <li key={index} className="text-muted-foreground">{fact}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground italic">None known</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
