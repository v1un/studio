/**
 * AI Game Master System
 * 
 * Autonomous AI system that can trigger game state changes based on story context,
 * player actions, and narrative requirements. Provides intelligent automation
 * for game management without manual intervention.
 */

import type {
  StructuredStoryState,
  CharacterProfile,
  StoryTurn,
  DisplayMessage
} from '@/types/story';

import type {
  GameCommand,
  CommandExecutionResult
} from './chat-command-executor';

import { parseGameCommand } from './chat-command-parser';
import { createCommandExecutor } from './chat-command-executor';
import { generateUUID } from '@/lib/utils';

// === AI GM DECISION TYPES ===

export interface GMDecision {
  id: string;
  type: 'character_progression' | 'inventory_update' | 'world_change' | 'quest_update' | 'combat_trigger' | 'narrative_event';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  commands: GameCommand[];
  triggerConditions: string[];
  timestamp: string;
}

export interface GMAnalysisResult {
  shouldTrigger: boolean;
  decisions: GMDecision[];
  contextAnalysis: {
    storyMomentum: number; // 0-1 scale
    playerEngagement: number; // 0-1 scale
    narrativeConsistency: number; // 0-1 scale
    systemBalance: number; // 0-1 scale
  };
  recommendations: string[];
}

export interface GMExecutionResult {
  executedDecisions: GMDecision[];
  results: CommandExecutionResult[];
  updatedStoryState: StructuredStoryState;
  systemMessages: DisplayMessage[];
  warnings: string[];
}

// === AI GAME MASTER CLASS ===

export class AIGameMaster {
  private storyState: StructuredStoryState;
  private storyHistory: StoryTurn[];
  private currentTurnId: string;

  constructor(storyState: StructuredStoryState, storyHistory: StoryTurn[], currentTurnId: string) {
    this.storyState = storyState;
    this.storyHistory = storyHistory;
    this.currentTurnId = currentTurnId;
  }

  /**
   * Analyzes current game state and determines what actions the GM should take
   */
  analyzeAndDecide(): GMAnalysisResult {
    const contextAnalysis = this.analyzeContext();
    const decisions = this.generateDecisions(contextAnalysis);
    
    return {
      shouldTrigger: decisions.length > 0,
      decisions,
      contextAnalysis,
      recommendations: this.generateRecommendations(contextAnalysis, decisions)
    };
  }

  /**
   * Executes GM decisions and applies changes to game state
   */
  async executeDecisions(decisions: GMDecision[]): Promise<GMExecutionResult> {
    const executor = createCommandExecutor({
      storyState: this.storyState,
      currentTurnId: this.currentTurnId,
      isGMCommand: true,
      safetyChecks: false // GM has elevated privileges
    });

    const executedDecisions: GMDecision[] = [];
    const results: CommandExecutionResult[] = [];
    const systemMessages: DisplayMessage[] = [];
    const warnings: string[] = [];
    let updatedStoryState = { ...this.storyState };

    // Sort decisions by priority
    const sortedDecisions = decisions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const decision of sortedDecisions) {
      try {
        // Execute all commands in the decision
        for (const command of decision.commands) {
          const result = await executor.executeCommand(command);
          results.push(result);

          if (result.success && result.updatedStoryState) {
            updatedStoryState = result.updatedStoryState;
            executor.context.storyState = updatedStoryState; // Update context for next command
          }

          if (result.warnings) {
            warnings.push(...result.warnings);
          }

          // Create system message for successful commands
          if (result.success) {
            systemMessages.push({
              id: generateUUID(),
              speakerType: 'SystemHelper',
              speakerNameLabel: 'Game Master',
              content: `${decision.reasoning}: ${result.message}`,
              timestamp: new Date().toISOString()
            });
          }
        }

        executedDecisions.push(decision);
      } catch (error: any) {
        warnings.push(`Failed to execute GM decision: ${error.message}`);
      }
    }

