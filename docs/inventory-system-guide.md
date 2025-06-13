# Comprehensive Inventory and Item Systems Guide

## Overview

This guide documents the enhanced inventory and item systems that provide strategic depth and player agency through comprehensive crafting, enhancement, and equipment mechanics.

## System Architecture

### Core Components

1. **Enhanced Item System** (`src/types/story.ts`)
   - Extended item types with crafting materials, enhancement items, and set pieces
   - Item enhancement levels, durability, and modification slots
   - Item set definitions and synergy mechanics

2. **Crafting Engine** (`src/lib/crafting-engine.ts`)
   - Recipe-based crafting with skill requirements
   - Crafting station management and bonuses
   - Success rate calculations and quality determination

3. **Item Synergy Engine** (`src/lib/item-synergy-engine.ts`)
   - Equipment set detection and bonus application
   - Item synergy calculations between different equipment pieces
   - Conditional bonuses based on character state and situation

4. **Item Maintenance Engine** (`src/lib/item-maintenance-engine.ts`)
   - Durability tracking and degradation
   - Maintenance requirements and scheduling
   - Repair mechanics and costs

5. **Inventory Manager** (`src/lib/inventory-manager.ts`)
   - Unified inventory management system
   - Integration of all item systems
   - Equipment recommendations and optimization

## Key Features

### 🔨 Crafting System

**Recipe-Based Crafting**
- Ingredients with quality requirements and alternatives
- Skill level requirements and experience rewards
- Crafting stations with specializations and bonuses
- Success rates based on character skills and materials

**Crafting Stations**
- Specialized workbenches (smithy, alchemy lab, enchanting table)
- Station levels with upgrade paths
- Bonuses to success rate, quality, and material efficiency
- Ownership and location-based access

**Recipe Discovery**
- Experimental crafting for discovering new recipes
- Teacher NPCs and unlock conditions
- Progressive recipe complexity

### ⚡ Item Enhancement System

**Enhancement Levels**
- Progressive enhancement from +0 to +10
- Increasing costs and decreasing success rates
- Risk of level loss or item destruction at higher levels
- Bonus stats that scale with enhancement level

**Enhancement Materials**
- Different quality materials with varying success bonuses
- Material efficiency and alternative options
- Special enhancement crystals for rare improvements

**Risk/Reward Mechanics**
- Failure consequences scale with enhancement level
- Safe enhancement zones vs. high-risk zones
- Protective materials to reduce failure risks

### 🛡️ Equipment Sets & Synergies

**Equipment Sets**
- Progressive bonuses for wearing multiple set pieces
- 2-piece, 3-piece, 4-piece bonus tiers
- Set bonuses that complement different playstyles
- Visual and mechanical set identification

**Item Synergies**
- Specific item combinations that provide unique bonuses
- Weapon + shield combinations
- Staff + orb magical synergies
- Conditional bonuses based on character state

**Conditional Bonuses**
- Health-based bonuses (low health, high mana)
- Combat state bonuses (in combat, specific enemy types)
- Environmental bonuses (time of day, location type)
- Dynamic bonus evaluation

### 🔧 Item Maintenance & Durability

**Durability System**
- Items degrade with use and time
- Different degradation rates based on item quality
- Condition states: pristine, good, worn, damaged, broken
- Performance penalties for poor condition

**Maintenance Requirements**
- Regular maintenance to prevent degradation
- Skill-based maintenance success rates
- Preventive maintenance bonuses
- Maintenance scheduling and alerts

**Repair Mechanics**
- Material and currency costs for repairs
- Skill-based repair success rates
- Quality changes during repair (improvement/degradation)
- Emergency field repairs vs. professional restoration

### 📊 Strategic Item Mechanics

**Active Item Abilities**
- Items with usable abilities beyond stat bonuses
- Cooldown-based active effects
- Situational utility items
- Combat consumables with tactical applications

**Trade-offs and Choices**
- Items with both positive and negative effects
- Specialization vs. versatility decisions
- Resource allocation for enhancement vs. new equipment
- Risk assessment for high-level enhancements

## Usage Examples

### Basic Equipment Management

```typescript
import { InventoryManager } from '@/lib/inventory-manager';
import { createSampleCharacter, createSampleInventoryState } from '@/lib/inventory-demo';

// Initialize inventory manager
const character = createSampleCharacter();
const inventoryState = createSampleInventoryState();
const manager = new InventoryManager(
  character,
  inventoryState,
  EQUIPMENT_SETS,
  ITEM_SYNERGIES,
  CRAFTING_RECIPES,
  CRAFTING_STATIONS
);

// Equip an item
const result = manager.equipItem('iron_sword_001', 'weapon');
console.log(result.message); // "Equipped Iron Sword"

// Check active set bonuses
const activeSets = manager.getActiveSets();
console.log(`Active sets: ${activeSets.length}`);
```

