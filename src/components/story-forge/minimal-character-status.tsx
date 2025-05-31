
"use client";

import type { CharacterProfile, StructuredStoryState } from "@/types/story";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeartIcon, ZapIcon, AwardIcon, GaugeIcon, MapPinIcon, SwordsIcon, UserCircleIcon } from "lucide-react";

interface MinimalCharacterStatusProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
}

export default function MinimalCharacterStatus({ character, storyState }: MinimalCharacterStatusProps) {
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
          <Badge variant="outline" className="text-md">
            <AwardIcon className="w-3.5 h-3.5 mr-1 text-yellow-500 shrink-0" />
            Lvl {character.level}
          </Badge>
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
              <GaugeIcon className="w-3 h-3 mr-1 text-green-500 shrink-0" /> {/* Changed w-3.5 h-3.5 to w-3 h-3 */}
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
