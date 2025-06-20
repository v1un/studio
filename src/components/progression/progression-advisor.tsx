"use client";

import React, { useState, useEffect } from 'react';
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
  Brain, 
  TrendingUp, 
  Target, 
  BookOpen,
  User,
  Zap,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import type { 
  CharacterProfile, 
  StructuredStoryState,
  AIProgressionRecommendation,
  AIAttributeAllocationSuggestion,
  AIBackstoryIntegration,
  DynamicCharacterTrait
} from '@/types/story';
import {
  generateProgressionRecommendations,
  generateBackstoryIntegration
} from '@/lib/scenario-api';
import { 
  analyzeSkillEvolutionOpportunities,
  generateProgressionRecommendations as generateLocalRecommendations
} from '@/lib/ai-progression-engine';

interface ProgressionAdvisorProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  seriesName: string;
  onCharacterUpdate: (character: CharacterProfile) => void;
}

export default function ProgressionAdvisor({ 
  character, 
  storyState, 
  seriesName, 
  onCharacterUpdate 
}: ProgressionAdvisorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<AIProgressionRecommendation[]>([]);
  const [attributeSuggestions, setAttributeSuggestions] = useState<AIAttributeAllocationSuggestion[]>([]);
  const [backstoryIntegration, setBackstoryIntegration] = useState<AIBackstoryIntegration | null>(null);
  const [characterTraits, setCharacterTraits] = useState<DynamicCharacterTrait[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Initialize with local analysis
    performLocalAnalysis();
  }, [character, storyState]);

  const performLocalAnalysis = () => {
    // Generate local recommendations without AI calls
    const availableOptions = ['combat_skills', 'magic_abilities', 'social_skills', 'utility_skills'];
    const localRecs = generateLocalRecommendations(character, storyState, availableOptions);
    setRecommendations(localRecs);

    // Generate attribute suggestions based on character analysis
    const attrSuggestions = generateAttributeSuggestions();
    setAttributeSuggestions(attrSuggestions);

    // Generate character traits based on current state
    const traits = generateCharacterTraits();
    setCharacterTraits(traits);
  };

  const performAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Generate AI-powered recommendations
      const availableOptions = ['combat_mastery', 'magic_affinity', 'social_skills', 'utility_skills'];
      const aiRecs = await generateProgressionRecommendations(
        character, 
        storyState, 
        availableOptions, 
        seriesName, 
        true
      );
      
      const formattedRecs: AIProgressionRecommendation[] = aiRecs.recommendations.map(rec => ({
        id: `ai_rec_${Date.now()}_${Math.random()}`,
        type: rec.type as any,
        priority: rec.priority,
        reasoning: rec.reasoning,
        narrativeJustification: rec.narrativeJustification,
        expectedOutcome: rec.expectedOutcome,
        confidence: rec.confidence,
        prerequisites: [],
        alternatives: rec.alternatives
      }));

      setRecommendations(formattedRecs);

      // Generate backstory integration
      const backstory = await generateBackstoryIntegration(
        character,
        `Level ${character.level} ${character.class} in ${seriesName}`,
        seriesName,
        true
      );

      // Convert to our expected format
      const backstoryIntegration: AIBackstoryIntegration = {
        id: `backstory_${Date.now()}`,
        backstoryElement: 'AI-generated character background',
        progressionImpact: [],
        narrativeHooks: backstory.backstoryIntegration.narrativeHooks,
        characterTraits: [],
        availableSkillTrees: [],
        restrictedSkillTrees: [],
        specialAbilities: backstory.backstoryIntegration.specialAbilities.map(ability => ability.ability)
      };

      setBackstoryIntegration(backstoryIntegration);

    } catch (error) {
      console.error('Failed to perform AI analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAttributeSuggestions = (): AIAttributeAllocationSuggestion[] => {
    const suggestions: AIAttributeAllocationSuggestion[] = [];
    const availablePoints = character.progressionPoints?.attribute || 0;

    if (availablePoints > 0) {
      // Analyze character class and current stats to suggest improvements
      const classLower = character.class.toLowerCase();
      
      if (classLower.includes('warrior') || classLower.includes('fighter')) {
        suggestions.push({
          attributeName: 'strength',
          suggestedPoints: Math.min(availablePoints, 3),
          reasoning: 'Strength enhances combat effectiveness for warrior-type characters',
          storyAlignment: 85,
          characterFit: 90,
          futureUtility: 80
        });
      }

      if (classLower.includes('mage') || classLower.includes('wizard')) {
        suggestions.push({
          attributeName: 'intelligence',
          suggestedPoints: Math.min(availablePoints, 3),
          reasoning: 'Intelligence improves magical abilities and mana capacity',
          storyAlignment: 90,
          characterFit: 95,
          futureUtility: 85
        });
      }

      // Always suggest constitution for survivability
      suggestions.push({
        attributeName: 'constitution',
        suggestedPoints: Math.min(availablePoints, 2),
        reasoning: 'Constitution improves health and survivability in dangerous situations',
        storyAlignment: 75,
        characterFit: 80,
        futureUtility: 90
      });
    }

    return suggestions;
  };

  const generateCharacterTraits = (): DynamicCharacterTrait[] => {
    const traits: DynamicCharacterTrait[] = [];

    // Generate traits based on character level and experiences
    if (character.level >= 5) {
      traits.push({
        id: 'experienced_adventurer',
        name: 'Experienced Adventurer',
        description: 'Has gained wisdom through various challenges and encounters',
        category: 'personality',
        strength: Math.min(character.level * 10, 100),
        development: {
          baseValue: 30,
          currentValue: Math.min(character.level * 10, 100),
          developmentHistory: [],
          influencingFactors: ['Combat experience', 'Quest completion'],
          developmentTrend: 'increasing'
        },
        skillInfluence: [
          {
            skillCategory: 'combat',
            influenceType: 'effectiveness',
            modifier: 1.1,
            description: 'Experience improves combat effectiveness'
          }
        ],
        storyImpact: [
          {
            storyContext: 'dangerous_situations',
            impactType: 'dialogue_option',
            description: 'Can draw on past experiences in dialogue'
          }
        ],
        evolutionPotential: []
      });
    }

    // Add relationship-based traits
    const positiveRelationships = storyState.npcRelationships.filter(rel => rel.relationshipScore > 50);
    if (positiveRelationships.length >= 3) {
      traits.push({
        id: 'charismatic_leader',
        name: 'Charismatic Leader',
        description: 'Has developed strong relationships and leadership qualities',
        category: 'social',
        strength: Math.min(positiveRelationships.length * 15, 100),
        development: {
          baseValue: 20,
          currentValue: Math.min(positiveRelationships.length * 15, 100),
          developmentHistory: [],
          influencingFactors: ['Positive relationships', 'Social interactions'],
          developmentTrend: 'increasing'
        },
        skillInfluence: [
          {
            skillCategory: 'social',
            influenceType: 'effectiveness',
            modifier: 1.2,
            description: 'Natural charisma enhances social skills'
          }
        ],
        storyImpact: [
          {
            storyContext: 'group_situations',
            impactType: 'action_availability',
            description: 'Can take leadership actions in group scenarios'
          }
        ],
        evolutionPotential: []
      });
    }

    return traits;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'text-red-500';
    if (priority >= 60) return 'text-orange-500';
    if (priority >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getAttributeIcon = (attribute: string) => {
    switch (attribute) {
      case 'strength': return <Zap className="w-4 h-4 text-red-500" />;
      case 'dexterity': return <Target className="w-4 h-4 text-blue-500" />;
      case 'constitution': return <Star className="w-4 h-4 text-green-500" />;
      case 'intelligence': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'wisdom': return <BookOpen className="w-4 h-4 text-yellow-500" />;
      case 'charisma': return <User className="w-4 h-4 text-pink-500" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-500" />
            Progression Advisor
          </h2>
          <p className="text-muted-foreground">
            AI-powered guidance for character development and growth
          </p>
        </div>
        <Button 
          onClick={performAIAnalysis}
          disabled={isAnalyzing}
          variant="outline"
        >
          {isAnalyzing ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Deep AI Analysis
            </>
          )}
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="traits">Traits</TabsTrigger>
          <TabsTrigger value="backstory">Backstory</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Character Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{character.level}</div>
                    <div className="text-xs text-muted-foreground">Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {character.skillsAndAbilities?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Skills</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Story Progress</span>
                    <span>{Math.min(character.level * 10, 100)}%</span>
                  </div>
                  <Progress value={Math.min(character.level * 10, 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Available Points</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Attribute: {character.progressionPoints?.attribute || 0}</div>
                    <div>Skill: {character.progressionPoints?.skill || 0}</div>
                    <div>Specialization: {character.progressionPoints?.specialization || 0}</div>
                    <div>Talent: {character.progressionPoints?.talent || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Top Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                        <div className={`text-lg font-bold ${getPriorityColor(rec.priority)}`}>
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm capitalize">
                            {rec.type.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rec.reasoning}
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {rec.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recommendations available</p>
                    <p className="text-xs">Perform AI analysis for detailed suggestions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Attribute Allocation Suggestions
              </CardTitle>
              <CardDescription>
                AI-recommended attribute improvements based on your character build and story direction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attributeSuggestions.length > 0 ? (
                <div className="space-y-4">
                  {attributeSuggestions.map((suggestion, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getAttributeIcon(suggestion.attributeName)}
                            <span className="font-medium capitalize">{suggestion.attributeName}</span>
                          </div>
                          <Badge variant="outline">
                            +{suggestion.suggestedPoints} points
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm">{suggestion.reasoning}</div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-blue-500">
                                {suggestion.storyAlignment}%
                              </div>
                              <div className="text-xs text-muted-foreground">Story Fit</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-500">
                                {suggestion.characterFit}%
                              </div>
                              <div className="text-xs text-muted-foreground">Character Fit</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-500">
                                {suggestion.futureUtility}%
                              </div>
                              <div className="text-xs text-muted-foreground">Future Value</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No attribute suggestions available</p>
                  <p className="text-xs">You may not have available attribute points to allocate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traits Tab */}
        <TabsContent value="traits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                Dynamic Character Traits
              </CardTitle>
              <CardDescription>
                Personality traits that develop based on your character's journey and choices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {characterTraits.length > 0 ? (
                <div className="space-y-4">
                  {characterTraits.map((trait, index) => (
                    <Card key={index} className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{trait.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {trait.category} trait
                            </div>
                          </div>
                          <Badge variant="outline">
                            {trait.strength}% strength
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm">{trait.description}</div>
                          
                          <div className="space-y-1">
                            <div className="text-xs font-medium">Development Trend:</div>
                            <div className="flex items-center gap-1 text-xs">
                              {trait.development.developmentTrend === 'increasing' ? (
                                <TrendingUp className="w-3 h-3 text-green-500" />
                              ) : (
                                <TrendingUp className="w-3 h-3 text-gray-500 transform rotate-180" />
                              )}
                              <span className="capitalize">{trait.development.developmentTrend}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs font-medium">Influences:</div>
                            {trait.development.influencingFactors.slice(0, 2).map((factor, factorIndex) => (
                              <div key={factorIndex} className="text-xs text-muted-foreground">
                                • {factor}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No character traits developed yet</p>
                  <p className="text-xs">Traits will develop as your character progresses through the story</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backstory Tab */}
        <TabsContent value="backstory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                AI-Generated Backstory Integration
              </CardTitle>
              <CardDescription>
                Character background elements that influence progression and story development
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backstoryIntegration ? (
                <div className="space-y-4">
                  <div>
                    <div className="font-medium mb-2">Narrative Hooks</div>
                    <div className="space-y-1">
                      {backstoryIntegration.narrativeHooks.map((hook, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {hook}
                        </div>
                      ))}
                    </div>
                  </div>

                  {backstoryIntegration.specialAbilities.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Special Abilities</div>
                      <div className="space-y-1">
                        {backstoryIntegration.specialAbilities.map((ability, index) => (
                          <Badge key={index} variant="secondary" className="mr-2">
                            {ability}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No backstory integration available</p>
                  <p className="text-xs">Perform AI analysis to generate character backstory elements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
