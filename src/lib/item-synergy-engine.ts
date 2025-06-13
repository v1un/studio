/**
 * Item Synergy and Set Bonus Engine
 * 
 * Manages equipment synergies, set bonuses, and conditional item effects:
 * - Equipment set detection and bonus application
 * - Item synergy calculations between different equipment pieces
 * - Conditional bonuses based on character state and situation
 * - Dynamic stat calculations with equipment interactions
 */

import type {
  CharacterProfile,
  EnhancedItem,
  ItemSynergy,
  ItemSetBonus,
  ConditionalBonus,
  ActiveEffect,
  StatModifier,
  EquipmentSlot
} from '@/types/story';

// === SET BONUS SYSTEM ===

export interface EquipmentSetInfo {
  setId: string;
  setName: string;
  equippedPieces: EnhancedItem[];
  totalPieces: number;
  activeBonuses: ItemSetBonus[];
}

export interface SynergyInfo {
  synergyId: string;
  name: string;
  activeItems: EnhancedItem[];
  effects: ActiveEffect[];
  conditionalBonuses: ConditionalBonus[];
}

export function detectEquipmentSets(
  equippedItems: Partial<Record<EquipmentSlot, EnhancedItem | null>>,
  availableSets: ItemSetBonus[]
): EquipmentSetInfo[] {
  const setMap = new Map<string, EnhancedItem[]>();
  
  // Group equipped items by set ID
  Object.values(equippedItems).forEach(item => {
    if (item?.setId) {
      if (!setMap.has(item.setId)) {
        setMap.set(item.setId, []);
      }
      setMap.get(item.setId)!.push(item);
    }
  });
  
  const equipmentSets: EquipmentSetInfo[] = [];
  
  setMap.forEach((equippedPieces, setId) => {
    const setDefinitions = availableSets.filter(set => set.setId === setId);
    const activeBonuses = setDefinitions.filter(set => equippedPieces.length >= set.requiredPieces);
    
    if (activeBonuses.length > 0) {
      equipmentSets.push({
        setId,
        setName: setDefinitions[0]?.setName || 'Unknown Set',
        equippedPieces,
        totalPieces: equippedPieces.length,
        activeBonuses
      });
    }
  });
  
  return equipmentSets;
}

export function detectItemSynergies(
  equippedItems: Partial<Record<EquipmentSlot, EnhancedItem | null>>,
  availableSynergies: ItemSynergy[]
): SynergyInfo[] {
  const equippedItemIds = Object.values(equippedItems)
    .filter(item => item !== null && item !== undefined)
    .map(item => item!.id);
  
  const activeSynergies: SynergyInfo[] = [];
  
  availableSynergies.forEach(synergy => {
    const hasAllRequiredItems = synergy.requiredItems.every(itemId => 
      equippedItemIds.includes(itemId)
    );
    
    if (hasAllRequiredItems) {
      const activeItems = synergy.requiredItems
        .map(itemId => Object.values(equippedItems).find(item => item?.id === itemId))
        .filter(item => item !== null && item !== undefined) as EnhancedItem[];
      
      activeSynergies.push({
        synergyId: synergy.id,
        name: synergy.name,
        activeItems,
        effects: synergy.synergyEffects,
        conditionalBonuses: synergy.conditionalBonuses || []
      });
    }
  });
  
  return activeSynergies;
}

// === CONDITIONAL BONUS SYSTEM ===

export function evaluateConditionalBonuses(
  conditionalBonuses: ConditionalBonus[],
  character: CharacterProfile,
  combatState?: any, // Combat state for combat-specific conditions
  environment?: any // Environment state for location-specific conditions
): ActiveEffect[] {
  const activeEffects: ActiveEffect[] = [];
  
  conditionalBonuses.forEach(bonus => {
    if (isConditionMet(bonus, character, combatState, environment)) {
      activeEffects.push(...bonus.effects);
    }
  });
  
  return activeEffects;
}

