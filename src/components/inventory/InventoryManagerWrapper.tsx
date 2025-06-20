/**
 * Inventory Manager Wrapper Component
 * 
 * Integrates the comprehensive inventory system with the existing game state:
 * - Converts existing character and story state to enhanced inventory format
 * - Manages inventory operations and state updates
 * - Provides seamless integration with character progression
 * - Handles inventory persistence and synchronization
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryInterface } from './InventoryInterface';
import { ItemEnhancementInterface } from './ItemEnhancementInterface';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, PackageIcon } from 'lucide-react';

import type {
  CharacterProfile,
  StructuredStoryState,
  EnhancedItem,
  EquipmentSlot,
  Item
} from '@/types/story';

import {
  InventoryManager,
  type InventoryState
} from '@/lib/inventory-manager';

import {
  EQUIPMENT_SETS,
  ITEM_SYNERGIES,
  CRAFTING_STATIONS,
  CRAFTING_RECIPES
} from '@/data/item-sets-and-synergies';

import { runCompleteInventoryDemo } from '@/lib/inventory-demo';

interface InventoryManagerWrapperProps {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  onCharacterUpdate: (updatedCharacter: CharacterProfile) => void;
  onStoryStateUpdate: (updatedStoryState: StructuredStoryState) => void;
}

interface NotificationState {
  type: 'success' | 'error' | 'warning';
  message: string;
  visible: boolean;
}

export const InventoryManagerWrapper: React.FC<InventoryManagerWrapperProps> = ({
  character,
  storyState,
  onCharacterUpdate,
  onStoryStateUpdate
}) => {
  const [inventoryManager, setInventoryManager] = useState<InventoryManager | null>(null);
  const [enhancementItem, setEnhancementItem] = useState<EnhancedItem | null>(null);
  const [notification, setNotification] = useState<NotificationState>({
    type: 'success',
    message: '',
    visible: false
  });

  // Convert existing items to enhanced items format
  const convertToEnhancedItem = useCallback((item: Item): EnhancedItem => {
    return {
      ...item,
      itemType: item.equipSlot ? (item.equipSlot === 'weapon' ? 'weapon' : 'armor') : 
                item.isConsumable ? 'consumable' : 'material',
      craftingQuality: 'normal',
      enhancement: item.equipSlot ? {
        level: 0,
        maxLevel: 10,
        bonusStats: [],
        enhancementCost: [{ itemId: 'enhancement_stone', quantity: 1 }],
        failureChance: 10,
        destructionChance: 0
      } : undefined,
      durability: item.equipSlot ? {
        current: 100,
        maximum: 100,
        degradationRate: 1.0,
        repairCost: [{ itemId: 'repair_kit', quantity: 1 }]
      } : undefined
    };
  }, []);

  // Create inventory state from existing story state
  const createInventoryState = useCallback((): InventoryState => {
    const enhancedEquippedItems: Partial<Record<EquipmentSlot, EnhancedItem | null>> = {};
    
    // Convert equipped items
    Object.entries(storyState.equippedItems || {}).forEach(([slot, item]) => {
      enhancedEquippedItems[slot as EquipmentSlot] = item ? convertToEnhancedItem(item) : null;
    });

    // Convert inventory items
    const enhancedInventoryItems = (storyState.inventory || []).map(convertToEnhancedItem);

    return {
      unequippedItems: enhancedInventoryItems.filter(item => 
        !item.equipSlot && !['consumable', 'material'].includes(item.itemType)
      ),
      equippedItems: enhancedEquippedItems,
      craftingMaterials: enhancedInventoryItems.filter(item => item.itemType === 'material'),
      consumables: enhancedInventoryItems.filter(item => item.itemType === 'consumable'),
      questItems: enhancedInventoryItems.filter(item => item.isQuestItem),
      currency: character.currency || 0
    };
  }, [storyState, character, convertToEnhancedItem]);

  // Initialize inventory manager
  useEffect(() => {
    const inventoryState = createInventoryState();
    const manager = new InventoryManager(
      character,
      inventoryState,
      EQUIPMENT_SETS,
      ITEM_SYNERGIES,
      CRAFTING_RECIPES,
      CRAFTING_STATIONS
    );
    setInventoryManager(manager);
  }, [character, createInventoryState]);

  // Show notification
  const showNotification = useCallback((type: NotificationState['type'], message: string) => {
    setNotification({ type, message, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  // Update story state from inventory changes
  const updateStoryStateFromInventory = useCallback((manager: InventoryManager) => {
    const inventoryState = manager.getInventoryState();
    
    // Convert enhanced items back to regular items
    const convertToRegularItem = (enhancedItem: EnhancedItem): Item => {
      const { itemType, enhancement, durability, condition, craftingQuality, ...regularItem } = enhancedItem;
      return regularItem;
    };

    // Update equipped items
    const updatedEquippedItems: Partial<Record<EquipmentSlot, Item | null>> = {};
    Object.entries(inventoryState.equippedItems).forEach(([slot, item]) => {
      updatedEquippedItems[slot as EquipmentSlot] = item ? convertToRegularItem(item) : null;
    });

    // Update inventory
    const updatedInventory = [
      ...inventoryState.unequippedItems,
      ...inventoryState.craftingMaterials,
      ...inventoryState.consumables,
      ...inventoryState.questItems
    ].map(convertToRegularItem);

    // Update story state
    const updatedStoryState = {
      ...storyState,
      equippedItems: updatedEquippedItems,
      inventory: updatedInventory
    };

    // Update character currency
    const updatedCharacter = {
      ...character,
      currency: inventoryState.currency
    };

    onStoryStateUpdate(updatedStoryState);
    onCharacterUpdate(updatedCharacter);
  }, [storyState, character, onStoryStateUpdate, onCharacterUpdate]);

  // Equipment handlers
  const handleEquipItem = useCallback(async (itemId: string, slot: EquipmentSlot) => {
    if (!inventoryManager) return;

    const result = inventoryManager.equipItem(itemId, slot);
    if (result.success) {
      updateStoryStateFromInventory(inventoryManager);
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
  }, [inventoryManager, updateStoryStateFromInventory, showNotification]);

  const handleUnequipItem = useCallback(async (slot: EquipmentSlot) => {
    if (!inventoryManager) return;

    const result = inventoryManager.unequipItem(slot);
    if (result.success) {
      updateStoryStateFromInventory(inventoryManager);
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
  }, [inventoryManager, updateStoryStateFromInventory, showNotification]);

  // Repair handler
  const handleRepairItem = useCallback(async (itemId: string) => {
    if (!inventoryManager) return;

    const result = inventoryManager.repairItem(itemId);
    if (result.success) {
      updateStoryStateFromInventory(inventoryManager);
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
  }, [inventoryManager, updateStoryStateFromInventory, showNotification]);

  // Maintenance handler
  const handleMaintainItem = useCallback(async (itemId: string) => {
    if (!inventoryManager) return;

    const result = inventoryManager.maintainItem(itemId);
    updateStoryStateFromInventory(inventoryManager);
    showNotification(result.success ? 'success' : 'warning', result.message);
  }, [inventoryManager, updateStoryStateFromInventory, showNotification]);

  // Enhancement handler
  const handleEnhanceItem = useCallback(async (itemId: string) => {
    if (!inventoryManager) return;

    const inventoryState = inventoryManager.getInventoryState();
    const item = [
      ...inventoryState.unequippedItems,
      ...inventoryState.craftingMaterials,
      ...inventoryState.consumables,
      ...inventoryState.questItems,
      ...Object.values(inventoryState.equippedItems).filter(item => item !== null) as EnhancedItem[]
    ].find(item => item.id === itemId);

    if (item) {
      setEnhancementItem(item);
    }
  }, [inventoryManager]);

  // Enhancement interface handler
  const handleEnhancementAttempt = useCallback(async (
    itemId: string, 
    materials: { itemId: string; quantity: number }[]
  ) => {
    if (!inventoryManager) {
      return { success: false, message: 'Inventory manager not initialized' };
    }

    const result = inventoryManager.enhanceItem(itemId, materials);
    updateStoryStateFromInventory(inventoryManager);
    
    return result;
  }, [inventoryManager, updateStoryStateFromInventory]);

  // Run demo
  const handleRunDemo = useCallback(() => {
    try {
      runCompleteInventoryDemo();
      showNotification('success', 'Demo completed successfully! Check console for details.');
    } catch (error) {
      showNotification('error', 'Demo failed to run. Check console for errors.');
      console.error('Demo error:', error);
    }
  }, [showNotification]);

  // Memoized values for performance
  const inventoryData = useMemo(() => {
    if (!inventoryManager) return null;

    return {
      inventoryState: inventoryManager.getInventoryState(),
      equipmentBonuses: inventoryManager.getEquipmentBonuses(),
      activeSets: inventoryManager.getActiveSets(),
      activeSynergies: inventoryManager.getActiveSynergies(),
      recommendations: inventoryManager.getEquipmentRecommendations()
    };
  }, [inventoryManager]);

  if (!inventoryManager || !inventoryData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loading inventory system...</p>
          <Button onClick={handleRunDemo} variant="outline">
            Run System Demo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Equipment & Inventory</h2>
          <p className="text-muted-foreground">
            Manage your equipment, items, crafting materials, and gear optimization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Currency</div>
            <div className="text-lg font-bold text-yellow-600">
              {inventoryData.inventoryState.currency} coins
            </div>
          </div>
        </div>
      </div>

      {/* Quick Equipment Overview */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center">
          <PackageIcon className="w-5 h-5 mr-2" />
          Quick Equipment Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          {Object.entries(inventoryData.inventoryState.equippedItems).map(([slot, item]) => (
            <div key={slot} className="flex flex-col p-2 border rounded">
              <span className="font-medium capitalize text-muted-foreground text-xs mb-1">
                {slot.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className={item ? "text-foreground truncate" : "text-muted-foreground italic"}>
                {item ? item.name : "Empty"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Use the Equipment tab below for detailed equipment management and optimization
        </div>
      </div>

      {/* Notification */}
      {notification.visible && (
        <Alert className={`${
          notification.type === 'success' ? 'border-green-500' :
          notification.type === 'error' ? 'border-red-500' : 'border-yellow-500'
        }`}>
          {notification.type === 'success' && <CheckCircleIcon className="h-4 w-4" />}
          {notification.type === 'error' && <XCircleIcon className="h-4 w-4" />}
          {notification.type === 'warning' && <AlertTriangleIcon className="h-4 w-4" />}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Demo Button */}
      <div className="flex justify-end">
        <Button onClick={handleRunDemo} variant="outline" size="sm">
          Run System Demo
        </Button>
      </div>

      {/* Main Inventory Interface */}
      <InventoryInterface
        character={character}
        inventoryState={inventoryData.inventoryState}
        equipmentBonuses={inventoryData.equipmentBonuses}
        activeSets={inventoryData.activeSets}
        activeSynergies={inventoryData.activeSynergies}
        recommendations={inventoryData.recommendations}
        onEquipItem={handleEquipItem}
        onUnequipItem={handleUnequipItem}
        onRepairItem={handleRepairItem}
        onMaintainItem={handleMaintainItem}
        onEnhanceItem={handleEnhanceItem}
      />

      {/* Enhancement Modal */}
      {enhancementItem && (
        <Modal
          isOpen={true}
          onClose={() => setEnhancementItem(null)}
          title="Item Enhancement"
          size="lg"
        >
          <ItemEnhancementInterface
            character={character}
            item={enhancementItem}
            availableMaterials={inventoryData.inventoryState.craftingMaterials}
            onEnhanceItem={handleEnhancementAttempt}
            onClose={() => setEnhancementItem(null)}
          />
        </Modal>
      )}
    </div>
  );
};
