
"use client";

import * as React from "react";
import type { CharacterProfile, StructuredStoryState, Item, EquipmentSlot, Skill, ActiveEffect } from "@/types/story";
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
    FootprintsIcon, HandIcon, CircleEllipsisIcon, SparklesIcon, StarIcon, CoinsIcon, LanguagesIcon, BookOpenIcon, MessageSquareIcon, BoltIcon,
    TrendingUpIcon, TreePineIcon, TargetIcon
} from "lucide-react";
import { checkLevelUp } from "@/lib/progression-engine";

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

function getLanguageProficiencyLabel(level?: number, type?: 'Reading' | 'Speaking'): string {
    const skillType = type ? `${type} ` : "";
    if (level === undefined || level === null) return `${skillType}Unknown`;
    if (level <= 0) return `${skillType}None (0/100)`;
    if (level <= 10) return `${skillType}Rudimentary (${level}/100)`;
    if (level <= 40) return `${skillType}Basic (${level}/100)`;
    if (level <= 70) return `${skillType}Conversational (${level}/100)`;
    if (level <= 99) return `${skillType}Good (${level}/100)`;
    return `${skillType}Fluent (${level}/100)`;
}

const ItemEffectsTooltipContent: React.FC<{ item: Item }> = ({ item }) => (
  <>
    <p className="text-sm font-medium">{item.name}</p>
    <p className="text-xs text-muted-foreground max-w-xs">{item.description}</p>
    {item.basePrice !== undefined && <p className="text-xs text-muted-foreground">Value: {item.basePrice}</p>}
    {item.rarity && <p className="text-xs text-muted-foreground">Rarity: <Badge variant="outline" className="text-xs">{item.rarity}</Badge></p>}
    {item.isConsumable && <p className="text-xs text-muted-foreground">Consumable: {item.effectDescription}</p>}
    {item.activeEffects && item.activeEffects.length > 0 && (
      <div className="mt-1 pt-1 border-t border-muted-foreground/20">
        <p className="text-xs font-semibold text-muted-foreground">Active Effects:</p>
        {item.activeEffects.map(effect => (
          <div key={effect.id} className="text-xs text-muted-foreground">
            - {effect.name}: {effect.description}
            {effect.type === 'stat_modifier' && effect.statModifiers && effect.statModifiers.map(mod => (
              <span key={mod.stat} className="ml-1 text-green-400">({mod.stat} {mod.type === 'add' ? (mod.value > 0 ? `+${mod.value}` : mod.value) : `x${mod.value}`})</span>
            ))}
          </div>
        ))}
      </div>
    )}
  </>
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

        {/* Progression Section */}
        {(character.progressionPoints || character.purchasedSkillNodes?.length || character.activeSpecializations?.length) && (
          <>
            <div>
              <h4 className="font-semibold mb-2 text-md flex items-center">
                <TrendingUpIcon className="w-4 h-4 mr-1.5 text-purple-500" /> Character Progression
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                {character.progressionPoints && (
                  <>
                    <StatDisplay
                      icon={TargetIcon}
                      label="Attribute Points"
                      value={character.progressionPoints.attribute}
                      colorClass="text-orange-500"
                    />
                    <StatDisplay
                      icon={TreePineIcon}
                      label="Skill Points"
                      value={character.progressionPoints.skill}
                      colorClass="text-green-500"
                    />
                    <StatDisplay
                      icon={StarIcon}
                      label="Specialization Points"
                      value={character.progressionPoints.specialization}
                      colorClass="text-blue-500"
                    />
                    <StatDisplay
                      icon={SparklesIcon}
                      label="Talent Points"
                      value={character.progressionPoints.talent}
                      colorClass="text-purple-500"
                    />
                  </>
                )}
              </div>

              {/* Active Specializations */}
              {character.activeSpecializations && character.activeSpecializations.length > 0 && (
                <div className="mt-3">
                  <h5 className="font-medium mb-1 text-sm">Active Specializations:</h5>
                  <div className="flex flex-wrap gap-2">
                    {character.activeSpecializations.map((spec) => (
                      <TooltipProvider key={spec.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="default" className="cursor-help">
                              {spec.name} (Lv.{spec.progressionLevel})
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <div className="font-medium">{spec.name}</div>
                              <div className="text-xs text-muted-foreground">{spec.description}</div>
                              <div className="text-xs">Progression Level: {spec.progressionLevel}/5</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Tree Progress */}
              {character.purchasedSkillNodes && character.purchasedSkillNodes.length > 0 && (
                <div className="mt-3">
                  <h5 className="font-medium mb-1 text-sm">Skill Tree Progress:</h5>
                  <div className="text-xs text-muted-foreground">
                    {character.purchasedSkillNodes.length} skill{character.purchasedSkillNodes.length !== 1 ? 's' : ''} learned
                  </div>
                </div>
              )}

              {/* Level Up Indicator */}
              {(() => {
                const levelUpCheck = checkLevelUp(character);
                return levelUpCheck.shouldLevelUp && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AwardIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Ready to Level Up!</span>
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">
                      You have enough experience to reach level {levelUpCheck.newLevel}
                    </div>
                  </div>
                );
              })()}
            </div>
            <Separator />
          </>
        )}

        <div>
          <h4 className="font-semibold mb-2 text-md flex items-center">
            <LanguagesIcon className="w-4 h-4 mr-1.5 text-indigo-500" /> Language Skills
          </h4>
          <div className="space-y-1">
            <StatDisplay icon={BookOpenIcon} label="Reading" value={getLanguageProficiencyLabel(character.languageReading)} colorClass="text-indigo-400" />
            <StatDisplay icon={MessageSquareIcon} label="Speaking" value={getLanguageProficiencyLabel(character.languageSpeaking)} colorClass="text-indigo-400" />
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
                           <span className="text-foreground cursor-help hover:text-primary transition-colors truncate flex items-center">
                              {equippedItem.name}
                              {equippedItem.activeEffects && equippedItem.activeEffects.length > 0 && <BoltIcon className="w-3 h-3 ml-1 text-yellow-500"/>}
                           </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                           <ItemEffectsTooltipContent item={equippedItem} />
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
                <ul className="space-y-1 pl-2">
                  {storyState.inventory.map((item: Item) => (
                    <li key={item.id} className="text-muted-foreground">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help font-medium text-foreground hover:text-primary transition-colors flex items-center">
                              {item.name}
                              {item.equipSlot && <Badge variant="outline" className="ml-1 text-xs">({item.equipSlot})</Badge>}
                              {item.activeEffects && item.activeEffects.length > 0 && <BoltIcon className="w-3 h-3 ml-1 text-yellow-500"/>}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                             <ItemEffectsTooltipContent item={item} />
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

