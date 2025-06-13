/**
 * Comprehensive Inventory Management System
 * 
 * Integrates all item systems into a unified inventory manager:
 * - Equipment management with set bonuses and synergies
 * - Crafting integration with recipe discovery
 * - Item enhancement and maintenance tracking
 * - Strategic item recommendations
 * - Inventory optimization and organization
 */

import type {
  CharacterProfile,
  EnhancedItem,
  EquipmentSlot,
  ItemSetBonus,
  ItemSynergy,
  CraftingRecipe,
  CraftingStation
} from '@/types/story';

import {
  calculateEquipmentBonuses,
  detectEquipmentSets,
  detectItemSynergies,
  generateEquipmentRecommendations,
  type EquipmentBonusCalculation,
  type EquipmentSetInfo,
  type SynergyInfo,
  type EquipmentRecommendation
} from '@/lib/item-synergy-engine';

import {
  attemptCrafting,
  enhanceItem,
  calculateEnhancementSuccess,
  type CraftingAttempt,
  type CraftingResult,
  type EnhancementAttempt
} from '@/lib/crafting-engine';

import {
  applyDurabilityDamage,
  attemptRepair,
  performMaintenance,
  isMaintenanceOverdue,
  type DurabilityDamage,
  type RepairResult
} from '@/lib/item-maintenance-engine';

// === INVENTORY STATE MANAGEMENT ===

export interface InventoryState {
  unequippedItems: EnhancedItem[];
  equippedItems: Partial<Record<EquipmentSlot, EnhancedItem | null>>;
  craftingMaterials: EnhancedItem[];
  consumables: EnhancedItem[];
  questItems: EnhancedItem[];
  currency: number;
  
  // Cached calculations
  equipmentBonuses?: EquipmentBonusCalculation;
  activeSets?: EquipmentSetInfo[];
  activeSynergies?: SynergyInfo[];
  maintenanceAlerts?: string[];
}

export interface InventoryAction {
  type: 'equip' | 'unequip' | 'craft' | 'enhance' | 'repair' | 'maintain' | 'use_consumable' | 'organize';
  itemId?: string;
  targetSlot?: EquipmentSlot;
  recipeId?: string;
  materials?: { itemId: string; quantity: number }[];
  targetDurability?: number;
}

export class InventoryManager {
  private character: CharacterProfile;
  private inventory: InventoryState;
  private availableSets: ItemSetBonus[];
  private availableSynergies: ItemSynergy[];
  private craftingRecipes: CraftingRecipe[];
  private craftingStations: CraftingStation[];

  constructor(
    character: CharacterProfile,
    initialInventory: InventoryState,
    availableSets: ItemSetBonus[],
    availableSynergies: ItemSynergy[],
    craftingRecipes: CraftingRecipe[],
    craftingStations: CraftingStation[]
  ) {
    this.character = character;
    this.inventory = initialInventory;
    this.availableSets = availableSets;
    this.availableSynergies = availableSynergies;
    this.craftingRecipes = craftingRecipes;
    this.craftingStations = craftingStations;
    
    this.updateCachedCalculations();
  }

  // === EQUIPMENT MANAGEMENT ===

  equipItem(itemId: string, targetSlot: EquipmentSlot): { success: boolean; message: string; unequippedItem?: EnhancedItem } {
    const item = this.findItemById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found in inventory' };
    }

    if (item.equipSlot !== targetSlot) {
      return { success: false, message: `Item cannot be equipped in ${targetSlot} slot` };
    }

    // Check if item is broken
    if (item.condition?.current === 'broken') {
      return { success: false, message: 'Cannot equip broken items. Repair the item first.' };
    }

    const currentlyEquipped = this.inventory.equippedItems[targetSlot];
    
    // Unequip current item if any
    if (currentlyEquipped) {
      this.inventory.unequippedItems.push(currentlyEquipped);
    }

    // Equip new item
    this.inventory.equippedItems[targetSlot] = item;
    this.removeItemFromInventory(itemId);
    
    this.updateCachedCalculations();
    
