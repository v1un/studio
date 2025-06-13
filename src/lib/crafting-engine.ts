/**
 * Crafting and Item Enhancement Engine
 * 
 * Core utilities for managing the comprehensive crafting system including:
 * - Recipe-based crafting with skill requirements
 * - Crafting station management and bonuses
 * - Item enhancement and upgrade mechanics
 * - Experimental crafting and recipe discovery
 * - Success rate calculations and quality determination
 */

import type {
  CharacterProfile,
  EnhancedItem,
  CraftingRecipe,
  CraftingStation,
  CraftingStationBonus,
  EnhancementAttempt,
  ExperimentalCrafting,
  ExperimentOutcome,
  ItemEnhancement,
  ItemModificationSlot,
  ItemSynergy,
  ConditionalBonus,
  StatModifier
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === CRAFTING SYSTEM ===

export interface CraftingAttempt {
  recipeId: string;
  stationId?: string;
  character: CharacterProfile;
  materialOverrides?: { [itemId: string]: string }; // Use alternative materials
}

export interface CraftingResult {
  success: boolean;
  outputItems: EnhancedItem[];
  materialsConsumed: { itemId: string; quantity: number }[];
  experienceGained: number;
  qualityAchieved: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork';
  discoveredRecipe?: string;
  failureReason?: string;
}

export function calculateCraftingSuccess(
  recipe: CraftingRecipe,
  character: CharacterProfile,
  station?: CraftingStation
): number {
  let baseSuccessRate = recipe.baseSuccessRate;
  
  // Skill level bonus
  if (recipe.requiredSkill) {
    const characterSkill = getCharacterSkillLevel(character, recipe.requiredSkill.skillId);
    const skillDifference = characterSkill - recipe.requiredSkill.level;
    baseSuccessRate += Math.max(0, skillDifference * 5); // +5% per skill level above requirement
  }
  
  // Station bonuses
  if (station) {
    const successBonus = station.bonuses
      .filter(bonus => bonus.type === 'success_rate')
      .reduce((total, bonus) => total + bonus.value, 0);
    baseSuccessRate += successBonus;
  }
  
  // Character attribute bonuses (intelligence for most crafting)
  const intelligenceBonus = Math.floor((character.intelligence - 10) / 2);
  baseSuccessRate += intelligenceBonus;
  
  return Math.min(95, Math.max(5, baseSuccessRate)); // Cap between 5% and 95%
}

export function calculateCraftingQuality(
  recipe: CraftingRecipe,
  character: CharacterProfile,
  station?: CraftingStation,
  materialQuality: number = 50
): 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork' {
  let qualityScore = materialQuality;
  
  // Skill level contribution
  if (recipe.requiredSkill) {
    const characterSkill = getCharacterSkillLevel(character, recipe.requiredSkill.skillId);
    qualityScore += characterSkill * 2;
  }
  
  // Station quality bonuses
  if (station) {
    const qualityBonus = station.bonuses
      .filter(bonus => bonus.type === 'quality_chance')
      .reduce((total, bonus) => total + bonus.value, 0);
    qualityScore += qualityBonus;
  }
  
  // Character dexterity bonus (crafting precision)
  qualityScore += Math.floor((character.dexterity - 10) / 2);
  
  // Random factor
  qualityScore += Math.random() * 20 - 10; // ±10 random variance
  
  if (qualityScore >= 90) return 'masterwork';
  if (qualityScore >= 75) return 'excellent';
  if (qualityScore >= 60) return 'good';
  if (qualityScore >= 40) return 'normal';
  return 'poor';
}

