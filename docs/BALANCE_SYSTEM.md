# Game Balance and Difficulty System

A comprehensive game balance and difficulty system for the scenario generation game that provides dynamic difficulty adjustment, resource management, risk/reward mechanics, and failure recovery systems.

## Overview

The balance system consists of four main components:

1. **Dynamic Difficulty System** - Adjusts game difficulty based on player performance
2. **Resource Scarcity Manager** - Manages resource availability and scarcity events
3. **Risk/Reward Calculator** - Balances risk vs reward for player actions
4. **Failure Recovery System** - Provides recovery options for failed actions

## Features

### Player-Controlled Difficulty System

- **Difficulty Modes**: Easy, Normal, Hard, Custom
- **Dynamic Adjustment**: Automatically adjusts based on player performance
- **Performance Metrics**: Tracks combat win rate, resource efficiency, quest completion
- **Custom Settings**: Fine-tune individual difficulty aspects

### Resource Management & Scarcity

- **Scarcity Events**: Dynamic events that affect resource availability
- **Recovery Mechanics**: Multiple ways to recover from resource shortages
- **Efficiency Tracking**: Monitors how well players manage resources
- **Warning System**: Alerts players when resources are running low

### Risk/Reward Balance

- **Risk Assessment**: Evaluates the risk level of player actions
- **Reward Scaling**: Adjusts rewards based on risk and difficulty
- **Trade-off Mechanics**: Strategic decisions with meaningful costs and benefits
- **Investment Systems**: Long-term resource allocation strategies

### Failure Recovery & Strategic Depth

- **Failure Classification**: Different types of failures with appropriate consequences
- **Recovery Options**: Multiple paths to recover from setbacks
- **Alternative Solutions**: Creative ways to achieve objectives after failure
- **Learning System**: Tracks player adaptation and resilience

## Integration

### With Existing Systems

The balance system integrates seamlessly with:

- **Combat System**: Adjusts enemy stats and encounter difficulty
- **Quest System**: Modifies quest complexity and failure handling
- **Inventory System**: Affects resource availability and costs
- **Progression System**: Influences experience and reward scaling

### Story State Integration

Balance settings are stored in the story state:

```typescript
interface StructuredStoryState {
  // ... existing fields
  gameBalance?: GameBalanceSettings;
  playerPerformance?: PlayerPerformanceMetrics;
  activeResourceScarcity?: ResourceScarcityEvent[];
  activeTradeoffs?: TradeoffMechanic[];
  failureHistory?: FailureRecoveryRecord[];
}
```

## Usage Examples

### Basic Setup

```typescript
import { GameBalanceSystem } from '@/lib/balance-system-integration';

// Initialize with default settings
const balanceSystem = new GameBalanceSystem();

// Or with existing settings from story state
const balanceSystem = new GameBalanceSystem(
  storyState.gameBalance,
  storyState.playerPerformance
);
```

### Combat Encounter Balancing

```typescript
const baseEnemyStats = {
  health: 50,
  attack: 12,
  defense: 8,
  speed: 10,
};

const balancedStats = balanceSystem.balanceCombatEncounter(baseEnemyStats, {
  playerLevel: 5,
  location: 'Dangerous Forest',
  questImportance: 'major',
  playerCondition: 'good',
});
```

### Reward Calculation

```typescript
const baseRewards = {
  experience: 100,
  currency: 50,
  items: [],
};

const balancedRewards = balanceSystem.calculateBalancedRewards(baseRewards, {
  riskLevel: 75,
  difficultyMultiplier: 1.2,
  timeConstraints: 2,
  creativeSolution: true,
});
```

### Processing Player Actions

```typescript
const result = balanceSystem.processPlayerAction(
  'Attack the forest wolf',
  'Successfully defeated the wolf',
  {
    storyState,
    actionType: 'combat',
    success: true,
    riskLevel: 60,
    resourcesUsed: { 'health_potions': 1 },
    combatResult: {
      combatId: 'combat-1',
      outcome: 'victory',
      duration: 6,
      difficultyLevel: 60,
      playerLevel: 5,
      timestamp: new Date().toISOString(),
    },
  }
);
```

## Configuration

### Difficulty Settings

```typescript
interface CustomDifficultySettings {
  combatScaling: number;      // 0.5 to 2.0 multiplier
  resourceScarcity: number;   // 0.5 to 2.0 multiplier
  consequenceSeverity: number; // 0.5 to 2.0 multiplier
  timeConstraints: number;    // 0.5 to 2.0 multiplier
  enemyIntelligence: number;  // 0.5 to 2.0 multiplier
  lootRarity: number;         // 0.5 to 2.0 multiplier
  experienceGain: number;     // 0.5 to 2.0 multiplier
}
```

### Dynamic Adjustment

```typescript
interface DynamicDifficultySettings {
  enabled: boolean;
  adjustmentSensitivity: number;    // 0 to 100
  performanceWindow: number;        // Number of recent actions
  maxAdjustmentPerSession: number;  // Maximum change per session
  adjustmentFactors: {
    winLossRatio: number;
    resourceEfficiency: number;
    questCompletionRate: number;
    playerFrustrationIndicators: number;
    sessionLength: number;
  };
}
```

## Testing

Run the balance system demo to see all features in action:

```bash
npm run test:balance-system
```

Or run the test script directly:

```typescript
import { runCompleteBalanceDemo } from '@/lib/balance-system-demo';
runCompleteBalanceDemo();
```

## Performance Metrics

The system tracks various performance metrics:

- **Combat Metrics**: Win rate, average duration, tactical quality
- **Resource Metrics**: Efficiency, waste rate, emergency preparedness
- **Quest Metrics**: Completion rate, time management, creativity
- **Overall Metrics**: Adaptability, learning rate, engagement level

## Recommendations

The system provides intelligent recommendations:

- Difficulty adjustments based on performance
- Resource management tips
- Strategic suggestions for challenging situations
- Recovery options for failures

## Re:Zero Canon Compliance

The balance system maintains strict canon compliance by:

- Using series-specific examples in prompts rather than hard-coded requirements
- Allowing flexible difficulty that adapts to different story scenarios
- Preserving the consequences and stakes that make Re:Zero compelling
- Supporting the loop mechanic through failure recovery systems

## Future Enhancements

Potential areas for expansion:

- Machine learning-based difficulty prediction
- More sophisticated risk assessment algorithms
- Advanced player behavior analysis
- Integration with multiplayer scenarios
- Seasonal events and special challenges

## API Reference

See the individual component files for detailed API documentation:

- `src/lib/game-balance-engine.ts` - Core balance calculations
- `src/lib/resource-scarcity-manager.ts` - Resource management
- `src/lib/risk-reward-calculator.ts` - Risk/reward mechanics
- `src/lib/failure-recovery-system.ts` - Failure handling
- `src/lib/balance-system-integration.ts` - Main integration point
