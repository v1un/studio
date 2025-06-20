"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Crown,
  Zap,
  Clock,
  AlertTriangle,
  Brain,
  Heart,
  Shield,
  Skull,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  Star,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import type { 
  CharacterProfile, 
  UniqueAbility,
  ReturnByDeathAbility,
  PsychologicalStage
} from '@/types/story';
import { 
  unlockUniqueAbility,
  activateUniqueAbility,
  executeReturnByDeath,
  checkAbilityRestrictions
} from '@/lib/scenario-api';

interface UniqueAbilitiesPanelProps {
  character: CharacterProfile;
  abilities: UniqueAbility[];
  characterAbilities: any;
  onCharacterUpdate: (character: CharacterProfile) => void;
}

const rarityColors = {
  legendary: 'text-yellow-500 border-yellow-500',
  mythic: 'text-purple-500 border-purple-500',
  divine: 'text-pink-500 border-pink-500'
};

const stageColors: Record<PsychologicalStage, string> = {
  denial: 'text-gray-500',
  panic: 'text-red-500',
  experimentation: 'text-blue-500',
  determination: 'text-green-500',
  desperation: 'text-orange-500',
  acceptance: 'text-purple-500',
  mastery: 'text-indigo-500',
  transcendence: 'text-pink-500'
};

