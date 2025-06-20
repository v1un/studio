/**
 * Enhanced Character Status Component
 * 
 * Comprehensive character status display including emotional state, relationships, and environmental context
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Heart, 
  Brain, 
  MapPin, 
  Users, 
  Target, 
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { StructuredStoryState, CharacterProfile } from '@/types/story';
import EmotionalStateDisplay from './emotional-state-display';
import RelationshipDisplay from './relationship-display';
import EnvironmentalDisplay from './environmental-display';

interface EnhancedCharacterStatusProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  isPremiumSession?: boolean;
  className?: string;
}

function QuickStatsCard({ character, storyState }: { character: CharacterProfile; storyState: StructuredStoryState }) {
  const healthPercentage = (character.health / character.maxHealth) * 100;
  const manaPercentage = (character.mana / character.maxMana) * 100;
  const xpPercentage = (character.experiencePoints / character.experienceToNextLevel) * 100;

  const getHealthColor = (percentage: number) => {
    if (percentage > 75) return 'text-green-600';
    if (percentage > 50) return 'text-yellow-600';
    if (percentage > 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getManaColor = (percentage: number) => {
    if (percentage > 75) return 'text-blue-600';
    if (percentage > 50) return 'text-blue-500';
    if (percentage > 25) return 'text-blue-400';
    return 'text-blue-300';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <User className="w-4 h-4" />
          <span>{character.name}</span>
          <Badge variant="outline" className="text-xs">Level {character.level}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Core Stats */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-3 h-3 text-red-500" />
              <span className="text-xs font-medium">Health</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={healthPercentage} className="w-16 h-1.5" />
              <span className={`text-xs font-bold ${getHealthColor(healthPercentage)}`}>
                {character.health}/{character.maxHealth}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Mana</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={manaPercentage} className="w-20 h-2" />
              <span className={`text-sm font-bold ${getManaColor(manaPercentage)}`}>
                {character.mana}/{character.maxMana}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Experience</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={xpPercentage} className="w-20 h-2" />
              <span className="text-sm font-bold text-purple-600">
                {character.experiencePoints}/{character.experienceToNextLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Class:</span>
            <span className="ml-1 font-medium">{character.class}</span>
          </div>
          <div>
            <span className="text-gray-600">Currency:</span>
            <span className="ml-1 font-medium">{character.currency}</span>
          </div>
          <div>
            <span className="text-gray-600">Reading:</span>
            <span className="ml-1 font-medium">{character.languageReading}/100</span>
          </div>
          <div>
            <span className="text-gray-600">Speaking:</span>
            <span className="ml-1 font-medium">{character.languageSpeaking}/100</span>
          </div>
        </div>

        {/* Current Location */}
        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">{storyState.currentLocation}</span>
        </div>

        {/* Emotional State Quick View */}
        {storyState.characterEmotionalState && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-sm">Mood:</span>
              <span className="text-sm font-medium capitalize">
                {storyState.characterEmotionalState.primaryMood.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">Stress:</span>
              <span className={`text-xs font-bold ${storyState.characterEmotionalState.stressLevel > 75 ? 'text-red-600' : storyState.characterEmotionalState.stressLevel > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                {storyState.characterEmotionalState.stressLevel}%
              </span>
            </div>
          </div>
        )}

        {/* Active Temporary Effects */}
        {character.activeTemporaryEffects && character.activeTemporaryEffects.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold mb-2">Active Effects</h5>
            <div className="space-y-1">
              {character.activeTemporaryEffects.slice(0, 3).map((effect) => (
                <div key={effect.id} className="flex items-center justify-between text-xs p-1 bg-blue-50 rounded">
                  <span className="font-medium">{effect.name}</span>
                  <span className="text-gray-600">{effect.turnsRemaining}t</span>
                </div>
              ))}
              {character.activeTemporaryEffects.length > 3 && (
                <p className="text-xs text-gray-500">+{character.activeTemporaryEffects.length - 3} more effects</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickRelationshipsCard({ storyState }: { storyState: StructuredStoryState }) {
  const topRelationships = storyState.npcRelationships
    ?.sort((a, b) => Math.abs(b.relationshipScore) - Math.abs(a.relationshipScore))
    .slice(0, 5) || [];

  const getRelationshipColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-blue-600';
    if (score >= -50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRelationshipLabel = (score: number) => {
    if (score >= 75) return 'Beloved';
    if (score >= 25) return 'Friend';
    if (score >= 0) return 'Neutral';
    if (score >= -50) return 'Disliked';
    return 'Enemy';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Key Relationships</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topRelationships.length > 0 ? (
          <div className="space-y-2">
            {topRelationships.map((rel) => (
              <div key={rel.npcId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{rel.npcName}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${getRelationshipColor(rel.relationshipScore)}`}>
                    {getRelationshipLabel(rel.relationshipScore)}
                  </span>
                  <span className={`text-xs font-bold ${getRelationshipColor(rel.relationshipScore)}`}>
                    {rel.relationshipScore > 0 ? '+' : ''}{rel.relationshipScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm py-4">No relationships established yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveQuestsCard({ storyState }: { storyState: StructuredStoryState }) {
  const activeQuests = storyState.quests?.filter(q => q.status === 'active').slice(0, 3) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Target className="w-5 h-5" />
          <span>Active Quests</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeQuests.length > 0 ? (
          <div className="space-y-2">
            {activeQuests.map((quest) => (
              <div key={quest.id} className="p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{quest.title || 'Untitled Quest'}</span>
                  <Badge variant="outline" className="text-xs">{quest.type}</Badge>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{quest.description}</p>
                {quest.objectives && quest.objectives.length > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">Progress:</span>
                      <span className="text-xs font-medium">
                        {quest.objectives.filter(obj => obj.isCompleted).length}/{quest.objectives.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm py-4">No active quests</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EnhancedCharacterStatus({
  character,
  storyState,
  isPremiumSession = false,
  className = ''
}: EnhancedCharacterStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompactMode = className.includes('compact-mode');

  return (
    <div className={className}>
      {/* Quick Overview - Always Visible */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 ${isCompactMode ? 'mb-2' : 'mb-4'}`}>
        <QuickStatsCard character={character} storyState={storyState} />
        <QuickRelationshipsCard storyState={storyState} />
        <ActiveQuestsCard storyState={storyState} />
      </div>

      {/* Expand/Collapse Button */}
      <div className={`flex justify-center ${isCompactMode ? 'mb-2' : 'mb-4'}`}>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2"
          size={isCompactMode ? "sm" : "default"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className={isCompactMode ? "text-sm" : ""}>{isExpanded ? 'Hide' : 'Show'} Detailed Status</span>
        </Button>
      </div>

      {/* Detailed Status - Expandable */}
      {isExpanded && (
        <Tabs defaultValue="emotional" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emotional">Emotional</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="emotional" className="mt-4">
            {storyState.characterEmotionalState ? (
              <EmotionalStateDisplay emotionalState={storyState.characterEmotionalState} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Emotional state tracking not available</p>
                  <p className="text-sm">This feature requires an enhanced save game</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="relationships" className="mt-4">
            {storyState.npcRelationships && storyState.factionStandings ? (
              <RelationshipDisplay 
                npcRelationships={storyState.npcRelationships}
                factionStandings={storyState.factionStandings}
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Relationship tracking not available</p>
                  <p className="text-sm">This feature requires an enhanced save game</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="environment" className="mt-4">
            {storyState.environmentalContext ? (
              <EnvironmentalDisplay environmentalContext={storyState.environmentalContext} />
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Environmental tracking not available</p>
                  <p className="text-sm">This feature requires an enhanced save game</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Premium Badge */}
      {isPremiumSession && (
        <div className="mt-4 flex justify-center">
          <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            Premium AI Enhanced Tracking
          </Badge>
        </div>
      )}
    </div>
  );
}
