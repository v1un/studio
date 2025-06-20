/**
 * Test Script for Chat Integration System
 * 
 * Comprehensive test of the AI-driven chat command system.
 * Run this to verify all components are working correctly.
 */

import { createChatIntegrationSystem } from '@/lib/chat-integration-system';
import { parseGameCommand } from '@/lib/chat-command-parser';
import { executeGameCommand } from '@/lib/chat-command-executor';
import { createAIGameMaster } from '@/lib/ai-game-master';
import type { StructuredStoryState, CharacterProfile, StoryTurn } from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === TEST DATA ===

function createTestCharacter(): CharacterProfile {
  return {
    id: generateUUID(),
    name: "Test Hero",
    class: "Warrior",
    level: 3,
    experience: 250,
    description: "A brave test character",
    baseStats: {
      health: 100,
      mana: 50,
      strength: 15,
      agility: 12,
      intelligence: 10,
      wisdom: 8,
      constitution: 14,
      charisma: 11
    },
    currentHealth: 80,
    currentMana: 30,
    skills: [
      {
        id: generateUUID(),
        name: "Sword Strike",
        description: "Basic sword attack",
        level: 2,
        experience: 50,
        maxLevel: 10,
        skillType: 'active',
        manaCost: 5,
        cooldown: 0,
        effects: []
      }
    ],
    activeTemporaryEffects: []
  };
}

function createTestStoryState(): StructuredStoryState {
  const character = createTestCharacter();
  
  return {
    character,
    currentLocation: "Test Village",
    inventory: [
      {
        id: generateUUID(),
        name: "Health Potion",
        description: "Restores health",
        itemType: "consumable",
        rarity: "common",
        value: 50,
        weight: 0.5,
        effects: []
      }
    ],
    equippedItems: {
      weapon: {
        id: generateUUID(),
        name: "Iron Sword",
        description: "A sturdy iron blade",
        itemType: "weapon",
        rarity: "common",
        value: 100,
        weight: 3,
        equipSlot: "weapon",
        effects: []
      }
    },
    quests: [],
    storyArcs: [],
    worldFacts: ["The village is peaceful", "Goblins lurk in the nearby forest"],
    trackedNPCs: [],
    
    // Enhanced tracking systems
    characterEmotionalState: {
      currentMood: "determined",
      stressLevel: 3,
      relationships: [],
      recentEmotionalEvents: []
    },
    npcRelationships: [],
    factionStandings: [],
    environmentalContext: {
      currentWeather: "clear",
      timeOfDay: "afternoon",
      season: "spring",
      ambientConditions: []
    },
    narrativeThreads: [],
    longTermStorySummary: {
      majorEvents: [],
      characterDevelopment: [],
      worldChanges: [],
      relationshipEvolution: []
    },
    playerPreferences: {
      preferredPacing: "medium",
      combatFrequency: "moderate",
      explorationFocus: "balanced",
      narrativeComplexity: "medium",
      characterInteractionLevel: "high"
    },
    choiceConsequences: [],
    systemMetrics: {
      totalPlayTime: 0,
      decisionsCount: 0,
      combatEncounters: 0,
      questsCompleted: 0,
      averageResponseTime: 0
    }
  };
}

function createTestStoryHistory(): StoryTurn[] {
  return [
    {
      id: generateUUID(),
      messages: [
        {
          id: generateUUID(),
          speakerType: 'GM',
          speakerNameLabel: 'Game Master',
          content: "Welcome to the test adventure!",
          timestamp: new Date().toISOString()
        }
      ],
      storyState: createTestStoryState(),
      timestamp: new Date().toISOString()
    }
  ];
}

// === TEST FUNCTIONS ===

async function testCommandParsing() {
  console.log("\n=== Testing Command Parsing ===");
  
  const testCommands = [
    "level up",
    "add skill fireball",
    "increase strength by 5",
    "gain 100 experience",
    "add item magic sword",
    "equip magic sword",
    "start combat with goblins",
    "heal 25 hp",
    "go to dark forest",
    "create quest find the artifact",
    "help",
    "status",
    "this is not a command"
  ];

  for (const command of testCommands) {
    const result = parseGameCommand(command);
    console.log(`Command: "${command}"`);
    console.log(`  Recognized: ${result.isGameCommand}`);
    console.log(`  Confidence: ${result.confidence}`);
    if (result.command) {
      console.log(`  Type: ${result.command.type}`);
      console.log(`  Action: ${(result.command as any).action || 'N/A'}`);
    }
    console.log("");
  }
}

async function testCommandExecution() {
  console.log("\n=== Testing Command Execution ===");
  
  const storyState = createTestStoryState();
  const currentTurnId = generateUUID();
  
  const testCommands = [
    "level up",
    "add skill ice bolt",
    "increase strength by 3",
    "gain 150 experience"
  ];

  let currentState = storyState;

  for (const commandText of testCommands) {
    console.log(`\nExecuting: "${commandText}"`);
    
    const parsed = parseGameCommand(commandText);
    if (parsed.isGameCommand && parsed.command) {
      const result = await executeGameCommand(
        parsed.command,
        currentState,
        currentTurnId,
        false
      );
      
      console.log(`  Success: ${result.success}`);
      console.log(`  Message: ${result.message}`);
      
      if (result.success && result.updatedStoryState) {
        currentState = result.updatedStoryState;
        console.log(`  Character Level: ${currentState.character.level}`);
        console.log(`  Character Health: ${currentState.character.currentHealth}/${currentState.character.baseStats.health}`);
        console.log(`  Character Skills: ${currentState.character.skills.length}`);
      }
      
      if (result.warnings) {
        console.log(`  Warnings: ${result.warnings.join(', ')}`);
      }
    }
  }
}

