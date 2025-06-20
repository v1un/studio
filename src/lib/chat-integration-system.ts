/**
 * Chat Integration System
 * 
 * Main orchestration system that integrates chat command parsing, execution,
 * AI Game Master decisions, and real-time state synchronization.
 * Provides the unified interface for all chat-driven game interactions.
 */

import type {
  StructuredStoryState,
  StoryTurn,
  DisplayMessage,
  GameSession
} from '@/types/story';

import type {
  ParsedCommand,
  GameCommand
} from './chat-command-parser';

import type {
  CommandExecutionResult
} from './chat-command-executor';

import type {
  GMAnalysisResult,
  GMExecutionResult
} from './ai-game-master';

import { parseGameCommand } from './chat-command-parser';
import { executeGameCommand } from './chat-command-executor';
import { runAIGameMasterAnalysis } from './ai-game-master';
import { generateUUID } from '@/lib/utils';

// === INTEGRATION TYPES ===

export interface ChatProcessingResult {
  // Command parsing results
  parsedCommand: ParsedCommand;
  
  // Execution results
  commandResult?: CommandExecutionResult;
  
  // AI GM analysis and actions
  gmAnalysis?: GMAnalysisResult;
  gmExecution?: GMExecutionResult;
  
  // Final state
  updatedStoryState: StructuredStoryState;
  systemMessages: DisplayMessage[];
  userFeedback: string;
  
  // Metadata
  processingTime: number;
  warnings: string[];
  errors: string[];
}

export interface ChatIntegrationOptions {
  enableAIGM: boolean;
  enableSafetyChecks: boolean;
  enableAutoProgression: boolean;
  enableInventoryManagement: boolean;
  enableWorldStateUpdates: boolean;
  enableQuestManagement: boolean;
  enableNarrativeEvents: boolean;
}

// === MAIN INTEGRATION CLASS ===

export class ChatIntegrationSystem {
  private options: ChatIntegrationOptions;

  constructor(options: Partial<ChatIntegrationOptions> = {}) {
    this.options = {
      enableAIGM: true,
      enableSafetyChecks: true,
      enableAutoProgression: true,
      enableInventoryManagement: true,
      enableWorldStateUpdates: true,
      enableQuestManagement: true,
      enableNarrativeEvents: true,
      ...options
    };
  }

  /**
   * Processes a chat message and executes any commands found
   */
  async processChatMessage(
    message: string,
    storyState: StructuredStoryState,
    storyHistory: StoryTurn[],
    currentTurnId: string,
    isGMCommand: boolean = false
  ): Promise<ChatProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const systemMessages: DisplayMessage[] = [];
    let updatedStoryState = { ...storyState };
    let userFeedback = '';