export function attemptCrafting(
  attempt: CraftingAttempt,
  recipe: CraftingRecipe,
  station?: CraftingStation,
  availableItems: EnhancedItem[] = []
): CraftingResult {
  const successRate = calculateCraftingSuccess(recipe, attempt.character, station);
  const isSuccess = Math.random() * 100 < successRate;
  
  if (!isSuccess) {
    return {
      success: false,
      outputItems: [],
      materialsConsumed: [], // No materials consumed on failure
      experienceGained: Math.floor(recipe.experienceGained * 0.1), // Small XP for attempt
      qualityAchieved: 'poor',
      failureReason: 'Crafting attempt failed'
    };
  }
  
  // Calculate material consumption
  const materialsConsumed = recipe.ingredients.map(ingredient => ({
    itemId: attempt.materialOverrides?.[ingredient.itemId] || ingredient.itemId,
    quantity: ingredient.quantity
  }));
  
  // Calculate quality
  const materialQuality = calculateMaterialQuality(materialsConsumed, availableItems);
  const quality = calculateCraftingQuality(recipe, attempt.character, station, materialQuality);
  
  // Create output item
  const outputItem = createCraftedItem(recipe, quality, attempt.character.id);
  
  return {
    success: true,
    outputItems: [outputItem],
    materialsConsumed,
    experienceGained: recipe.experienceGained,
    qualityAchieved: quality
  };
}

// === ITEM ENHANCEMENT SYSTEM ===

export function calculateEnhancementSuccess(
  item: EnhancedItem,
  materials: { itemId: string; quantity: number }[],
  character: CharacterProfile
): EnhancementAttempt {
  const currentLevel = item.enhancement?.level || 0;
  const maxLevel = item.enhancement?.maxLevel || 10;
  
  if (currentLevel >= maxLevel) {
    throw new Error('Item is already at maximum enhancement level');
  }
  
  // Base success rate decreases with enhancement level
  let baseSuccessRate = Math.max(10, 90 - (currentLevel * 8));
  
  // Material quality bonus
  const materialBonus = materials.reduce((bonus, material) => {
    // Higher tier materials provide better success rates
    return bonus + getMaterialEnhancementBonus(material.itemId);
  }, 0);
  
  baseSuccessRate += materialBonus;
  
  // Character skill bonus
  const enhancementSkill = getCharacterSkillLevel(character, 'item_enhancement');
  baseSuccessRate += enhancementSkill * 2;
  
  const successChance = Math.min(95, Math.max(5, baseSuccessRate));
  
  // Determine failure consequence
  let failureConsequence: 'nothing' | 'level_loss' | 'destruction' = 'nothing';
  if (currentLevel >= 7) {
    failureConsequence = Math.random() < 0.1 ? 'destruction' : 'level_loss';
  } else if (currentLevel >= 4) {
    failureConsequence = Math.random() < 0.05 ? 'level_loss' : 'nothing';
  }
  
  return {
    itemId: item.id,
    enhancementMaterials: materials,
    successChance,
    failureConsequence
  };
}

export function enhanceItem(
  item: EnhancedItem,
  attempt: EnhancementAttempt
): { success: boolean; newItem: EnhancedItem; message: string } {
  const isSuccess = Math.random() * 100 < attempt.successChance;
  
  if (isSuccess) {
    const newItem = {
      ...item,
      enhancement: {
        ...item.enhancement!,
        level: (item.enhancement?.level || 0) + 1,
        bonusStats: calculateEnhancementBonuses(item, (item.enhancement?.level || 0) + 1)
      }
    };
    
    return {
      success: true,
      newItem,
      message: `Successfully enhanced ${item.name} to +${newItem.enhancement.level}!`
    };
  } else {
    // Handle failure
    if (attempt.failureConsequence === 'destruction') {
      return {
        success: false,
        newItem: item,
        message: `Enhancement failed catastrophically! ${item.name} was destroyed.`
      };
    } else if (attempt.failureConsequence === 'level_loss') {
      const newItem = {
        ...item,
        enhancement: {
          ...item.enhancement!,
          level: Math.max(0, (item.enhancement?.level || 0) - 1),
          bonusStats: calculateEnhancementBonuses(item, Math.max(0, (item.enhancement?.level || 0) - 1))
        }
      };
      
      return {
        success: false,
        newItem,
        message: `Enhancement failed! ${item.name} lost an enhancement level.`
      };
    } else {
      return {
        success: false,
        newItem: item,
        message: `Enhancement failed, but ${item.name} was not damaged.`
      };
    }
  }
}