### Crafting Items

```typescript
// Craft a health potion
const craftingResult = manager.craftItem('health_potion', 'alchemy_lab');

if (craftingResult.success) {
  console.log(`Crafted ${craftingResult.outputItems[0].name}`);
  console.log(`Quality: ${craftingResult.qualityAchieved}`);
  console.log(`Experience gained: ${craftingResult.experienceGained}`);
} else {
  console.log(`Crafting failed: ${craftingResult.failureReason}`);
}
```

### Item Enhancement

```typescript
// Enhance a weapon
const materials = [{ itemId: 'enhancement_stone', quantity: 1 }];
const enhancementResult = manager.enhanceItem('iron_sword_001', materials);

console.log(`Enhancement ${enhancementResult.success ? 'succeeded' : 'failed'}`);
console.log(enhancementResult.message);
```

### Equipment Recommendations

```typescript
// Get equipment recommendations
const recommendations = manager.getEquipmentRecommendations();

recommendations.forEach(rec => {
  console.log(`Recommend ${rec.recommendedItem.name} for ${rec.slot}`);
  console.log(`Improvement type: ${rec.improvementType}`);
  console.log(`Expected benefits: ${rec.description}`);
});
```

## Integration with Existing Systems

### Character Progression
- Crafting skills affect success rates and available recipes
- Enhancement skills reduce failure risks
- Maintenance skills improve repair outcomes
- Equipment bonuses integrate with character stats

### Combat System
- Equipment bonuses apply to combat calculations
- Item durability affects combat performance
- Active item abilities available during combat
- Set bonuses and synergies enhance combat effectiveness

### Story and Quests
- Quest rewards can include rare crafting materials
- Story progression unlocks new recipes and stations
- Equipment requirements for certain story paths
- NPC interactions for recipe learning

## Configuration and Customization

### Adding New Item Sets

```typescript
// Define a new equipment set
const newSet: ItemSetBonus = {
  setId: 'arcane_scholar',
  setName: 'Arcane Scholar',
  requiredPieces: 3,
  bonusEffects: [
    {
      id: 'scholar_wisdom',
      name: 'Scholar\'s Wisdom',
      description: '+15 Intelligence, +25 Max Mana',
      type: 'stat_modifier',
      duration: 'permanent_while_equipped',
      statModifiers: [
        { stat: 'intelligence', value: 15, type: 'add' },
        { stat: 'maxMana', value: 25, type: 'add' }
      ]
    }
  ],
  description: 'Enhances magical learning and mana capacity'
};
```

### Creating Custom Synergies

```typescript
// Define item synergy
const customSynergy: ItemSynergy = {
  id: 'elemental_mastery',
  name: 'Elemental Mastery',
  description: 'Fire staff + ice ring combination',
  requiredItems: ['fire_staff', 'ice_ring'],
  synergyEffects: [
    {
      id: 'elemental_balance',
      name: 'Elemental Balance',
      description: '+20% Spell Damage, Spells gain dual element effects',
      type: 'special_effect',
      duration: 'permanent_while_equipped',
      statModifiers: [
        { stat: 'spellDamage', value: 20, type: 'add' }
      ]
    }
  ],
  conditionalBonuses: [
    {
      condition: 'high_mana',
      threshold: 75,
      effects: [/* additional effects when mana is high */],
      description: 'Enhanced effects when mana is above 75%'
    }
  ]
};
```

## Performance Considerations

- **Caching**: Equipment bonuses are cached and only recalculated when equipment changes
- **Lazy Evaluation**: Conditional bonuses are only evaluated when needed
- **Efficient Lookups**: Item and recipe lookups use optimized data structures
- **Batch Operations**: Multiple inventory operations can be batched for efficiency

## Testing and Validation

Run the comprehensive demo to test all systems:

```typescript
import { runCompleteInventoryDemo } from '@/lib/inventory-demo';

// Run full system demonstration
runCompleteInventoryDemo();
```

This will test:
- Equipment set detection and bonuses
- Item synergy calculations
- Crafting mechanics
- Enhancement system
- Maintenance and repair
- Equipment recommendations

## Future Enhancements

- **Item Socketing**: Gem and rune socketing system
- **Legendary Items**: Unique items with special properties
- **Item Transmutation**: Converting items between types
- **Auction House**: Player-to-player trading system
- **Item Collections**: Achievement-based item collecting
- **Seasonal Items**: Time-limited equipment and materials