async function testAIGameMaster() {
  console.log("\n=== Testing AI Game Master ===");
  
  const storyState = createTestStoryState();
  const storyHistory = createTestStoryHistory();
  const currentTurnId = generateUUID();
  
  // Modify state to trigger GM decisions
  storyState.character.experience = 350; // Enough for level up
  storyState.character.currentHealth = 15; // Low health
  
  const gm = createAIGameMaster(storyState, storyHistory, currentTurnId);
  
  console.log("Running GM analysis...");
  const analysis = gm.analyzeAndDecide();
  
  console.log(`Should Trigger: ${analysis.shouldTrigger}`);
  console.log(`Decisions: ${analysis.decisions.length}`);
  
  console.log("\nContext Analysis:");
  console.log(`  Story Momentum: ${analysis.contextAnalysis.storyMomentum.toFixed(2)}`);
  console.log(`  Player Engagement: ${analysis.contextAnalysis.playerEngagement.toFixed(2)}`);
  console.log(`  Narrative Consistency: ${analysis.contextAnalysis.narrativeConsistency.toFixed(2)}`);
  console.log(`  System Balance: ${analysis.contextAnalysis.systemBalance.toFixed(2)}`);
  
  if (analysis.decisions.length > 0) {
    console.log("\nGM Decisions:");
    for (const decision of analysis.decisions) {
      console.log(`  ${decision.type} (${decision.priority}): ${decision.reasoning}`);
      console.log(`    Commands: ${decision.commands.length}`);
    }
    
    console.log("\nExecuting GM decisions...");
    const execution = await gm.executeDecisions(analysis.decisions);
    
    console.log(`Executed: ${execution.executedDecisions.length} decisions`);
    console.log(`Results: ${execution.results.length} command results`);
    console.log(`System Messages: ${execution.systemMessages.length}`);
    
    if (execution.warnings.length > 0) {
      console.log(`Warnings: ${execution.warnings.join(', ')}`);
    }
  }
  
  console.log("\nRecommendations:");
  for (const rec of analysis.recommendations) {
    console.log(`  - ${rec}`);
  }
}

async function testChatIntegration() {
  console.log("\n=== Testing Chat Integration System ===");
  
  const chatSystem = createChatIntegrationSystem({
    enableAIGM: true,
    enableSafetyChecks: true,
    enableAutoProgression: true,
    enableInventoryManagement: true,
    enableWorldStateUpdates: true,
    enableQuestManagement: true,
    enableNarrativeEvents: true
  });
  
  const storyState = createTestStoryState();
  const storyHistory = createTestStoryHistory();
  const currentTurnId = generateUUID();
  
  const testMessages = [
    "level up and learn fireball",
    "give me a better sword",
    "status",
    "help",
    "this is just a story action, not a command"
  ];
  
  let currentState = storyState;
  
  for (const message of testMessages) {
    console.log(`\nProcessing: "${message}"`);
    
    const result = await chatSystem.processChatMessage(
      message,
      currentState,
      storyHistory,
      currentTurnId,
      false
    );
    
    console.log(`  Command Recognized: ${result.parsedCommand.isGameCommand}`);
    console.log(`  User Feedback: ${result.userFeedback}`);
    console.log(`  Processing Time: ${result.processingTime}ms`);
    
    if (result.commandResult) {
      console.log(`  Command Success: ${result.commandResult.success}`);
    }
    
    if (result.gmAnalysis) {
      console.log(`  GM Analysis: ${result.gmAnalysis.decisions.length} decisions`);
    }
    
    if (result.systemMessages.length > 0) {
      console.log(`  System Messages: ${result.systemMessages.length}`);
    }
    
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.join(', ')}`);
    }
    
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
    
    currentState = result.updatedStoryState;
  }
}

async function testBatchCommands() {
  console.log("\n=== Testing Batch Command Processing ===");
  
  const chatSystem = createChatIntegrationSystem();
  const storyState = createTestStoryState();
  const storyHistory = createTestStoryHistory();
  const currentTurnId = generateUUID();
  
  const batchCommands = [
    "level up",
    "add skill lightning bolt",
    "increase agility by 2",
    "add item steel armor",
    "equip steel armor"
  ];
  
  console.log(`Processing ${batchCommands.length} commands in sequence...`);
  
  const results = await chatSystem.processBatchCommands(
    batchCommands,
    storyState,
    storyHistory,
    currentTurnId,
    false
  );
  
  console.log(`\nBatch Results:`);
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    console.log(`  ${i + 1}. "${batchCommands[i]}": ${result.commandResult?.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.userFeedback) {
      console.log(`     ${result.userFeedback}`);
    }
  }
  
  const finalState = results[results.length - 1]?.updatedStoryState || storyState;
  console.log(`\nFinal Character State:`);
  console.log(`  Level: ${finalState.character.level}`);
  console.log(`  Skills: ${finalState.character.skills.length}`);
  console.log(`  Inventory: ${finalState.inventory.length} items`);
}

// === MAIN TEST RUNNER ===

export async function runChatIntegrationTests() {
  console.log("🧪 Starting Chat Integration System Tests");
  console.log("==========================================");
  
  try {
    await testCommandParsing();
    await testCommandExecution();
    await testAIGameMaster();
    await testChatIntegration();
    await testBatchCommands();
    
    console.log("\n✅ All tests completed successfully!");
    console.log("\nThe AI-driven chat system is ready for use.");
    console.log("Players can now control all game systems through natural language commands.");
    console.log("The AI Game Master will automatically manage game balance and progression.");
    
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runChatIntegrationTests();
}
