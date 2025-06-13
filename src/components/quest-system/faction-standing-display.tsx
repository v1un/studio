'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Crown, 
  Sword, 
  Coins, 
  BookOpen, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Star
} from 'lucide-react';
import type { 
  FactionStanding, 
  EnhancedFaction,
  StructuredStoryState 
} from '@/types/story';

interface FactionStandingDisplayProps {
  storyState: StructuredStoryState;
  onFactionSelect?: (factionId: string) => void;
}

export function FactionStandingDisplay({ storyState, onFactionSelect }: FactionStandingDisplayProps) {
  const [selectedTab, setSelectedTab] = useState('standings');
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);

  const factionStandings = storyState.factionStandings || [];
  const enhancedFactions = storyState.enhancedFactions || [];

  const getFactionTypeIcon = (type: string) => {
    switch (type) {
      case 'political': return <Crown className="h-4 w-4" />;
      case 'military': return <Sword className="h-4 w-4" />;
      case 'economic': return <Coins className="h-4 w-4" />;
      case 'academic': return <BookOpen className="h-4 w-4" />;
      case 'religious': return <Star className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStandingColor = (level: string) => {
    switch (level) {
      case 'revered': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'allied': return 'bg-green-100 text-green-800 border-green-200';
      case 'friendly': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'unfriendly': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hostile': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReputationProgress = (score: number): number => {
    // Convert -100 to +100 scale to 0-100 progress
    return ((score + 100) / 200) * 100;
  };

  const getInfluenceColor = (influence: number): string => {
    if (influence >= 80) return 'text-red-600';
    if (influence >= 60) return 'text-orange-600';
    if (influence >= 40) return 'text-yellow-600';
    if (influence >= 20) return 'text-blue-600';
    return 'text-gray-600';
  };

  const FactionStandingCard = ({ standing }: { standing: FactionStanding }) => {
    const enhancedFaction = enhancedFactions.find(f => f.id === standing.factionId);
    const recentHistory = standing.reputationHistory.slice(-3);

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {enhancedFaction && (
                <div className="p-2 bg-gray-100 rounded">
                  {getFactionTypeIcon(enhancedFaction.type)}
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{standing.factionName}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getStandingColor(standing.standingLevel)} border`}>
                    {standing.standingLevel.replace('_', ' ')}
                  </Badge>
                  {enhancedFaction && (
                    <Badge variant="outline" className="text-xs">
                      {enhancedFaction.type}
                    </Badge>
                  )}
                  {standing.knownBy && (
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Known
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {standing.reputationScore > 0 ? '+' : ''}{standing.reputationScore}
              </div>
              <div className="text-xs text-gray-500">Reputation</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Reputation Progress</span>
              <span className="text-sm text-gray-600">
                {Math.round(getReputationProgress(standing.reputationScore))}%
              </span>
            </div>
            <Progress 
              value={getReputationProgress(standing.reputationScore)} 
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Hostile (-100)</span>
              <span>Neutral (0)</span>
              <span>Revered (+100)</span>
            </div>
          </div>

          {enhancedFaction && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Faction Influence:</span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Political:</span>
                  <span className={getInfluenceColor(enhancedFaction.influence.political)}>
                    {enhancedFaction.influence.political}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Economic:</span>
                  <span className={getInfluenceColor(enhancedFaction.influence.economic)}>
                    {enhancedFaction.influence.economic}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Military:</span>
                  <span className={getInfluenceColor(enhancedFaction.influence.military)}>
                    {enhancedFaction.influence.military}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {standing.specialTitles.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Special Titles:</span>
              <div className="flex flex-wrap gap-2">
                {standing.specialTitles.map((title, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {standing.currentConsequences.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Active Effects:</span>
              <div className="space-y-1">
                {standing.currentConsequences.map((consequence, index) => (
                  <div key={index} className="text-sm p-2 bg-blue-50 rounded border border-blue-200">
                    {consequence}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentHistory.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Recent History:</span>
              <div className="space-y-2">
                {recentHistory.map((event, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm p-2 bg-gray-50 rounded">
                    <div className="mt-1">
                      {event.reputationChange > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : event.reputationChange < 0 ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : (
                        <Clock className="h-3 w-3 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div>{event.action}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {event.reputationChange > 0 ? '+' : ''}{event.reputationChange} reputation
                        • {new Date(event.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFactionSelect?.(standing.factionId)}
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFaction(
                selectedFaction === standing.factionId ? null : standing.factionId
              )}
            >
              {selectedFaction === standing.factionId ? 'Hide' : 'Show'} Full History
            </Button>
          </div>

          {selectedFaction === standing.factionId && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium mb-2 block">Complete Reputation History:</span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {standing.reputationHistory.map((event, index) => (
                  <div key={index} className="text-sm p-2 bg-white rounded border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{event.action}</span>
                      <span className={`text-xs ${event.reputationChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {event.reputationChange > 0 ? '+' : ''}{event.reputationChange}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(event.timestamp).toLocaleString()} • New standing: {event.newStandingLevel}
                    </div>
                    {event.witnesses && event.witnesses.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Witnessed by: {event.witnesses.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EnhancedFactionCard = ({ faction }: { faction: EnhancedFaction }) => {
    const playerStanding = factionStandings.find(s => s.factionId === faction.id);
    const activeGoals = faction.goals.filter(goal => goal.progress < 100);
    const completedGoals = faction.goals.filter(goal => goal.progress >= 100);

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded">
                {getFactionTypeIcon(faction.type)}
              </div>
              <div>
                <CardTitle className="text-lg">{faction.name}</CardTitle>
                <CardDescription>{faction.description}</CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {faction.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Power: {faction.powerLevel}%
                  </Badge>
                  {playerStanding && (
                    <Badge className={`${getStandingColor(playerStanding.standingLevel)} border text-xs`}>
                      {playerStanding.standingLevel.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4">
            <span className="text-sm font-medium mb-2 block">Influence Distribution:</span>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(faction.influence).map(([type, value]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type}:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={value} className="w-16 h-2" />
                    <span className={`text-xs ${getInfluenceColor(value)}`}>
                      {value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {faction.leadership && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Leadership:</span>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-sm">
                  <span className="font-medium">Structure:</span> {faction.leadership.structure}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Decision Making:</span> {faction.leadership.decisionMaking.replace('_', ' ')}
                </div>
                {faction.leadership.leaders.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium">Key Leaders:</span>
                    <div className="mt-1 space-y-1">
                      {faction.leadership.leaders.slice(0, 3).map((leader, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-medium">{leader.name}</span> - {leader.title}
                          <span className="text-gray-600 ml-2">
                            (Influence: {leader.influence}%, Loyalty: {leader.loyalty}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeGoals.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Active Goals:</span>
              <div className="space-y-2">
                {activeGoals.slice(0, 3).map((goal, index) => (
                  <div key={goal.id} className="p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{goal.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {goal.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">{goal.description}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={goal.progress} className="flex-1 h-2" />
                      <span className="text-xs">{goal.progress}%</span>
                    </div>
                    {goal.playerCanInfluence && (
                      <div className="text-xs text-blue-600 mt-1">
                        ✓ You can influence this goal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {faction.relationships.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium mb-2 block">Faction Relations:</span>
              <div className="space-y-1">
                {faction.relationships.slice(0, 3).map((rel, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{rel.factionName}</span>
                    <Badge className={`${getStandingColor(rel.relationshipType)} border text-xs`}>
                      {rel.relationshipType.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
                {faction.relationships.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{faction.relationships.length - 3} more relationships
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onFactionSelect?.(faction.id)}
          >
            View Full Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Faction Relations</h2>
        <p className="text-gray-600">Your standing with the various powers of the world</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standings" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your Standing ({factionStandings.length})
          </TabsTrigger>
          <TabsTrigger value="factions" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            All Factions ({enhancedFactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-6">
          {factionStandings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Faction Relations</h3>
                <p className="text-gray-600">
                  Interact with different groups to establish your reputation!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {factionStandings
                .sort((a, b) => b.reputationScore - a.reputationScore)
                .map(standing => (
                  <FactionStandingCard key={standing.factionId} standing={standing} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="factions" className="mt-6">
          {enhancedFactions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Crown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Known Factions</h3>
                <p className="text-gray-600">
                  Explore the world to discover the various powers and organizations!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {enhancedFactions
                .sort((a, b) => b.powerLevel - a.powerLevel)
                .map(faction => (
                  <EnhancedFactionCard key={faction.id} faction={faction} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
