"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Minus, 
  Star, 
  Zap, 
  Shield, 
  Sword, 
  Brain, 
  Eye, 
  Heart,
  Dumbbell,
  Sparkles,
  Target
} from 'lucide-react';
import type { CharacterProfile, ProgressionPoints, AttributeProgression } from '@/types/story';
import { 
  allocateAttributePoint, 
  calculateDerivedStats,
  initializeAttributeProgression 
} from '@/lib/progression-engine';

interface LevelUpModalProps {
  character: CharacterProfile;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (updatedCharacter: CharacterProfile) => void;
}

interface AttributeAllocation {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export default function LevelUpModal({ character, isOpen, onClose, onComplete }: LevelUpModalProps) {
  const [currentTab, setCurrentTab] = useState('attributes');
  const [attributeAllocations, setAttributeAllocations] = useState<AttributeAllocation>({
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  });

  const availablePoints = character.progressionPoints?.attribute || 0;
  const usedPoints = Object.values(attributeAllocations).reduce((sum, val) => sum + val, 0);
  const remainingPoints = availablePoints - usedPoints;

  const attributeInfo = [
    {
      key: 'strength' as keyof AttributeAllocation,
      name: 'Strength',
      icon: Dumbbell,
      color: 'text-orange-500',
      description: 'Increases attack damage and carry capacity'
    },
    {
      key: 'dexterity' as keyof AttributeAllocation,
      name: 'Dexterity',
      icon: Target,
      color: 'text-green-500',
      description: 'Improves accuracy, evasion, and critical chance'
    },
    {
      key: 'constitution' as keyof AttributeAllocation,
      name: 'Constitution',
      icon: Heart,
      color: 'text-red-500',
      description: 'Increases health and defense'
    },
    {
      key: 'intelligence' as keyof AttributeAllocation,
      name: 'Intelligence',
      icon: Brain,
      color: 'text-purple-500',
      description: 'Boosts mana and magical damage'
    },
    {
      key: 'wisdom' as keyof AttributeAllocation,
      name: 'Wisdom',
      icon: Eye,
      color: 'text-blue-500',
      description: 'Enhances perception and initiative'
    },
    {
      key: 'charisma' as keyof AttributeAllocation,
      name: 'Charisma',
      icon: Sparkles,
      color: 'text-pink-500',
      description: 'Improves social interactions and leadership'
    },
  ];

  const handleAttributeChange = (attribute: keyof AttributeAllocation, delta: number) => {
    const newValue = attributeAllocations[attribute] + delta;
    if (newValue >= 0 && (delta < 0 || remainingPoints > 0)) {
      setAttributeAllocations(prev => ({
        ...prev,
        [attribute]: newValue
      }));
    }
  };

  const calculatePreviewStats = () => {
    try {
      const currentProgression = character.attributeProgression || initializeAttributeProgression();
      let tempProgression = { ...currentProgression };

      // Apply allocations with validation
      Object.entries(attributeAllocations).forEach(([attr, points]) => {
        if (points > 0) {
          tempProgression = allocateAttributePoint(
            tempProgression,
            attr as keyof Omit<AttributeProgression, 'maxHealthBonus' | 'maxManaBonus' | 'carryCapacityBonus'>,
            points
          );
        }
      });

      return calculateDerivedStats(character, tempProgression);
    } catch (error) {
      console.error('Error calculating preview stats:', error);
      // Return current stats as fallback
      return {
        attack: character.attack || 0,
        defense: character.defense || 0,
        maxHealth: character.maxHealth,
        maxMana: character.maxMana || 0
      };
    }
  };

  const previewStats = calculatePreviewStats();

  const handleComplete = () => {
    try {
      // Validate that all points are allocated
      if (remainingPoints !== 0) {
        console.error('Cannot complete level up with unallocated points');
        return;
      }

      const currentProgression = character.attributeProgression || initializeAttributeProgression();
      let newProgression = { ...currentProgression };

      // Apply all allocations with validation
      Object.entries(attributeAllocations).forEach(([attr, points]) => {
        if (points > 0) {
          newProgression = allocateAttributePoint(
            newProgression,
            attr as keyof Omit<AttributeProgression, 'maxHealthBonus' | 'maxManaBonus' | 'carryCapacityBonus'>,
            points
          );
        }
      });

      const derivedStats = calculateDerivedStats(character, newProgression);
      const currentPoints = character.progressionPoints || { attribute: 0, skill: 0, specialization: 0, talent: 0 };

      const updatedCharacter: CharacterProfile = {
        ...character,
        ...derivedStats,
        attributeProgression: newProgression,
        progressionPoints: {
          ...currentPoints,
          attribute: remainingPoints,
        },
      };

      onComplete(updatedCharacter);
    } catch (error) {
      console.error('Error completing level up:', error);
      // Could show a toast notification here
    }
  };

  const canComplete = remainingPoints === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Level Up! Welcome to Level {character.level}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="skills" disabled>Skills</TabsTrigger>
            <TabsTrigger value="specialization" disabled>Specialization</TabsTrigger>
          </TabsList>

          <TabsContent value="attributes" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Attribute Points</h3>
                <p className="text-sm text-muted-foreground">
                  Allocate your attribute points to customize your character&apos;s strengths
                </p>
              </div>
              <Badge variant={remainingPoints > 0 ? "default" : "secondary"} className="text-lg px-3 py-1">
                {remainingPoints} points remaining
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attributeInfo.map((attr) => {
                const currentValue = (character[attr.key] || 10) + (character.attributeProgression?.[attr.key] || 0);
                const allocation = attributeAllocations[attr.key];
                const newValue = currentValue + allocation;

                return (
                  <Card key={attr.key} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <attr.icon className={`w-5 h-5 ${attr.color}`} />
                        <span className="font-medium">{attr.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAttributeChange(attr.key, -1)}
                          disabled={allocation === 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-mono">
                          {allocation}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAttributeChange(attr.key, 1)}
                          disabled={remainingPoints === 0}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {attr.description}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Current: {currentValue}</span>
                      {allocation > 0 && (
                        <span className="text-green-600 font-medium">
                          → {newValue} (+{allocation})
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Preview Stats */}
            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Stat Preview</CardTitle>
                <CardDescription>
                  How your stats will change with the current allocation
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4 text-red-500" />
                  <span className="text-sm">
                    Attack: {character.attack || 0} → {previewStats.attack || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">
                    Defense: {character.defense || 0} → {previewStats.defense || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-sm">
                    Health: {character.maxHealth} → {previewStats.maxHealth || character.maxHealth}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">
                    Mana: {character.maxMana || 0} → {previewStats.maxMana || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Skill allocation coming soon!</p>
            </div>
          </TabsContent>

          <TabsContent value="specialization">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Specialization selection coming soon!</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleComplete} 
            disabled={!canComplete}
            className="bg-green-600 hover:bg-green-700"
          >
            Complete Level Up
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