    return {
      executedDecisions,
      results,
      updatedStoryState,
      systemMessages,
      warnings
    };
  }

  // === CONTEXT ANALYSIS ===

  private analyzeContext(): GMAnalysisResult['contextAnalysis'] {
    const character = this.storyState.character;
    const recentTurns = this.storyHistory.slice(-5);
    
    // Analyze story momentum (how active/engaging recent turns have been)
    const storyMomentum = this.calculateStoryMomentum(recentTurns);
    
    // Analyze player engagement (variety of actions, meaningful choices)
    const playerEngagement = this.calculatePlayerEngagement(recentTurns);
    
    // Analyze narrative consistency (story coherence, character development)
    const narrativeConsistency = this.calculateNarrativeConsistency();
    
    // Analyze system balance (character power, resource availability)
    const systemBalance = this.calculateSystemBalance(character);

    return {
      storyMomentum,
      playerEngagement,
      narrativeConsistency,
      systemBalance
    };
  }

  private calculateStoryMomentum(recentTurns: StoryTurn[]): number {
    if (recentTurns.length === 0) return 0.5;

    let momentum = 0;
    for (const turn of recentTurns) {
      // Check for action words, conflict, progression
      const content = turn.messages.map(m => m.content).join(' ').toLowerCase();
      
      if (content.includes('combat') || content.includes('fight') || content.includes('battle')) momentum += 0.3;
      if (content.includes('discover') || content.includes('find') || content.includes('learn')) momentum += 0.2;
      if (content.includes('quest') || content.includes('mission') || content.includes('objective')) momentum += 0.2;
      if (content.includes('level') || content.includes('skill') || content.includes('power')) momentum += 0.1;
    }

    return Math.min(momentum / recentTurns.length, 1);
  }

  private calculatePlayerEngagement(recentTurns: StoryTurn[]): number {
    if (recentTurns.length === 0) return 0.5;

    let engagement = 0;
    for (const turn of recentTurns) {
      const playerMessages = turn.messages.filter(m => m.speakerType === 'Player');
      
      // Longer, more detailed responses indicate higher engagement
      for (const message of playerMessages) {
        const wordCount = message.content.split(' ').length;
        if (wordCount > 20) engagement += 0.3;
        else if (wordCount > 10) engagement += 0.2;
        else if (wordCount > 5) engagement += 0.1;
      }
    }

    return Math.min(engagement / recentTurns.length, 1);
  }

  private calculateNarrativeConsistency(): number {
    // Check for consistent character development, world state, etc.
    let consistency = 0.7; // Base consistency score

    // Check character progression consistency
    const character = this.storyState.character;
    if (character.level > 1 && character.skills.length === 0) consistency -= 0.2;
    if (character.experience > character.level * 100) consistency -= 0.1;

    // Check inventory consistency
    const hasWeapon = this.storyState.equippedItems.weapon;
    const hasArmor = this.storyState.equippedItems.body;
    if (character.level > 5 && !hasWeapon) consistency -= 0.1;
    if (character.level > 3 && !hasArmor) consistency -= 0.1;

    return Math.max(consistency, 0);
  }

  private calculateSystemBalance(character: CharacterProfile): number {
    let balance = 0.7; // Base balance score

    // Check health/mana ratios
    const healthRatio = character.currentHealth / character.baseStats.health;
    const manaRatio = character.currentMana / character.baseStats.mana;
    
    if (healthRatio < 0.3) balance -= 0.2; // Very low health
    if (manaRatio < 0.3) balance -= 0.1; // Very low mana
    
    // Check level vs stats balance
    const expectedStatTotal = character.level * 10 + 60; // Rough estimate
    const actualStatTotal = Object.values(character.baseStats).reduce((sum, stat) => sum + stat, 0);
    const statRatio = actualStatTotal / expectedStatTotal;
    
    if (statRatio < 0.8) balance -= 0.2; // Underpowered
    if (statRatio > 1.5) balance -= 0.1; // Overpowered

    return Math.max(balance, 0);
  }

  // === DECISION GENERATION ===

  private generateDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];

    // Character progression decisions
    decisions.push(...this.generateCharacterProgressionDecisions(context));

    // Inventory management decisions
    decisions.push(...this.generateInventoryDecisions(context));

    // World state decisions
    decisions.push(...this.generateWorldStateDecisions(context));

    // Quest management decisions
    decisions.push(...this.generateQuestDecisions(context));

    // Combat decisions
    decisions.push(...this.generateCombatDecisions(context));

    // Narrative decisions
    decisions.push(...this.generateNarrativeDecisions(context));

    return decisions.filter(decision => decision.commands.length > 0);
  }

  private generateCharacterProgressionDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];
    const character = this.storyState.character;

    // Auto-level up if enough experience
    const expForNextLevel = character.level * 100;
    if (character.experience >= expForNextLevel) {
      decisions.push({
        id: generateUUID(),
        type: 'character_progression',
        priority: 'medium',
        reasoning: 'Character has enough experience to level up',
        commands: [
          parseGameCommand('level up', { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['experience >= level_threshold'],
        timestamp: new Date().toISOString()
      });
    }

    // Heal character if critically low health and not in combat
    if (character.currentHealth < character.baseStats.health * 0.2) {
      const healAmount = Math.floor(character.baseStats.health * 0.3);
      decisions.push({
        id: generateUUID(),
        type: 'character_progression',
        priority: 'high',
        reasoning: 'Character health is critically low, providing emergency healing',
        commands: [
          parseGameCommand(`heal ${healAmount} hp`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['health < 20%', 'not_in_combat'],
        timestamp: new Date().toISOString()
      });
    }

    return decisions;
  }

  private generateInventoryDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];
    const character = this.storyState.character;

    // Suggest basic equipment for new characters
    const hasWeapon = character.inventory.some(item => item.type === 'weapon' && item.isEquipped);
    if (character.level <= 3 && !hasWeapon) {
      decisions.push({
        id: generateUUID(),
        type: 'inventory_update',
        priority: 'medium',
        reasoning: 'New character needs basic equipment',
        commands: [
          parseGameCommand('add item basic sword', { character, storyState: this.storyState }).command!,
          parseGameCommand('equip basic sword', { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['low_level', 'no_weapon'],
        timestamp: new Date().toISOString()
      });
    }

    // Suggest healing items if health is low and no potions
    const hasHealingItems = character.inventory.some(item =>
      item.name.toLowerCase().includes('potion') || item.name.toLowerCase().includes('heal')
    );
    if (character.currentHealth < character.baseStats.health * 0.5 && !hasHealingItems) {
      decisions.push({
        id: generateUUID(),
        type: 'inventory_update',
        priority: 'high',
        reasoning: 'Character needs healing items for survival',
        commands: [
          parseGameCommand('add item health potion 3', { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['low_health', 'no_healing_items'],
        timestamp: new Date().toISOString()
      });
    }

    // Equipment upgrade suggestions based on level
    if (character.level >= 5 && character.level % 5 === 0) {
      const upgradeLevel = Math.floor(character.level / 5);
      decisions.push({
        id: generateUUID(),
        type: 'inventory_update',
        priority: 'medium',
        reasoning: `Character level ${character.level} qualifies for equipment upgrade`,
        commands: [
          parseGameCommand(`add item enhanced sword +${upgradeLevel}`, { character, storyState: this.storyState }).command!,
          parseGameCommand(`add item enhanced armor +${upgradeLevel}`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['level_milestone', 'equipment_upgrade_available'],
        timestamp: new Date().toISOString()
      });
    }

    return decisions;
  }

  private generateWorldStateDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];
    const character = this.storyState.character;

    // Dynamic weather changes based on story mood
    if (context.storyMomentum < 0.4) {
      const weatherOptions = ['stormy', 'foggy', 'overcast', 'rainy'];
      const weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
      decisions.push({
        id: generateUUID(),
        type: 'world_change',
        priority: 'low',
        reasoning: 'Adjusting weather to match story atmosphere',
        commands: [
          parseGameCommand(`set weather to ${weather}`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['low_story_momentum'],
        timestamp: new Date().toISOString()
      });
    }

    // Relationship improvements for positive story moments
    if (context.narrativeConsistency > 0.7 && this.storyState.relationships?.length > 0) {
      const randomRelationship = this.storyState.relationships[
        Math.floor(Math.random() * this.storyState.relationships.length)
      ];
      decisions.push({
        id: generateUUID(),
        type: 'world_change',
        priority: 'low',
        reasoning: 'Strengthening relationships during positive story moments',
        commands: [
          parseGameCommand(`improve relationship with ${randomRelationship.characterName} by 5`,
            { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['high_narrative_consistency', 'positive_story_moment'],
        timestamp: new Date().toISOString()
      });
    }

    // Time progression for pacing
    if (context.storyMomentum > 0.8) {
      decisions.push({
        id: generateUUID(),
        type: 'world_change',
        priority: 'low',
        reasoning: 'Advancing time to maintain story pacing',
        commands: [
          parseGameCommand('advance time by 1 hour', { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['high_story_momentum'],
        timestamp: new Date().toISOString()
      });
    }

    return decisions;
  }

  private generateQuestDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];
    const character = this.storyState.character;
    const activeQuests = this.storyState.activeQuests || [];

    // Create new quest if player has none and engagement is low
    if (activeQuests.length === 0 && context.playerEngagement < 0.5) {
      const questTypes = [
        'Explore the mysterious cave',
        'Help the local merchant',
        'Investigate strange occurrences',
        'Gather rare materials',
        'Defeat the troublesome bandits'
      ];
      const questName = questTypes[Math.floor(Math.random() * questTypes.length)];

      decisions.push({
        id: generateUUID(),
        type: 'quest_update',
        priority: 'medium',
        reasoning: 'Creating new quest to increase player engagement',
        commands: [
          parseGameCommand(`create quest ${questName}`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['no_active_quests', 'low_engagement'],
        timestamp: new Date().toISOString()
      });
    }

    // Auto-complete simple quests if conditions are met
    for (const quest of activeQuests) {
      if (quest.objectives.every(obj => obj.isCompleted || obj.isOptional)) {
        decisions.push({
          id: generateUUID(),
          type: 'quest_update',
          priority: 'medium',
          reasoning: `Quest "${quest.title}" objectives completed, auto-completing`,
          commands: [
            parseGameCommand(`complete quest ${quest.title}`, { character, storyState: this.storyState }).command!
          ],
          triggerConditions: ['quest_objectives_complete'],
          timestamp: new Date().toISOString()
        });
      }
    }

    // Add objectives to existing quests for progression
    if (activeQuests.length > 0 && context.storyMomentum > 0.6) {
      const randomQuest = activeQuests[Math.floor(Math.random() * activeQuests.length)];
      const objectives = [
        'Find a clue about the mystery',
        'Speak with a knowledgeable NPC',
        'Collect a required item',
        'Overcome a challenge',
        'Reach a specific location'
      ];
      const objective = objectives[Math.floor(Math.random() * objectives.length)];

      decisions.push({
        id: generateUUID(),
        type: 'quest_update',
        priority: 'low',
        reasoning: 'Adding new objective to maintain quest progression',
        commands: [
          parseGameCommand(`add objective ${objective} to quest ${randomQuest.title}`,
            { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['active_quest_available', 'good_story_momentum'],
        timestamp: new Date().toISOString()
      });
    }

    return decisions;
  }

  private generateCombatDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];
    const character = this.storyState.character;

    // Start combat if story momentum is low and no active combat
    if (context.storyMomentum < 0.3 && !this.storyState.activeCombat) {
      const enemies = ['bandits', 'wild wolves', 'goblins', 'skeleton warriors', 'dark spirits'];
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];

      decisions.push({
        id: generateUUID(),
        type: 'combat_trigger',
        priority: 'medium',
        reasoning: 'Initiating combat encounter to increase story momentum',
        commands: [
          parseGameCommand(`start combat with ${enemy}`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['low_story_momentum', 'no_active_combat'],
        timestamp: new Date().toISOString()
      });
    }

    // End combat if it's been going too long
    if (this.storyState.activeCombat && this.storyState.activeCombat.round > 10) {
      decisions.push({
        id: generateUUID(),
        type: 'combat_trigger',
        priority: 'high',
        reasoning: 'Ending prolonged combat to maintain pacing',
        commands: [
          parseGameCommand('end combat', { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['prolonged_combat'],
        timestamp: new Date().toISOString()
      });
    }

    return decisions;
  }

  private generateNarrativeDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    const decisions: GMDecision[] = [];
    const character = this.storyState.character;

    // Trigger consequences for dramatic moments
    if (context.narrativeConsistency > 0.8 && context.storyMomentum > 0.7) {
      const consequences = [
        'unexpected revelation',
        'character development moment',
        'plot twist discovery',
        'emotional breakthrough',
        'mysterious encounter'
      ];
      const consequence = consequences[Math.floor(Math.random() * consequences.length)];

      decisions.push({
        id: generateUUID(),
        type: 'narrative_event',
        priority: 'medium',
        reasoning: 'Triggering narrative consequence for dramatic impact',
        commands: [
          parseGameCommand(`trigger consequence ${consequence}`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['high_narrative_consistency', 'high_story_momentum'],
        timestamp: new Date().toISOString()
      });
    }

    // Add important memories during significant moments
    if (context.playerEngagement > 0.7) {
      const memories = [
        'important conversation',
        'significant discovery',
        'emotional moment',
        'crucial decision point',
        'character insight'
      ];
      const memory = memories[Math.floor(Math.random() * memories.length)];

      decisions.push({
        id: generateUUID(),
        type: 'narrative_event',
        priority: 'low',
        reasoning: 'Recording important memory during significant moment',
        commands: [
          parseGameCommand(`add memory ${memory}`, { character, storyState: this.storyState }).command!
        ],
        triggerConditions: ['high_player_engagement'],
        timestamp: new Date().toISOString()
      });
    }

    return decisions;
  }

  private generateWorldStateDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    // Placeholder for world state decisions
    return [];
  }

  private generateQuestDecisions(context: GMAnalysisResult['contextAnalysis']): GMDecision[] {
    // Placeholder for quest decisions
    return [];
  }

  private generateRecommendations(
    context: GMAnalysisResult['contextAnalysis'],
    decisions: GMDecision[]
  ): string[] {
    const recommendations: string[] = [];

    if (context.storyMomentum < 0.3) {
      recommendations.push('Consider introducing more dynamic events or conflicts to increase story momentum');
    }

    if (context.playerEngagement < 0.4) {
      recommendations.push('Player engagement is low - consider offering more meaningful choices or interactive elements');
    }

    if (context.narrativeConsistency < 0.6) {
      recommendations.push('Narrative consistency could be improved - review character development and world state');
    }

    if (context.systemBalance < 0.5) {
      recommendations.push('Game balance needs attention - character power level may need adjustment');
    }

    if (decisions.length === 0) {
      recommendations.push('No immediate GM actions needed - story is progressing well');
    }

    return recommendations;
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Creates an AI Game Master instance
 */
export function createAIGameMaster(
  storyState: StructuredStoryState,
  storyHistory: StoryTurn[],
  currentTurnId: string
): AIGameMaster {
  return new AIGameMaster(storyState, storyHistory, currentTurnId);
}

/**
 * Quick analysis and execution helper
 */
export async function runAIGameMasterAnalysis(
  storyState: StructuredStoryState,
  storyHistory: StoryTurn[],
  currentTurnId: string
): Promise<{ analysis: GMAnalysisResult; execution?: GMExecutionResult }> {
  const gm = createAIGameMaster(storyState, storyHistory, currentTurnId);
  const analysis = gm.analyzeAndDecide();
  
  let execution: GMExecutionResult | undefined;
  if (analysis.shouldTrigger) {
    execution = await gm.executeDecisions(analysis.decisions);
  }

  return { analysis, execution };
}