    return {
      success: true,
      message: `Equipped ${item.name}`,
      unequippedItem: currentlyEquipped || undefined
    };
  }

  unequipItem(slot: EquipmentSlot): { success: boolean; message: string; unequippedItem?: EnhancedItem } {
    const item = this.inventory.equippedItems[slot];
    if (!item) {
      return { success: false, message: `No item equipped in ${slot} slot` };
    }

    this.inventory.equippedItems[slot] = null;
    this.inventory.unequippedItems.push(item);
    
    this.updateCachedCalculations();
    
    return {
      success: true,
      message: `Unequipped ${item.name}`,
      unequippedItem: item
    };
  }

  // === CRAFTING INTEGRATION ===

  craftItem(recipeId: string, stationId?: string, materialOverrides?: { [itemId: string]: string }): CraftingResult {
    const recipe = this.craftingRecipes.find(r => r.id === recipeId);
    if (!recipe) {
      return {
        success: false,
        outputItems: [],
        materialsConsumed: [],
        experienceGained: 0,
        qualityAchieved: 'poor',
        failureReason: 'Recipe not found'
      };
    }

    const station = stationId ? this.craftingStations.find(s => s.id === stationId) : undefined;
    
    // Check if we have required materials
    const hasRequiredMaterials = recipe.ingredients.every(ingredient => {
      const requiredId = materialOverrides?.[ingredient.itemId] || ingredient.itemId;
      const available = this.inventory.craftingMaterials.find(item => item.id === requiredId);
      return available && this.getItemQuantity(requiredId) >= ingredient.quantity;
    });

    if (!hasRequiredMaterials) {
      return {
        success: false,
        outputItems: [],
        materialsConsumed: [],
        experienceGained: 0,
        qualityAchieved: 'poor',
        failureReason: 'Insufficient materials'
      };
    }

    const craftingAttempt: CraftingAttempt = {
      recipeId,
      stationId,
      character: this.character,
      materialOverrides
    };

    const result = attemptCrafting(
      craftingAttempt,
      recipe,
      station,
      [...this.inventory.unequippedItems, ...this.inventory.craftingMaterials]
    );

    if (result.success) {
      // Consume materials
      result.materialsConsumed.forEach(material => {
        this.removeItemQuantity(material.itemId, material.quantity);
      });

      // Add crafted items to inventory
      result.outputItems.forEach(item => {
        this.addItemToInventory(item);
      });

      // Award experience (this would integrate with character progression)
      this.character.experiencePoints += result.experienceGained;
    }

    return result;
  }

  // === ITEM ENHANCEMENT ===

  enhanceItem(itemId: string, materials: { itemId: string; quantity: number }[]): { success: boolean; newItem?: EnhancedItem; message: string } {
    const item = this.findItemById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    // Check if we have required materials
    const hasRequiredMaterials = materials.every(material => {
      return this.getItemQuantity(material.itemId) >= material.quantity;
    });

    if (!hasRequiredMaterials) {
      return { success: false, message: 'Insufficient enhancement materials' };
    }

    const enhancementAttempt = calculateEnhancementSuccess(item, materials, this.character);
    const result = enhanceItem(item, enhancementAttempt);

    if (result.success || enhancementAttempt.failureConsequence !== 'destruction') {
      // Consume materials
      materials.forEach(material => {
        this.removeItemQuantity(material.itemId, material.quantity);
      });

      // Update item in inventory
      this.updateItemInInventory(result.newItem);
      this.updateCachedCalculations();
    } else if (enhancementAttempt.failureConsequence === 'destruction') {
      // Remove destroyed item
      this.removeItemFromInventory(itemId);
    }

    return {
      success: result.success,
      newItem: result.newItem,
      message: result.message
    };
  }

  // === MAINTENANCE AND REPAIR ===

  repairItem(itemId: string, targetDurability?: number): RepairResult {
    const item = this.findItemById(itemId);
    if (!item) {
      return {
        success: false,
        durabilityRestored: 0,
        materialsConsumed: [],
        costPaid: 0,
        message: 'Item not found'
      };
    }

    const availableMaterials = this.inventory.craftingMaterials.map(item => ({
      itemId: item.id,
      quantity: this.getItemQuantity(item.id)
    }));

    const result = attemptRepair(item, this.character, availableMaterials, targetDurability);

    if (result.success) {
      // Consume materials and currency
      result.materialsConsumed.forEach(material => {
        this.removeItemQuantity(material.itemId, material.quantity);
      });
      this.inventory.currency -= result.costPaid;

      // Update item durability
      if (item.durability) {
        item.durability.current += result.durabilityRestored;
        this.updateItemInInventory(item);
      }
    }

    return result;
  }

  maintainItem(itemId: string): { success: boolean; item?: EnhancedItem; message: string } {
    const item = this.findItemById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    const result = performMaintenance(item, this.character);
    
    if (result.success || !result.success) {
      this.updateItemInInventory(result.item);
      this.updateCachedCalculations();
    }

    return result;
  }

  // === DURABILITY MANAGEMENT ===

  applyItemDamage(itemId: string, damage: DurabilityDamage): void {
    const item = this.findItemById(itemId);
    if (!item) return;

    const damagedItem = applyDurabilityDamage(item, damage);
    this.updateItemInInventory(damagedItem);
    this.updateCachedCalculations();
  }

  getMaintenanceAlerts(): string[] {
    const alerts: string[] = [];
    
    Object.values(this.inventory.equippedItems).forEach(item => {
      if (item && isMaintenanceOverdue(item)) {
        alerts.push(`${item.name} requires maintenance`);
      }
      
      if (item?.durability && item.durability.current <= item.durability.maximum * 0.2) {
        alerts.push(`${item.name} is in poor condition and needs repair`);
      }
    });

    return alerts;
  }

  // === RECOMMENDATIONS ===

  getEquipmentRecommendations(): EquipmentRecommendation[] {
    return generateEquipmentRecommendations(
      this.character,
      this.inventory.equippedItems,
      this.inventory.unequippedItems,
      this.availableSets,
      this.availableSynergies
    );
  }

  // === UTILITY METHODS ===

  private updateCachedCalculations(): void {
    this.inventory.equipmentBonuses = calculateEquipmentBonuses(
      this.inventory.equippedItems,
      this.character,
      this.availableSets,
      this.availableSynergies
    );
    
    this.inventory.activeSets = detectEquipmentSets(this.inventory.equippedItems, this.availableSets);
    this.inventory.activeSynergies = detectItemSynergies(this.inventory.equippedItems, this.availableSynergies);
    this.inventory.maintenanceAlerts = this.getMaintenanceAlerts();
  }

  private findItemById(itemId: string): EnhancedItem | null {
    // Search in all inventory categories
    const allItems = [
      ...this.inventory.unequippedItems,
      ...this.inventory.craftingMaterials,
      ...this.inventory.consumables,
      ...this.inventory.questItems,
      ...Object.values(this.inventory.equippedItems).filter(item => item !== null) as EnhancedItem[]
    ];
    
    return allItems.find(item => item.id === itemId) || null;
  }

  private removeItemFromInventory(itemId: string): void {
    this.inventory.unequippedItems = this.inventory.unequippedItems.filter(item => item.id !== itemId);
    this.inventory.craftingMaterials = this.inventory.craftingMaterials.filter(item => item.id !== itemId);
    this.inventory.consumables = this.inventory.consumables.filter(item => item.id !== itemId);
    this.inventory.questItems = this.inventory.questItems.filter(item => item.id !== itemId);
  }

  private addItemToInventory(item: EnhancedItem): void {
    switch (item.itemType) {
      case 'material':
        this.inventory.craftingMaterials.push(item);
        break;
      case 'consumable':
        this.inventory.consumables.push(item);
        break;
      case 'quest':
        this.inventory.questItems.push(item);
        break;
      default:
        this.inventory.unequippedItems.push(item);
        break;
    }
  }

  private updateItemInInventory(updatedItem: EnhancedItem): void {
    // Find and update the item in the appropriate inventory section
    const updateInArray = (array: EnhancedItem[]) => {
      const index = array.findIndex(item => item.id === updatedItem.id);
      if (index !== -1) {
        array[index] = updatedItem;
        return true;
      }
      return false;
    };

    if (!updateInArray(this.inventory.unequippedItems) &&
        !updateInArray(this.inventory.craftingMaterials) &&
        !updateInArray(this.inventory.consumables) &&
        !updateInArray(this.inventory.questItems)) {
      
      // Check equipped items
      Object.keys(this.inventory.equippedItems).forEach(slot => {
        const item = this.inventory.equippedItems[slot as EquipmentSlot];
        if (item?.id === updatedItem.id) {
          this.inventory.equippedItems[slot as EquipmentSlot] = updatedItem;
        }
      });
    }
  }

  private getItemQuantity(itemId: string): number {
    // For now, assume each item has quantity 1
    // This could be extended to support stackable items
    const allItems = [
      ...this.inventory.unequippedItems,
      ...this.inventory.craftingMaterials,
      ...this.inventory.consumables,
      ...this.inventory.questItems
    ];
    
    return allItems.filter(item => item.id === itemId).length;
  }

  private removeItemQuantity(itemId: string, quantity: number): void {
    let remaining = quantity;
    
    const removeFromArray = (array: EnhancedItem[]) => {
      for (let i = array.length - 1; i >= 0 && remaining > 0; i--) {
        if (array[i].id === itemId) {
          array.splice(i, 1);
          remaining--;
        }
      }
    };

    removeFromArray(this.inventory.craftingMaterials);
    removeFromArray(this.inventory.unequippedItems);
    removeFromArray(this.inventory.consumables);
  }

  // === PUBLIC GETTERS ===

  getInventoryState(): InventoryState {
    return { ...this.inventory };
  }

  getEquipmentBonuses(): EquipmentBonusCalculation | undefined {
    return this.inventory.equipmentBonuses;
  }

  getActiveSets(): EquipmentSetInfo[] {
    return this.inventory.activeSets || [];
  }

  getActiveSynergies(): SynergyInfo[] {
    return this.inventory.activeSynergies || [];
  }
}
