/**
 * Item Enhancement Interface Component
 * 
 * Specialized interface for item enhancement and upgrade mechanics:
 * - Enhancement level progression display
 * - Material requirements and success rates
 * - Risk assessment and failure consequences
 * - Enhancement preview and stat comparisons
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SparklesIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  GemIcon,
  CoinsIcon
} from 'lucide-react';

import type {
  CharacterProfile,
  EnhancedItem,
  StatModifier
} from '@/types/story';

import type {
  EnhancementAttempt
} from '@/lib/crafting-engine';

interface ItemEnhancementInterfaceProps {
  character: CharacterProfile;
  item: EnhancedItem;
  availableMaterials: EnhancedItem[];
  onEnhanceItem: (itemId: string, materials: { itemId: string; quantity: number }[]) => Promise<{
    success: boolean;
    newItem?: EnhancedItem;
    message: string;
  }>;
  onClose: () => void;
}

interface EnhancementMaterial {
  id: string;
  name: string;
  quantity: number;
  available: number;
  successBonus: number;
  description: string;
}

const ENHANCEMENT_MATERIALS: EnhancementMaterial[] = [
  {
    id: 'basic_enhancement_stone',
    name: 'Basic Enhancement Stone',
    quantity: 1,
    available: 5,
    successBonus: 0,
    description: 'Standard enhancement material'
  },
  {
    id: 'superior_enhancement_stone',
    name: 'Superior Enhancement Stone',
    quantity: 1,
    available: 2,
    successBonus: 15,
    description: 'Higher quality stone with better success rate'
  },
  {
    id: 'blessed_enhancement_crystal',
    name: 'Blessed Enhancement Crystal',
    quantity: 1,
    available: 1,
    successBonus: 25,
    description: 'Rare crystal that significantly improves success chance'
  }
];

export const ItemEnhancementInterface: React.FC<ItemEnhancementInterfaceProps> = ({
  character,
  item,
  availableMaterials,
  onEnhanceItem,
  onClose
}) => {
  const [selectedMaterials, setSelectedMaterials] = useState<{ itemId: string; quantity: number }[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const currentLevel = item.enhancement?.level || 0;
  const maxLevel = item.enhancement?.maxLevel || 10;
  const canEnhance = currentLevel < maxLevel;

  const enhancementPreview = useMemo(() => {
    if (!canEnhance) return null;

    // Calculate success rate based on selected materials
    let baseSuccessRate = Math.max(10, 90 - (currentLevel * 8));
    const materialBonus = selectedMaterials.reduce((bonus, material) => {
      const materialData = ENHANCEMENT_MATERIALS.find(m => m.id === material.itemId);
      return bonus + (materialData?.successBonus || 0);
    }, 0);

    const successRate = Math.min(95, Math.max(5, baseSuccessRate + materialBonus));

    // Determine failure consequence
    let failureConsequence: 'nothing' | 'level_loss' | 'destruction' = 'nothing';
    if (currentLevel >= 7) {
      failureConsequence = Math.random() < 0.1 ? 'destruction' : 'level_loss';
    } else if (currentLevel >= 4) {
      failureConsequence = Math.random() < 0.05 ? 'level_loss' : 'nothing';
    }

    return {
      successRate,
      failureConsequence,
      newLevel: currentLevel + 1,
      newBonuses: calculateEnhancementBonuses(item, currentLevel + 1)
    };
  }, [item, currentLevel, canEnhance, selectedMaterials]);

  const handleMaterialSelect = (materialId: string, quantity: number) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.itemId === materialId);
      if (existing) {
        return prev.map(m => 
          m.itemId === materialId 
            ? { ...m, quantity: Math.max(0, quantity) }
            : m
        ).filter(m => m.quantity > 0);
      } else if (quantity > 0) {
        return [...prev, { itemId: materialId, quantity }];
      }
      return prev;
    });
  };

  const handleEnhance = async () => {
    if (!enhancementPreview || selectedMaterials.length === 0) return;

    setIsEnhancing(true);
    try {
      const result = await onEnhanceItem(item.id, selectedMaterials);
      // Handle result (success/failure feedback would be shown by parent component)
      if (result.success) {
        setSelectedMaterials([]);
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  const getFailureConsequenceColor = (consequence: string): string => {
    switch (consequence) {
      case 'nothing': return 'text-green-500';
      case 'level_loss': return 'text-yellow-500';
      case 'destruction': return 'text-red-500';
      default: return 'text-foreground';
    }
  };

  const getFailureConsequenceIcon = (consequence: string) => {
    switch (consequence) {
      case 'nothing': return CheckCircleIcon;
      case 'level_loss': return AlertTriangleIcon;
      case 'destruction': return XCircleIcon;
      default: return AlertTriangleIcon;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2" />
            Enhance Item
          </h2>
          <p className="text-muted-foreground">Improve your equipment with enhancement materials</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{item.name}</span>
              <Badge variant={item.rarity === 'legendary' ? 'default' : 'outline'}>
                {item.rarity || 'common'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Enhancement</p>
              <div className="flex items-center space-x-2">
                <Progress value={(currentLevel / maxLevel) * 100} className="flex-1" />
                <span className="text-sm font-medium">+{currentLevel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Level {currentLevel} of {maxLevel}
              </p>
            </div>

            {item.enhancement?.bonusStats && item.enhancement.bonusStats.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Bonuses</p>
                <div className="space-y-1">
                  {item.enhancement.bonusStats.map((bonus, index) => (
                    <div key={index} className="text-sm flex justify-between">
                      <span>{bonus.stat}</span>
                      <span className="text-green-500">+{bonus.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!canEnhance && (
              <Alert>
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  This item is already at maximum enhancement level.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Enhancement Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GemIcon className="w-5 h-5 mr-2" />
              Enhancement Materials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ENHANCEMENT_MATERIALS.map(material => (
              <div key={material.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{material.name}</h4>
                    <p className="text-xs text-muted-foreground">{material.description}</p>
                  </div>
                  <Badge variant="outline">
                    {material.available} available
                  </Badge>
                </div>
                
                {material.successBonus > 0 && (
                  <p className="text-sm text-green-500 mb-2">
                    +{material.successBonus}% success rate
                  </p>
                )}

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canEnhance || material.available === 0}
                    onClick={() => {
                      const current = selectedMaterials.find(m => m.itemId === material.id)?.quantity || 0;
                      if (current === 0) {
                        handleMaterialSelect(material.id, 1);
                      } else {
                        handleMaterialSelect(material.id, 0);
                      }
                    }}
                  >
                    {selectedMaterials.find(m => m.itemId === material.id) ? 'Remove' : 'Select'}
                  </Button>
                  
                  {selectedMaterials.find(m => m.itemId === material.id) && (
                    <Badge>Selected</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Enhancement Preview */}
      {enhancementPreview && canEnhance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUpIcon className="w-5 h-5 mr-2" />
              Enhancement Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                <div className="flex items-center justify-center space-x-2">
                  <Progress value={enhancementPreview.successRate} className="w-20" />
                  <span className="font-medium">{enhancementPreview.successRate.toFixed(1)}%</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">New Level</p>
                <div className="flex items-center justify-center space-x-2">
                  <span>+{currentLevel}</span>
                  <ArrowRightIcon className="w-4 h-4" />
                  <span className="font-medium text-green-500">+{enhancementPreview.newLevel}</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Failure Risk</p>
                <div className="flex items-center justify-center space-x-1">
                  {React.createElement(getFailureConsequenceIcon(enhancementPreview.failureConsequence), {
                    className: `w-4 h-4 ${getFailureConsequenceColor(enhancementPreview.failureConsequence)}`
                  })}
                  <span className={`text-sm ${getFailureConsequenceColor(enhancementPreview.failureConsequence)}`}>
                    {enhancementPreview.failureConsequence.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Stat Improvements</p>
              <div className="grid grid-cols-2 gap-2">
                {enhancementPreview.newBonuses.map((bonus, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{bonus.stat}</span>
                    <span className="text-green-500">+{bonus.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleEnhance}
                disabled={selectedMaterials.length === 0 || isEnhancing}
                className="px-8"
              >
                {isEnhancing ? 'Enhancing...' : `Enhance to +${enhancementPreview.newLevel}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper function to calculate enhancement bonuses
function calculateEnhancementBonuses(item: EnhancedItem, level: number): StatModifier[] {
  // This would be more sophisticated in a real implementation
  const bonuses: StatModifier[] = [];
  
  if (item.itemType === 'weapon') {
    bonuses.push({
      stat: 'attack',
      value: level * 2,
      type: 'add',
      description: `+${level * 2} Attack from enhancement`
    });
  } else if (item.itemType === 'armor') {
    bonuses.push({
      stat: 'defense',
      value: level * 2,
      type: 'add',
      description: `+${level * 2} Defense from enhancement`
    });
  }
  
  // Add secondary bonuses at higher levels
  if (level >= 5) {
    bonuses.push({
      stat: 'criticalChance',
      value: Math.floor(level / 5),
      type: 'add',
      description: `+${Math.floor(level / 5)}% Critical Chance from high enhancement`
    });
  }
  
  return bonuses;
}
