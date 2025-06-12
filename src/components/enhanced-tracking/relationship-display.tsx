/**
 * Relationship Display Component
 * 
 * Shows NPC relationships, faction standings, and relationship history
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Heart, Shield, Eye, Crown, TrendingUp, TrendingDown } from 'lucide-react';
import type { RelationshipEntry, FactionStanding, RelationshipHistoryEntry } from '@/types/story';

interface RelationshipDisplayProps {
  npcRelationships: RelationshipEntry[];
  factionStandings: FactionStanding[];
  className?: string;
}

function getRelationshipColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 25) return 'text-blue-600';
  if (score >= -25) return 'text-gray-600';
  if (score >= -75) return 'text-orange-600';
  return 'text-red-600';
}

function getRelationshipLabel(score: number): string {
  if (score >= 75) return 'Beloved';
  if (score >= 50) return 'Close Friend';
  if (score >= 25) return 'Friend';
  if (score >= 0) return 'Acquaintance';
  if (score >= -25) return 'Neutral';
  if (score >= -50) return 'Disliked';
  if (score >= -75) return 'Enemy';
  return 'Arch-Enemy';
}

function getFactionStandingColor(standing: string): string {
  switch (standing) {
    case 'revered': return 'text-purple-600';
    case 'allied': return 'text-green-600';
    case 'friendly': return 'text-blue-600';
    case 'neutral': return 'text-gray-600';
    case 'unfriendly': return 'text-orange-600';
    case 'hostile': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

function RelationshipCard({ relationship }: { relationship: RelationshipEntry }) {
  const [showHistory, setShowHistory] = useState(false);
  
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-semibold">{relationship.npcName}</h4>
              <p className={`text-sm ${getRelationshipColor(relationship.relationshipScore)}`}>
                {getRelationshipLabel(relationship.relationshipScore)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${getRelationshipColor(relationship.relationshipScore)}`}>
              {relationship.relationshipScore > 0 ? '+' : ''}{relationship.relationshipScore}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {relationship.emotionalState.primaryMood}
            </div>
          </div>
        </div>

        {/* Relationship Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                  <Heart className="w-4 h-4 mx-auto mb-1 text-red-500" />
                  <Progress value={relationship.trustLevel} className="h-2 mb-1" />
                  <span className="text-xs text-gray-600">{relationship.trustLevel}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Trust Level</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                  <Eye className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                  <Progress value={relationship.fearLevel} className="h-2 mb-1" />
                  <span className="text-xs text-gray-600">{relationship.fearLevel}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Fear Level</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                  <Crown className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                  <Progress value={relationship.respectLevel} className="h-2 mb-1" />
                  <span className="text-xs text-gray-600">{relationship.respectLevel}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Respect Level</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Recent History */}
        {relationship.relationshipHistory.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-xs"
            >
              {showHistory ? 'Hide' : 'Show'} Relationship History
            </Button>
            
            {showHistory && (
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {relationship.relationshipHistory.slice(-3).map((entry, index) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {entry.interactionType}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {entry.relationshipChange > 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : entry.relationshipChange < 0 ? (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        ) : null}
                        <span className={entry.relationshipChange > 0 ? 'text-green-600' : entry.relationshipChange < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {entry.relationshipChange > 0 ? '+' : ''}{entry.relationshipChange}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700">{entry.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FactionCard({ faction }: { faction: FactionStanding }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-semibold">{faction.factionName}</h4>
              <p className={`text-sm capitalize ${getFactionStandingColor(faction.standingLevel)}`}>
                {faction.standingLevel}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${getFactionStandingColor(faction.standingLevel)}`}>
              {faction.reputationScore > 0 ? '+' : ''}{faction.reputationScore}
            </div>
            <div className="text-xs text-gray-500">
              {faction.knownBy ? 'Known' : 'Unknown'}
            </div>
          </div>
        </div>

        {/* Special Titles */}
        {faction.specialTitles.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {faction.specialTitles.map((title, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Current Consequences */}
        {faction.currentConsequences.length > 0 && (
          <div className="mb-3">
            <h5 className="text-xs font-semibold mb-1 text-gray-700">Active Effects:</h5>
            <div className="space-y-1">
              {faction.currentConsequences.map((consequence, index) => (
                <p key={index} className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                  {consequence}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Reputation Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Reputation Progress</span>
            <span>{faction.reputationScore}/100</span>
          </div>
          <Progress value={Math.max(0, faction.reputationScore + 100) / 2} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RelationshipDisplay({ 
  npcRelationships, 
  factionStandings, 
  className = '' 
}: RelationshipDisplayProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Relationships & Reputation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="npcs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="npcs">NPCs ({npcRelationships.length})</TabsTrigger>
            <TabsTrigger value="factions">Factions ({factionStandings.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="npcs" className="mt-4">
            <div className="max-h-96 overflow-y-auto">
              {npcRelationships.length > 0 ? (
                npcRelationships
                  .sort((a, b) => b.relationshipScore - a.relationshipScore)
                  .map((relationship) => (
                    <RelationshipCard key={relationship.npcId} relationship={relationship} />
                  ))
              ) : (
                <p className="text-center text-gray-500 py-8">No NPC relationships established yet</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="factions" className="mt-4">
            <div className="max-h-96 overflow-y-auto">
              {factionStandings.length > 0 ? (
                factionStandings
                  .sort((a, b) => b.reputationScore - a.reputationScore)
                  .map((faction) => (
                    <FactionCard key={faction.factionId} faction={faction} />
                  ))
              ) : (
                <p className="text-center text-gray-500 py-8">No faction standings established yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