function isConditionMet(
  bonus: ConditionalBonus,
  character: CharacterProfile,
  combatState?: any,
  environment?: any
): boolean {
  switch (bonus.condition) {
    case 'low_health':
      const healthPercentage = (character.health / character.maxHealth) * 100;
      return healthPercentage <= (bonus.threshold || 25);
    
    case 'high_mana':
      if (!character.mana || !character.maxMana) return false;
      const manaPercentage = (character.mana / character.maxMana) * 100;
      return manaPercentage >= (bonus.threshold || 75);
    
    case 'in_combat':
      return combatState?.isActive || false;
    
    case 'specific_enemy_type':
      return combatState?.enemies?.some((enemy: any) => 
        enemy.type === bonus.value
      ) || false;
    
    case 'time_of_day':
      // This would integrate with a time system
      return environment?.timeOfDay === bonus.value;
    
    case 'location_type':
      return environment?.locationType === bonus.value;
    
    default:
      return false;
  }
}

// === STAT CALCULATION WITH SYNERGIES ===

export interface EquipmentBonusCalculation {
  baseStats: StatModifier[];
  setBonuses: StatModifier[];
  synergyBonuses: StatModifier[];
  conditionalBonuses: StatModifier[];
  totalBonuses: StatModifier[];
}

export function calculateEquipmentBonuses(
  equippedItems: Partial<Record<EquipmentSlot, EnhancedItem | null>>,
  character: CharacterProfile,
  availableSets: ItemSetBonus[],
  availableSynergies: ItemSynergy[],
  combatState?: any,
  environment?: any
): EquipmentBonusCalculation {
  const baseStats: StatModifier[] = [];
  const setBonuses: StatModifier[] = [];
  const synergyBonuses: StatModifier[] = [];
  const conditionalBonuses: StatModifier[] = [];
  
  // Collect base item stats
  Object.values(equippedItems).forEach(item => {
    if (item?.activeEffects) {
      item.activeEffects.forEach(effect => {
        if (effect.type === 'stat_modifier' && effect.statModifiers) {
          baseStats.push(...effect.statModifiers);
        }
      });
    }
    
    // Enhancement bonuses
    if (item?.enhancement?.bonusStats) {
      baseStats.push(...item.enhancement.bonusStats);
    }
  });
  
  // Calculate set bonuses
  const equipmentSets = detectEquipmentSets(equippedItems, availableSets);
  equipmentSets.forEach(setInfo => {
    setInfo.activeBonuses.forEach(bonus => {
      bonus.bonusEffects.forEach(effect => {
        if (effect.type === 'stat_modifier' && effect.statModifiers) {
          setBonuses.push(...effect.statModifiers);
        }
      });
    });
  });
  
  // Calculate synergy bonuses
  const itemSynergies = detectItemSynergies(equippedItems, availableSynergies);
  itemSynergies.forEach(synergy => {
    synergy.effects.forEach(effect => {
      if (effect.type === 'stat_modifier' && effect.statModifiers) {
        synergyBonuses.push(...effect.statModifiers);
      }
    });
    
    // Evaluate conditional bonuses from synergies
    const conditionalEffects = evaluateConditionalBonuses(
      synergy.conditionalBonuses,
      character,
      combatState,
      environment
    );
    
    conditionalEffects.forEach(effect => {
      if (effect.type === 'stat_modifier' && effect.statModifiers) {
        conditionalBonuses.push(...effect.statModifiers);
      }
    });
  });
  
  // Combine all bonuses
  const totalBonuses = [
    ...baseStats,
    ...setBonuses,
    ...synergyBonuses,
    ...conditionalBonuses
  ];
  
  return {
    baseStats,
    setBonuses,
    synergyBonuses,
    conditionalBonuses,
    totalBonuses
  };
}

// === EQUIPMENT RECOMMENDATIONS ===

export interface EquipmentRecommendation {
  slot: EquipmentSlot;
  currentItem: EnhancedItem | null;
  recommendedItem: EnhancedItem;
  improvementType: 'stat_increase' | 'set_bonus' | 'synergy' | 'conditional_bonus';
  expectedImprovement: StatModifier[];
  description: string;
}

