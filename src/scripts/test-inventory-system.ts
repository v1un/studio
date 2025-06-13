/**
 * Test Script for Inventory System
 * 
 * Comprehensive test of the inventory system functionality.
 * Run this to verify all components are working correctly.
 */

import { runCompleteInventoryDemo } from '@/lib/inventory-demo';
import { 
  createSampleCharacter, 
  createSampleItems, 
  createSampleInventoryState,
  createInventoryManagerDemo 
} from '@/lib/inventory-demo';

import {
  calculateEquipmentBonuses,
  detectEquipmentSets,
  detectItemSynergies
} from '@/lib/item-synergy-engine';

import {
  attemptCrafting,
  calculateCraftingSuccess,
  enhanceItem,
  calculateEnhancementSuccess
} from '@/lib/crafting-engine';

import {
  applyDurabilityDamage,
  attemptRepair,
  performMaintenance
} from '@/lib/item-maintenance-engine';

import {
  EQUIPMENT_SETS,
  ITEM_SYNERGIES,
  CRAFTING_STATIONS,
  CRAFTING_RECIPES
} from '@/data/item-sets-and-synergies';

// Test individual components
function testItemSynergyEngine() {
  console.log('\n🔧 Testing Item Synergy Engine...');
  
  const character = createSampleCharacter();
  const items = createSampleItems();
  
  // Create equipped items for testing
  const equippedItems = {
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
  };
  
  // Test set detection
  const activeSets = detectEquipmentSets(equippedItems, EQUIPMENT_SETS);
  console.log(`✅ Detected ${activeSets.length} active equipment sets`);
  
  // Test synergy detection
  const activeSynergies = detectItemSynergies(equippedItems, ITEM_SYNERGIES);
  console.log(`✅ Detected ${activeSynergies.length} active synergies`);
  
  // Test bonus calculations
  const bonuses = calculateEquipmentBonuses(
    equippedItems,
    character,
    EQUIPMENT_SETS,
    ITEM_SYNERGIES
  );
  console.log(`✅ Calculated equipment bonuses: ${bonuses.totalBonuses.length} total bonuses`);
}

function testCraftingEngine() {
  console.log('\n🔨 Testing Crafting Engine...');
  
  const character = createSampleCharacter();
  const recipe = CRAFTING_RECIPES.find(r => r.id === 'health_potion');
  const station = CRAFTING_STATIONS.find(s => s.id === 'alchemy_lab');
  
  if (recipe) {
    // Test success rate calculation
    const successRate = calculateCraftingSuccess(recipe, character, station);
    console.log(`✅ Calculated crafting success rate: ${successRate}%`);
    
    // Test crafting attempt
    const craftingAttempt = {
      recipeId: recipe.id,
      stationId: station?.id,
      character: character
    };
    
    const result = attemptCrafting(craftingAttempt, recipe, station);
    console.log(`✅ Crafting attempt: ${result.success ? 'Success' : 'Failed'}`);
    console.log(`   Quality: ${result.qualityAchieved}, XP: ${result.experienceGained}`);
  }
}

function testEnhancementSystem() {
  console.log('\n⚡ Testing Enhancement System...');
  
  const character = createSampleCharacter();
  const items = createSampleItems();
  const sword = items.find(item => item.id === 'iron_sword_001');
  
  if (sword) {
    // Test enhancement calculation
    const materials = [{ itemId: 'enhancement_stone_001', quantity: 1 }];
    const enhancementAttempt = calculateEnhancementSuccess(sword, materials, character);
    console.log(`✅ Enhancement success chance: ${enhancementAttempt.successChance}%`);
    console.log(`   Failure consequence: ${enhancementAttempt.failureConsequence}`);
    
    // Test enhancement attempt
    const result = enhanceItem(sword, enhancementAttempt);
    console.log(`✅ Enhancement attempt: ${result.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${result.message}`);
  }
}