export function UniqueAbilitiesPanel({ 
  character, 
  abilities, 
  characterAbilities, 
  onCharacterUpdate 
}: UniqueAbilitiesPanelProps) {
  const [selectedAbility, setSelectedAbility] = useState<UniqueAbility | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnByDeathAbility = character.returnByDeathAbility;
  const unlockedAbilities = characterAbilities?.unlockedAbilities || [];
  const activeAbilities = characterAbilities?.activeAbilities || [];

  const handleUnlockAbility = async (ability: UniqueAbility) => {
    try {
      const result = await unlockUniqueAbility(ability.id, character, 'Player choice');
      
      if (result.success) {
        onCharacterUpdate(result.character);
      } else {
        setError('Failed to unlock ability');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleActivateAbility = async (ability: UniqueAbility) => {
    try {
      setIsActivating(true);
      setError(null);

      // Check restrictions first
      const restrictionCheck = await checkAbilityRestrictions(
        character, 
        'activate_ability', 
        ability.id
      );

      if (!restrictionCheck.allowed) {
        setError(restrictionCheck.warning || 'Ability activation restricted');
        return;
      }

      const result = await activateUniqueAbility(
        ability.id, 
        character, 
        {}, // story state would be passed from parent
        'Player activation'
      );
      
      if (result.success) {
        onCharacterUpdate(result.character);
      } else {
        setError(result.error || 'Failed to activate ability');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsActivating(false);
    }
  };

  const renderPsychologicalStatus = (rbdAbility: ReturnByDeathAbility) => {
    const psych = rbdAbility.psychologicalProgression;
    
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" />
            Psychological Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span>Sanity</span>
                <span>{psych.currentSanity}/{psych.maxSanity}</span>
              </div>
              <Progress value={(psych.currentSanity / psych.maxSanity) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span>Trauma</span>
                <span>{psych.traumaAccumulation}/100</span>
              </div>
              <Progress value={psych.traumaAccumulation} className="h-2 bg-red-100" />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Current Stage:</span>
            <Badge className={stageColors[psych.currentStage]}>
              {psych.currentStage}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-muted-foreground">Desensitization</div>
              <div className="font-medium">{psych.desensitizationLevel}%</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Determination</div>
              <div className="font-medium">{psych.determinationLevel}%</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Isolation</div>
              <div className="font-medium">{psych.isolationLevel}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAbilityCard = (ability: UniqueAbility, isUnlocked: boolean = false) => {
    const isActive = activeAbilities.some((a: any) => a.id === ability.id);
    const isOnCooldown = ability.currentCooldown && ability.currentCooldown > 0;

    return (
      <Card 
        key={ability.id} 
        className={`cursor-pointer transition-all hover:shadow-md ${
          isUnlocked ? 'border-primary/50' : ''
        } ${rarityColors[ability.rarity as keyof typeof rarityColors]}`}
        onClick={() => setSelectedAbility(ability)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <h4 className="font-medium">{ability.name}</h4>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className={rarityColors[ability.rarity as keyof typeof rarityColors]}>
                {ability.rarity}
              </Badge>
              {ability.seriesOrigin !== 'Generic' && (
                <Badge variant="secondary">{ability.seriesOrigin}</Badge>
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {ability.description}
          </p>

          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Power: {ability.powerLevel}/100</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{ability.cooldownInfo.type}</span>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2 mb-3">
            {isActive && (
              <Badge variant="default" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            {isOnCooldown && (
              <Badge variant="destructive" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Cooldown: {ability.currentCooldown}
              </Badge>
            )}
            {!isUnlocked && (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isUnlocked ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlockAbility(ability);
                }}
              >
                Unlock
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isOnCooldown || isActivating}
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivateAbility(ability);
                }}
              >
                {isActivating ? 'Activating...' : 'Activate'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAbility(ability);
              }}
            >
              Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
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

      {/* Return by Death Status */}
      {returnByDeathAbility && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-500" />
            Return by Death
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-purple-500" />
                  {returnByDeathAbility.name}
                </CardTitle>
                <CardDescription>{returnByDeathAbility.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Total Uses:</span>
                    <span>{returnByDeathAbility.usageHistory.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Power Level:</span>
                    <span>{returnByDeathAbility.powerLevel}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Memory Retention:</span>
                    <span>{returnByDeathAbility.memoryRetention.baseRetentionRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {renderPsychologicalStatus(returnByDeathAbility)}
          </div>
        </div>
      )}

      {/* Unlocked Abilities */}
      {unlockedAbilities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            Unlocked Unique Abilities
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {unlockedAbilities.map((ability: UniqueAbility) => renderAbilityCard(ability, true))}
          </div>
        </div>
      )}

      {/* Available Abilities */}
      {abilities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Available Unique Abilities
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {abilities
              .filter(ability => !unlockedAbilities.some((ua: UniqueAbility) => ua.id === ability.id))
              .map(ability => renderAbilityCard(ability, false))
            }
          </div>
        </div>
      )}

      {/* Ability Detail Modal */}
      {selectedAbility && (
        <Dialog open={true} onOpenChange={() => setSelectedAbility(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {selectedAbility.name}
              </DialogTitle>
              <DialogDescription>{selectedAbility.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>Category: {selectedAbility.category}</div>
                    <div>Rarity: {selectedAbility.rarity}</div>
                    <div>Power Level: {selectedAbility.powerLevel}/100</div>
                    <div>Series: {selectedAbility.seriesOrigin}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Cooldown</h4>
                  <div className="space-y-1 text-sm">
                    <div>Type: {selectedAbility.cooldownInfo.type}</div>
                    <div>Duration: {selectedAbility.cooldownInfo.duration}</div>
                    <div>Can be reduced: {selectedAbility.cooldownInfo.canBeReduced ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              {/* Effects */}
              <div>
                <h4 className="font-medium mb-2">Effects</h4>
                <div className="space-y-2">
                  {selectedAbility.effects.map((effect, index) => (
                    <Card key={index} className="p-3">
                      <div className="text-sm">
                        <div className="font-medium">{effect.type} ({effect.scope})</div>
                        <div className="text-muted-foreground">{effect.description}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Balance Mechanisms */}
              <div>
                <h4 className="font-medium mb-2">Balance Mechanisms</h4>
                <div className="space-y-2">
                  {selectedAbility.balanceMechanisms.map((mechanism, index) => (
                    <Card key={index} className="p-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{mechanism.type}</Badge>
                          <Badge variant={mechanism.severity === 'severe' ? 'destructive' : 'secondary'}>
                            {mechanism.severity}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">{mechanism.description}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Costs */}
              {selectedAbility.costs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Activation Costs</h4>
                  <div className="space-y-2">
                    {selectedAbility.costs.map((cost, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{cost.type}: {cost.amount}</span>
                        <Badge variant={cost.isPermanent ? 'destructive' : 'secondary'}>
                          {cost.isPermanent ? 'Permanent' : 'Temporary'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restrictions */}
              {selectedAbility.narrativeRestrictions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Narrative Restrictions</h4>
                  <div className="space-y-2">
                    {selectedAbility.narrativeRestrictions.map((restriction, index) => (
                      <Card key={index} className="p-3">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{restriction.type}</Badge>
                            <Badge variant={restriction.severity === 'major' ? 'destructive' : 'secondary'}>
                              {restriction.severity}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">{restriction.description}</div>
                          {restriction.workarounds && (
                            <div className="mt-1">
                              <span className="font-medium">Workarounds: </span>
                              {restriction.workarounds.join(', ')}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
