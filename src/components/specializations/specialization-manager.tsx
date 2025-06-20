"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TreePine, 
  Star, 
  Lock, 
  Unlock,
  Zap,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Sword,
  Shield,
  Users,
  Wrench
} from 'lucide-react';
import type { 
  CharacterProfile, 
  SpecializationTree,
  SpecializationCategory,
  UniqueAbility
} from '@/types/story';
import { 
  getSpecializationTrees,
  getAvailableSpecializationTrees,
  unlockSpecializationTree,
  purchaseSpecializationNode,
  getUniqueAbilities,
  getCharacterAbilities
} from '@/lib/scenario-api';
import { SpecializationTreeView } from './specialization-tree-view';
import { UniqueAbilitiesPanel } from './unique-abilities-panel';

interface SpecializationManagerProps {
  character: CharacterProfile;
  onCharacterUpdate: (character: CharacterProfile) => void;
  seriesName?: string;
  currentTurnId?: string;
  storyState?: any; // Add story state for dynamic generation
}

const categoryIcons: Record<SpecializationCategory, any> = {
  combat: Sword,
  magic: Zap,
  social: Users,
  utility: Wrench,
  unique: Crown,
  defensive: Shield,
  support: Users,
  crafting: Wrench,
  exploration: TreePine,
  leadership: Crown
};

const categoryColors: Record<SpecializationCategory, string> = {
  combat: 'text-red-500',
  magic: 'text-blue-500',
  social: 'text-green-500',
  utility: 'text-yellow-500',
  unique: 'text-purple-500',
  defensive: 'text-gray-500',
  support: 'text-pink-500',
  crafting: 'text-orange-500',
  exploration: 'text-teal-500',
  leadership: 'text-indigo-500'
};

export function SpecializationManager({
  character,
  onCharacterUpdate,
  seriesName,
  currentTurnId,
  storyState
}: SpecializationManagerProps) {
  const [availableTrees, setAvailableTrees] = useState<SpecializationTree[]>([]);
  const [lockedTrees, setLockedTrees] = useState<any[]>([]);
  const [uniqueAbilities, setUniqueAbilities] = useState<UniqueAbility[]>([]);
  const [characterAbilities, setCharacterAbilities] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<SpecializationCategory>('combat');
  const [selectedTree, setSelectedTree] = useState<SpecializationTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const specializationProgression = character.specializationProgression;
  const availablePoints = specializationProgression?.availablePoints || 0;

  useEffect(() => {
    loadSpecializationData();
  }, [character, seriesName]);

  const loadSpecializationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load available trees with dynamic generation
      const treesResult = await getAvailableSpecializationTrees(character, storyState, seriesName);
      setAvailableTrees(treesResult.availableTrees || []);
      setLockedTrees(treesResult.lockedTrees || []);

      // Load unique abilities
      const abilitiesResult = await getUniqueAbilities(seriesName, character.name);
      setUniqueAbilities(abilitiesResult.abilities || []);

      // Load character's current abilities
      const characterAbilitiesResult = await getCharacterAbilities(character);
      setCharacterAbilities(characterAbilitiesResult);

    } catch (error: any) {
      console.error('Failed to load specialization data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockTree = async (tree: SpecializationTree) => {
    try {
      const result = await unlockSpecializationTree(tree.id, character);
      
      if (result.success) {
        // Update character with new progression
        const updatedCharacter = {
          ...character,
          specializationProgression: result.progression
        };
        onCharacterUpdate(updatedCharacter);
        
        // Refresh data
        await loadSpecializationData();
      } else {
        setError(result.error || 'Failed to unlock specialization tree');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handlePurchaseNode = async (treeId: string, nodeId: string) => {
    try {
      const result = await purchaseSpecializationNode(treeId, nodeId, character, currentTurnId);
      
      if (result.success) {
        // Update character with new progression
        const updatedCharacter = {
          ...character,
          specializationProgression: result.progression
        };
        onCharacterUpdate(updatedCharacter);
        
        // Refresh data
        await loadSpecializationData();
      } else {
        setError(result.error || 'Failed to purchase specialization node');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getTreesByCategory = (category: SpecializationCategory) => {
    return availableTrees.filter(tree => tree.category === category);
  };

  const getUnlockedTreesByCategory = (category: SpecializationCategory) => {
    if (!specializationProgression) return [];
    
    return Object.values(specializationProgression.specializationTrees)
      .filter(tree => tree.category === category);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Specializations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Points */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5" />
                Character Specializations
              </CardTitle>
              <CardDescription>
                Develop your character through specialized skill trees and unique abilities
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{availablePoints}</div>
              <div className="text-sm text-muted-foreground">Available Points</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as SpecializationCategory)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="combat" className="flex items-center gap-1">
            <Sword className="h-4 w-4" />
            Combat
          </TabsTrigger>
          <TabsTrigger value="magic" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Magic
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Social
          </TabsTrigger>
          <TabsTrigger value="utility" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            Utility
          </TabsTrigger>
          <TabsTrigger value="unique" className="flex items-center gap-1">
            <Crown className="h-4 w-4" />
            Unique
          </TabsTrigger>
        </TabsList>

        {(['combat', 'magic', 'social', 'utility', 'unique'] as SpecializationCategory[]).map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid gap-4">
              {/* Available Trees */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Unlock className="h-4 w-4" />
                  Available Specializations
                </h3>
                <div className="grid gap-3">
                  {getTreesByCategory(category).map(tree => (
                    <Card key={tree.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{tree.name}</h4>
                              <Badge variant="outline" className={categoryColors[tree.category]}>
                                {tree.category}
                              </Badge>
                              {tree.seriesOrigin && (
                                <Badge variant="secondary">{tree.seriesOrigin}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{tree.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{tree.nodes.length} nodes</span>
                              <span>Max {tree.maxPoints} points</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUnlockTree(tree)}
                              disabled={availablePoints < 1}
                            >
                              Unlock
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTree(tree)}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Unlocked Trees */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Unlocked Specializations
                </h3>
                <div className="grid gap-3">
                  {getUnlockedTreesByCategory(category).map(tree => (
                    <Card key={tree.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{tree.name}</h4>
                              <Badge className={categoryColors[tree.category]}>
                                {tree.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span>Progress</span>
                                  <span>{tree.pointsSpent}/{tree.maxPoints}</span>
                                </div>
                                <Progress value={(tree.pointsSpent / tree.maxPoints) * 100} className="h-2" />
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setSelectedTree(tree)}
                          >
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Unique Abilities for this category */}
              {category === 'unique' && (
                <UniqueAbilitiesPanel
                  character={character}
                  abilities={uniqueAbilities}
                  characterAbilities={characterAbilities}
                  onCharacterUpdate={onCharacterUpdate}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Tree Detail View */}
      {selectedTree && (
        <SpecializationTreeView
          tree={selectedTree}
          character={character}
          onPurchaseNode={handlePurchaseNode}
          onClose={() => setSelectedTree(null)}
        />
      )}
    </div>
  );
}
