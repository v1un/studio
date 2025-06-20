"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TreePine,
  Sparkles,
  Brain,
  Zap,
  GitBranch,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw
} from 'lucide-react';
import type { 
  CharacterProfile,
  StructuredStoryState,
  DynamicSkillNode,
  SkillEvolutionChain,
  EvolutionDecisionPoint,
  SkillUsageTracker
} from '@/types/story';
import SkillEvolutionTree from './skill-evolution-tree';
import { generateSkillEvolutionChain } from '@/lib/scenario-api';
import { 
  generateSkillEvolutionChain as generateLocalChain,
  globalEvolutionTracker,
  SkillEvolutionTracker
} from '@/lib/ai-skill-evolution-engine';

interface SkillEvolutionManagerProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  seriesName: string;
  onCharacterUpdate: (character: CharacterProfile) => void;
}

export default function SkillEvolutionManager({
  character,
  storyState,
  seriesName,
  onCharacterUpdate
}: SkillEvolutionManagerProps) {
  const [evolutionChains, setEvolutionChains] = useState<SkillEvolutionChain[]>([]);
  const [activeDecisionPoints, setActiveDecisionPoints] = useState<EvolutionDecisionPoint[]>([]);
  const [selectedChain, setSelectedChain] = useState<SkillEvolutionChain | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [usageTrackers, setUsageTrackers] = useState<Map<string, SkillUsageTracker>>(new Map());

  useEffect(() => {
    // Initialize evolution chains for existing skills
    initializeEvolutionChains();
    
    // Load active decision points
    setActiveDecisionPoints(globalEvolutionTracker.getActiveDecisionPoints());
  }, [character.skillsAndAbilities]);

  const initializeEvolutionChains = async () => {
    if (!character.skillsAndAbilities) return;

    const chains: SkillEvolutionChain[] = [];
    
    for (const skill of character.skillsAndAbilities) {
      // Convert skill to DynamicSkillNode format
      const dynamicSkill: DynamicSkillNode = {
        id: skill.id || `skill_${skill.name.replace(/\s+/g, '_').toLowerCase()}`,
        name: skill.name,
        description: skill.description,
        icon: 'star',
        tier: 1,
        cost: 1,
        prerequisites: [],
        effects: skill.effects || [],
        position: { x: 1, y: 1 },
        isUnlocked: true,
        isPurchased: true,
        category: skill.category || 'utility',
        evolutionTriggers: [],
        fusionCompatibility: [],
        narrativeRequirements: [],
        adaptiveEffects: [],
        usageHistory: []
      };

      // Generate evolution chain
      const chain = generateLocalChain(
        dynamicSkill,
        character,
        storyState,
        seriesName,
        {
          evolutionDepth: 5,
          branchingOptions: 3,
          focusThemes: ['combat_focused', 'elemental_infusion', 'defensive_mastery']
        }
      );

      chains.push(chain);
      globalEvolutionTracker.addEvolutionChain(chain);
    }

    setEvolutionChains(chains);
    if (chains.length > 0 && !selectedChain) {
      setSelectedChain(chains[0]);
    }
  };

  const handleGenerateAIEvolutionChain = async (skill: DynamicSkillNode) => {
    setIsGenerating(true);
    try {
      const aiResponse = await generateSkillEvolutionChain(
        skill,
        character,
        storyState,
        seriesName,
        {
          maxTiers: 5,
          branchingPoints: 2,
          focusThemes: ['combat_focused', 'elemental_infusion', 'defensive_mastery'],
          usePremiumAI: true
        }
      );

      const newChain = aiResponse.evolutionChain;
      setEvolutionChains(prev => [...prev, newChain]);
      globalEvolutionTracker.addEvolutionChain(newChain);
      setSelectedChain(newChain);

    } catch (error) {
      console.error('Failed to generate AI evolution chain:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkillUsage = (skillId: string, context: string, effectiveness: number) => {
    globalEvolutionTracker.recordSkillUsage(
      skillId,
      context as any,
      effectiveness,
      75, // Default story impact
      `Used ${skillId} in ${context}`
    );

    // Check for new evolution opportunities
    const newDecisionPoints = globalEvolutionTracker.checkEvolutionOpportunities(skillId);
    setActiveDecisionPoints(prev => [...prev, ...newDecisionPoints]);
  };

  const handleEvolutionChoice = (decisionPointId: string, branchId: string) => {
    globalEvolutionTracker.resolveDecisionPoint(decisionPointId, branchId);
    
    // Update active decision points
    setActiveDecisionPoints(prev => prev.filter(dp => dp.id !== decisionPointId));
    
    // Refresh evolution chains to show updated state
    setEvolutionChains(prev => [...prev]);
  };

  const getEvolutionProgress = (chainId: string) => {
    const chain = evolutionChains.find(c => c.id === chainId);
    if (!chain) return null;

    return globalEvolutionTracker.getEvolutionProgress(chain.baseSkillId);
  };

  const getSkillsWithoutEvolution = () => {
    if (!character.skillsAndAbilities) return [];
    
    return character.skillsAndAbilities.filter(skill => 
      !evolutionChains.some(chain => 
        chain.baseSkillId === skill.id || 
        chain.baseSkillId === `skill_${skill.name.replace(/\s+/g, '_').toLowerCase()}`
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TreePine className="w-6 h-6 text-green-500" />
            Skill Evolution System
          </h2>
          <p className="text-muted-foreground">
            Dynamic skill progression with AI-generated branching evolution paths
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            <Sparkles className="w-4 h-4 mr-1" />
            AI-Powered
          </Badge>
          {activeDecisionPoints.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {activeDecisionPoints.length} Decision{activeDecisionPoints.length !== 1 ? 's' : ''} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{evolutionChains.length}</div>
            <div className="text-sm text-muted-foreground">Evolution Chains</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {evolutionChains.reduce((sum, chain) => 
                sum + chain.evolutionTiers.filter(tier => tier.isActive).length, 0
              )}
            </div>
            <div className="text-sm text-muted-foreground">Active Evolutions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {evolutionChains.reduce((sum, chain) => sum + chain.branchingPoints.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Branching Points</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{activeDecisionPoints.length}</div>
            <div className="text-sm text-muted-foreground">Pending Decisions</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="evolution-trees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evolution-trees" className="flex items-center gap-2">
            <TreePine className="w-4 h-4" />
            Evolution Trees
          </TabsTrigger>
          <TabsTrigger value="decision-points" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Decision Points
          </TabsTrigger>
          <TabsTrigger value="skill-management" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Skill Management
          </TabsTrigger>
        </TabsList>

        {/* Evolution Trees Tab */}
        <TabsContent value="evolution-trees" className="space-y-6">
          {evolutionChains.length > 0 ? (
            <div className="space-y-6">
              {/* Chain Selector */}
              <div className="flex flex-wrap gap-2">
                {evolutionChains.map((chain) => (
                  <Button
                    key={chain.id}
                    variant={selectedChain?.id === chain.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChain(chain)}
                    className="flex items-center gap-2"
                  >
                    <TreePine className="w-4 h-4" />
                    {chain.chainName}
                    {getEvolutionProgress(chain.id) && (
                      <Badge variant="secondary" className="ml-1">
                        T{getEvolutionProgress(chain.id)?.tier}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* Selected Evolution Tree */}
              {selectedChain && (
                <SkillEvolutionTree
                  evolutionChain={selectedChain}
                  character={character}
                  evolutionProgress={getEvolutionProgress(selectedChain.id)}
                  activeDecisionPoints={activeDecisionPoints.filter(dp => 
                    dp.skillId === selectedChain.baseSkillId
                  )}
                  onEvolutionChoice={handleEvolutionChoice}
                  onPreviewEvolution={(tier) => {
                    console.log('Preview evolution:', tier);
                  }}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TreePine className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Evolution Chains</h3>
                <p className="text-muted-foreground mb-4">
                  Create evolution chains for your skills to unlock progressive development paths.
                </p>
                <Button onClick={initializeEvolutionChains}>
                  <Plus className="w-4 h-4 mr-2" />
                  Initialize Evolution Chains
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Decision Points Tab */}
        <TabsContent value="decision-points" className="space-y-6">
          {activeDecisionPoints.length > 0 ? (
            <div className="space-y-4">
              {activeDecisionPoints.map((decisionPoint) => (
                <Card key={decisionPoint.id} className="border-yellow-400 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Evolution Decision Required
                    </CardTitle>
                    <CardDescription>
                      {decisionPoint.decisionContext.triggerEvent}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Available Branches:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {decisionPoint.availableBranches.map((branch) => (
                          <Card key={branch.branchId} className="cursor-pointer hover:bg-muted/50">
                            <CardContent className="p-4">
                              <div className="font-medium">{branch.branchName}</div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {branch.description}
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {branch.branchTheme.replace('_', ' ')}
                              </Badge>
                              <Button
                                size="sm"
                                className="w-full mt-3"
                                onClick={() => handleEvolutionChoice(decisionPoint.id, branch.branchId)}
                              >
                                Choose This Path
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <GitBranch className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Decisions</h3>
                <p className="text-muted-foreground">
                  Evolution decisions will appear here when your skills are ready to branch into specialized paths.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Skill Management Tab */}
        <TabsContent value="skill-management" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills with Evolution Chains */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-green-500" />
                  Skills with Evolution Chains
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionChains.length > 0 ? (
                  <div className="space-y-3">
                    {evolutionChains.map((chain) => {
                      const progress = getEvolutionProgress(chain.id);
                      return (
                        <div key={chain.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div>
                            <div className="font-medium">{chain.chainName}</div>
                            <div className="text-sm text-muted-foreground">
                              {progress ? `Tier ${progress.tier} - ${progress.progress.toFixed(0)}% to next` : 'Not started'}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedChain(chain);
                              // Switch to evolution trees tab
                            }}
                          >
                            View Tree
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No evolution chains created yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills without Evolution Chains */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  Skills Available for Evolution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getSkillsWithoutEvolution().length > 0 ? (
                  <div className="space-y-3">
                    {getSkillsWithoutEvolution().map((skill) => (
                      <div key={skill.id || skill.name} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <div className="font-medium">{skill.name}</div>
                          <div className="text-sm text-muted-foreground">{skill.description}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isGenerating}
                          onClick={() => {
                            const dynamicSkill: DynamicSkillNode = {
                              id: skill.id || `skill_${skill.name.replace(/\s+/g, '_').toLowerCase()}`,
                              name: skill.name,
                              description: skill.description,
                              icon: 'star',
                              tier: 1,
                              cost: 1,
                              prerequisites: [],
                              effects: skill.effects || [],
                              position: { x: 1, y: 1 },
                              isUnlocked: true,
                              isPurchased: true,
                              category: skill.category || 'utility',
                              evolutionTriggers: [],
                              fusionCompatibility: [],
                              narrativeRequirements: [],
                              adaptiveEffects: [],
                              usageHistory: []
                            };
                            handleGenerateAIEvolutionChain(dynamicSkill);
                          }}
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 mr-1" />
                              Create Evolution
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    All skills have evolution chains
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Usage Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Skill Usage Tracking
              </CardTitle>
              <CardDescription>
                Track skill usage to trigger automatic evolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Skills evolve automatically based on usage patterns, story milestones, and character development.
                Use your skills in various contexts to unlock new evolution opportunities.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
