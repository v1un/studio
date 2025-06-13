/**
 * Balance System Demo
 * 
 * Demonstrates the comprehensive game balance and difficulty system:
 * - Shows how different components work together
 * - Provides examples of balance adjustments
 * - Demonstrates failure recovery mechanics
 * - Shows resource scarcity effects
 */

import { GameBalanceSystem } from './balance-system-integration';
import type { StructuredStoryState, CharacterProfile, CombatResult } from '@/types/story';

// === DEMO SETUP ===

function createDemoCharacter(): CharacterProfile {
  return {
    id: 'demo-player',
    name: 'Demo Player',
    level: 5,
    health: 80,
    maxHealth: 100,
    experiencePoints: 1200,
    experienceToNextLevel: 300,
    currency: 150,
    attributes: {
      strength: 12,
      dexterity: 10,
      constitution: 14,
      intelligence: 11,
      wisdom: 9,
      charisma: 8,
    },
    skills: {},
    backstory: 'A brave adventurer testing the balance system',
  };
}

function createDemoStoryState(): StructuredStoryState {
  return {
    character: createDemoCharacter(),
    currentLocation: 'Dangerous Forest',
    inventory: [
      {
        id: 'health-potion-1',
        name: 'Health Potion',
        description: 'Restores health',
        quantity: 2,
        basePrice: 25,
      },
      {
        id: 'sword-1',
        name: 'Iron Sword',
        description: 'A reliable weapon',
        quantity: 1,
        basePrice: 100,
        equipSlot: 'weapon',
      },
    ],
    equippedItems: {},
    quests: [
      {
        id: 'demo-quest',
        title: 'Explore the Forest',
        description: 'Navigate through the dangerous forest',
        status: 'active',
        type: 'main',
        objectives: [
          {
            id: 'obj-1',
            description: 'Reach the forest clearing',
            completed: false,
          },
        ],
      },
    ],
    storyArcs: [],
    worldFacts: ['The forest is known to be dangerous', 'Monsters roam at night'],
    trackedNPCs: [],
  } as StructuredStoryState;
}

// === DEMO SCENARIOS ===

