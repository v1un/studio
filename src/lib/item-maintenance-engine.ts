/**
 * Item Maintenance and Durability Engine
 * 
 * Manages item condition, durability, and maintenance systems:
 * - Durability tracking and degradation
 * - Maintenance requirements and scheduling
 * - Repair mechanics and costs
 * - Condition-based performance penalties
 * - Preventive maintenance bonuses
 */

import type {
  CharacterProfile,
  EnhancedItem,
  ItemDurability,
  ItemCondition,
  MaintenanceRequirement,
  StatModifier
} from '@/types/story';

// === DURABILITY SYSTEM ===

export interface DurabilityDamage {
  amount: number;
  source: 'combat' | 'usage' | 'time' | 'environment';
  description: string;
}

export interface RepairAttempt {
  itemId: string;
  materials: { itemId: string; quantity: number }[];
  skillLevel: number;
  repairAmount: number;
  cost: number;
  successRate: number;
}

export interface RepairResult {
  success: boolean;
  durabilityRestored: number;
  materialsConsumed: { itemId: string; quantity: number }[];
  costPaid: number;
  qualityChange?: 'improved' | 'maintained' | 'degraded';
  message: string;
}

export function calculateDurabilityLoss(
  item: EnhancedItem,
  damage: DurabilityDamage
): number {
  if (!item.durability) return 0;
  
  let baseLoss = damage.amount;
  
  // Apply degradation rate modifier
  baseLoss *= item.durability.degradationRate;
  
  // Quality affects durability loss
  if (item.craftingQuality) {
    const qualityModifier = getQualityDurabilityModifier(item.craftingQuality);
    baseLoss *= qualityModifier;
  }
  
  // Enhancement level can affect durability
  if (item.enhancement?.level) {
    // Higher enhancement levels are more resilient
    const enhancementModifier = 1 - (item.enhancement.level * 0.05);
    baseLoss *= Math.max(0.5, enhancementModifier);
  }
  
  return Math.ceil(baseLoss);
}

export function applyDurabilityDamage(
  item: EnhancedItem,
  damage: DurabilityDamage
): EnhancedItem {
  if (!item.durability) return item;
  
  const durabilityLoss = calculateDurabilityLoss(item, damage);
  const newCurrent = Math.max(0, item.durability.current - durabilityLoss);
  
  const updatedItem = {
    ...item,
    durability: {
      ...item.durability,
      current: newCurrent
    }
  };
  
  // Update condition based on new durability
  return updateItemCondition(updatedItem);
}

export function updateItemCondition(item: EnhancedItem): EnhancedItem {
  if (!item.durability) return item;
  
  const durabilityPercentage = (item.durability.current / item.durability.maximum) * 100;
  let newCondition: ItemCondition['current'];
  
  if (durabilityPercentage >= 90) {
    newCondition = 'pristine';
  } else if (durabilityPercentage >= 70) {
    newCondition = 'good';
  } else if (durabilityPercentage >= 40) {
    newCondition = 'worn';
  } else if (durabilityPercentage > 0) {
    newCondition = 'damaged';
  } else {
    newCondition = 'broken';
  }
  
  const conditionEffects = getConditionEffects(newCondition, item);
  
  return {
    ...item,
    condition: {
      current: newCondition,
      effects: conditionEffects,
      maintenanceOverdue: isMaintenanceOverdue(item),
      lastMaintained: item.condition?.lastMaintained
    }
  };
}

