"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles, 
  Brain, 
  Zap, 
  Target, 
  BookOpen,
  Lightbulb,
  TrendingUp,
  Shuffle,
  CheckCircle,
  AlertCircle,
  Clock,
  Star
} from 'lucide-react';
import type { 
  CharacterProfile, 
  StructuredStoryState,
  AIGeneratedSkillTree,
  AIProgressionRecommendation,
  SkillFusionOpportunity
} from '@/types/story';
import { generateDynamicSkillTree, generateProgressionRecommendations } from '@/lib/scenario-api';
import { identifySkillFusionOpportunities } from '@/lib/ai-progression-engine';

interface AISkillGeneratorProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  seriesName: string;
  onCharacterUpdate: (character: CharacterProfile) => void;
  onSkillTreeGenerated: (skillTree: AIGeneratedSkillTree) => void;
}

export default function AISkillGenerator({ 
  character, 
  storyState, 
  seriesName, 
  onCharacterUpdate,
  onSkillTreeGenerated 
}: AISkillGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSkillTree, setGeneratedSkillTree] = useState<AIGeneratedSkillTree | null>(null);
  const [recommendations, setRecommendations] = useState<AIProgressionRecommendation[]>([]);
  const [fusionOpportunities, setFusionOpportunities] = useState<SkillFusionOpportunity[]>([]);
  const [activeTab, setActiveTab] = useState('generator');

  const handleGenerateSkillTree = async () => {
    setIsGenerating(true);
    try {
      const result = await generateDynamicSkillTree(character, storyState, seriesName, true);
      
      // Convert the result to our expected format
      const aiSkillTree: AIGeneratedSkillTree = {
        ...result.skillTree,
        generationContext: {
          characterProfile: character,
          recentStoryEvents: storyState.narrativeThreads.slice(-5).map(thread => thread.description),
          currentStoryArc: storyState.storyArcs.find(arc => arc.id === storyState.currentStoryArcId),
          usedSkills: character.skillsAndAbilities?.map(skill => skill.name) || [],
          characterChoices: [], // Would be passed from parent
          environmentalContext: storyState.environmentalContext,
          relationshipContext: storyState.npcRelationships,
          seriesName
        },
        adaptationHistory: [],
        narrativeIntegration: result.skillTree.narrativeIntegration,
        dynamicNodes: result.skillTree.nodes.map(node => ({
          ...node,
          icon: 'star',
          position: { x: 1, y: 1 },
          isUnlocked: true,
          isPurchased: false,
          category: result.skillTree.category as any,
          evolutionTriggers: [],
          fusionCompatibility: node.fusionCompatibility || [],
          narrativeRequirements: [],
          adaptiveEffects: node.effects.map(effect => ({
            ...effect,
            contextModifiers: [],
            scalingFactors: []
          })),
          usageHistory: []
        }))
      };

      setGeneratedSkillTree(aiSkillTree);
      onSkillTreeGenerated(aiSkillTree);
    } catch (error) {
      console.error('Failed to generate skill tree:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const availableOptions = ['combat_mastery', 'magic_affinity', 'social_skills', 'utility_skills'];
      const result = await generateProgressionRecommendations(
        character, 
        storyState, 
        availableOptions, 
        seriesName, 
        true
      );
      
      const aiRecommendations: AIProgressionRecommendation[] = result.recommendations.map(rec => ({
        id: `rec_${Date.now()}_${Math.random()}`,
        type: rec.type as any,
        priority: rec.priority,
        reasoning: rec.reasoning,
        narrativeJustification: rec.narrativeJustification,
        expectedOutcome: rec.expectedOutcome,
        confidence: rec.confidence,
        prerequisites: [],
        alternatives: rec.alternatives
      }));

      setRecommendations(aiRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleIdentifyFusions = () => {
    const opportunities = identifySkillFusionOpportunities(character, storyState);
    setFusionOpportunities(opportunities);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'skill_purchase': return <BookOpen className="w-4 h-4" />;
      case 'attribute_allocation': return <TrendingUp className="w-4 h-4" />;
      case 'specialization_choice': return <Target className="w-4 h-4" />;
      case 'skill_fusion': return <Shuffle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'text-red-500';
    if (priority >= 60) return 'text-orange-500';
    if (priority >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            AI Progression Assistant
          </h2>
          <p className="text-muted-foreground">
            Intelligent progression recommendations based on your story journey
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Sparkles className="w-4 h-4 mr-1" />
          AI-Powered
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Skill Generator
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="fusion" className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            Skill Fusion
          </TabsTrigger>
        </TabsList>

        {/* Skill Generator Tab */}
        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Dynamic Skill Tree Generation
              </CardTitle>
              <CardDescription>
                Generate custom skill trees that adapt to your character's story progression and experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Story Context</div>
                  <div className="text-xs text-muted-foreground">
                    Recent events: {storyState.narrativeThreads.slice(-3).length} threads
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Relationships: {storyState.npcRelationships.length} tracked
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Character Analysis</div>
                  <div className="text-xs text-muted-foreground">
                    Current skills: {character.skillsAndAbilities?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Level: {character.level}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleGenerateSkillTree}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Generating AI Skill Tree...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Dynamic Skill Tree
                  </>
                )}
              </Button>

              {generatedSkillTree && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">{generatedSkillTree.name}</CardTitle>
                    <CardDescription>{generatedSkillTree.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-500">
                            {generatedSkillTree.narrativeIntegration.storyRelevance}%
                          </div>
                          <div className="text-xs text-muted-foreground">Story Relevance</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-500">
                            {generatedSkillTree.narrativeIntegration.characterAlignment}%
                          </div>
                          <div className="text-xs text-muted-foreground">Character Fit</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-500">
                            {generatedSkillTree.narrativeIntegration.progressionCoherence}%
                          </div>
                          <div className="text-xs text-muted-foreground">Coherence</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Generated Skills ({generatedSkillTree.dynamicNodes.length})</div>
                        <div className="grid grid-cols-1 gap-2">
                          {generatedSkillTree.dynamicNodes.slice(0, 3).map((node, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div>
                                <div className="font-medium text-sm">{node.name}</div>
                                <div className="text-xs text-muted-foreground">{node.description}</div>
                              </div>
                              <Badge variant="outline">Tier {node.tier}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Future Narrative Potential</div>
                        <div className="space-y-1">
                          {generatedSkillTree.narrativeIntegration.futureNarrativePotential.slice(0, 2).map((potential, index) => (
                            <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {potential}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                AI Progression Recommendations
              </CardTitle>
              <CardDescription>
                Intelligent suggestions for character development based on story context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGenerateRecommendations}
                disabled={isGenerating}
                className="w-full mb-4"
              >
                {isGenerating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Progression...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Recommendations
                  </>
                )}
              </Button>

              {recommendations.length > 0 && (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getRecommendationIcon(rec.type)}
                            <span className="font-medium capitalize">{rec.type.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                              Priority: {rec.priority}
                            </Badge>
                            <Badge variant="secondary">
                              {rec.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm">{rec.reasoning}</div>
                          <div className="text-xs text-muted-foreground italic">
                            "{rec.narrativeJustification}"
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Expected outcome:</span> {rec.expectedOutcome}
                          </div>
                        </div>

                        {rec.alternatives.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium mb-1">Alternatives:</div>
                            {rec.alternatives.slice(0, 2).map((alt, altIndex) => (
                              <div key={altIndex} className="text-xs text-muted-foreground">
                                • {alt.description} (Suitability: {alt.suitability}%)
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skill Fusion Tab */}
        <TabsContent value="fusion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-orange-500" />
                Skill Fusion Opportunities
              </CardTitle>
              <CardDescription>
                Discover unique skill combinations based on your character's abilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleIdentifyFusions}
                className="w-full mb-4"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Identify Fusion Opportunities
              </Button>

              {fusionOpportunities.length > 0 ? (
                <div className="space-y-4">
                  {fusionOpportunities.map((fusion, index) => (
                    <Card key={index} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{fusion.resultingSkill.name}</div>
                          <Badge variant="outline" className="capitalize">
                            {fusion.rarity}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Source Skills:</span> {fusion.sourceSkills.join(' + ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {fusion.narrativeContext}
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Discovery:</span> {fusion.discoveryMethod.replace('_', ' ')}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs font-medium mb-1">Requirements:</div>
                          {fusion.fusionRequirements.map((req, reqIndex) => (
                            <div key={reqIndex} className="flex items-center gap-1 text-xs">
                              {req.isMet ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              )}
                              {req.description}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shuffle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No fusion opportunities identified yet.</p>
                  <p className="text-xs">Develop more skills to unlock fusion possibilities.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
