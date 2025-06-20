"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  X,
  Lock,
  Unlock,
  CheckCircle,
  Star,
  Zap,
  ArrowRight,
  AlertCircle,
  Crown
} from 'lucide-react';
import type { 
  CharacterProfile, 
  SpecializationTree,
  SpecializationNode,
  SpecializationBonus
} from '@/types/story';

interface SpecializationTreeViewProps {
  tree: SpecializationTree;
  character: CharacterProfile;
  onPurchaseNode: (treeId: string, nodeId: string) => Promise<void>;
  onClose: () => void;
}

export function SpecializationTreeView({ 
  tree, 
  character, 
  onPurchaseNode, 
  onClose 
}: SpecializationTreeViewProps) {
  const [selectedNode, setSelectedNode] = useState<SpecializationNode | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const specializationProgression = character.specializationProgression;
  const availablePoints = specializationProgression?.availablePoints || 0;
  const unlockedTree = specializationProgression?.specializationTrees[tree.id];

  const handlePurchaseNode = async (nodeId: string) => {
    try {
      setIsPurchasing(true);
      await onPurchaseNode(tree.id, nodeId);
      setSelectedNode(null);
    } catch (error) {
      console.error('Failed to purchase node:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const getNodeStatus = (node: SpecializationNode) => {
    if (unlockedTree) {
      const treeNode = unlockedTree.nodes.find(n => n.id === node.id);
      if (treeNode?.isPurchased) return 'purchased';
      if (treeNode?.isUnlocked) return 'unlocked';
    }
    return 'locked';
  };

  const canPurchaseNode = (node: SpecializationNode) => {
    const status = getNodeStatus(node);
    return status === 'unlocked' && availablePoints >= node.pointCost;
  };

  const getNodeIcon = (node: SpecializationNode) => {
    const status = getNodeStatus(node);
    switch (status) {
      case 'purchased':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unlocked':
        return <Unlock className="h-4 w-4 text-blue-500" />;
      default:
        return <Lock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getNodeColor = (node: SpecializationNode) => {
    const status = getNodeStatus(node);
    switch (status) {
      case 'purchased':
        return 'border-green-500 bg-green-50';
      case 'unlocked':
        return 'border-blue-500 bg-blue-50 hover:bg-blue-100';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const renderBonus = (bonus: SpecializationBonus) => {
    return (
      <div key={`${bonus.type}-${bonus.appliesAtLevel}`} className="text-sm">
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 text-yellow-500" />
          <span className="font-medium">{bonus.description}</span>
        </div>
        {bonus.conditions && bonus.conditions.length > 0 && (
          <div className="ml-5 text-xs text-muted-foreground">
            Conditions: {bonus.conditions.map(c => `${c.target} ${c.operator} ${c.value}`).join(', ')}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {tree.category === 'unique' && <Crown className="h-5 w-5 text-purple-500" />}
                {tree.name}
              </DialogTitle>
              <DialogDescription>{tree.description}</DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{availablePoints}</div>
              <div className="text-xs text-muted-foreground">Available Points</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tree Progress */}
          {unlockedTree && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tree Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {unlockedTree.pointsSpent}/{tree.maxPoints} points
                  </span>
                </div>
                <Progress value={(unlockedTree.pointsSpent / tree.maxPoints) * 100} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Tier Information */}
          <div className="grid gap-3">
            <h3 className="text-lg font-semibold">Specialization Tiers</h3>
            <div className="grid gap-2">
              {tree.tiers.map(tier => (
                <Card key={tier.tier} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Tier {tier.tier}: {tier.name}</div>
                      <div className="text-sm text-muted-foreground">{tier.description}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requires {tier.requiredPoints} points
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Specialization Nodes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Specialization Nodes</h3>
            
            {/* Group nodes by tier */}
            {tree.tiers.map(tier => {
              const tierNodes = tree.nodes.filter(node => node.tier === tier.tier);
              if (tierNodes.length === 0) return null;

              return (
                <div key={tier.tier} className="space-y-3">
                  <h4 className="font-medium text-muted-foreground">
                    Tier {tier.tier} - {tier.name}
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {tierNodes.map(node => (
                      <Card 
                        key={node.id} 
                        className={`cursor-pointer transition-all ${getNodeColor(node)}`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getNodeIcon(node)}
                              <h5 className="font-medium">{node.name}</h5>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{node.pointCost}</span>
                              <Star className="h-3 w-3 text-yellow-500" />
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {node.description}
                          </p>

                          {/* Prerequisites */}
                          {node.prerequisites.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs text-muted-foreground mb-1">Prerequisites:</div>
                              <div className="flex flex-wrap gap-1">
                                {node.prerequisites.map(prereqId => {
                                  const prereqNode = tree.nodes.find(n => n.id === prereqId);
                                  const prereqStatus = getNodeStatus(prereqNode!);
                                  return (
                                    <Badge 
                                      key={prereqId} 
                                      variant={prereqStatus === 'purchased' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {prereqNode?.name}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Bonuses Preview */}
                          <div className="space-y-1">
                            {node.bonuses.slice(0, 2).map((bonus, index) => (
                              <div key={index} className="text-xs text-muted-foreground">
                                • {bonus.description}
                              </div>
                            ))}
                            {node.bonuses.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{node.bonuses.length - 2} more bonuses...
                              </div>
                            )}
                          </div>

                          {/* Purchase Button */}
                          {getNodeStatus(node) === 'unlocked' && (
                            <Button
                              size="sm"
                              className="w-full mt-3"
                              disabled={!canPurchaseNode(node) || isPurchasing}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchaseNode(node.id);
                              }}
                            >
                              {isPurchasing ? 'Purchasing...' : `Purchase (${node.pointCost} points)`}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion Bonuses */}
          {tree.completionBonuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Bonuses</CardTitle>
                <CardDescription>
                  Bonuses gained when the entire specialization tree is completed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tree.completionBonuses.map((bonus, index) => renderBonus(bonus))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Node Detail Modal */}
        {selectedNode && (
          <Dialog open={true} onOpenChange={() => setSelectedNode(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getNodeIcon(selectedNode)}
                  {selectedNode.name}
                </DialogTitle>
                <DialogDescription>{selectedNode.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Node Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Tier:</span> {selectedNode.tier}
                  </div>
                  <div>
                    <span className="font-medium">Cost:</span> {selectedNode.pointCost} points
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge className="ml-2" variant={
                      getNodeStatus(selectedNode) === 'purchased' ? 'default' : 
                      getNodeStatus(selectedNode) === 'unlocked' ? 'secondary' : 'outline'
                    }>
                      {getNodeStatus(selectedNode)}
                    </Badge>
                  </div>
                </div>

                {/* Prerequisites */}
                {selectedNode.prerequisites.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Prerequisites</h4>
                    <div className="space-y-1">
                      {selectedNode.prerequisites.map(prereqId => {
                        const prereqNode = tree.nodes.find(n => n.id === prereqId);
                        const prereqStatus = getNodeStatus(prereqNode!);
                        return (
                          <div key={prereqId} className="flex items-center gap-2 text-sm">
                            {prereqStatus === 'purchased' ? 
                              <CheckCircle className="h-4 w-4 text-green-500" /> :
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            }
                            <span>{prereqNode?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bonuses */}
                <div>
                  <h4 className="font-medium mb-2">Bonuses</h4>
                  <div className="space-y-2">
                    {selectedNode.bonuses.map((bonus, index) => renderBonus(bonus))}
                  </div>
                </div>

                {/* Unique Abilities */}
                {selectedNode.uniqueAbilities && selectedNode.uniqueAbilities.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Unique Abilities Granted</h4>
                    <div className="space-y-1">
                      {selectedNode.uniqueAbilities.map(abilityId => (
                        <Badge key={abilityId} variant="outline" className="mr-2">
                          <Zap className="h-3 w-3 mr-1" />
                          {abilityId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase Button */}
                {getNodeStatus(selectedNode) === 'unlocked' && (
                  <Button
                    className="w-full"
                    disabled={!canPurchaseNode(selectedNode) || isPurchasing}
                    onClick={() => handlePurchaseNode(selectedNode.id)}
                  >
                    {isPurchasing ? 'Purchasing...' : `Purchase for ${selectedNode.pointCost} points`}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