function getConditionEffects(
  condition: ItemCondition['current'],
  item: EnhancedItem
): StatModifier[] {
  const effects: StatModifier[] = [];
  
  switch (condition) {
    case 'pristine':
      // Pristine items might have small bonuses
      effects.push({
        stat: 'accuracy',
        value: 2,
        type: 'add',
        description: 'Pristine condition bonus'
      });
      break;
    
    case 'good':
      // No penalties or bonuses
      break;
    
    case 'worn':
      // Minor penalties
      effects.push({
        stat: 'attack',
        value: -2,
        type: 'add',
        description: 'Worn condition penalty'
      });
      break;
    
    case 'damaged':
      // Moderate penalties
      effects.push(
        {
          stat: 'attack',
          value: -5,
          type: 'add',
          description: 'Damaged condition penalty'
        },
        {
          stat: 'defense',
          value: -3,
          type: 'add',
          description: 'Damaged condition penalty'
        }
      );
      break;
    
    case 'broken':
      // Severe penalties
      effects.push(
        {
          stat: 'attack',
          value: -10,
          type: 'add',
          description: 'Broken condition penalty'
        },
        {
          stat: 'defense',
          value: -8,
          type: 'add',
          description: 'Broken condition penalty'
        },
        {
          stat: 'accuracy',
          value: -15,
          type: 'add',
          description: 'Broken condition penalty'
        }
      );
      break;
  }
  
  return effects;
}

// === REPAIR SYSTEM ===

export function calculateRepairCost(
  item: EnhancedItem,
  targetDurability?: number
): { materials: { itemId: string; quantity: number }[]; currency: number } {
  if (!item.durability) {
    return { materials: [], currency: 0 };
  }
  
  const repairAmount = targetDurability 
    ? Math.min(targetDurability, item.durability.maximum) - item.durability.current
    : item.durability.maximum - item.durability.current;
  
  if (repairAmount <= 0) {
    return { materials: [], currency: 0 };
  }
  
  // Base repair cost from item durability configuration
  const baseMaterials = item.durability.repairCost || [];
  const repairRatio = repairAmount / item.durability.maximum;
  
  const materials = baseMaterials.map(material => ({
    itemId: material.itemId,
    quantity: Math.ceil(material.quantity * repairRatio)
  }));
  
  // Currency cost based on item value and repair amount
  const baseCurrency = (item.basePrice || 100) * 0.1; // 10% of item value
  const currency = Math.ceil(baseCurrency * repairRatio);
  
  return { materials, currency };
}

export function attemptRepair(
  item: EnhancedItem,
  character: CharacterProfile,
  availableMaterials: { itemId: string; quantity: number }[],
  targetDurability?: number
): RepairResult {
  if (!item.durability) {
    return {
      success: false,
      durabilityRestored: 0,
      materialsConsumed: [],
      costPaid: 0,
      message: 'This item cannot be repaired.'
    };
  }
  
  const repairCost = calculateRepairCost(item, targetDurability);
  const repairAmount = targetDurability 
    ? Math.min(targetDurability, item.durability.maximum) - item.durability.current
    : item.durability.maximum - item.durability.current;
  
  // Check if player has required materials
  const hasRequiredMaterials = repairCost.materials.every(required => {
    const available = availableMaterials.find(m => m.itemId === required.itemId);
    return available && available.quantity >= required.quantity;
  });
  
  if (!hasRequiredMaterials) {
    return {
      success: false,
      durabilityRestored: 0,
      materialsConsumed: [],
      costPaid: 0,
      message: 'Insufficient materials for repair.'
    };
  }
  
  // Calculate success rate based on character skill
  const repairSkill = getCharacterSkillLevel(character, 'repair');
  const baseSuccessRate = Math.min(95, 50 + (repairSkill * 5));
  
  // Item condition affects repair difficulty
  const conditionModifier = getRepairDifficultyModifier(item.condition?.current || 'good');
  const successRate = Math.max(5, baseSuccessRate + conditionModifier);
  
  const isSuccess = Math.random() * 100 < successRate;
  
  if (isSuccess) {
    // Successful repair
    const actualRepairAmount = Math.min(repairAmount, item.durability.maximum - item.durability.current);
    
    // Determine quality change
    let qualityChange: RepairResult['qualityChange'] = 'maintained';
    const qualityRoll = Math.random() * 100;
    
    if (repairSkill >= 15 && qualityRoll < 10) {
      qualityChange = 'improved';
    } else if (repairSkill < 5 && qualityRoll < 20) {
      qualityChange = 'degraded';
    }
    
    return {
      success: true,
      durabilityRestored: actualRepairAmount,
      materialsConsumed: repairCost.materials,
      costPaid: repairCost.currency,
      qualityChange,
      message: `Successfully repaired ${item.name}. Restored ${actualRepairAmount} durability.`
    };
  } else {
    // Failed repair - consume some materials but no benefit
    const partialMaterials = repairCost.materials.map(material => ({
      itemId: material.itemId,
      quantity: Math.ceil(material.quantity * 0.3) // Lose 30% of materials
    }));
    
    return {
      success: false,
      durabilityRestored: 0,
      materialsConsumed: partialMaterials,
      costPaid: Math.ceil(repairCost.currency * 0.2), // Lose 20% of currency
      message: `Repair attempt failed. Some materials were lost in the process.`
    };
  }
}

