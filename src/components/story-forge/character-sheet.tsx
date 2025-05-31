
"use client";

import * as React from "react";
import type { CharacterProfile, StructuredStoryState, Item, EquipmentSlot, Skill } from "@/types/story";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    PackageIcon, HeartIcon, ZapIcon, 
    DumbbellIcon, VenetianMaskIcon, BrainIcon, EyeIcon, SparklesIcon as CharismaIcon, AwardIcon, 
    GaugeIcon, SwordsIcon, ShieldIcon, UserSquareIcon, ShirtIcon, GemIcon, 
    FootprintsIcon, HandIcon, CircleEllipsisIcon, SparklesIcon, StarIcon, CoinsIcon
} from "lucide-react";

interface CharacterSheetProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
}

const StatDisplay: React.FC<{ icon: React.ElementType, label: string, value?: number | string, colorClass?: string }> = ({ icon: Icon, label, value, colorClass }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <Icon className={`w-4 h-4 mr-1.5 ${colorClass || 'text-primary'}`} />
      <Label className="text-sm font-medium">{label}</Label>
    </div>
    <span className="text-sm text-muted-foreground">{value ?? 'N/A'}</span>
  </div>
);

const equipmentSlotDisplayOrder: EquipmentSlot[] = [
  'weapon', 'shield', 'head', 'body', 'hands', 'legs', 'feet', 'neck', 'ring1', 'ring2'
];

const equipmentSlotIcons: Record<EquipmentSlot, React.ElementType> = {
  weapon: SwordsIcon,
  shield: ShieldIcon,
  head: UserSquareIcon, 
  body: ShirtIcon,
  legs: CircleEllipsisIcon, 
  feet: FootprintsIcon,
  hands: HandIcon,
  neck: GemIcon, 
  ring1: CircleEllipsisIcon, 
  ring2: CircleEllipsisIcon, 
};

function getSlotDisplayName(slot: EquipmentSlot): string {
  if (slot === 'ring1') return 'Ring 1';
  if (slot === 'ring2') return 'Ring 2';
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}


export default function CharacterSheet({ character, storyState }: CharacterSheetProps) {
  const healthPercentage = character.maxHealth > 0 ? (character.health / character.maxHealth) * 100 : 0;
  const manaPercentage = (character.maxMana ?? 0) > 0 ? ((character.mana ?? 0) / (character.maxMana ?? 1)) * 100 : 0;
  const xpPercentage = character.experienceToNextLevel > 0 ? (character.experiencePoints / character.experienceToNextLevel) * 100 : 0;

  return (
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-headline text-3xl flex items-center justify-between">
          <div className="flex items-center">
            {character.name}
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="ml-2 text-lg cursor-default">
                            <AwardIcon className="w-4 h-4 mr-1 text-yellow-500"/>Lvl {character.level}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Level {character.level}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
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
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label className="text-sm font-medium flex items-center">
              <GaugeIcon className="w-4 h-4 mr-1.5 text-green-500" />
              XP
            </Label>
            <span className="text-sm text-muted-foreground">{character.experiencePoints} / {character.experienceToNextLevel}</span>
          </div>
          <Progress value={xpPercentage} aria-label={`${xpPercentage}% experience points`} className="h-3 [&>div]:bg-green-500" />
        </div>

        <Separator />
         <StatDisplay icon={CoinsIcon} label="Currency" value={character.currency ?? 0} colorClass="text-yellow-600" />
        <Separator />


        <div>
          <h4 className="font-semibold mb-2 text-md">Core Stats</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            <StatDisplay icon={DumbbellIcon} label="Strength" value={character.strength} colorClass="text-orange-500" />
            <StatDisplay icon={VenetianMaskIcon} label="Dexterity" value={character.dexterity} colorClass="text-green-500" />
            <StatDisplay icon={HeartIcon} label="Constitution" value={character.constitution} colorClass="text-red-600" />
            <StatDisplay icon={BrainIcon} label="Intelligence" value={character.intelligence} colorClass="text-purple-500" />
            <StatDisplay icon={EyeIcon} label="Wisdom" value={character.wisdom} colorClass="text-sky-500" />
            <StatDisplay icon={CharismaIcon} label="Charisma" value={character.charisma} colorClass="text-pink-500" />
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-semibold mb-2 text-md flex items-center">
            <StarIcon className="w-4 h-4 mr-1.5 text-yellow-400" /> Skills &amp; Abilities
          </h4>
          {character.skillsAndAbilities && character.skillsAndAbilities.length > 0 ? (
            <ScrollArea className="h-32 rounded-md border p-2 bg-background/50">
              <ul className="space-y-2">
                {character.skillsAndAbilities.map((skill: Skill) => (
                  <li key={skill.id} className="text-sm">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{skill.name}</span>
                                <Badge variant="outline" className="text-xs">{skill.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs w-auto">
                          <div className="text-sm">
                            <span className="font-medium">{skill.name}</span>
                            <Badge variant="secondary" className="ml-1 text-xs">{skill.type}</Badge>
                          </div>
                          <p className="text-xs whitespace-pre-line">{skill.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground italic text-sm p-2 border rounded-md bg-background/50">No special skills or abilities known.</p>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-2 text-md">Equipment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {equipmentSlotDisplayOrder.map(slot => {
              const equippedItem = storyState.equippedItems?.[slot];
              const SlotIcon = equipmentSlotIcons[slot] || CircleEllipsisIcon;
              return (
                <div key={slot} className="flex items-center">
                  <SlotIcon className="w-4 h-4 mr-1.5 text-primary" />
                  <span className="font-medium mr-1">{getSlotDisplayName(slot)}:</span>
                  {equippedItem ? (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-foreground cursor-help hover:text-primary transition-colors truncate">{equippedItem.name}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                           <p className="text-sm font-medium">{equippedItem.name}</p>
                           <p className="text-xs text-muted-foreground max-w-xs">{equippedItem.description}</p>
                           {equippedItem.basePrice !== undefined && <p className="text-xs text-muted-foreground">Value: {equippedItem.basePrice}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground italic">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4 text-sm pt-1">
          <div>
            <h4 className="font-semibold mb-1 flex items-center"><PackageIcon className="w-4 h-4 mr-1.5 text-primary" />Inventory (Unequipped)</h4>
            {storyState.inventory.length > 0 ? (
              <ScrollArea className="h-28 rounded-md border p-2">
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {storyState.inventory.map((item: Item) => (
                    <li key={item.id} className="text-muted-foreground">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help font-medium text-foreground hover:text-primary transition-colors">
                              {item.name}
                              {item.equipSlot && <Badge variant="outline" className="ml-1 text-xs">({item.equipSlot})</Badge>}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                             <p className="text-sm font-medium">{item.name}</p>
                             <p className="text-xs text-muted-foreground max-w-xs">{item.description}</p>
                             {item.basePrice !== undefined && <p className="text-xs text-muted-foreground">Value: {item.basePrice}</p>}
                             {item.isConsumable && <p className="text-xs text-muted-foreground">Consumable: {item.effectDescription}</p>}
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
        </div>
      </CardContent>
    </Card>
  );
}
