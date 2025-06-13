/**
 * Inventory System Demo and Integration Example
 * 
 * Demonstrates how to use the comprehensive inventory system with:
 * - Sample data setup
 * - Integration with character progression
 * - Example workflows for crafting, enhancement, and equipment management
 * - Testing utilities for the inventory system
 */

import type {
  CharacterProfile,
  EnhancedItem,
  EquipmentSlot
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

// === SAMPLE DATA CREATION ===

export function createSampleCharacter(): CharacterProfile {
  return {
    id: 'demo_character',
    name: 'Demo Hero',
    level: 10,
    experiencePoints: 2500,
    experienceToNextLevel: 500,
    
    // Core attributes
    strength: 15,
    dexterity: 12,
    constitution: 14,
    intelligence: 13,
    wisdom: 11,
    charisma: 10,
    
    // Derived stats
    health: 85,
    maxHealth: 100,
    mana: 45,
    maxMana: 60,
    
    // Progression
    progressionPoints: {
      attribute: 3,
      skill: 5,
      specialization: 1,
      talent: 2
    },
    
    // Other required fields
    currency: 1500,
    languageReading: 'common',
    languageSpeaking: 'common',
    
    // Skills and progression
    purchasedSkillNodes: ['basic_attack', 'smithing_basics'],
    availableSkillTrees: ['combat', 'crafting'],
    activeSpecializations: [],
    purchasedTalents: [],
    completedMilestones: [],
    totalExperienceEarned: 3000
  };
}

export function createSampleItems(): EnhancedItem[] {
  return [
    // Weapons
    {
      id: 'iron_sword_001',
      name: 'Iron Sword',
      description: 'A well-crafted iron sword with a sharp edge',
      itemType: 'weapon',
      equipSlot: 'weapon',
      basePrice: 150,
      rarity: 'common',
      craftingQuality: 'good',
      enhancement: {
        level: 2,
        maxLevel: 10,
        bonusStats: [
          { stat: 'attack', value: 4, type: 'add', description: '+4 Attack from enhancement' }
        ],
        enhancementCost: [
          { itemId: 'enhancement_stone', quantity: 1 }
        ],
        failureChance: 15,
        destructionChance: 0
      },
      durability: {
        current: 85,
        maximum: 100,
        degradationRate: 1.0,
        repairCost: [
          { itemId: 'iron_ingot', quantity: 1 }
        ]
      },
      setId: 'warriors_valor',
      activeEffects: [
        {
          id: 'sword_attack_bonus',
          name: 'Sharp Edge',
          description: '+8 Attack',
          type: 'stat_modifier',
          duration: 'permanent_while_equipped',
          statModifiers: [
            { stat: 'attack', value: 8, type: 'add', description: '+8 Attack from Iron Sword' }
          ]
        }
      ]
    },
    
    {
      id: 'steel_shield_001',
      name: 'Steel Shield',
      description: 'A sturdy steel shield that provides excellent protection',
      itemType: 'armor',
      equipSlot: 'shield',
      basePrice: 120,
      rarity: 'common',
      craftingQuality: 'normal',
      enhancement: {
        level: 1,
        maxLevel: 10,
        bonusStats: [
          { stat: 'defense', value: 2, type: 'add', description: '+2 Defense from enhancement' }
        ],
        enhancementCost: [
          { itemId: 'enhancement_stone', quantity: 1 }
        ],
        failureChance: 10,
        destructionChance: 0
      },
      durability: {
        current: 95,
        maximum: 100,
        degradationRate: 0.8,
        repairCost: [
          { itemId: 'steel_ingot', quantity: 1 }
        ]
      },
      setId: 'warriors_valor',
      activeEffects: [
        {
          id: 'shield_defense_bonus',
          name: 'Protective Barrier',
          description: '+6 Defense, +5% Block Chance',
          type: 'stat_modifier',
          duration: 'permanent_while_equipped',
          statModifiers: [
            { stat: 'defense', value: 6, type: 'add', description: '+6 Defense from Steel Shield' },
            { stat: 'blockChance', value: 5, type: 'add', description: '+5% Block Chance from Steel Shield' }
          ]
        }
      ]
    },
    
    // Armor pieces
    {
      id: 'chain_mail_001',
      name: 'Chain Mail Armor',
      description: 'Flexible chain mail that provides good protection without hindering movement',
      itemType: 'armor',
      equipSlot: 'body',
      basePrice: 200,
      rarity: 'common',
      craftingQuality: 'good',
      setId: 'warriors_valor',
      durability: {
        current: 78,
        maximum: 100,
        degradationRate: 1.2,
        repairCost: [
          { itemId: 'iron_ring', quantity: 5 }
        ]
      },
      condition: {
        current: 'worn',
        effects: [
          { stat: 'defense', value: -1, type: 'add', description: 'Worn condition penalty' }
        ],
        maintenanceOverdue: true,
        lastMaintained: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      },
      activeEffects: [
        {
          id: 'chainmail_defense',
          name: 'Flexible Protection',
          description: '+5 Defense, +2 Dexterity',
          type: 'stat_modifier',
          duration: 'permanent_while_equipped',
          statModifiers: [
            { stat: 'defense', value: 5, type: 'add', description: '+5 Defense from Chain Mail' },
            { stat: 'dexterity', value: 2, type: 'add', description: '+2 Dexterity from Chain Mail' }
          ]
        }
      ]
    },
    
    // Consumables
    {
      id: 'health_potion_001',
      name: 'Health Potion',
      description: 'A red potion that restores health when consumed',
      itemType: 'consumable',
      basePrice: 25,
      rarity: 'common',
      craftingQuality: 'normal',
      isConsumable: true,
      activeEffects: [
        {
          id: 'health_restore',
          name: 'Healing',
          description: 'Restores 50 health',
          type: 'healing',
          duration: 1,
          statModifiers: [
            { stat: 'health', value: 50, type: 'add', description: 'Restores 50 health' }
          ]
        }
      ]
    },
    
    // Crafting materials
    {
      id: 'iron_ingot_001',
      name: 'Iron Ingot',
      description: 'A refined iron ingot, perfect for smithing',
      itemType: 'material',
      basePrice: 15,
      rarity: 'common'
    },
    
    {
      id: 'enhancement_stone_001',
      name: 'Enhancement Stone',
      description: 'A magical stone used to enhance equipment',
      itemType: 'enhancement',
      basePrice: 50,
      rarity: 'uncommon'
    },
    
    {
      id: 'red_herb_001',
      name: 'Red Herb',
      description: 'A medicinal herb with healing properties',
      itemType: 'material',
      basePrice: 5,
      rarity: 'common'
    }
  ];
}

export function createSampleInventoryState(): InventoryState {
  const items = createSampleItems();
  
  return {
    unequippedItems: items.filter(item => 
      !item.equipSlot && !['consumable', 'material', 'enhancement'].includes(item.itemType)
    ),
    equippedItems: {
      weapon: items.find(item => item.id === 'iron_sword_001') || null,
      shield: items.find(item => item.id === 'steel_shield_001') || null,
      body: items.find(item => item.id === 'chain_mail_001') || null,
      head: null,
      legs: null,
      feet: null,
      hands: null,
      neck: null,
      ring1: null,
      ring2: null
    },
    craftingMaterials: items.filter(item => 
      ['material', 'enhancement'].includes(item.itemType)
    ),
    consumables: items.filter(item => item.itemType === 'consumable'),
    questItems: [],
    currency: 1500
  };
}

// === DEMO WORKFLOWS ===

export function createInventoryManagerDemo(): InventoryManager {
  const character = createSampleCharacter();
  const inventoryState = createSampleInventoryState();
  
  return new InventoryManager(
    character,
    inventoryState,
    EQUIPMENT_SETS,
    ITEM_SYNERGIES,
    CRAFTING_RECIPES,
    CRAFTING_STATIONS
  );
}

export function demonstrateEquipmentSynergies(manager: InventoryManager): void {
  console.log('=== Equipment Synergies Demo ===');
  
  const activeSets = manager.getActiveSets();
  const activeSynergies = manager.getActiveSynergies();
  const equipmentBonuses = manager.getEquipmentBonuses();
  
  console.log('Active Equipment Sets:', activeSets.length);
  activeSets.forEach(set => {
    console.log(`- ${set.setName}: ${set.totalPieces} pieces equipped`);
    set.activeBonuses.forEach(bonus => {
      console.log(`  * (${bonus.requiredPieces}pc) ${bonus.description}`);
    });
  });
  
  console.log('\nActive Synergies:', activeSynergies.length);
  activeSynergies.forEach(synergy => {
    console.log(`- ${synergy.name}`);
    synergy.effects.forEach(effect => {
      console.log(`  * ${effect.description}`);
    });
  });
  
  if (equipmentBonuses) {
    console.log('\nTotal Equipment Bonuses:');
    console.log(`- Base Stats: ${equipmentBonuses.baseStats.length}`);
    console.log(`- Set Bonuses: ${equipmentBonuses.setBonuses.length}`);
    console.log(`- Synergy Bonuses: ${equipmentBonuses.synergyBonuses.length}`);
    console.log(`- Conditional Bonuses: ${equipmentBonuses.conditionalBonuses.length}`);
  }
}

export function demonstrateCrafting(manager: InventoryManager): void {
  console.log('\n=== Crafting Demo ===');
  
  // Attempt to craft a health potion
  const craftingResult = manager.craftItem('health_potion');
  
  console.log('Crafting Health Potion:');
  console.log(`- Success: ${craftingResult.success}`);
  console.log(`- Quality: ${craftingResult.qualityAchieved}`);
  console.log(`- Experience Gained: ${craftingResult.experienceGained}`);
  
  if (craftingResult.success) {
    console.log('- Output Items:', craftingResult.outputItems.map(item => item.name));
  } else {
    console.log(`- Failure Reason: ${craftingResult.failureReason}`);
  }
}

export function demonstrateItemEnhancement(manager: InventoryManager): void {
  console.log('\n=== Item Enhancement Demo ===');
  
  const materials = [{ itemId: 'enhancement_stone_001', quantity: 1 }];
  const enhancementResult = manager.enhanceItem('iron_sword_001', materials);
  
  console.log('Enhancing Iron Sword:');
  console.log(`- Success: ${enhancementResult.success}`);
  console.log(`- Message: ${enhancementResult.message}`);
  
  if (enhancementResult.newItem) {
    const newLevel = enhancementResult.newItem.enhancement?.level || 0;
    console.log(`- New Enhancement Level: +${newLevel}`);
  }
}

export function demonstrateMaintenanceSystem(manager: InventoryManager): void {
  console.log('\n=== Maintenance System Demo ===');
  
  const alerts = manager.getMaintenanceAlerts();
  console.log('Maintenance Alerts:', alerts.length);
  alerts.forEach(alert => console.log(`- ${alert}`));
  
  // Perform maintenance on chain mail
  const maintenanceResult = manager.maintainItem('chain_mail_001');
  console.log('\nMaintaining Chain Mail:');
  console.log(`- Success: ${maintenanceResult.success}`);
  console.log(`- Message: ${maintenanceResult.message}`);
}

export function demonstrateRecommendations(manager: InventoryManager): void {
  console.log('\n=== Equipment Recommendations Demo ===');
  
  const recommendations = manager.getEquipmentRecommendations();
  console.log('Equipment Recommendations:', recommendations.length);
  
  recommendations.slice(0, 3).forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.recommendedItem.name} for ${rec.slot}`);
    console.log(`   - Type: ${rec.improvementType}`);
    console.log(`   - Description: ${rec.description}`);
    console.log(`   - Expected Improvements: ${rec.expectedImprovement.length} stat bonuses`);
  });
}

// === COMPLETE DEMO FUNCTION ===

export function runCompleteInventoryDemo(): void {
  console.log('🎮 Starting Comprehensive Inventory System Demo\n');
  
  const manager = createInventoryManagerDemo();
  
  demonstrateEquipmentSynergies(manager);
  demonstrateCrafting(manager);
  demonstrateItemEnhancement(manager);
  demonstrateMaintenanceSystem(manager);
  demonstrateRecommendations(manager);
  
  console.log('\n✅ Demo completed successfully!');
  console.log('\nThe inventory system provides:');
  console.log('- Equipment sets with progressive bonuses');
  console.log('- Item synergies between different equipment pieces');
  console.log('- Comprehensive crafting with skill requirements');
  console.log('- Item enhancement with risk/reward mechanics');
  console.log('- Durability and maintenance systems');
  console.log('- Strategic equipment recommendations');
  console.log('- Integration with character progression');
}