export function generateEquipmentRecommendations(
  character: CharacterProfile,
  equippedItems: Partial<Record<EquipmentSlot, EnhancedItem | null>>,
  availableItems: EnhancedItem[],
  availableSets: ItemSetBonus[],
  availableSynergies: ItemSynergy[]
): EquipmentRecommendation[] {
  const recommendations: EquipmentRecommendation[] = [];
  
  // Current equipment bonuses
  const currentBonuses = calculateEquipmentBonuses(
    equippedItems,
    character,
    availableSets,
    availableSynergies
  );
  
  // Test each available item in each compatible slot
  availableItems.forEach(item => {
    if (item.equipSlot) {
      const slot = item.equipSlot;
      const currentItem = equippedItems[slot];
      
      // Skip if item is already equipped
      if (currentItem?.id === item.id) return;
      
      // Test equipment with this item
      const testEquipment = {
        ...equippedItems,
        [slot]: item
      };
      
      const testBonuses = calculateEquipmentBonuses(
        testEquipment,
        character,
        availableSets,
        availableSynergies
      );
      
      // Calculate improvement
      const improvement = calculateStatDifference(currentBonuses.totalBonuses, testBonuses.totalBonuses);
      
      if (improvement.length > 0) {
        let improvementType: EquipmentRecommendation['improvementType'] = 'stat_increase';
        let description = `Improves overall stats`;
        
        // Check for set bonus improvements
        const currentSets = detectEquipmentSets(equippedItems, availableSets);
        const testSets = detectEquipmentSets(testEquipment, availableSets);
        
        if (testSets.length > currentSets.length || 
            testSets.some(set => set.activeBonuses.length > 
              (currentSets.find(cs => cs.setId === set.setId)?.activeBonuses.length || 0))) {
          improvementType = 'set_bonus';
          description = `Activates or improves set bonuses`;
        }
        
        // Check for synergy improvements
        const currentSynergies = detectItemSynergies(equippedItems, availableSynergies);
        const testSynergies = detectItemSynergies(testEquipment, availableSynergies);
        
        if (testSynergies.length > currentSynergies.length) {
          improvementType = 'synergy';
          description = `Activates item synergies`;
        }
        
        recommendations.push({
          slot,
          currentItem,
          recommendedItem: item,
          improvementType,
          expectedImprovement: improvement,
          description
        });
      }
    }
  });
  
  // Sort by improvement magnitude
  return recommendations.sort((a, b) => {
    const aValue = a.expectedImprovement.reduce((sum, mod) => sum + Math.abs(mod.value), 0);
    const bValue = b.expectedImprovement.reduce((sum, mod) => sum + Math.abs(mod.value), 0);
    return bValue - aValue;
  });
}

// === UTILITY FUNCTIONS ===

function calculateStatDifference(current: StatModifier[], test: StatModifier[]): StatModifier[] {
  const currentStats = aggregateStatModifiers(current);
  const testStats = aggregateStatModifiers(test);
  const differences: StatModifier[] = [];
  
  // Find improvements
  Object.keys(testStats).forEach(stat => {
    const currentValue = currentStats[stat] || 0;
    const testValue = testStats[stat] || 0;
    const difference = testValue - currentValue;
    
    if (difference > 0) {
      differences.push({
        stat: stat as any,
        value: difference,
        type: 'add',
        description: `+${difference} ${stat} improvement`
      });
    }
  });
  
  return differences;
}

function aggregateStatModifiers(modifiers: StatModifier[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  modifiers.forEach(modifier => {
    const currentValue = stats[modifier.stat] || 0;
    
    if (modifier.type === 'add') {
      stats[modifier.stat] = currentValue + modifier.value;
    } else if (modifier.type === 'multiply') {
      stats[modifier.stat] = currentValue * modifier.value;
    }
  });
  
  return stats;
}