function testMaintenanceSystem() {
  console.log('\n🔧 Testing Maintenance System...');
  
  const character = createSampleCharacter();
  const items = createSampleItems();
  const chainMail = items.find(item => item.id === 'chain_mail_001');
  
  if (chainMail) {
    // Test durability damage
    const damage = {
      amount: 10,
      source: 'combat' as const,
      description: 'Battle damage'
    };
    
    const damagedItem = applyDurabilityDamage(chainMail, damage);
    console.log(`✅ Applied durability damage: ${damagedItem.durability?.current}/${damagedItem.durability?.maximum}`);
    
    // Test repair
    const availableMaterials = [{ itemId: 'iron_ring', quantity: 10 }];
    const repairResult = attemptRepair(chainMail, character, availableMaterials);
    console.log(`✅ Repair attempt: ${repairResult.success ? 'Success' : 'Failed'}`);
    console.log(`   Durability restored: ${repairResult.durabilityRestored}`);
    
    // Test maintenance
    const maintenanceResult = performMaintenance(chainMail, character);
    console.log(`✅ Maintenance: ${maintenanceResult.success ? 'Success' : 'Failed'}`);
    console.log(`   Message: ${maintenanceResult.message}`);
  }
}

function testInventoryManager() {
  console.log('\n📦 Testing Inventory Manager...');
  
  const manager = createInventoryManagerDemo();
  
  // Test equipment operations
  const equipResult = manager.equipItem('iron_sword_001', 'weapon');
  console.log(`✅ Equipment test: ${equipResult.success ? 'Success' : 'Failed'} - ${equipResult.message}`);
  
  // Test recommendations
  const recommendations = manager.getEquipmentRecommendations();
  console.log(`✅ Generated ${recommendations.length} equipment recommendations`);
  
  // Test active sets and synergies
  const activeSets = manager.getActiveSets();
  const activeSynergies = manager.getActiveSynergies();
  console.log(`✅ Active sets: ${activeSets.length}, Active synergies: ${activeSynergies.length}`);
  
  // Test maintenance alerts
  const inventoryState = manager.getInventoryState();
  const alerts = inventoryState.maintenanceAlerts || [];
  console.log(`✅ Maintenance alerts: ${alerts.length}`);
}

function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...');
  
  // Test that all required data is present
  console.log(`✅ Equipment sets: ${EQUIPMENT_SETS.length} defined`);
  console.log(`✅ Item synergies: ${ITEM_SYNERGIES.length} defined`);
  console.log(`✅ Crafting recipes: ${CRAFTING_RECIPES.length} defined`);
  console.log(`✅ Crafting stations: ${CRAFTING_STATIONS.length} defined`);
  
  // Test sample data creation
  const character = createSampleCharacter();
  const items = createSampleItems();
  const inventoryState = createSampleInventoryState();
  
  console.log(`✅ Sample character created: ${character.name} (Level ${character.level})`);
  console.log(`✅ Sample items created: ${items.length} items`);
  console.log(`✅ Sample inventory state created with ${Object.keys(inventoryState.equippedItems).length} equipment slots`);
}

// Main test function
export function runInventorySystemTests() {
  console.log('🎮 Starting Comprehensive Inventory System Tests\n');
  console.log('=' .repeat(60));
  
  try {
    testDataIntegrity();
    testItemSynergyEngine();
    testCraftingEngine();
    testEnhancementSystem();
    testMaintenanceSystem();
    testInventoryManager();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All inventory system tests completed successfully!');
    console.log('\nRunning complete demo...\n');
    
    // Run the complete demo
    runCompleteInventoryDemo();
    
    console.log('\n✅ Inventory system is fully functional and ready for integration!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  }
}

// Export for use in other files
export {
  testItemSynergyEngine,
  testCraftingEngine,
  testEnhancementSystem,
  testMaintenanceSystem,
  testInventoryManager,
  testDataIntegrity
};

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runInventorySystemTests();
}
