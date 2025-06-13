'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Target, 
  Users, 
  Clock, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Plus
} from 'lucide-react';
import type { 
  StructuredStoryState, 
  Quest,
  QuestGenerationSettings,
  PlayerChoice 
} from '@/types/story';
import { QuestTracker } from './quest-tracker';
import { ChoiceConsequenceTracker } from './choice-consequence-tracker';
import { FactionStandingDisplay } from './faction-standing-display';

interface QuestSystemIntegrationProps {
  storyState: StructuredStoryState;
  onStateUpdate: (newState: StructuredStoryState) => void;
  onGenerateQuest?: (settings: QuestGenerationSettings) => Promise<Quest | null>;
  onSelectQuestBranch?: (questId: string, branchId: string, choiceText: string) => Promise<void>;
  className?: string;
}

export function QuestSystemIntegration({ 
  storyState, 
  onStateUpdate, 
  onGenerateQuest,
  onSelectQuestBranch,
  className 
}: QuestSystemIntegrationProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isGeneratingQuest, setIsGeneratingQuest] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  // Calculate overview statistics
  const activeQuests = storyState.quests?.filter(q => q.status === 'active') || [];
  const completedQuests = storyState.quests?.filter(q => q.status === 'completed') || [];
  const failedQuests = storyState.quests?.filter(q => q.status === 'failed') || [];
  const recentChoices = storyState.playerChoices?.slice(-5) || [];
  const activeConsequences = storyState.playerChoices?.flatMap(choice => 
    choice.consequences?.filter(c => c.manifestedAt) || []
  ) || [];
  const factionStandings = storyState.factionStandings || [];

  // Get urgent quests (time-sensitive)
  const urgentQuests = activeQuests.filter(quest => {
    if (!quest.timeLimit) return false;
    
    const startTime = new Date(quest.updatedAt || Date.now()).getTime();
    const currentTime = Date.now();
    const timeElapsed = currentTime - startTime;
    const timeLimitMs = quest.timeLimit.duration * 60 * 60 * 1000;
    const timeRemaining = timeLimitMs - timeElapsed;
    const warningThreshold = quest.timeLimit.warningThreshold || 25;
    
    return (timeRemaining / timeLimitMs) * 100 <= warningThreshold;
  });

  // Get critical consequences
  const criticalConsequences = activeConsequences.filter(c => c.severity === 'critical');

  const handleGenerateQuest = useCallback(async () => {
    if (!onGenerateQuest) return;
    
    setIsGeneratingQuest(true);
    try {
      const settings: QuestGenerationSettings = {
        dynamicQuestFrequency: 'medium',
        preferredQuestTypes: ['dynamic'],
        difficultyPreference: 'adaptive',
        branchingComplexity: 'moderate',
        consequenceSeverity: 'moderate',
        moralComplexityLevel: 50,
        timeConstraintPreference: 'moderate',
        failureToleranceLevel: 50,
        adaptiveGeneration: true,
        playerChoiceWeight: 70
      };

      const newQuest = await onGenerateQuest(settings);
      if (newQuest) {
        const updatedState = {
          ...storyState,
          quests: [...storyState.quests, newQuest]
        };
        onStateUpdate(updatedState);
      }
    } catch (error) {
      console.error('Failed to generate quest:', error);
    } finally {
      setIsGeneratingQuest(false);
    }
  }, [onGenerateQuest, storyState, onStateUpdate]);

  const handleQuestBranchSelect = useCallback(async (questId: string, branchId: string) => {
    if (!onSelectQuestBranch) return;
    
    const quest = storyState.quests.find(q => q.id === questId);
    const branch = quest?.branches?.find(b => b.id === branchId);
    
    if (quest && branch) {
      try {
        await onSelectQuestBranch(questId, branchId, `Choose ${branch.name} approach`);
      } catch (error) {
        console.error('Failed to select quest branch:', error);
      }
    }
  }, [onSelectQuestBranch, storyState.quests]);

  const OverviewCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    variant = 'default',
    onClick 
  }: {
    title: string;
    value: number | string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'warning' | 'success' | 'danger';
    onClick?: () => void;
  }) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'warning': return 'border-yellow-200 bg-yellow-50';
        case 'success': return 'border-green-200 bg-green-50';
        case 'danger': return 'border-red-200 bg-red-50';
        default: return 'border-gray-200 bg-white';
      }
    };

    return (
      <Card 
        className={`${getVariantStyles()} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-gray-600">{description}</div>
            </div>
            <Icon className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const QuestDetailDialog = ({ quest }: { quest: Quest }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quest.title || quest.description}</DialogTitle>
          <DialogDescription>
            {quest.category && `${quest.category} quest`} • 
            Difficulty: {quest.difficultyRating || 'Unknown'}/10
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-gray-600">{quest.description}</p>
          </div>

          {quest.objectives && quest.objectives.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Objectives</h4>
              <div className="space-y-2">
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

          {quest.branches && quest.branches.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Available Approaches</h4>
              <div className="space-y-2">
                {quest.branches.map((branch) => (
                  <div key={branch.id} className="p-3 border rounded">
                    <div className="font-medium">{branch.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{branch.description}</div>
                    <Button
                      size="sm"
                      onClick={() => handleQuestBranchSelect(quest.id, branch.id)}
                    >
                      Choose This Approach
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quest.rewards && (
            <div>
              <h4 className="font-medium mb-2">Rewards</h4>
              <div className="flex flex-wrap gap-2">
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

          {quest.consequences && quest.consequences.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Potential Consequences</h4>
              <div className="space-y-2">
                {quest.consequences.slice(0, 3).map((consequence, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    <Badge className="mb-1 text-xs">{consequence.severity}</Badge>
                    <div>{consequence.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Quest & Choice System</h2>
            <p className="text-gray-600">Manage your adventures and track the consequences of your choices</p>
          </div>
          {onGenerateQuest && (
            <Button 
              onClick={handleGenerateQuest} 
              disabled={isGeneratingQuest}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isGeneratingQuest ? 'Generating...' : 'Generate Quest'}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="choices">Choices</TabsTrigger>
          <TabsTrigger value="factions">Factions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <OverviewCard
              title="Active Quests"
              value={activeQuests.length}
              description="Currently pursuing"
              icon={Target}
              onClick={() => setSelectedTab('quests')}
            />
            <OverviewCard
              title="Recent Choices"
              value={recentChoices.length}
              description="Last 5 decisions"
              icon={Clock}
              onClick={() => setSelectedTab('choices')}
            />
            <OverviewCard
              title="Faction Relations"
              value={factionStandings.length}
              description="Known groups"
              icon={Users}
              onClick={() => setSelectedTab('factions')}
            />
            <OverviewCard
              title="Active Consequences"
              value={activeConsequences.length}
              description="Ongoing effects"
              icon={Zap}
              variant={criticalConsequences.length > 0 ? 'danger' : 'default'}
              onClick={() => setSelectedTab('choices')}
            />
          </div>

          {urgentQuests.length > 0 && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Urgent Quests
                </CardTitle>
                <CardDescription>These quests have time limits that are running out!</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urgentQuests.map(quest => (
                    <div key={quest.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <div className="font-medium">{quest.title || quest.description}</div>
                        <div className="text-sm text-gray-600">
                          {quest.category} • Difficulty: {quest.difficultyRating}/10
                        </div>
                      </div>
                      <QuestDetailDialog quest={quest} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {criticalConsequences.length > 0 && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Consequences
                </CardTitle>
                <CardDescription>Your choices have led to significant ongoing effects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalConsequences.slice(0, 3).map((consequence, index) => (
                    <div key={index} className="p-3 bg-white rounded border">
                      <div className="font-medium">{consequence.description}</div>
                      <div className="text-sm text-gray-600">
                        Category: {consequence.category} • Type: {consequence.type}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quest Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span className="text-green-600">{completedQuests.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active:</span>
                    <span className="text-blue-600">{activeQuests.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Failed:</span>
                    <span className="text-red-600">{failedQuests.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choice Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Choices:</span>
                    <span>{storyState.playerChoices?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Consequences:</span>
                    <span>{activeConsequences.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Moral Alignment:</span>
                    <span className="capitalize">
                      {storyState.moralProfile?.overallAlignment?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">World Standing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Known Factions:</span>
                    <span>{factionStandings.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Positive Relations:</span>
                    <span className="text-green-600">
                      {factionStandings.filter(f => f.reputationScore > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hostile Relations:</span>
                    <span className="text-red-600">
                      {factionStandings.filter(f => f.reputationScore < -25).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quests" className="mt-6">
          <QuestTracker 
            storyState={storyState}
            onQuestSelect={(questId) => {
              const quest = storyState.quests.find(q => q.id === questId);
              if (quest) setSelectedQuest(quest);
            }}
            onBranchSelect={handleQuestBranchSelect}
          />
        </TabsContent>

        <TabsContent value="choices" className="mt-6">
          <ChoiceConsequenceTracker 
            storyState={storyState}
            onChoiceSelect={(choiceId) => {
              // Handle choice selection for detailed view
              console.log('Selected choice:', choiceId);
            }}
          />
        </TabsContent>

        <TabsContent value="factions" className="mt-6">
          <FactionStandingDisplay 
            storyState={storyState}
            onFactionSelect={(factionId) => {
              // Handle faction selection for detailed view
              console.log('Selected faction:', factionId);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
