
"use client";

import type { CharacterProfile } from "@/types/story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeartIcon, ZapIcon, AwardIcon } from "lucide-react";

interface MinimalCharacterStatusProps {
  character: CharacterProfile;
}

export default function MinimalCharacterStatus({ character }: MinimalCharacterStatusProps) {
  const healthPercentage = character.maxHealth > 0 ? (character.health / character.maxHealth) * 100 : 0;
  const manaPercentage = (character.maxMana ?? 0) > 0 ? ((character.mana ?? 0) / (character.maxMana ?? 1)) * 100 : 0;

  return (
    <Card className="w-full shadow-md bg-card/70 backdrop-blur-sm mb-4 animate-fade-in">
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-headline font-semibold text-primary">{character.name}</h3>
          <Badge variant="outline" className="text-md">
            <AwardIcon className="w-3.5 h-3.5 mr-1 text-yellow-500" />
            Lvl {character.level}
          </Badge>
        </div>
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <Label className="text-xs font-medium flex items-center">
              <HeartIcon className="w-3.5 h-3.5 mr-1 text-red-500" />
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
                <ZapIcon className="w-3.5 h-3.5 mr-1 text-blue-500" />
                Mana
              </Label>
              <span className="text-xs text-muted-foreground">{character.mana ?? 0} / {character.maxMana ?? 0}</span>
            </div>
            <Progress value={manaPercentage} aria-label={`${manaPercentage}% mana`} className="h-2 [&>div]:bg-blue-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
