'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, Target, AlertTriangle, CheckCircle, XCircle, Zap, Users, Crown } from 'lucide-react';
import type { Quest, QuestBranch, QuestChoice, StructuredStoryState } from '@/types/story';

interface QuestTrackerProps {
  storyState: StructuredStoryState;
  onQuestSelect?: (questId: string) => void;
  onBranchSelect?: (questId: string, branchId: string) => void;
}

export function QuestTracker({ storyState, onQuestSelect, onBranchSelect }: QuestTrackerProps) {
  const [selectedTab, setSelectedTab] = useState('active');
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);

  const quests = storyState.quests || [];
  const activeQuests = quests.filter(q => q.status === 'active');
  const completedQuests = quests.filter(q => q.status === 'completed');
  const failedQuests = quests.filter(q => q.status === 'failed');

  const getQuestTypeIcon = (type: Quest['type']) => {
    switch (type) {
      case 'main': return <Crown className="h-4 w-4" />;
      case 'side': return <Target className="h-4 w-4" />;
      case 'dynamic': return <Zap className="h-4 w-4" />;
      case 'arc_goal': return <Users className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getQuestTypeColor = (type: Quest['type']) => {
    switch (type) {
      case 'main': return 'bg-yellow-500';
      case 'side': return 'bg-blue-500';
      case 'dynamic': return 'bg-purple-500';
      case 'arc_goal': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getMoralAlignmentColor = (alignment?: string) => {
    switch (alignment) {
      case 'good': return 'text-green-600';
      case 'evil': return 'text-red-600';
      case 'complex': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const calculateQuestProgress = (quest: Quest): number => {
    if (!quest.objectives || quest.objectives.length === 0) return 0;
    const completed = quest.objectives.filter(obj => obj.isCompleted).length;
    return (completed / quest.objectives.length) * 100;
  };

  const getTimeRemainingDisplay = (quest: Quest): string | null => {
    if (!quest.timeLimit) return null;
    
    const startTime = new Date(quest.updatedAt || Date.now()).getTime();
    const currentTime = Date.now();
    const timeElapsed = currentTime - startTime;
    const timeLimitMs = quest.timeLimit.duration * 60 * 60 * 1000;
    const timeRemaining = timeLimitMs - timeElapsed;
    
    if (timeRemaining <= 0) return 'EXPIRED';
    
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const isQuestUrgent = (quest: Quest): boolean => {
    if (!quest.timeLimit) return false;
    
    const timeRemaining = getTimeRemainingDisplay(quest);
    if (timeRemaining === 'EXPIRED') return true;
    
    const startTime = new Date(quest.updatedAt || Date.now()).getTime();
    const currentTime = Date.now();
    const timeElapsed = currentTime - startTime;
    const timeLimitMs = quest.timeLimit.duration * 60 * 60 * 1000;
    const timeRemaining = timeLimitMs - timeElapsed;
    const warningThreshold = quest.timeLimit.warningThreshold || 25;
    
    return (timeRemaining / timeLimitMs) * 100 <= warningThreshold;
  };

  const QuestCard = ({ quest }: { quest: Quest }) => {
    const progress = calculateQuestProgress(quest);
    const timeRemaining = getTimeRemainingDisplay(quest);
    const isUrgent = isQuestUrgent(quest);
    const availableBranches = quest.branches?.filter(branch => 
      // Simple check - in a real implementation, this would use the quest engine
      true
    ) || [];

    return (
      <Card className={`mb-4 ${isUrgent ? 'border-red-500 border-2' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${getQuestTypeColor(quest.type)} text-white`}>
                {getQuestTypeIcon(quest.type)}
              </div>
              <div>
                <CardTitle className="text-lg">{quest.title || quest.description}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {quest.type.replace('_', ' ')}
                  </Badge>
                  {quest.category && (
                    <Badge variant="secondary" className="text-xs">
                      {quest.category}
                    </Badge>
                  )}
                  {quest.moralAlignment && (
                    <Badge variant="outline" className={`text-xs ${getMoralAlignmentColor(quest.moralAlignment)}`}>
                      {quest.moralAlignment}
                    </Badge>
                  )}
                  {quest.difficultyRating && (
                    <Badge variant="outline" className="text-xs">
                      Difficulty: {quest.difficultyRating}/10
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {timeRemaining && (
                <div className={`flex items-center gap-1 text-sm ${isUrgent ? 'text-red-600' : 'text-gray-600'}`}>
                  <Clock className="h-3 w-3" />
                  {timeRemaining}
                </div>
              )}
              {quest.estimatedDuration && (
                <div className="text-xs text-gray-500">
                  ~{quest.estimatedDuration}min
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <CardDescription className="mb-3">
            {quest.description}
          </CardDescription>
          
          {quest.objectives && quest.objectives.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="mb-2" />
              
              <div className="space-y-1">
                {quest.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {objective.isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 border border-gray-300 rounded-full" />
                    )}
                    <span className={objective.isCompleted ? 'line-through text-gray-500' : ''}>
                      {objective.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableBranches.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium mb-2 block">Available Approaches:</span>
              <div className="space-y-2">
                {availableBranches.map((branch) => (
                  <Button
                    key={branch.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onBranchSelect?.(quest.id, branch.id)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{branch.name}</div>
                      <div className="text-xs text-gray-600">{branch.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {quest.rewards && (
            <div className="mb-3">
              <span className="text-sm font-medium mb-1 block">Rewards:</span>
              <div className="flex flex-wrap gap-2 text-xs">
                {quest.rewards.experiencePoints && (
                  <Badge variant="secondary">{quest.rewards.experiencePoints} XP</Badge>
                )}
                {quest.rewards.currency && (
                  <Badge variant="secondary">{quest.rewards.currency} Gold</Badge>
                )}
                {quest.rewards.items && quest.rewards.items.length > 0 && (
                  <Badge variant="secondary">{quest.rewards.items.length} Items</Badge>
                )}
              </div>
            </div>
          )}

          {isUrgent && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Time is running out!</span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuestSelect?.(quest.id)}
            >
              View Details
            </Button>
            {quest.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
              >
                {expandedQuest === quest.id ? 'Hide' : 'Show'} History
              </Button>
            )}
          </div>

          {expandedQuest === quest.id && quest.choiceHistory && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium mb-2 block">Choice History:</span>
              <div className="space-y-2">
                {quest.choiceHistory.map((choice, index) => (
                  <div key={choice.id} className="text-sm">
                    <div className="font-medium">{choice.choiceText}</div>
                    <div className="text-gray-600 text-xs">
                      {new Date(choice.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Quest Journal</h2>
        <p className="text-gray-600">Track your adventures and make meaningful choices</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Active ({activeQuests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedQuests.length})
          </TabsTrigger>
          <TabsTrigger value="failed" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Failed ({failedQuests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeQuests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Active Quests</h3>
                <p className="text-gray-600">Explore the world to discover new adventures!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeQuests
                .sort((a, b) => {
                  // Sort by urgency first, then by type priority
                  const aUrgent = isQuestUrgent(a);
                  const bUrgent = isQuestUrgent(b);
                  if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
                  
                  const typePriority = { main: 0, arc_goal: 1, dynamic: 2, side: 3 };
                  return typePriority[a.type] - typePriority[b.type];
                })
                .map(quest => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedQuests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Completed Quests</h3>
                <p className="text-gray-600">Complete some quests to see your achievements here!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedQuests.map(quest => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="failed" className="mt-6">
          {failedQuests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-medium mb-2">No Failed Quests</h3>
                <p className="text-gray-600">Great job! You haven&apos;t failed any quests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {failedQuests.map(quest => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
