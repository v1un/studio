/**
 * Enhanced Inventory Interface Component
 * 
 * Comprehensive inventory management UI featuring:
 * - Equipment slots with drag-and-drop functionality
 * - Item categorization and filtering
 * - Set bonus and synergy displays
 * - Maintenance alerts and item condition indicators
 * - Equipment recommendations
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SwordsIcon,
  ShieldIcon,
  PackageIcon,
  AlertTriangleIcon,
  StarIcon,
  TrendingUpIcon,
  WrenchIcon,
  GemIcon,
  FlaskConicalIcon,
  HammerIcon,
  SparklesIcon
} from 'lucide-react';

import type {
  CharacterProfile,
  EnhancedItem,
  EquipmentSlot
} from '@/types/story';

import type {
  InventoryState,
  EquipmentBonusCalculation,
  EquipmentSetInfo,
  SynergyInfo,
  EquipmentRecommendation
} from '@/lib/inventory-manager';

interface InventoryInterfaceProps {
  character: CharacterProfile;
  inventoryState: InventoryState;
  equipmentBonuses?: EquipmentBonusCalculation;
  activeSets: EquipmentSetInfo[];
  activeSynergies: SynergyInfo[];
  recommendations: EquipmentRecommendation[];
  onEquipItem: (itemId: string, slot: EquipmentSlot) => void;
  onUnequipItem: (slot: EquipmentSlot) => void;
  onRepairItem: (itemId: string) => void;
  onMaintainItem: (itemId: string) => void;
  onEnhanceItem: (itemId: string) => void;
}

const EQUIPMENT_SLOT_ICONS = {
  weapon: SwordsIcon,
  shield: ShieldIcon,
  head: PackageIcon,
  body: PackageIcon,
  legs: PackageIcon,
  feet: PackageIcon,
  hands: PackageIcon,
  neck: GemIcon,
  ring1: GemIcon,
  ring2: GemIcon,
};

const ITEM_TYPE_ICONS = {
  weapon: SwordsIcon,
  armor: ShieldIcon,
  accessory: GemIcon,
  consumable: FlaskConicalIcon,
  material: PackageIcon,
  tool: HammerIcon,
  quest: StarIcon,
  enhancement: SparklesIcon,
  gem: GemIcon,
  rune: SparklesIcon,
};

export const InventoryInterface: React.FC<InventoryInterfaceProps> = ({
  character,
  inventoryState,
  equipmentBonuses,
  activeSets,
  activeSynergies,
  recommendations,
  onEquipItem,
  onUnequipItem,
  onRepairItem,
  onMaintainItem,
  onEnhanceItem
}) => {
  const [selectedTab, setSelectedTab] = useState('equipment');
  const [selectedItem, setSelectedItem] = useState<EnhancedItem | null>(null);

  const maintenanceAlerts = useMemo(() => {
    return inventoryState.maintenanceAlerts || [];
  }, [inventoryState.maintenanceAlerts]);

  const getItemConditionColor = (item: EnhancedItem): string => {
    if (!item.condition) return 'text-foreground';
    
    switch (item.condition.current) {
      case 'pristine': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'worn': return 'text-yellow-500';
      case 'damaged': return 'text-orange-500';
      case 'broken': return 'text-red-500';
      default: return 'text-foreground';
    }
  };

  const getDurabilityPercentage = (item: EnhancedItem): number => {
    if (!item.durability) return 100;
    return (item.durability.current / item.durability.maximum) * 100;
  };

  const getRarityColor = (rarity?: string): string => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'uncommon': return 'text-green-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-orange-500';
      default: return 'text-foreground';
    }
  };

  const EquipmentSlot: React.FC<{ slot: EquipmentSlot; item: EnhancedItem | null }> = ({ slot, item }) => {
    const SlotIcon = EQUIPMENT_SLOT_ICONS[slot];
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Card className={`w-16 h-16 flex items-center justify-center cursor-pointer transition-colors ${
                item ? 'bg-primary/10 border-primary/30' : 'bg-muted border-dashed'
              }`}>
                <CardContent className="p-0">
                  {item ? (
                    <div className="relative">
                      <SlotIcon className={`w-8 h-8 ${getRarityColor(item.rarity)}`} />
                      {item.enhancement?.level && (
                        <Badge className="absolute -top-1 -right-1 text-xs px-1">
                          +{item.enhancement.level}
                        </Badge>
                      )}
                      {item.condition?.current === 'broken' && (
                        <AlertTriangleIcon className="absolute -bottom-1 -right-1 w-3 h-3 text-red-500" />
                      )}
                    </div>
                  ) : (
                    <SlotIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
              
              {item && item.durability && (
                <Progress 
                  value={getDurabilityPercentage(item)} 
                  className="absolute -bottom-2 left-0 right-0 h-1"
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {item ? (
              <div className="space-y-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.enhancement?.level && (
                  <p className="text-sm text-blue-400">Enhancement: +{item.enhancement.level}</p>
                )}
                {item.condition && (
                  <p className={`text-sm ${getItemConditionColor(item)}`}>
                    Condition: {item.condition.current}
                  </p>
                )}
                {item.durability && (
                  <p className="text-sm">
                    Durability: {item.durability.current}/{item.durability.maximum}
                  </p>
                )}
              </div>
            ) : (
              <p>Empty {slot} slot</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const ItemCard: React.FC<{ item: EnhancedItem; showActions?: boolean }> = ({ item, showActions = true }) => {
    const ItemIcon = ITEM_TYPE_ICONS[item.itemType] || PackageIcon;
    
    return (
      <Card className="p-3 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedItem(item)}>
        <div className="flex items-start space-x-3">
          <div className="relative">
            <ItemIcon className={`w-8 h-8 ${getRarityColor(item.rarity)}`} />
            {item.enhancement?.level && (
              <Badge className="absolute -top-1 -right-1 text-xs px-1">
                +{item.enhancement.level}
              </Badge>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium truncate">{item.name}</h4>
              {item.rarity && (
                <Badge variant="outline" className={getRarityColor(item.rarity)}>
                  {item.rarity}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            
            {item.durability && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Durability</span>
                  <span>{item.durability.current}/{item.durability.maximum}</span>
                </div>
                <Progress value={getDurabilityPercentage(item)} className="h-1" />
              </div>
            )}
            
            {showActions && (
              <div className="flex space-x-1 mt-2">
                {item.equipSlot && (
                  <Button size="sm" variant="outline" onClick={(e) => {
                    e.stopPropagation();
                    onEquipItem(item.id, item.equipSlot!);
                  }}>
                    Equip
                  </Button>
                )}
                
                {item.durability && item.durability.current < item.durability.maximum && (
                  <Button size="sm" variant="outline" onClick={(e) => {
                    e.stopPropagation();
                    onRepairItem(item.id);
                  }}>
                    <WrenchIcon className="w-3 h-3 mr-1" />
                    Repair
                  </Button>
                )}
                
                {item.enhancement && item.enhancement.level < item.enhancement.maxLevel && (
                  <Button size="sm" variant="outline" onClick={(e) => {
                    e.stopPropagation();
                    onEnhanceItem(item.id);
                  }}>
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Enhance
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Alerts */}
      {maintenanceAlerts.length > 0 && (
        <Alert>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Maintenance Required:</p>
              {maintenanceAlerts.map((alert, index) => (
                <p key={index} className="text-sm">{alert}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="sets">Sets & Synergies</TabsTrigger>
          <TabsTrigger value="crafting">Crafting</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SwordsIcon className="w-5 h-5 mr-2" />
                Equipment Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(inventoryState.equippedItems).map(([slot, item]) => (
                  <div key={slot} className="text-center">
                    <EquipmentSlot slot={slot as EquipmentSlot} item={item} />
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {slot.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Equipment Bonuses Summary */}
          {equipmentBonuses && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUpIcon className="w-5 h-5 mr-2" />
                  Equipment Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Base Stats</p>
                    <p>{equipmentBonuses.baseStats.length} bonuses</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Set Bonuses</p>
                    <p>{equipmentBonuses.setBonuses.length} bonuses</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Synergies</p>
                    <p>{equipmentBonuses.synergyBonuses.length} bonuses</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Conditional</p>
                    <p>{equipmentBonuses.conditionalBonuses.length} bonuses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weapons & Armor</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {inventoryState.unequippedItems
                      .filter(item => ['weapon', 'armor'].includes(item.itemType))
                      .map(item => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Consumables</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {inventoryState.consumables.map(item => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {inventoryState.craftingMaterials.map(item => (
                      <ItemCard key={item.id} item={item} showActions={false} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StarIcon className="w-5 h-5 mr-2" />
                  Active Equipment Sets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSets.map(set => (
                    <div key={set.setId} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{set.setName}</h4>
                        <Badge>{set.totalPieces} pieces</Badge>
                      </div>
                      <div className="space-y-1">
                        {set.activeBonuses.map(bonus => (
                          <div key={bonus.setId + bonus.requiredPieces} className="text-sm">
                            <span className="text-green-600">({bonus.requiredPieces}pc)</span> {bonus.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {activeSets.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No active equipment sets</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Active Synergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSynergies.map(synergy => (
                    <div key={synergy.synergyId} className="border rounded-lg p-3">
                      <h4 className="font-medium mb-2">{synergy.name}</h4>
                      <div className="space-y-1">
                        {synergy.effects.map((effect, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            {effect.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {activeSynergies.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No active synergies</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="crafting">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HammerIcon className="w-5 h-5 mr-2" />
                  Available Recipes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    <div className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Iron Sword</h4>
                        <Badge variant="outline">Smithing</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">A sturdy sword forged from iron</p>
                      <div className="text-xs text-muted-foreground">
                        <p>Materials: Iron Ingot x3, Wood Handle x1</p>
                        <p>Success Rate: 80% | Experience: 25</p>
                      </div>
                      <Button size="sm" className="mt-2" disabled>
                        Craft (Missing Materials)
                      </Button>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Health Potion</h4>
                        <Badge variant="outline">Alchemy</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Restores health when consumed</p>
                      <div className="text-xs text-muted-foreground">
                        <p>Materials: Red Herb x2, Spring Water x1</p>
                        <p>Success Rate: 90% | Experience: 15</p>
                      </div>
                      <Button size="sm" className="mt-2">
                        Craft
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FlaskConicalIcon className="w-5 h-5 mr-2" />
                  Crafting Stations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Basic Smithy</h4>
                      <Badge>Level 1</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">+10% smithing success rate</p>
                    <Button size="sm" variant="outline">
                      Use Station
                    </Button>
                  </div>

                  <div className="border rounded-lg p-3 opacity-60">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Alchemy Laboratory</h4>
                      <Badge variant="outline">Locked</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Requires Alchemy skill level 5</p>
                    <Button size="sm" variant="outline" disabled>
                      Locked
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUpIcon className="w-5 h-5 mr-2" />
                Equipment Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.slice(0, 5).map((rec, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{rec.recommendedItem.name}</h4>
                        <p className="text-sm text-muted-foreground">for {rec.slot} slot</p>
                      </div>
                      <Badge variant={rec.improvementType === 'set_bonus' ? 'default' : 'outline'}>
                        {rec.improvementType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm">{rec.description}</p>
                    <Button size="sm" className="mt-2" onClick={() => onEquipItem(rec.recommendedItem.id, rec.slot)}>
                      Equip Now
                    </Button>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No equipment recommendations available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