    try {
      // Step 1: Parse the message for commands
      const parsedCommand = parseGameCommand(message, {
        character: storyState.character,
        storyState: storyState
      });

      let commandResult: CommandExecutionResult | undefined;

      // Step 2: Execute command if found
      if (parsedCommand.isGameCommand && parsedCommand.command) {
        commandResult = await executeGameCommand(
          parsedCommand.command,
          updatedStoryState,
          currentTurnId,
          isGMCommand
        );

        if (commandResult.success && commandResult.updatedStoryState) {
          updatedStoryState = commandResult.updatedStoryState;
          userFeedback = commandResult.message;
          
          if (commandResult.systemMessages) {
            systemMessages.push(...commandResult.systemMessages.map(msg => ({
              id: generateUUID(),
              speakerType: 'SystemHelper' as const,
              speakerNameLabel: 'System',
              content: msg,
              timestamp: new Date().toISOString()
            })));
          }
        } else {
          errors.push(commandResult.message);
          userFeedback = `Command failed: ${commandResult.message}`;
        }

        if (commandResult.warnings) {
          warnings.push(...commandResult.warnings);
        }
      } else if (parsedCommand.confidence > 0.5) {
        // Partial command recognition - provide suggestions
        userFeedback = 'I detected a possible command but couldn\'t parse it completely. ';
        if (parsedCommand.suggestions) {
          userFeedback += `Did you mean: ${parsedCommand.suggestions.join(', ')}?`;
        }
      }

      // Step 3: Run AI Game Master analysis (if enabled)
      let gmAnalysis: GMAnalysisResult | undefined;
      let gmExecution: GMExecutionResult | undefined;

      if (this.options.enableAIGM) {
        try {
          const gmResult = await runAIGameMasterAnalysis(
            updatedStoryState,
            storyHistory,
            currentTurnId
          );
          
          gmAnalysis = gmResult.analysis;
          gmExecution = gmResult.execution;

          if (gmExecution) {
            updatedStoryState = gmExecution.updatedStoryState;
            systemMessages.push(...gmExecution.systemMessages);
            warnings.push(...gmExecution.warnings);
          }
        } catch (error: any) {
          warnings.push(`AI GM analysis failed: ${error.message}`);
        }
      }

      // Step 4: Generate user feedback if no command was found
      if (!parsedCommand.isGameCommand && !userFeedback) {
        userFeedback = this.generateHelpfulResponse(message, storyState);
      }

      const processingTime = Date.now() - startTime;

      return {
        parsedCommand,
        commandResult,
        gmAnalysis,
        gmExecution,
        updatedStoryState,
        systemMessages,
        userFeedback,
        processingTime,
        warnings,
        errors
      };

    } catch (error: any) {
      errors.push(`Chat processing failed: ${error.message}`);
      
      return {
        parsedCommand: { isGameCommand: false, remainingText: message, confidence: 0 },
        updatedStoryState,
        systemMessages,
        userFeedback: `Sorry, I encountered an error processing your message: ${error.message}`,
        processingTime: Date.now() - startTime,
        warnings,
        errors
      };
    }
  }

  /**
   * Processes multiple commands in sequence
   */
  async processBatchCommands(
    commands: string[],
    storyState: StructuredStoryState,
    storyHistory: StoryTurn[],
    currentTurnId: string,
    isGMCommand: boolean = false
  ): Promise<ChatProcessingResult[]> {
    const results: ChatProcessingResult[] = [];
    let currentState = storyState;

    for (const command of commands) {
      const result = await this.processChatMessage(
        command,
        currentState,
        storyHistory,
        currentTurnId,
        isGMCommand
      );
      
      results.push(result);
      currentState = result.updatedStoryState;
    }

    return results;
  }

  /**
   * Generates helpful responses for non-command messages
   */
  private generateHelpfulResponse(message: string, storyState: StructuredStoryState): string {
    const lowerMessage = message.toLowerCase();

    // Check for help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('command')) {
      return this.generateHelpText();
    }

    // Check for status requests
    if (lowerMessage.includes('status') || lowerMessage.includes('stats')) {
      return this.generateStatusSummary(storyState);
    }

    // Check for inventory requests
    if (lowerMessage.includes('inventory') || lowerMessage.includes('items')) {
      return this.generateInventorySummary(storyState);
    }

    // Check for quest requests
    if (lowerMessage.includes('quest') || lowerMessage.includes('mission')) {
      return this.generateQuestSummary(storyState);
    }

    // Default response
    return 'I didn\'t recognize that as a command. Type "help" to see available commands, or continue with your story action.';
  }

  private generateHelpText(): string {
    return `Available Commands:

**Character Commands:**
• "level up" - Gain a level
• "add skill [name]" - Learn a new skill
• "increase [stat] by [amount]" - Boost attributes
• "gain [amount] experience" - Add experience points

**Inventory Commands:**
• "add item [name]" - Get an item
• "equip [item]" - Equip an item
• "remove [item]" - Remove an item
• "craft [item]" - Create an item

**Combat Commands:**
• "start combat" - Begin a fight
• "deal [amount] damage" - Apply damage
• "heal [amount] hp" - Restore health

**World Commands:**
• "go to [location]" - Change location
• "improve relationship with [character]" - Boost relationships

**Quest Commands:**
• "create quest [name]" - Start a new quest
• "complete quest [name]" - Finish a quest

Type "status" for character info, "inventory" for items, or "quests" for active missions.`;
  }

  private generateStatusSummary(storyState: StructuredStoryState): string {
    const char = storyState.character;
    return `**${char.name}** (Level ${char.level})
Health: ${char.currentHealth}/${char.baseStats.health}
Mana: ${char.currentMana}/${char.baseStats.mana}
Experience: ${char.experience}
Location: ${storyState.currentLocation}
Skills: ${char.skills.length} learned`;
  }

  private generateInventorySummary(storyState: StructuredStoryState): string {
    const equipped = Object.entries(storyState.equippedItems)
      .filter(([_, item]) => item)
      .map(([slot, item]) => `${slot}: ${item!.name}`)
      .join(', ');
    
    const inventoryCount = storyState.inventory.length;
    
    return `**Equipment:** ${equipped || 'None equipped'}
**Inventory:** ${inventoryCount} items
Type "equip [item]" to equip items or "add item [name]" to get new items.`;
  }

  private generateQuestSummary(storyState: StructuredStoryState): string {
    const activeQuests = storyState.quests.filter(q => q.status === 'active');
    
    if (activeQuests.length === 0) {
      return 'No active quests. Type "create quest [name]" to start a new quest.';
    }

    const questList = activeQuests
      .map(q => `• ${q.title} (${q.objectives.filter(o => o.completed).length}/${q.objectives.length} objectives)`)
      .join('\n');

    return `**Active Quests:**\n${questList}`;
  }

  /**
   * Updates system configuration
   */
  updateOptions(newOptions: Partial<ChatIntegrationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Gets current system configuration
   */
  getOptions(): ChatIntegrationOptions {
    return { ...this.options };
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Creates a chat integration system with default options
 */
export function createChatIntegrationSystem(options?: Partial<ChatIntegrationOptions>): ChatIntegrationSystem {
  return new ChatIntegrationSystem(options);
}

/**
 * Quick command processing helper
 */
export async function processQuickCommand(
  command: string,
  storyState: StructuredStoryState,
  currentTurnId: string,
  isGMCommand: boolean = false
): Promise<{ success: boolean; message: string; updatedState?: StructuredStoryState }> {
  const system = createChatIntegrationSystem();
  const result = await system.processChatMessage(command, storyState, [], currentTurnId, isGMCommand);
  
  return {
    success: result.errors.length === 0,
    message: result.userFeedback,
    updatedState: result.updatedStoryState
  };
}