// === UTILITY FUNCTIONS ===

function getCharacterSkillLevel(character: CharacterProfile, skillId: string): number {
  // Integrate with existing skill system
  // Check if character has purchased skill nodes related to this skill
  const purchasedNodes = character.purchasedSkillNodes || [];

  // Map skill IDs to skill tree nodes
  const skillMappings: Record<string, string[]> = {
    'smithing': ['smithing_basics', 'advanced_smithing', 'master_smithing'],
    'alchemy': ['alchemy_basics', 'advanced_alchemy', 'master_alchemy'],
    'enchanting': ['enchanting_basics', 'advanced_enchanting', 'master_enchanting'],
    'repair': ['repair_basics', 'advanced_repair'],
    'maintenance': ['maintenance_basics', 'advanced_maintenance'],
    'item_enhancement': ['enhancement_basics', 'advanced_enhancement']
  };

  const relatedNodes = skillMappings[skillId] || [];
  const purchasedRelatedNodes = relatedNodes.filter(node => purchasedNodes.includes(node));

  // Base skill level from character level and relevant attributes
  let baseLevel = Math.floor(character.level / 3);

  // Add bonus from relevant attributes
  switch (skillId) {
    case 'smithing':
    case 'repair':
      baseLevel += Math.floor((character.strength + character.constitution) / 4);
      break;
    case 'alchemy':
    case 'enchanting':
      baseLevel += Math.floor((character.intelligence + character.wisdom) / 4);
      break;
    case 'maintenance':
    case 'item_enhancement':
      baseLevel += Math.floor((character.dexterity + character.intelligence) / 4);
      break;
  }

  // Add bonus from purchased skill nodes
  const nodeBonus = purchasedRelatedNodes.length * 3;

  return Math.max(1, baseLevel + nodeBonus);
}

function calculateMaterialQuality(
  materials: { itemId: string; quantity: number }[],
  availableItems: EnhancedItem[]
): number {
  // Calculate average quality of materials used
  let totalQuality = 0;
  let materialCount = 0;
  
  materials.forEach(material => {
    const item = availableItems.find(i => i.id === material.itemId);
    if (item?.craftingQuality) {
      const qualityValue = getQualityValue(item.craftingQuality);
      totalQuality += qualityValue * material.quantity;
      materialCount += material.quantity;
    }
  });
  
  return materialCount > 0 ? totalQuality / materialCount : 50;
}

function getQualityValue(quality: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork'): number {
  switch (quality) {
    case 'poor': return 20;
    case 'normal': return 50;
    case 'good': return 70;
    case 'excellent': return 85;
    case 'masterwork': return 100;
    default: return 50;
  }
}

function createCraftedItem(
  recipe: CraftingRecipe,
  quality: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork',
  crafterId: string
): EnhancedItem {
  // This would create a new item based on the recipe and quality
  // Implementation would depend on the specific item creation logic
  return {
    id: generateUUID(),
    name: `${quality === 'masterwork' ? 'Masterwork ' : ''}${recipe.name}`,
    description: `A ${quality} quality item crafted by a skilled artisan.`,
    itemType: 'weapon', // This would be determined by the recipe
    craftedBy: crafterId,
    craftingQuality: quality,
    basePrice: 100, // This would be calculated based on materials and quality
    rarity: quality === 'masterwork' ? 'epic' : quality === 'excellent' ? 'rare' : 'common'
  };
}

function getMaterialEnhancementBonus(materialId: string): number {
  // Return enhancement bonus based on material type
  // This would be configured based on actual material items
  return 5; // Placeholder
}

function calculateEnhancementBonuses(item: EnhancedItem, level: number): StatModifier[] {
  // Calculate stat bonuses based on enhancement level
  // This would be specific to item type and base stats
  return [
    {
      stat: 'strength',
      value: level * 2,
      type: 'add',
      description: `+${level * 2} Strength from enhancement`
    }
  ];
}
