
"use client";

import * as React from "react";
import type { CharacterProfile, StructuredStoryState } from "@/types/story";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    HeartIcon, ZapIcon,
    DumbbellIcon, VenetianMaskIcon, BrainIcon, EyeIcon, SparklesIcon as CharismaIcon, AwardIcon,
    GaugeIcon, CoinsIcon
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-2">
            <StatDisplay icon={DumbbellIcon} label="Strength" value={character.strength} colorClass="text-orange-500" />
            <StatDisplay icon={VenetianMaskIcon} label="Dexterity" value={character.dexterity} colorClass="text-green-500" />
            <StatDisplay icon={HeartIcon} label="Constitution" value={character.constitution} colorClass="text-red-600" />
            <StatDisplay icon={BrainIcon} label="Intelligence" value={character.intelligence} colorClass="text-purple-500" />
            <StatDisplay icon={EyeIcon} label="Wisdom" value={character.wisdom} colorClass="text-sky-500" />
            <StatDisplay icon={CharismaIcon} label="Charisma" value={character.charisma} colorClass="text-pink-500" />
          </div>
        </div>

        {/* Quick Navigation Hints */}
        <div className="bg-muted/30 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground text-center">
            View detailed <span className="font-medium text-primary">Skills & Progression</span> in the Skills tab •
            Manage <span className="font-medium text-primary">Equipment & Inventory</span> in the Inventory tab
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

