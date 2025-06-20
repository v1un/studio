"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TreePine,
  ArrowRight,
  ArrowDown,
  Star,
  Lock,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Sparkles,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  Eye
} from 'lucide-react';
import type { 
  SkillEvolutionChain,
  SkillEvolutionTier,
  SkillBranchingPoint,
  EvolutionDecisionPoint,
  CharacterProfile
} from '@/types/story';

interface SkillEvolutionTreeProps {
  evolutionChain: SkillEvolutionChain;
  character: CharacterProfile;
  evolutionProgress?: { tier: number; progress: number; nextEvolution?: string };
  activeDecisionPoints?: EvolutionDecisionPoint[];
  onEvolutionChoice?: (decisionPointId: string, branchId: string) => void;
  onPreviewEvolution?: (tier: SkillEvolutionTier) => void;
}

export default function SkillEvolutionTree({
  evolutionChain,
  character,
  evolutionProgress,
  activeDecisionPoints = [],
  onEvolutionChoice,
  onPreviewEvolution
}: SkillEvolutionTreeProps) {
  const [selectedTier, setSelectedTier] = useState<SkillEvolutionTier | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [showBranchDetails, setShowBranchDetails] = useState(false);

  const getTierStatus = (tier: SkillEvolutionTier) => {
    if (tier.isActive) return 'active';
    if (tier.isUnlocked) return 'unlocked';
    
    // Check if requirements are met
    const requirementsMet = tier.requirements.every(req => req.isMet);
    if (requirementsMet) return 'ready';
    
    return 'locked';
  };

  const getTierStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 border-green-500 text-green-800';
      case 'unlocked': return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'ready': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'locked': return 'bg-gray-100 border-gray-300 text-gray-500';
      default: return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  const getTierIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'unlocked': return <Star className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'locked': return <Lock className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getRequirementProgress = (tier: SkillEvolutionTier) => {
    const totalRequirements = tier.requirements.length;
    const metRequirements = tier.requirements.filter(req => req.isMet).length;
    return totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 100;
  };

  const renderLinearProgression = () => {
    const linearTiers = evolutionChain.evolutionTiers.filter(tier => 
      !evolutionChain.branchingPoints.some(bp => 
        bp.evolutionPath.some(pathTier => pathTier.skillId === tier.skillId)
      )
    );

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TreePine className="w-5 h-5 text-green-500" />
          Linear Progression
        </h3>
        
        <div className="flex flex-col space-y-3">
          {linearTiers.map((tier, index) => {
            const status = getTierStatus(tier);
            const progress = getRequirementProgress(tier);
            const hasBranching = evolutionChain.branchingPoints.some(bp => bp.atTier === tier.tier);
            
            return (
              <div key={tier.skillId} className="flex items-center space-x-3">
                {/* Tier Node */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                          ${getTierStatusColor(status)}
                          ${selectedTier?.skillId === tier.skillId ? 'ring-2 ring-blue-400' : ''}
                          ${hasBranching ? 'border-dashed' : ''}
                        `}
                        onClick={() => setSelectedTier(tier)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50">
                            {getTierIcon(status)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{tier.name}</div>
                            <div className="text-xs opacity-75">Tier {tier.tier}</div>
                            {status === 'locked' && progress < 100 && (
                              <div className="mt-1">
                                <Progress value={progress} className="h-1" />
                              </div>
                            )}
                          </div>
                          {hasBranching && (
                            <GitBranch className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="space-y-2">
                        <div className="font-medium">{tier.name}</div>
                        <div className="text-sm text-muted-foreground">{tier.description}</div>
                        <div className="space-y-1">
                          {tier.effects.slice(0, 3).map((effect, idx) => (
                            <div key={idx} className="text-xs text-green-600">
                              • {effect.description}
                            </div>
                          ))}
                        </div>
                        {tier.requirements.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Requirements: {tier.requirements.filter(req => req.isMet).length}/{tier.requirements.length} met
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Connection Arrow */}
                {index < linearTiers.length - 1 && (
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                )}

                {/* Branching Indicator */}
                {hasBranching && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBranch(tier.tier.toString());
                      setShowBranchDetails(true);
                    }}
                    className="ml-2"
                  >
                    <GitBranch className="w-4 h-4 mr-1" />
                    View Branches
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBranchingOptions = () => {
    if (!selectedBranch || !showBranchDetails) return null;

    const branchingPoint = evolutionChain.branchingPoints.find(
      bp => bp.atTier.toString() === selectedBranch
    );

    if (!branchingPoint) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-500" />
            Branching Options (Tier {branchingPoint.atTier})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBranchDetails(false)}
          >
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[branchingPoint].map((branch) => (
            <Card key={branch.branchId} className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{branch.branchName}</CardTitle>
                <CardDescription className="text-sm">
                  {branch.description}
                </CardDescription>
                <Badge variant="outline" className="w-fit capitalize">
                  {branch.branchTheme.replace('_', ' ')}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Requirements:</div>
                  {branch.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      {req.isMet ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      )}
                      {req.description}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Evolution Path:</div>
                  <div className="space-y-1">
                    {branch.evolutionPath.slice(0, 3).map((pathTier, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        {idx + 1}. {pathTier.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs italic text-muted-foreground">
                  {branch.narrativeJustification}
                </div>

                {/* Decision Point Actions */}
                {activeDecisionPoints.some(dp => 
                  dp.availableBranches.some(ab => ab.branchId === branch.branchId)
                ) && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const decisionPoint = activeDecisionPoints.find(dp =>
                        dp.availableBranches.some(ab => ab.branchId === branch.branchId)
                      );
                      if (decisionPoint && onEvolutionChoice) {
                        onEvolutionChoice(decisionPoint.id, branch.branchId);
                      }
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Choose This Path
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderSelectedTierDetails = () => {
    if (!selectedTier) return null;

    const status = getTierStatus(selectedTier);
    const progress = getRequirementProgress(selectedTier);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{selectedTier.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Tier {selectedTier.tier}</Badge>
              <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>{selectedTier.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Effects */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Effects:
            </h4>
            <ul className="space-y-1">
              {selectedTier.effects.map((effect, index) => (
                <li key={index} className="text-sm text-green-600">
                  • {effect.description}
                </li>
              ))}
            </ul>
          </div>

          {/* Mechanical Improvements */}
          {selectedTier.mechanicalImprovements.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Improvements:
              </h4>
              <ul className="space-y-1">
                {selectedTier.mechanicalImprovements.map((improvement, index) => (
                  <li key={index} className="text-sm text-blue-600">
                    • {improvement.description} ({improvement.comparedToPrevious})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {selectedTier.requirements.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <Target className="w-4 h-4" />
                Requirements:
              </h4>
              <div className="space-y-2">
                {selectedTier.requirements.map((req, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{req.description}</span>
                      <span className={req.isMet ? 'text-green-600' : 'text-muted-foreground'}>
                        {req.currentValue}/{req.requiredValue}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((req.currentValue / req.requiredValue) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narrative Significance */}
          <div>
            <h4 className="font-medium mb-2">Narrative Significance:</h4>
            <p className="text-sm text-muted-foreground italic">
              {selectedTier.narrativeSignificance}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {status === 'ready' && (
              <Button size="sm" className="flex-1">
                <Sparkles className="w-4 h-4 mr-1" />
                Evolve Now
              </Button>
            )}
            {onPreviewEvolution && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onPreviewEvolution(selectedTier)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{evolutionChain.chainName}</h2>
          <p className="text-muted-foreground">{evolutionChain.description}</p>
        </div>
        {evolutionProgress && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Current Progress</div>
            <div className="text-lg font-bold">Tier {evolutionProgress.tier}</div>
            {evolutionProgress.nextEvolution && (
              <div className="text-sm text-blue-600">
                Next: {evolutionProgress.nextEvolution}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Evolution Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {renderLinearProgression()}
          {renderBranchingOptions()}
        </div>
        
        <div className="space-y-6">
          {renderSelectedTierDetails()}
          
          {/* Active Decision Points */}
          {activeDecisionPoints.length > 0 && (
            <Card className="border-yellow-400 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Evolution Decision Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Your skill is ready to evolve! Choose a specialization path to continue development.
                </p>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const firstDecision = activeDecisionPoints[0];
                    if (firstDecision.availableBranches.length > 0) {
                      setSelectedBranch(firstDecision.currentTier.toString());
                      setShowBranchDetails(true);
                    }
                  }}
                >
                  <GitBranch className="w-4 h-4 mr-1" />
                  View Evolution Options
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
