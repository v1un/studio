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
import { EnhancedCard, EnhancedCardGrid, StatDisplayCard } from '@/components/ui/enhanced-card';
import { SearchFilter } from '@/components/ui/search-filter';
import { ResponsiveGrid } from '@/components/ui/responsive-grid';
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
  SparklesIcon,
  Search,
  Filter,
  Grid3X3,
  List,
  ArrowUpDown,
  Package,
  Zap,
  Shield,
  Heart,
  Plus,
  Minus,
  MoreHorizontal
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
import RecipeViewer from './RecipeViewer';
import { CRAFTING_RECIPES } from '@/data/item-sets-and-synergies';

// Helper function to determine equipment slot for an item
const getEquipmentSlotForItem = (item: EnhancedItem): EquipmentSlot | null => {
  // This is a simplified mapping - in a real implementation,
  // items would have a specific slot property
  if (item.name?.toLowerCase().includes('sword') || item.name?.toLowerCase().includes('weapon')) {
    return 'main_hand';
  }
  if (item.name?.toLowerCase().includes('shield')) {
    return 'off_hand';
  }
  if (item.name?.toLowerCase().includes('helmet') || item.name?.toLowerCase().includes('hat')) {
    return 'head';
  }
  if (item.name?.toLowerCase().includes('armor') || item.name?.toLowerCase().includes('chest')) {
    return 'chest';
  }
  if (item.name?.toLowerCase().includes('boots') || item.name?.toLowerCase().includes('shoes')) {
    return 'feet';
  }
  if (item.name?.toLowerCase().includes('ring')) {
    return 'ring';
  }
  if (item.name?.toLowerCase().includes('necklace') || item.name?.toLowerCase().includes('amulet')) {
    return 'necklace';
  }
  return null;
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');

  const maintenanceAlerts = useMemo(() => {
    return inventoryState.maintenanceAlerts || [];
  }, [inventoryState.maintenanceAlerts]);

  // Filter and search functionality
  const filterGroups = useMemo(() => [
    {
      id: 'itemType',
      label: 'Item Type',
      type: 'checkbox' as const,
      options: [
        { id: 'weapon', label: 'Weapons', value: 'weapon' },
        { id: 'armor', label: 'Armor', value: 'armor' },
        { id: 'accessory', label: 'Accessories', value: 'accessory' },
        { id: 'consumable', label: 'Consumables', value: 'consumable' },
        { id: 'material', label: 'Materials', value: 'material' },
        { id: 'tool', label: 'Tools', value: 'tool' },
        { id: 'quest', label: 'Quest Items', value: 'quest' }
      ]
    },
    {
      id: 'rarity',
      label: 'Rarity',
      type: 'checkbox' as const,
      options: [
        { id: 'common', label: 'Common', value: 'common' },
        { id: 'uncommon', label: 'Uncommon', value: 'uncommon' },
        { id: 'rare', label: 'Rare', value: 'rare' },
        { id: 'epic', label: 'Epic', value: 'epic' },
        { id: 'legendary', label: 'Legendary', value: 'legendary' }
      ]
    },
    {
      id: 'condition',
      label: 'Condition',
      type: 'checkbox' as const,
      options: [
        { id: 'pristine', label: 'Pristine', value: 'pristine' },
        { id: 'good', label: 'Good', value: 'good' },
        { id: 'worn', label: 'Worn', value: 'worn' },
        { id: 'damaged', label: 'Damaged', value: 'damaged' },
        { id: 'broken', label: 'Broken', value: 'broken' }
      ]
    }
  ], []);

  const sortOptions = useMemo(() => [
    { id: 'name', label: 'Name A-Z', field: 'name', direction: 'asc' as const },
    { id: 'name_desc', label: 'Name Z-A', field: 'name', direction: 'desc' as const },
    { id: 'rarity', label: 'Rarity', field: 'rarity', direction: 'desc' as const },
    { id: 'type', label: 'Type', field: 'itemType', direction: 'asc' as const },
    { id: 'condition', label: 'Condition', field: 'condition', direction: 'desc' as const }
  ], []);

  // Get all items for filtering
  const allItems = useMemo(() => [
    ...inventoryState.unequippedItems,
    ...inventoryState.consumables,
    ...inventoryState.craftingMaterials,
    ...inventoryState.questItems
  ], [inventoryState]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let items = allItems;

    // Apply search filter
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filters
    Object.entries(activeFilters).forEach(([groupId, filterIds]) => {
      if (filterIds.length > 0) {
        items = items.filter(item => {
          switch (groupId) {
            case 'itemType':
              return filterIds.includes(item.itemType);
            case 'rarity':
              return item.rarity && filterIds.includes(item.rarity);
            case 'condition':
              return item.condition && filterIds.includes(item.condition.current);
            default:
              return true;
          }
        });
      }
    });

    // Apply sorting
    const sortOption = sortOptions.find(opt => opt.id === sortBy);
    if (sortOption) {
      items.sort((a, b) => {
        let aValue = a[sortOption.field as keyof EnhancedItem] as string;
        let bValue = b[sortOption.field as keyof EnhancedItem] as string;

        if (sortOption.field === 'condition') {
          aValue = a.condition?.current || '';
          bValue = b.condition?.current || '';
        }

        if (sortOption.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }

    return items;
  }, [allItems, searchQuery, activeFilters, sortBy, sortOptions]);

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

  const ItemCard: React.FC<{ item: EnhancedItem; showActions?: boolean; onClick?: () => void }> = ({ item, showActions = true, onClick }) => {
    const ItemIcon = ITEM_TYPE_ICONS[item.itemType] || PackageIcon;

    const handleClick = () => {
      if (onClick) {
        onClick();
      } else {
        setSelectedItem(item);
      }
    };

    return (
      <Card className="p-3 hover:bg-accent/50 transition-colors cursor-pointer" onClick={handleClick}>
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
    <div className="w-full max-w-none space-y-6">
      {/* Maintenance Alerts */}
      {maintenanceAlerts.length > 0 && (
        <EnhancedCard variant="elevated" className="border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangleIcon className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-800 mb-1">Maintenance Required</h3>
              <div className="space-y-1">
                {maintenanceAlerts.map((alert, index) => (
                  <p key={index} className="text-sm text-orange-700">{alert}</p>
                ))}
              </div>
            </div>
          </div>
        </EnhancedCard>
      )}

      {/* Enhanced Header with Stats */}
      <div className="space-y-4">
        <ResponsiveGrid columns={{ default: 2, sm: 4, lg: 6 }} gap="md">
          <StatDisplayCard
            label="Total Items"
            value={allItems.length}
            icon={Package}
            iconColor="text-blue-500"
            description="Items in inventory"
          />
          <StatDisplayCard
            label="Equipped"
            value={Object.values(inventoryState.equippedItems).filter(Boolean).length}
            icon={SwordsIcon}
            iconColor="text-green-500"
            description="Items equipped"
          />
          <StatDisplayCard
            label="Sets Active"
            value={activeSets.length}
            icon={StarIcon}
            iconColor="text-purple-500"
            description="Equipment sets"
          />
          <StatDisplayCard
            label="Synergies"
            value={activeSynergies.length}
            icon={SparklesIcon}
            iconColor="text-orange-500"
            description="Active synergies"
          />
          <StatDisplayCard
            label="Consumables"
            value={inventoryState.consumables.length}
            icon={FlaskConicalIcon}
            iconColor="text-red-500"
            description="Potions & items"
          />
          <StatDisplayCard
            label="Materials"
            value={inventoryState.craftingMaterials.length}
            icon={HammerIcon}
            iconColor="text-yellow-500"
            description="Crafting materials"
          />
        </ResponsiveGrid>
      </div>

      {/* Enhanced Navigation */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <TabsList className="grid grid-cols-5 w-full lg:w-auto">
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <SwordsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="sets" className="flex items-center gap-2">
              <StarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Sets</span>
            </TabsTrigger>
            <TabsTrigger value="crafting" className="flex items-center gap-2">
              <HammerIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Crafting</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Recommendations</span>
            </TabsTrigger>
          </TabsList>

          {/* Search and Controls for Inventory Tab */}
          {selectedTab === 'inventory' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <SearchFilter
                searchPlaceholder="Search items..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filterGroups={filterGroups}
                activeFilters={activeFilters}
                onFiltersChange={setActiveFilters}
                sortOptions={sortOptions}
                activeSortOption={sortBy}
                onSortChange={setSortBy}
                showResultCount
                resultCount={filteredItems.length}
                className="flex-1 lg:w-96"
              />
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="equipment" className="space-y-6">
          {/* Equipment Slots */}
          <EnhancedCard
            title="Equipment Slots"
            description="Click items in inventory to equip them"
            icon={SwordsIcon}
            iconColor="text-blue-500"
            animation="slide-left"
          >
            <ResponsiveGrid
              columns={{ default: 3, sm: 5, lg: 5 }}
              gap="lg"
              className="justify-items-center"
            >
              {Object.entries(inventoryState.equippedItems).map(([slot, item]) => (
                <div key={slot} className="text-center space-y-2">
                  <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors">
                    {item ? (
                      <div className="relative group">
                        <EquipmentSlot slot={slot as EquipmentSlot} item={item} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUnequipItem(slot as EquipmentSlot)}
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        {slot.replace('_', ' ').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize font-medium">
                    {slot.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              ))}
            </ResponsiveGrid>
          </EnhancedCard>

          {/* Equipment Bonuses Summary */}
          {equipmentBonuses && (
            <ResponsiveGrid columns={{ default: 1, lg: 2 }} gap="lg">
              <EnhancedCard
                title="Equipment Bonuses"
                description="Active bonuses from your equipped items"
                icon={TrendingUpIcon}
                iconColor="text-green-500"
                animation="slide-left"
              >
                <ResponsiveGrid columns={{ default: 2, sm: 4 }} gap="sm">
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <div className="text-2xl font-bold text-blue-500">{equipmentBonuses.baseStats.length}</div>
                    <div className="text-sm text-muted-foreground">Base Stats</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-2xl font-bold text-purple-500">{equipmentBonuses.setBonuses.length}</div>
                    <div className="text-sm text-muted-foreground">Set Bonuses</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-orange-500/10">
                    <div className="text-2xl font-bold text-orange-500">{equipmentBonuses.synergyBonuses.length}</div>
                    <div className="text-sm text-muted-foreground">Synergies</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-500">{equipmentBonuses.conditionalBonuses.length}</div>
                    <div className="text-sm text-muted-foreground">Conditional</div>
                  </div>
                </ResponsiveGrid>
              </EnhancedCard>

              <EnhancedCard
                title="Character Stats"
                description="Your character's current combat statistics"
                icon={Zap}
                iconColor="text-yellow-500"
                animation="slide-right"
              >
                <ResponsiveGrid columns={{ default: 2 }} gap="sm">
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <div className="text-2xl font-bold text-red-500">{character.attack || 0}</div>
                    <div className="text-sm text-muted-foreground">Attack</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <div className="text-2xl font-bold text-blue-500">{character.defense || 0}</div>
                    <div className="text-sm text-muted-foreground">Defense</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-500">{character.health}</div>
                    <div className="text-sm text-muted-foreground">Health</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <div className="text-2xl font-bold text-purple-500">{character.mana || 0}</div>
                    <div className="text-sm text-muted-foreground">Mana</div>
                  </div>
                </ResponsiveGrid>
              </EnhancedCard>
            </ResponsiveGrid>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          {/* Enhanced Inventory Display */}
          <EnhancedCard
            title={`Inventory (${filteredItems.length} items)`}
            description="Manage your items with advanced filtering and sorting"
            icon={Package}
            iconColor="text-blue-500"
          >
            {filteredItems.length > 0 ? (
              <div className="space-y-4">
                {viewMode === 'grid' ? (
                  <ResponsiveGrid
                    columns={{ default: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
                    gap="md"
                    maximized
                  >
                    {filteredItems.map(item => (
                      <div key={item.id} className="h-full">
                        <ItemCard
                          item={item}
                          onClick={() => {
                            // Try to equip the item if it's equippable
                            if (item.itemType && ['weapon', 'armor', 'accessory'].includes(item.itemType)) {
                              const slot = getEquipmentSlotForItem(item);
                              if (slot) {
                                onEquipItem(item.id, slot);
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </ResponsiveGrid>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map(item => (
                      <div key={item.id}>
                        <ItemCard
                          item={item}
                          onClick={() => {
                            // Try to equip the item if it's equippable
                            if (item.itemType && ['weapon', 'armor', 'accessory'].includes(item.itemType)) {
                              const slot = getEquipmentSlotForItem(item);
                              if (slot) {
                                onEquipItem(item.id, slot);
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || Object.keys(activeFilters).length > 0
                    ? 'Try adjusting your search or filters'
                    : 'Your inventory is empty'
                  }
                </p>
              </div>
            )}
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="sets" className="space-y-6">
          <ResponsiveGrid columns={{ default: 1, lg: 2 }} gap="lg">
            <EnhancedCard
              title="Active Equipment Sets"
              description="Equipment sets provide powerful bonuses when multiple pieces are worn"
              icon={StarIcon}
              iconColor="text-purple-500"
              animation="slide-left"
            >
              {activeSets.length > 0 ? (
                <div className="space-y-4">
                  {activeSets.map(set => (
                    <div key={set.setId} className="p-4 rounded-lg border bg-card">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-lg">{set.setName}</h4>
                        <Badge variant="secondary" className="text-sm">
                          {set.totalPieces} pieces
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {set.activeBonuses.map(bonus => (
                          <div key={bonus.setId + bonus.requiredPieces} className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                              {bonus.requiredPieces}pc
                            </Badge>
                            <span className="text-sm">{bonus.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <StarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active equipment sets</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Equip multiple pieces from the same set to activate bonuses
                  </p>
                </div>
              )}
            </EnhancedCard>

            <EnhancedCard
              title="Active Synergies"
              description="Item synergies provide additional bonuses when specific combinations are equipped"
              icon={SparklesIcon}
              iconColor="text-orange-500"
              animation="slide-right"
            >
              {activeSynergies.length > 0 ? (
                <div className="space-y-4">
                  {activeSynergies.map(synergy => (
                    <div key={synergy.synergyId} className="p-4 rounded-lg border bg-card">
                      <h4 className="font-semibold text-lg mb-3">{synergy.name}</h4>
                      <div className="space-y-2">
                        {synergy.effects.map((effect, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <SparklesIcon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                            <span className="text-sm">{effect.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <SparklesIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active synergies</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Equip complementary items to unlock powerful synergies
                  </p>
                </div>
              )}
            </EnhancedCard>
          </ResponsiveGrid>
        </TabsContent>

        <TabsContent value="crafting" className="space-y-6">
          <EnhancedCard
            title="Recipe Book"
            description="Browse available crafting recipes and their requirements"
            icon={HammerIcon}
            iconColor="text-yellow-500"
          >
            <RecipeViewer
              recipes={CRAFTING_RECIPES}
              availableItems={[
                ...inventoryState.unequippedItems,
                ...inventoryState.craftingMaterials,
                ...inventoryState.consumables
              ]}
              character={character}
            />
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <EnhancedCard
            title="Equipment Recommendations"
            description="AI-powered suggestions to optimize your equipment loadout"
            icon={TrendingUpIcon}
            iconColor="text-green-500"
          >
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{rec.type}</h4>
                      <Badge variant="outline">{rec.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>
                    <Button size="sm" variant="outline">
                      Apply Recommendation
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUpIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recommendations</h3>
                <p className="text-muted-foreground mb-4">
                  Your equipment is optimally configured, or you need more items to generate recommendations.
                </p>
                <p className="text-sm text-muted-foreground">
                  Recommendations will appear here as you acquire new equipment.
                </p>
              </div>
            )}
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};
