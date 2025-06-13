'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Heart, 
  Users, 
  Globe, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import type { 
  PlayerChoice, 
  ChoiceConsequenceTracking, 
  MoralProfile,
  StructuredStoryState 
} from '@/types/story';

interface ChoiceConsequenceTrackerProps {
  storyState: StructuredStoryState;
  onChoiceSelect?: (choiceId: string) => void;
}

export function ChoiceConsequenceTracker({ storyState, onChoiceSelect }: ChoiceConsequenceTrackerProps) {
  const [selectedTab, setSelectedTab] = useState('recent');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const playerChoices = storyState.playerChoices || [];
  const moralProfile = storyState.moralProfile;
  
  // Get recent choices (last 10)
  const recentChoices = playerChoices.slice(-10).reverse();
  
  // Get all consequences from all choices
  const allConsequences = playerChoices.flatMap(choice => choice.consequences || []);
  
  // Filter consequences by manifestation status
  const manifestedConsequences = allConsequences.filter(c => c.manifestedAt);
  const pendingConsequences = allConsequences.filter(c => !c.manifestedAt);
  
  // Filter by category
  const filteredConsequences = selectedCategory === 'all' 
    ? manifestedConsequences 
    : manifestedConsequences.filter(c => c.category === selectedCategory);

  const getConsequenceIcon = (category: string) => {
    switch (category) {
      case 'relationship': return <Heart className="h-4 w-4" />;
      case 'reputation': return <Users className="h-4 w-4" />;
      case 'world_state': return <Globe className="h-4 w-4" />;
      case 'character_development': return <TrendingUp className="h-4 w-4" />;
      case 'story_progression': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'trivial': return 'bg-gray-100 text-gray-800';
      case 'minor': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMoralAlignmentIcon = (alignment?: string) => {
    switch (alignment) {
      case 'good': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'evil': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'complex': return <Minus className="h-4 w-4 text-purple-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAwarenessIcon = (awareness: string) => {
    switch (awareness) {
      case 'fully_aware': return <Eye className="h-4 w-4 text-green-600" />;
      case 'partially_aware': return <Eye className="h-4 w-4 text-yellow-600" />;
      case 'suspected': return <EyeOff className="h-4 w-4 text-orange-600" />;
      case 'unaware': return <EyeOff className="h-4 w-4 text-red-600" />;
      default: return <EyeOff className="h-4 w-4 text-gray-600" />;
    }
  };

  const ChoiceCard = ({ choice }: { choice: PlayerChoice }) => {
    const consequences = choice.consequences || [];
    const manifestedCount = consequences.filter(c => c.manifestedAt).length;
    const pendingCount = consequences.length - manifestedCount;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{choice.choiceText}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Difficulty: {choice.difficultyLevel}/10
                </Badge>
                <div className="flex items-center gap-1">
                  {getMoralAlignmentIcon(choice.moralAlignment)}
                  <span className="text-xs text-gray-600">
                    {choice.moralAlignment || 'neutral'}
                  </span>
                </div>
                {choice.confidence && (
                  <Badge variant="secondary" className="text-xs">
                    Confidence: {choice.confidence}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {new Date(choice.timestamp).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(choice.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {choice.choiceDescription && (
            <CardDescription className="mb-3">
              {choice.choiceDescription}
            </CardDescription>
          )}

          {choice.context && (
            <div className="mb-3 p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium mb-2 block">Context:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Location:</span> {choice.context.location}
                </div>
                <div>
                  <span className="font-medium">Stress Level:</span> {choice.context.stressLevel}%
                </div>
                <div>
                  <span className="font-medium">Pressure:</span> {choice.context.pressureLevel}%
                </div>
                <div>
                  <span className="font-medium">Time of Day:</span> {choice.context.timeOfDay}
                </div>
              </div>
            </div>
          )}

          {consequences.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Consequences</span>
                <div className="flex gap-2 text-xs">
                  {manifestedCount > 0 && (
                    <Badge variant="default">{manifestedCount} Active</Badge>
                  )}
                  {pendingCount > 0 && (
                    <Badge variant="outline">{pendingCount} Pending</Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                {consequences.slice(0, 3).map((consequence, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-1 mt-0.5">
                      {getConsequenceIcon(consequence.category)}
                      {getAwarenessIcon(consequence.playerAwareness)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${getSeverityColor(consequence.severity)}`}>
                          {consequence.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {consequence.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {consequence.type}
                        </Badge>
                      </div>
                      <div>{consequence.description}</div>
                      {consequence.manifestedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Manifested: {new Date(consequence.manifestedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {consequences.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{consequences.length - 3} more consequences
                  </div>
                )}
              </div>
            </div>
          )}

          {choice.alternatives && choice.alternatives.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium mb-2 block">Alternative Options:</span>
              <div className="space-y-1">
                {choice.alternatives.slice(0, 2).map((alt, index) => (
                  <div key={alt.id} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                    {alt.wasAvailable ? '✓' : '✗'} {alt.text}
                    {!alt.wasAvailable && alt.reasonUnavailable && (
                      <div className="text-red-600 mt-1">
                        Unavailable: {alt.reasonUnavailable}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onChoiceSelect?.(choice.id)}
          >
            View Full Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  const ConsequenceCard = ({ consequence }: { consequence: ChoiceConsequenceTracking }) => {
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-1 mt-1">
              {getConsequenceIcon(consequence.category)}
              {getAwarenessIcon(consequence.playerAwareness)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-xs ${getSeverityColor(consequence.severity)}`}>
                  {consequence.severity}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {consequence.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {consequence.type}
                </Badge>
                {consequence.reversible && (
                  <Badge variant="secondary" className="text-xs">
                    Reversible
                  </Badge>
                )}
              </div>
              
              <div className="text-sm mb-2">{consequence.description}</div>
              
              {consequence.ongoingEffects.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium">Ongoing Effects:</span>
                  <ul className="text-xs text-gray-600 mt-1">
                    {consequence.ongoingEffects.map((effect, index) => (
                      <li key={index}>• {effect}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {consequence.futureImplications.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium">Future Implications:</span>
                  <ul className="text-xs text-gray-600 mt-1">
                    {consequence.futureImplications.map((implication, index) => (
                      <li key={index}>• {implication}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {consequence.manifestedAt && (
                <div className="text-xs text-gray-500">
                  Manifested: {new Date(consequence.manifestedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const MoralProfileCard = () => {
    if (!moralProfile) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Moral Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Overall Alignment:</span>
              <div className="text-lg font-bold capitalize">
                {moralProfile.overallAlignment.replace('_', ' ')}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium">Consistency Score:</span>
              <div className="flex items-center gap-2">
                <Progress value={moralProfile.consistencyScore} className="flex-1" />
                <span className="text-sm">{moralProfile.consistencyScore}%</span>
              </div>
            </div>
          </div>
          
          {moralProfile.moralTraits.length > 0 && (
            <div className="mt-4">
              <span className="text-sm font-medium mb-2 block">Dominant Traits:</span>
              <div className="flex flex-wrap gap-2">
                {moralProfile.moralTraits.slice(0, 5).map((trait, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {trait.trait} ({trait.strength}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'relationship', label: 'Relationships' },
    { value: 'reputation', label: 'Reputation' },
    { value: 'world_state', label: 'World State' },
    { value: 'character_development', label: 'Character' },
    { value: 'story_progression', label: 'Story' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Choice & Consequence Tracker</h2>
        <p className="text-gray-600">See how your decisions shape the world around you</p>
      </div>

      <MoralProfileCard />

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">Recent Choices</TabsTrigger>
          <TabsTrigger value="consequences">
            Active Consequences ({manifestedConsequences.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingConsequences.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-6">
          {recentChoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Recent Choices</h3>
                <p className="text-gray-600">Make some decisions to see them tracked here!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentChoices.map(choice => (
                <ChoiceCard key={choice.id} choice={choice} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="consequences" className="mt-6">
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {filteredConsequences.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Active Consequences</h3>
                <p className="text-gray-600">
                  {selectedCategory === 'all' 
                    ? 'Your choices haven\'t manifested consequences yet.'
                    : `No consequences in the ${selectedCategory} category.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredConsequences
                .sort((a, b) => {
                  // Sort by severity, then by recency
                  const severityOrder = { critical: 0, major: 1, moderate: 2, minor: 3, trivial: 4 };
                  const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                                     severityOrder[b.severity as keyof typeof severityOrder];
                  if (severityDiff !== 0) return severityDiff;
                  
                  return new Date(b.manifestedAt || 0).getTime() - new Date(a.manifestedAt || 0).getTime();
                })
                .map((consequence, index) => (
                  <ConsequenceCard key={`${consequence.consequenceId}-${index}`} consequence={consequence} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingConsequences.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Pending Consequences</h3>
                <p className="text-gray-600">All consequences from your choices have manifested.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingConsequences.map((consequence, index) => (
                <ConsequenceCard key={`pending-${consequence.consequenceId}-${index}`} consequence={consequence} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