// === MAINTENANCE SYSTEM ===

export function isMaintenanceOverdue(item: EnhancedItem): boolean {
  if (!item.durability?.repairCost) return false;
  
  const lastMaintained = item.condition?.lastMaintained || 0;
  const currentTime = Date.now();
  const timeSinceLastMaintenance = currentTime - lastMaintained;
  
  // Maintenance needed every 24 hours of game time (placeholder)
  const maintenanceInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  return timeSinceLastMaintenance > maintenanceInterval;
}

export function performMaintenance(
  item: EnhancedItem,
  character: CharacterProfile
): { success: boolean; item: EnhancedItem; message: string } {
  if (!item.durability) {
    return {
      success: false,
      item,
      message: 'This item does not require maintenance.'
    };
  }
  
  const maintenanceSkill = getCharacterSkillLevel(character, 'maintenance');
  const successRate = Math.min(95, 60 + (maintenanceSkill * 4));
  
  const isSuccess = Math.random() * 100 < successRate;
  
  if (isSuccess) {
    // Successful maintenance provides small durability bonus and resets timer
    const bonusDurability = Math.min(5, item.durability.maximum - item.durability.current);
    
    const maintainedItem = {
      ...item,
      durability: {
        ...item.durability,
        current: item.durability.current + bonusDurability
      },
      condition: {
        ...item.condition!,
        lastMaintained: Date.now(),
        maintenanceOverdue: false
      }
    };
    
    return {
      success: true,
      item: updateItemCondition(maintainedItem),
      message: `Successfully maintained ${item.name}. Gained ${bonusDurability} durability.`
    };
  } else {
    // Failed maintenance just resets the timer
    const maintainedItem = {
      ...item,
      condition: {
        ...item.condition!,
        lastMaintained: Date.now(),
        maintenanceOverdue: false
      }
    };
    
    return {
      success: false,
      item: maintainedItem,
      message: `Maintenance attempt on ${item.name} was unsuccessful, but the item was cleaned.`
    };
  }
}

// === UTILITY FUNCTIONS ===

function getQualityDurabilityModifier(quality: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork'): number {
  switch (quality) {
    case 'poor': return 1.5; // Poor quality degrades faster
    case 'normal': return 1.0;
    case 'good': return 0.8;
    case 'excellent': return 0.6;
    case 'masterwork': return 0.4; // Masterwork degrades much slower
    default: return 1.0;
  }
}

function getRepairDifficultyModifier(condition: ItemCondition['current']): number {
  switch (condition) {
    case 'pristine': return 10;
    case 'good': return 5;
    case 'worn': return 0;
    case 'damaged': return -10;
    case 'broken': return -20;
    default: return 0;
  }
}

function getCharacterSkillLevel(character: CharacterProfile, skillId: string): number {
  // This would integrate with the existing skill system
  // For now, return a placeholder based on character level and relevant attributes
  const baseLevel = Math.floor(character.level / 3);
  const attributeBonus = Math.floor((character.intelligence + character.dexterity) / 4);
  return Math.max(1, baseLevel + attributeBonus);
}
