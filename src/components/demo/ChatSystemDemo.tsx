"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  User, 
  Zap, 
  Shield, 
  Sword, 
  Package, 
  MapPin, 
  BookOpen,
  MessageSquare,
  Sparkles
} from 'lucide-react';

import { createChatIntegrationSystem } from '@/lib/chat-integration-system';
import type { StructuredStoryState, CharacterProfile } from '@/types/story';
import { generateUUID } from '@/lib/utils';

interface DemoMessage {
  id: string;
  type: 'user' | 'system' | 'gm';
  content: string;
  timestamp: string;
  commandType?: string;
  success?: boolean;
}

export function ChatSystemDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: generateUUID(),
      type: 'system',
      content: 'Welcome to the AI-Driven Chat System Demo! Try commands like "level up", "add item magic sword", "status", or "help".',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoState, setDemoState] = useState<StructuredStoryState>(createDemoState());

  const chatSystem = createChatIntegrationSystem({
    enableAIGM: true,
    enableSafetyChecks: true,
    enableAutoProgression: true,
    enableInventoryManagement: true,
    enableWorldStateUpdates: true,
    enableQuestManagement: true,
    enableNarrativeEvents: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: DemoMessage = {
      id: generateUUID(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const result = await chatSystem.processChatMessage(
        input.trim(),
        demoState,
        [],
        generateUUID(),
        false
      );

      // Update demo state
      setDemoState(result.updatedStoryState);

      // Add system response
      const systemMessage: DemoMessage = {
        id: generateUUID(),
        type: 'system',
        content: result.userFeedback,
        timestamp: new Date().toISOString(),
        commandType: result.parsedCommand.command?.type,
        success: result.commandResult?.success
      };

      setMessages(prev => [...prev, systemMessage]);

      // Add GM messages if any
      if (result.gmExecution?.systemMessages) {
        for (const gmMsg of result.gmExecution.systemMessages) {
          const gmMessage: DemoMessage = {
            id: generateUUID(),
            type: 'gm',
            content: gmMsg.content,
            timestamp: new Date().toISOString(),
            success: true
          };
          setMessages(prev => [...prev, gmMessage]);
        }
      }

    } catch (error: any) {
      const errorMessage: DemoMessage = {
        id: generateUUID(),
        type: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
        success: false
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setInput('');
    setIsProcessing(false);
  };

  const quickCommands = [
    { label: 'Level Up', command: 'level up', icon: Zap },
    { label: 'Add Skill', command: 'add skill fireball', icon: Sparkles },
    { label: 'Get Item', command: 'add item magic sword', icon: Package },
    { label: 'Status', command: 'status', icon: Shield },
    { label: 'Help', command: 'help', icon: MessageSquare },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI-Driven Chat System Demo</h1>
        <p className="text-muted-foreground">
          Experience the power of natural language game control
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat Interface
              </CardTitle>
              <CardDescription>
                Type commands in natural language to control the game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-96 w-full border rounded-lg p-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex gap-2 max-w-[80%] ${
                          message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        <div className="shrink-0 mt-1">
                          {message.type === 'user' ? (
                            <User className="w-6 h-6 text-blue-500" />
                          ) : message.type === 'gm' ? (
                            <Bot className="w-6 h-6 text-purple-500" />
                          ) : (
                            <Bot className="w-6 h-6 text-green-500" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-blue-500 text-white'
                              : message.type === 'gm'
                              ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                              : message.success === false
                              ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
                              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.commandType && (
                            <Badge variant="secondary" className="mt-2">
                              {message.commandType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command... (e.g., 'level up', 'add item sword', 'status')"
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button type="submit" disabled={isProcessing || !input.trim()}>
                  {isProcessing ? 'Processing...' : 'Send'}
                </Button>
              </form>

              {/* Quick Commands */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Commands:</p>
                <div className="flex flex-wrap gap-2">
                  {quickCommands.map((cmd) => (
                    <Button
                      key={cmd.command}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(cmd.command)}
                      disabled={isProcessing}
                      className="flex items-center gap-1"
                    >
                      <cmd.icon className="w-3 h-3" />
                      {cmd.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Character Status */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Character Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{demoState.character.name}</span>
                  <Badge>Level {demoState.character.level}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {demoState.character.class}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Health:</span>
                  <span>{demoState.character.currentHealth}/{demoState.character.baseStats.health}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Mana:</span>
                  <span>{demoState.character.currentMana}/{demoState.character.baseStats.mana}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Experience:</span>
                  <span>{demoState.character.experience}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  <span className="text-sm font-medium">Skills ({demoState.character.skills.length})</span>
                </div>
                <div className="space-y-1">
                  {demoState.character.skills.slice(0, 3).map((skill) => (
                    <div key={skill.id} className="text-xs text-muted-foreground">
                      {skill.name} (Level {skill.level})
                    </div>
                  ))}
                  {demoState.character.skills.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{demoState.character.skills.length - 3} more...
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">Inventory ({demoState.inventory.length})</span>
                </div>
                <div className="space-y-1">
                  {demoState.inventory.slice(0, 3).map((item) => (
                    <div key={item.id} className="text-xs text-muted-foreground">
                      {item.name}
                    </div>
                  ))}
                  {demoState.inventory.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{demoState.inventory.length - 3} more...
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Location</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {demoState.currentLocation}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Command Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Character:</strong> "level up", "add skill fireball"</div>
                <div><strong>Inventory:</strong> "add item magic sword", "equip sword"</div>
                <div><strong>Combat:</strong> "start combat", "heal 25 hp"</div>
                <div><strong>World:</strong> "go to tavern", "improve relationship with alice"</div>
                <div><strong>Info:</strong> "status", "inventory", "help"</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function createDemoState(): StructuredStoryState {
  const character: CharacterProfile = {
    id: generateUUID(),
    name: "Demo Hero",
    class: "Adventurer",
    level: 1,
    experience: 0,
    description: "A brave adventurer ready for action",
    baseStats: {
      health: 100,
      mana: 50,
      strength: 10,
      agility: 10,
      intelligence: 10,
      wisdom: 10,
      constitution: 10,
      charisma: 10
    },
    currentHealth: 100,
    currentMana: 50,
    skills: [
      {
        id: generateUUID(),
        name: "Basic Attack",
        description: "A simple attack",
        level: 1,
        experience: 0,
        maxLevel: 10,
        skillType: 'active',
        manaCost: 0,
        cooldown: 0,
        effects: []
      }
    ],
    activeTemporaryEffects: []
  };

  return {
    character,
    currentLocation: "Demo Village",
    inventory: [
      {
        id: generateUUID(),
        name: "Starter Potion",
        description: "A basic healing potion",
        itemType: "consumable",
        rarity: "common",
        value: 25,
        weight: 0.5,
        effects: []
      }
    ],
    equippedItems: {},
    quests: [],
    storyArcs: [],
    worldFacts: ["This is a demo environment", "Commands work in real-time"],
    trackedNPCs: [],
    
    // Required enhanced tracking systems (minimal for demo)
    characterEmotionalState: {
      currentMood: "curious",
      stressLevel: 1,
      relationships: [],
      recentEmotionalEvents: []
    },
    npcRelationships: [],
    factionStandings: [],
    environmentalContext: {
      currentWeather: "clear",
      timeOfDay: "morning",
      season: "spring",
      ambientConditions: []
    },
    narrativeThreads: [],
    longTermStorySummary: {
      majorEvents: [],
      characterDevelopment: [],
      worldChanges: [],
      relationshipEvolution: []
    },
    playerPreferences: {
      preferredPacing: "medium",
      combatFrequency: "moderate",
      explorationFocus: "balanced",
      narrativeComplexity: "medium",
      characterInteractionLevel: "high"
    },
    choiceConsequences: [],
    systemMetrics: {
      totalPlayTime: 0,
      decisionsCount: 0,
      combatEncounters: 0,
      questsCompleted: 0,
      averageResponseTime: 0
    }
  };
}
