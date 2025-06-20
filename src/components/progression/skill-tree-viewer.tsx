"use client";

import React, { useState } from 'react';
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
  Lock, 
  Check, 
  Star, 
  Sword, 
  Wand2, 
  Users, 
  Wrench, 
  Compass,
  ChefHat
} from 'lucide-react';
import type { 
  CharacterProfile, 
  SkillTree, 
  SkillTreeNode, 
  SkillTreeCategory 
} from '@/types/story';
import { 
  isSkillNodeUnlocked, 
  canPurchaseSkillNode, 
  purchaseSkillNode 
} from '@/lib/progression-engine';
import { defaultSkillTrees } from '@/lib/skill-trees';

interface SkillTreeViewerProps {
  character: CharacterProfile;
  onCharacterUpdate: (character: CharacterProfile) => void;
}

const categoryIcons: Record<SkillTreeCategory, React.ComponentType<any>> = {
  combat: Sword,
  magic: Wand2,
  social: Users,
  utility: Wrench,
  crafting: ChefHat,
  exploration: Compass,
};

const categoryColors: Record<SkillTreeCategory, string> = {
  combat: 'text-red-500',
  magic: 'text-purple-500',
  social: 'text-blue-500',
  utility: 'text-green-500',
  crafting: 'text-orange-500',
  exploration: 'text-teal-500',
};

