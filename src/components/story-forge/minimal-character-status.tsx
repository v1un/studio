
"use client";

import type { CharacterProfile, StructuredStoryState } from "@/types/story";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeartIcon, ZapIcon, AwardIcon, GaugeIcon, MapPinIcon, SwordsIcon, UserCircleIcon, CoinsIcon, SparklesIcon, LanguagesIcon, BookOpenIcon, MessageSquareIcon } from "lucide-react";

interface MinimalCharacterStatusProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  isPremiumSession?: boolean;
}

function getShortLanguageProficiencyLabel(level?: number, type?: 'Read' | 'Speak'): string {
    const prefix = type ? `${type}: ` : "Lang: ";
    if (level === undefined || level === null) return `${prefix}N/A`;
    if (level <= 0) return `${prefix}None`;
    if (level <= 10) return `${prefix}Basic`; // Simplified for minimal display
    if (level <= 40) return `${prefix}Limited`;
    if (level <= 70) return `${prefix}Okay`;
    if (level <= 99) return `${prefix}Good`;
    return `${prefix}Fluent`;
}


export default function MinimalCharacterStatus({ character, storyState, isPremiumSession }: MinimalCharacterStatusProps) {
  const healthPercentage = character.maxHealth > 0 ? (character.health / character.maxHealth) * 100 : 0;
  const manaPercentage = (character.maxMana ?? 0) > 0 ? ((character.mana ?? 0) / (character.maxMana ?? 1)) * 100 : 0;
  const xpPercentage = character.experienceToNextLevel > 0 ? (character.experiencePoints / character.experienceToNextLevel) * 100 : 0;
  const equippedWeaponName = storyState.equippedItems?.weapon?.name || "Unarmed";
  const currentLocation = storyState.currentLocation;

  return (
    <Card className="w-full shadow-md bg-card/70 backdrop-blur-sm mb-4 animate-fade-in">
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-headline font-semibold text-primary">{character.name}</h3>
            <p className="text-sm text-muted-foreground -mt-0.5 flex items-center">
              <UserCircleIcon className="w-3.5 h-3.5 mr-1 text-purple-400 shrink-0"/> {character.class}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1">
             <div className="flex items-center gap-2">
                {isPremiumSession && (
                    <Badge variant="outline" className="text-xs border-yellow-500/70 text-yellow-600 dark:text-yellow-400">
                        <SparklesIcon className="w-3 h-3 mr-1 text-yellow-500 shrink-0" />
                        Premium AI
                    </Badge>
                )}
                <Badge variant="outline" className="text-md">
                <AwardIcon className="w-3.5 h-3.5 mr-1 text-yellow-500 shrink-0" />
                Lvl {character.level}
                </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
                {character.languageReading !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                        <BookOpenIcon className="w-3 h-3 mr-1 text-indigo-500 shrink-0" />
                        {getShortLanguageProficiencyLabel(character.languageReading, 'Read')}
                    </Badge>
                )}
                 {character.languageSpeaking !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                        <MessageSquareIcon className="w-3 h-3 mr-1 text-teal-500 shrink-0" />
                        {getShortLanguageProficiencyLabel(character.languageSpeaking, 'Speak')}
                    </Badge>
                )}
                {character.currency !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                        <CoinsIcon className="w-3 h-3 mr-1 text-yellow-600 shrink-0" />
                        {character.currency}
                    </Badge>
                )}
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <Label className="text-xs font-medium flex items-center">
              <HeartIcon className="w-3.5 h-3.5 mr-1 text-red-500 shrink-0" />
              Health
            </Label>
            <span className="text-xs text-muted-foreground">{character.health} / {character.maxHealth}</span>
          </div>
          <Progress value={healthPercentage} aria-label={`${healthPercentage}% health`} className="h-2 [&>div]:bg-red-500" />
        </div>

        {(character.maxMana ?? 0) > 0 && (
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <Label className="text-xs font-medium flex items-center">
                <ZapIcon className="w-3.5 h-3.5 mr-1 text-blue-500 shrink-0" />
                Mana
              </Label>
              <span className="text-xs text-muted-foreground">{character.mana ?? 0} / {character.maxMana ?? 0}</span>
            </div>
            <Progress value={manaPercentage} aria-label={`${manaPercentage}% mana`} className="h-2 [&>div]:bg-blue-500" />
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-0.5">
            <Label className="text-xs font-medium flex items-center">
              <GaugeIcon className="w-3 h-3 mr-1 text-green-500 shrink-0" />
              XP
            </Label>
            <span className="text-xs text-muted-foreground">{character.experiencePoints} / {character.experienceToNextLevel}</span>
          </div>
          <Progress value={xpPercentage} aria-label={`${xpPercentage}% experience points`} className="h-2 [&>div]:bg-green-500" />
        </div>

        {currentLocation && (
          <div className="pt-1">
            <Label className="text-xs font-medium flex items-center">
              <MapPinIcon className="w-3.5 h-3.5 mr-1 text-purple-500 shrink-0" />
              Location
            </Label>
            <p className="text-sm text-foreground truncate" title={currentLocation}>{currentLocation}</p>
          </div>
        )}

        <div className="pt-1">
          <Label className="text-xs font-medium flex items-center">
            <SwordsIcon className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
            Weapon
          </Label>
          <p className="text-sm text-foreground truncate" title={equippedWeaponName}>{equippedWeaponName}</p>
        </div>
      </CardContent>
    </Card>
  );
}
