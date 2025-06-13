
"use client";

import type { CombatHelperInfo, CombatEventLogEntry } from "@/types/story";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlertIcon, HeartIcon, ZapIcon, UserIcon, SwordsIcon, BotIcon, SkullIcon, MessageSquareTextIcon, PlusCircleIcon, MinusCircleIcon, PlayIcon } from "lucide-react";

interface CombatHelperDisplayProps {
  combatInfo: CombatHelperInfo;
  onStartInteractiveCombat?: () => void;
  showInteractiveOption?: boolean;
}

const EventIcon = ({type}: {type: CombatEventLogEntry['type']}) => {
    switch(type) {
        case 'damage': return <MinusCircleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />;
        case 'healing': return <PlusCircleIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />;
        case 'death': return <SkullIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />;
        case 'effect': return <SwordsIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />; // Generic effect
        case 'action': return <MessageSquareTextIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
        default: return <SwordsIcon className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
    }
}

export default function CombatHelperDisplay({
  combatInfo,
  onStartInteractiveCombat,
  showInteractiveOption = false
}: CombatHelperDisplayProps) {
  return (
    <Card className="w-full my-4 shadow-md border-destructive/30 bg-destructive/5 animate-fade-in">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="font-headline text-xl text-destructive flex items-center">
          <ShieldAlertIcon className="w-5 h-5 mr-2" />
          Combat Log
        </CardTitle>
        <CardDescription className="text-xs">
          Summary of the recent combat actions and status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h4 className="font-semibold mb-1 flex items-center text-destructive/90">
                <UserIcon className="w-4 h-4 mr-1.5"/>Player Status
            </h4>
            <div className="text-xs space-y-0.5">
              <p className="flex items-center"><HeartIcon className="w-3 h-3 mr-1 text-red-500"/> Health: {combatInfo.playerHealth} / {combatInfo.playerMaxHealth}</p>
              {(combatInfo.playerMana !== undefined && combatInfo.playerMaxMana !== undefined) && (
                <p className="flex items-center"><ZapIcon className="w-3 h-3 mr-1 text-blue-500"/> Mana: {combatInfo.playerMana} / {combatInfo.playerMaxMana}</p>
              )}
            </div>
          </div>
          {combatInfo.hostileNPCs.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1 flex items-center text-destructive/90">
                <BotIcon className="w-4 h-4 mr-1.5"/>Hostile NPCs
              </h4>
              <ul className="text-xs space-y-0.5">
                {combatInfo.hostileNPCs.map(npc => (
                  <li key={npc.id} className="flex items-center">
                    {npc.name} 
                    {npc.health !== undefined && npc.maxHealth !== undefined && (
                      <Badge variant="destructive" className="ml-1.5 text-xs px-1 py-0">HP: {npc.health}/{npc.maxHealth}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {combatInfo.turnEvents.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1 mt-2 flex items-center text-destructive/90">
                <SwordsIcon className="w-4 h-4 mr-1.5"/>Key Events This Turn
            </h4>
            <ScrollArea className="h-24 rounded-md border border-destructive/20 p-2 bg-background/30">
              <ul className="space-y-1 text-xs">
                {combatInfo.turnEvents.map((event, index) => (
                  <li key={index} className="flex items-start">
                    <EventIcon type={event.type} />
                    <span className="ml-1.5">{event.description}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* Interactive Combat Option */}
        {showInteractiveOption && onStartInteractiveCombat && (
          <div className="mt-3 pt-3 border-t border-destructive/20">
            <Button
              onClick={onStartInteractiveCombat}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Start Interactive Combat
            </Button>
            <p className="text-xs text-gray-600 mt-1 text-center">
              Take direct control of combat actions and tactics
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