export default function SkillTreeViewer({ character, onCharacterUpdate }: SkillTreeViewerProps) {
  const [selectedTree, setSelectedTree] = useState<string>(defaultSkillTrees[0]?.id || '');
  const [selectedNode, setSelectedNode] = useState<SkillTreeNode | null>(null);

  const availableSkillPoints = character.progressionPoints?.skill || 0;
  const purchasedNodes = character.purchasedSkillNodes || [];

  const currentTree = defaultSkillTrees.find(tree => tree.id === selectedTree);

  const handlePurchaseNode = (nodeId: string) => {
    if (!currentTree) return;

    try {
      const updatedCharacter = purchaseSkillNode(nodeId, character, currentTree);
      onCharacterUpdate(updatedCharacter);
      setSelectedNode(null);
    } catch (error) {
      console.error('Failed to purchase skill node:', error);
    }
  };

  const getNodeStatus = (node: SkillTreeNode) => {
    if (purchasedNodes.includes(node.id)) {
      return 'purchased';
    }
    if (isSkillNodeUnlocked(node, purchasedNodes, character)) {
      return canPurchaseSkillNode(node, purchasedNodes, availableSkillPoints, character) 
        ? 'available' 
        : 'locked_insufficient_points';
    }
    return 'locked';
  };

  const getNodeStyle = (status: string) => {
    switch (status) {
      case 'purchased':
        return 'bg-green-100 border-green-500 text-green-800 hover:bg-green-200';
      case 'available':
        return 'bg-blue-100 border-blue-500 text-blue-800 hover:bg-blue-200 cursor-pointer';
      case 'locked_insufficient_points':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'locked':
      default:
        return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  const getNodeIcon = (status: string) => {
    switch (status) {
      case 'purchased':
        return <Check className="w-4 h-4" />;
      case 'available':
        return <Star className="w-4 h-4" />;
      case 'locked_insufficient_points':
      case 'locked':
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  if (!currentTree) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No skill trees available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skill Trees</h2>
          <p className="text-muted-foreground">
            Develop your character&apos;s abilities and unlock new powers
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {availableSkillPoints} skill points
        </Badge>
      </div>

      {/* Skill Tree Tabs */}
      <Tabs value={selectedTree} onValueChange={setSelectedTree}>
        <TabsList className="grid w-full grid-cols-2">
          {defaultSkillTrees.map((tree) => {
            const IconComponent = categoryIcons[tree.category];
            return (
              <TabsTrigger key={tree.id} value={tree.id} className="flex items-center gap-2">
                <IconComponent className={`w-4 h-4 ${categoryColors[tree.category]}`} />
                {tree.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {defaultSkillTrees.map((tree) => (
          <TabsContent key={tree.id} value={tree.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {React.createElement(categoryIcons[tree.category], {
                    className: `w-5 h-5 ${categoryColors[tree.category]}`
                  })}
                  {tree.name}
                </CardTitle>
                <CardDescription>{tree.description}</CardDescription>
              </CardHeader>
            </Card>

            {/* Skill Tree Grid */}
            <div className="relative">
              <div 
                className="grid gap-4 p-6 bg-gray-50 rounded-lg"
                style={{
                  gridTemplateColumns: `repeat(${tree.layout.width}, 1fr)`,
                  gridTemplateRows: `repeat(${tree.layout.height}, 1fr)`,
                }}
              >
                {tree.nodes.map((node) => {
                  const status = getNodeStatus(node);
                  const nodeStyle = getNodeStyle(status);
                  const nodeIcon = getNodeIcon(status);

                  return (
                    <TooltipProvider key={node.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`
                              relative p-4 rounded-lg border-2 transition-all duration-200
                              ${nodeStyle}
                              ${selectedNode?.id === node.id ? 'ring-2 ring-blue-400' : ''}
                            `}
                            style={{
                              gridColumn: node.position.x,
                              gridRow: node.position.y,
                            }}
                            onClick={() => setSelectedNode(node)}
                          >
                            <div className="flex flex-col items-center text-center space-y-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50">
                                {nodeIcon}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{node.name}</div>
                                <div className="text-xs opacity-75">
                                  Tier {node.tier} • {node.cost} pts
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-2">
                            <div className="font-medium">{node.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {node.description}
                            </div>
                            <div className="space-y-1">
                              {node.effects.map((effect, index) => (
                                <div key={index} className="text-xs text-green-600">
                                  • {effect.description}
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Cost: {node.cost} skill points
                            </div>
                            {node.prerequisites.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Requires: {node.prerequisites.join(', ')}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>

              {/* Connection Lines */}
              <svg 
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                {tree.layout.connections.map((connection, index) => {
                  const fromNode = tree.nodes.find(n => n.id === connection.fromNodeId);
                  const toNode = tree.nodes.find(n => n.id === connection.toNodeId);
                  
                  if (!fromNode || !toNode) return null;

                  // Simple line connection (you could make this more sophisticated)
                  const fromX = (fromNode.position.x - 0.5) * 100 + 50;
                  const fromY = (fromNode.position.y - 0.5) * 100 + 50;
                  const toX = (toNode.position.x - 0.5) * 100 + 50;
                  const toY = (toNode.position.y - 0.5) * 100 + 50;

                  return (
                    <line
                      key={index}
                      x1={`${fromX}%`}
                      y1={`${fromY}%`}
                      x2={`${toX}%`}
                      y2={`${toY}%`}
                      stroke="#cbd5e1"
                      strokeWidth="2"
                      strokeDasharray={connection.type === 'prerequisite' ? '0' : '5,5'}
                    />
                  );
                })}
              </svg>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedNode.name}</span>
              <Badge variant="outline">
                Tier {selectedNode.tier} • {selectedNode.cost} points
              </Badge>
            </CardTitle>
            <CardDescription>{selectedNode.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Effects:</h4>
              <ul className="space-y-1">
                {selectedNode.effects.map((effect, index) => (
                  <li key={index} className="text-sm text-green-600">
                    • {effect.description}
                  </li>
                ))}
              </ul>
            </div>

            {selectedNode.prerequisites.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Prerequisites:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.prerequisites.map((prereqId) => {
                    const prereqNode = currentTree.nodes.find(n => n.id === prereqId);
                    const isCompleted = purchasedNodes.includes(prereqId);
                    return (
                      <Badge 
                        key={prereqId} 
                        variant={isCompleted ? "default" : "secondary"}
                      >
                        {prereqNode?.name || prereqId}
                        {isCompleted && <Check className="w-3 h-3 ml-1" />}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Status: {getNodeStatus(selectedNode).replace('_', ' ')}
              </div>
              {getNodeStatus(selectedNode) === 'available' && (
                <Button 
                  onClick={() => handlePurchaseNode(selectedNode.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Purchase ({selectedNode.cost} points)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