export function runBalanceSystemDemo(): void {
  console.log('=== Game Balance System Demo ===\n');

  const balanceSystem = new GameBalanceSystem();
  const storyState = createDemoStoryState();

  // Scenario 1: Combat Encounter Balancing
  console.log('1. Combat Encounter Balancing');
  console.log('------------------------------');
  
  const baseEnemyStats = {
    health: 50,
    attack: 12,
    defense: 8,
    speed: 10,
  };

  const balancedEnemy = balanceSystem.balanceCombatEncounter(baseEnemyStats, {
    playerLevel: 5,
    location: 'Dangerous Forest',
    questImportance: 'major',
    playerCondition: 'good',
  });

  console.log('Base enemy stats:', baseEnemyStats);
  console.log('Balanced enemy stats:', balancedEnemy);
  console.log();

  // Scenario 2: Resource Scarcity Effects
  console.log('2. Resource Scarcity Effects');
  console.log('----------------------------');

  const resourceAvailability = balanceSystem.getResourceAvailability(
    'health_potions',
    100, // 100% base availability
    'shop'
  );

  console.log('Health potion availability:', resourceAvailability);
  console.log();

  // Scenario 3: Risk/Reward Calculation
  console.log('3. Risk/Reward Calculation');
  console.log('--------------------------');

  const baseRewards = {
    experience: 100,
    currency: 50,
    items: [],
  };

  const balancedRewards = balanceSystem.calculateBalancedRewards(baseRewards, {
    riskLevel: 75, // High risk action
    difficultyMultiplier: 1.2,
    timeConstraints: 2, // Time pressure
    creativeSolution: true,
  });

  console.log('Base rewards:', baseRewards);
  console.log('Balanced rewards:', balancedRewards);
  console.log();

  // Scenario 4: Player Action Processing
  console.log('4. Player Action Processing');
  console.log('---------------------------');

  const combatResult: CombatResult = {
    combatId: 'demo-combat',
    outcome: 'victory',
    duration: 6,
    difficultyLevel: 60,
    playerLevel: 5,
    timestamp: new Date().toISOString(),
  };

  const actionResult = balanceSystem.processPlayerAction(
    'Attack the forest wolf',
    'Successfully defeated the wolf',
    {
      storyState,
      actionType: 'combat',
      success: true,
      riskLevel: 60,
      resourcesUsed: { 'health_potions': 1 },
      timeSpent: 6,
      combatResult,
    }
  );

  console.log('Action processing results:');
  console.log('- Performance metrics updated');
  console.log('- Scarcity events checked:', actionResult.scarcityEvents.length);
  console.log('- Recovery options:', actionResult.recoveryOptions.length);
  console.log('- Recommendations:', actionResult.recommendations);
  console.log();

  // Scenario 5: Trade-off Mechanics
  console.log('5. Trade-off Mechanics');
  console.log('----------------------');

  const availableTradeoffs = balanceSystem.getAvailableTradeoffs(
    storyState,
    'Facing a powerful enemy'
  );

  console.log('Available trade-offs:', availableTradeoffs.length);
  availableTradeoffs.forEach((tradeoff, index) => {
    console.log(`${index + 1}. ${tradeoff.name}: ${tradeoff.description}`);
  });
  console.log();

  // Scenario 6: System Status Overview
  console.log('6. System Status Overview');
  console.log('-------------------------');

  const systemStatus = balanceSystem.getSystemStatus();
  
  console.log('Current difficulty settings:');
  console.log('- Combat scaling:', systemStatus.currentDifficulty.combatScaling);
  console.log('- Resource scarcity:', systemStatus.currentDifficulty.resourceScarcity);
  console.log('- Consequence severity:', systemStatus.currentDifficulty.consequenceSeverity);
  console.log();

  console.log('Performance summary:');
  console.log('- Combat win rate:', systemStatus.performanceSummary.combatWinRate + '%');
  console.log('- Resource efficiency:', systemStatus.performanceSummary.resourceEfficiency + '%');
  console.log('- Quest completion rate:', systemStatus.performanceSummary.questCompletionRate + '%');
  console.log('- Engagement level:', systemStatus.performanceSummary.overallEngagement + '%');
  console.log('- Frustration level:', systemStatus.performanceSummary.frustrationLevel + '%');
  console.log();

  console.log('Active events:', systemStatus.activeEvents.length);
  console.log('Recommendations:', systemStatus.recommendations);
  console.log();

  console.log('Player resilience:');
  console.log('- Resilience score:', systemStatus.playerResilience.resilienceScore);
  console.log('- Adaptability score:', systemStatus.playerResilience.adaptabilityScore);
  console.log('- Learning rate:', systemStatus.playerResilience.learningRate);
  console.log();
}

// === SPECIFIC FEATURE DEMOS ===

export function demonstrateDynamicDifficulty(): void {
  console.log('=== Dynamic Difficulty Adjustment Demo ===\n');

  const balanceSystem = new GameBalanceSystem();
  
  // Simulate a struggling player
  console.log('Scenario: Player struggling with combat');
  console.log('--------------------------------------');
  
  // Simulate multiple combat losses
  for (let i = 0; i < 5; i++) {
    const combatResult: CombatResult = {
      combatId: `combat-${i}`,
      outcome: 'defeat',
      duration: 3,
      difficultyLevel: 70,
      playerLevel: 3,
      timestamp: new Date().toISOString(),
    };

    balanceSystem.processPlayerAction(
      'Engage in combat',
      'Defeated by enemy',
      {
        storyState: createDemoStoryState(),
        actionType: 'combat',
        success: false,
        combatResult,
      }
    );
  }

  const statusAfterLosses = balanceSystem.getSystemStatus();
  console.log('After multiple defeats:');
  console.log('- Combat scaling adjusted to:', statusAfterLosses.currentDifficulty.combatScaling);
  console.log('- Recommendations:', statusAfterLosses.recommendations);
  console.log();

  // Simulate player improvement
  console.log('Scenario: Player improving performance');
  console.log('-------------------------------------');
  
  for (let i = 0; i < 5; i++) {
    const combatResult: CombatResult = {
      combatId: `victory-${i}`,
      outcome: 'victory',
      duration: 4,
      difficultyLevel: 50,
      playerLevel: 4,
      timestamp: new Date().toISOString(),
    };

    balanceSystem.processPlayerAction(
      'Engage in combat',
      'Victory achieved',
      {
        storyState: createDemoStoryState(),
        actionType: 'combat',
        success: true,
        combatResult,
      }
    );
  }

  const statusAfterWins = balanceSystem.getSystemStatus();
  console.log('After multiple victories:');
  console.log('- Combat scaling adjusted to:', statusAfterWins.currentDifficulty.combatScaling);
  console.log('- Recommendations:', statusAfterWins.recommendations);
  console.log();
}

export function demonstrateFailureRecovery(): void {
  console.log('=== Failure Recovery System Demo ===\n');

  const balanceSystem = new GameBalanceSystem();
  const storyState = createDemoStoryState();

  // Simulate a quest failure
  console.log('Scenario: Quest failure and recovery');
  console.log('-----------------------------------');

  const failureResult = balanceSystem.processPlayerAction(
    'Attempt to negotiate with bandits',
    'Negotiations failed, bandits became hostile',
    {
      storyState,
      actionType: 'quest',
      success: false,
      riskLevel: 50,
    }
  );

  console.log('Quest failure detected');
  console.log('Available recovery options:', failureResult.recoveryOptions.length);
  
  failureResult.recoveryOptions.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name}: ${option.description}`);
    console.log(`   Success chance: ${option.successChance}%`);
    console.log(`   Requirements: ${option.requirements.map((r: any) => r.description).join(', ')}`);
  });
  console.log();
}

// === INTEGRATION EXAMPLES ===

export function demonstrateSystemIntegration(): void {
  console.log('=== System Integration Demo ===\n');

  const balanceSystem = new GameBalanceSystem();
  let storyState = createDemoStoryState();

  console.log('Demonstrating how balance system integrates with game flow:');
  console.log('----------------------------------------------------------');

  // 1. Player enters combat
  console.log('1. Player enters combat encounter');
  const enemyStats = balanceSystem.balanceCombatEncounter(
    { health: 60, attack: 15, defense: 10, speed: 12 },
    {
      playerLevel: storyState.character.level,
      location: storyState.currentLocation,
      questImportance: 'major',
      playerCondition: 'good',
    }
  );
  console.log('   Enemy balanced for current difficulty');

  // 2. Combat resolution
  console.log('2. Combat resolved with victory');
  const rewards = balanceSystem.calculateBalancedRewards(
    { experience: 80, currency: 30 },
    { riskLevel: 65, difficultyMultiplier: 1.1 }
  );
  console.log('   Rewards calculated:', rewards);

  // 3. Resource usage
  console.log('3. Player uses resources during adventure');
  const resourceInfo = balanceSystem.getResourceAvailability('health_potions', 100, 'loot');
  console.log('   Resource availability affected by scarcity:', resourceInfo.adjustedAvailability);

  // 4. System learns and adapts
  console.log('4. System updates and provides recommendations');
  const systemStatus = balanceSystem.getSystemStatus();
  console.log('   Current recommendations:', systemStatus.recommendations.slice(0, 2));

  console.log('\nBalance system successfully integrated with game mechanics!');
}

// === EXPORT MAIN DEMO FUNCTION ===

export function runCompleteBalanceDemo(): void {
  runBalanceSystemDemo();
  console.log('\n' + '='.repeat(50) + '\n');
  demonstrateDynamicDifficulty();
  console.log('\n' + '='.repeat(50) + '\n');
  demonstrateFailureRecovery();
  console.log('\n' + '='.repeat(50) + '\n');
  demonstrateSystemIntegration();
}
