/**
 * Universal Chat Command Parser
 *
 * Parses user chat messages to detect and extract all types of game commands.
 * Supports natural language interpretation for comprehensive game system control.
 */

import type { CraftingRecipe, CharacterProfile, StructuredStoryState } from '@/types/story';

// === COMMAND TYPES ===

export interface CraftingCommand {
  type: 'craft';
  recipeName: string;
  quantity?: number;
  originalText: string;
}

export interface CharacterCommand {
  type: 'character';
  action: 'level_up' | 'add_skill' | 'modify_stat' | 'add_experience' | 'reset_stats';
  target?: string; // stat name, skill name, etc.
  value?: number | string;
  originalText: string;
}

export interface InventoryCommand {
  type: 'inventory';
  action: 'add_item' | 'remove_item' | 'equip_item' | 'unequip_item' | 'enhance_item' | 'repair_item';
  itemName?: string;
  quantity?: number;
  slot?: string;
  originalText: string;
}

export interface CombatCommand {
  type: 'combat';
  action: 'start_combat' | 'end_combat' | 'apply_damage' | 'heal' | 'add_status_effect' | 'remove_status_effect';
  target?: string;
  value?: number;
  effectName?: string;
  duration?: number;
  originalText: string;
}

export interface QuestCommand {
  type: 'quest';
  action: 'create_quest' | 'update_quest' | 'complete_quest' | 'fail_quest' | 'add_objective';
  questName?: string;
  objective?: string;
  description?: string;
  originalText: string;
}

export interface WorldCommand {
  type: 'world';
  action: 'change_location' | 'modify_relationship' | 'update_faction' | 'set_weather' | 'advance_time';
  target?: string;
  value?: number | string;
  originalText: string;
}

export interface NarrativeCommand {
  type: 'narrative';
  action: 'trigger_consequence' | 'start_arc' | 'end_arc' | 'add_memory' | 'trigger_loop';
  target?: string;
  description?: string;
  originalText: string;
}

export type GameCommand =
  | CraftingCommand
  | CharacterCommand
  | InventoryCommand
  | CombatCommand
  | QuestCommand
  | WorldCommand
  | NarrativeCommand;

export interface ParsedCommand {
  isGameCommand: boolean;
  command?: GameCommand;
  remainingText: string;
  confidence: number; // 0-1 score for how confident we are in the parsing
  suggestions?: string[]; // Alternative interpretations

  // Legacy support for existing code
  isCraftingCommand?: boolean;
}

// Common crafting command patterns
const CRAFTING_PATTERNS = [
  /^craft\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^make\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^create\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^forge\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^brew\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^cook\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^sew\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^enchant\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
];

// Alternative patterns for more natural language
const NATURAL_PATTERNS = [
  /^(?:i want to|i'd like to|let me|can i)\s+(?:craft|make|create|forge|brew|cook|sew|enchant)\s+(.+?)(?:\s*x?\s*(\d+))?$/i,
  /^(?:craft|make|create|forge|brew|cook|sew|enchant)\s+(?:a|an|some|the)?\s*(.+?)(?:\s*x?\s*(\d+))?$/i,
];

/**
 * Normalizes item names for better matching
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(a|an|the|some)\b/g, '')
    .trim();
}

/**
 * Finds the best matching recipe for a given item name
 */
export function findMatchingRecipe(itemName: string, recipes: CraftingRecipe[]): CraftingRecipe | null {
  const normalizedInput = normalizeItemName(itemName);
  
  // First, try exact name match
  let bestMatch = recipes.find(recipe => 
    normalizeItemName(recipe.name) === normalizedInput
  );
  
  if (bestMatch) return bestMatch;
  
  // Then try partial matches
  bestMatch = recipes.find(recipe => 
    normalizeItemName(recipe.name).includes(normalizedInput) ||
    normalizedInput.includes(normalizeItemName(recipe.name))
  );
  
  if (bestMatch) return bestMatch;
  
  // Finally, try fuzzy matching with keywords
  const inputWords = normalizedInput.split(' ');
  bestMatch = recipes.find(recipe => {
    const recipeWords = normalizeItemName(recipe.name).split(' ');
    const matchingWords = inputWords.filter(word => 
      recipeWords.some(recipeWord => 
        recipeWord.includes(word) || word.includes(recipeWord)
      )
    );
    return matchingWords.length >= Math.min(inputWords.length, recipeWords.length) / 2;
  });
  
  return bestMatch || null;
}

/**
 * Parses a user message to detect crafting commands
 */
export function parseCraftingCommand(message: string, availableRecipes: CraftingRecipe[]): ParsedCommand {
  const trimmedMessage = message.trim();
  
  // Try all crafting patterns
  for (const pattern of [...CRAFTING_PATTERNS, ...NATURAL_PATTERNS]) {
    const match = trimmedMessage.match(pattern);
    if (match) {
      const itemName = match[1].trim();
      const quantity = match[2] ? parseInt(match[2], 10) : 1;
      
      // Find matching recipe
      const recipe = findMatchingRecipe(itemName, availableRecipes);
      
      if (recipe) {
        return {
          isGameCommand: true,
          isCraftingCommand: true,
          command: {
            type: 'craft',
            recipeName: recipe.name,
            quantity: Math.max(1, quantity),
            originalText: trimmedMessage
          },
          remainingText: '',
          confidence: 0.9
        };
      }
    }
  }
  
  // Check if message contains crafting keywords but no valid recipe
  const containsCraftingKeywords = /\b(craft|make|create|forge|brew|cook|sew|enchant)\b/i.test(trimmedMessage);
  
  if (containsCraftingKeywords) {
    // This might be a crafting attempt with an unknown recipe
    return {
      isGameCommand: true,
      isCraftingCommand: true,
      command: {
        type: 'craft',
        recipeName: 'unknown',
        quantity: 1,
        originalText: trimmedMessage
      },
      remainingText: '',
      confidence: 0.5
    };
  }

  return {
    isGameCommand: false,
    isCraftingCommand: false,
    remainingText: trimmedMessage,
    confidence: 0
  };
}

/**
 * Generates helpful suggestions for crafting commands
 */
export function generateCraftingSuggestions(
  partialInput: string, 
  availableRecipes: CraftingRecipe[],
  maxSuggestions: number = 5
): string[] {
  const normalizedInput = normalizeItemName(partialInput);
  
  if (normalizedInput.length < 2) return [];
  
  const suggestions = availableRecipes
    .filter(recipe => 
      normalizeItemName(recipe.name).includes(normalizedInput) ||
      recipe.description.toLowerCase().includes(normalizedInput)
    )
    .slice(0, maxSuggestions)
    .map(recipe => `craft ${recipe.name.toLowerCase()}`);
  
  return suggestions;
}

/**
 * Validates if a crafting command can be executed
 */
export function validateCraftingCommand(
  command: CraftingCommand,
  recipe: CraftingRecipe,
  availableItems: { id: string; quantity?: number }[]
): {
  canCraft: boolean;
  missingMaterials: { itemId: string; needed: number; available: number }[];
  message: string;
} {
  if (command.recipeName === 'unknown') {
    return {
      canCraft: false,
      missingMaterials: [],
      message: 'Unknown recipe. Type "recipes" to see available crafting recipes.'
    };
  }
  
  const missingMaterials: { itemId: string; needed: number; available: number }[] = [];
  
  for (const ingredient of recipe.ingredients) {
    const availableItem = availableItems.find(item => item.id === ingredient.itemId);
    const available = availableItem?.quantity || 0;
    const needed = ingredient.quantity * (command.quantity || 1);
    
    if (available < needed) {
      missingMaterials.push({
        itemId: ingredient.itemId,
        needed,
        available
      });
    }
  }
  
  if (missingMaterials.length > 0) {
    const missingList = missingMaterials
      .map(m => `${m.itemId.replace('_', ' ')} (need ${m.needed}, have ${m.available})`)
      .join(', ');
    
    return {
      canCraft: false,
      missingMaterials,
      message: `Cannot craft ${recipe.name}. Missing materials: ${missingList}`
    };
  }
  
  return {
    canCraft: true,
    missingMaterials: [],
    message: `Ready to craft ${command.quantity || 1}x ${recipe.name}`
  };
}

/**
 * Formats a crafting result message
 */
export function formatCraftingResult(
  success: boolean,
  recipeName: string,
  quantity: number,
  quality?: string,
  experienceGained?: number
): string {
  if (success) {
    let message = `Successfully crafted ${quantity}x ${recipeName}`;
    if (quality && quality !== 'normal') {
      message += ` (${quality} quality)`;
    }
    if (experienceGained) {
      message += `. Gained ${experienceGained} experience.`;
    }
    return message;
  } else {
    return `Failed to craft ${recipeName}. The crafting attempt was unsuccessful.`;
  }
}

// === UNIVERSAL COMMAND PATTERNS ===

// Character command patterns
const CHARACTER_PATTERNS = [
  { pattern: /^(?:level up|gain level|increase level)(?:\s+(\d+))?$/i, action: 'level_up' },
  { pattern: /^(?:add|learn|gain)\s+skill\s+(.+)$/i, action: 'add_skill' },
  { pattern: /^(?:increase|boost|raise)\s+(.+?)\s+(?:by\s+)?(\d+)$/i, action: 'modify_stat' },
  { pattern: /^(?:gain|add|get)\s+(\d+)\s+(?:exp|experience|xp)$/i, action: 'add_experience' },
  { pattern: /^reset\s+(?:stats|attributes|character)$/i, action: 'reset_stats' },
];

// Inventory command patterns
const INVENTORY_PATTERNS = [
  { pattern: /^(?:add|give|get|obtain)\s+item\s+(.+?)(?:\s+(\d+))?$/i, action: 'add_item' },
  { pattern: /^(?:remove|delete|lose|drop)\s+item\s+(.+?)(?:\s+(\d+))?$/i, action: 'remove_item' },
  { pattern: /^(?:equip|wear|wield)\s+(.+?)(?:\s+(?:to|in|on)\s+(.+))?$/i, action: 'equip_item' },
  { pattern: /^(?:unequip|remove|take off)\s+(.+)$/i, action: 'unequip_item' },
  { pattern: /^(?:enhance|upgrade|improve)\s+(.+)$/i, action: 'enhance_item' },
  { pattern: /^(?:repair|fix|mend)\s+(.+)$/i, action: 'repair_item' },
];

// Combat command patterns
const COMBAT_PATTERNS = [
  { pattern: /^(?:start|begin|initiate)\s+(?:combat|battle|fight)(?:\s+with\s+(.+))?$/i, action: 'start_combat' },
  { pattern: /^(?:end|stop|finish)\s+(?:combat|battle|fight)$/i, action: 'end_combat' },
  { pattern: /^(?:deal|apply|take)\s+(\d+)\s+damage(?:\s+to\s+(.+))?$/i, action: 'apply_damage' },
  { pattern: /^(?:heal|restore)\s+(\d+)\s+(?:hp|health)(?:\s+to\s+(.+))?$/i, action: 'heal' },
  { pattern: /^(?:add|apply)\s+(.+?)\s+(?:effect|status)(?:\s+for\s+(\d+)\s+turns?)?$/i, action: 'add_status_effect' },
  { pattern: /^(?:remove|clear)\s+(.+?)\s+(?:effect|status)$/i, action: 'remove_status_effect' },
];

// Quest command patterns
const QUEST_PATTERNS = [
  { pattern: /^(?:create|start|begin)\s+quest\s+(.+)$/i, action: 'create_quest' },
  { pattern: /^(?:update|progress)\s+quest\s+(.+)$/i, action: 'update_quest' },
  { pattern: /^(?:complete|finish|end)\s+quest\s+(.+)$/i, action: 'complete_quest' },
  { pattern: /^(?:fail|abandon)\s+quest\s+(.+)$/i, action: 'fail_quest' },
  { pattern: /^(?:add|create)\s+objective\s+(.+?)(?:\s+to\s+quest\s+(.+))?$/i, action: 'add_objective' },
];

// World command patterns
const WORLD_PATTERNS = [
  { pattern: /^(?:go to|travel to|move to|change location to)\s+(.+)$/i, action: 'change_location' },
  { pattern: /^(?:improve|increase|boost)\s+relationship\s+with\s+(.+?)(?:\s+by\s+(\d+))?$/i, action: 'modify_relationship' },
  { pattern: /^(?:worsen|decrease|lower)\s+relationship\s+with\s+(.+?)(?:\s+by\s+(\d+))?$/i, action: 'modify_relationship' },
  { pattern: /^(?:set|change)\s+weather\s+to\s+(.+)$/i, action: 'set_weather' },
  { pattern: /^(?:advance|pass|skip)\s+time(?:\s+by\s+(.+))?$/i, action: 'advance_time' },
];

// Narrative command patterns
const NARRATIVE_PATTERNS = [
  { pattern: /^(?:trigger|activate)\s+consequence\s+(.+)$/i, action: 'trigger_consequence' },
  { pattern: /^(?:start|begin)\s+(?:arc|story arc)\s+(.+)$/i, action: 'start_arc' },
  { pattern: /^(?:end|finish)\s+(?:arc|story arc)\s+(.+)$/i, action: 'end_arc' },
  { pattern: /^(?:add|create)\s+memory\s+(.+)$/i, action: 'add_memory' },
  { pattern: /^(?:trigger|activate)\s+(?:time\s+)?loop$/i, action: 'trigger_loop' },
];

// === UNIVERSAL COMMAND PARSING ===

/**
 * Parses any game command from user input
 */
export function parseGameCommand(
  message: string,
  context?: {
    availableRecipes?: CraftingRecipe[];
    character?: CharacterProfile;
    storyState?: StructuredStoryState;
  }
): ParsedCommand {
  const trimmedMessage = message.trim();

  // Try character commands
  const characterCommand = parseCharacterCommand(trimmedMessage);
  if (characterCommand.isGameCommand) return characterCommand;

  // Try inventory commands
  const inventoryCommand = parseInventoryCommand(trimmedMessage);
  if (inventoryCommand.isGameCommand) return inventoryCommand;

  // Try combat commands
  const combatCommand = parseCombatCommand(trimmedMessage);
  if (combatCommand.isGameCommand) return combatCommand;

  // Try quest commands
  const questCommand = parseQuestCommand(trimmedMessage);
  if (questCommand.isGameCommand) return questCommand;

  // Try world commands
  const worldCommand = parseWorldCommand(trimmedMessage);
  if (worldCommand.isGameCommand) return worldCommand;

  // Try narrative commands
  const narrativeCommand = parseNarrativeCommand(trimmedMessage);
  if (narrativeCommand.isGameCommand) return narrativeCommand;

  // Try crafting commands (legacy support)
  if (context?.availableRecipes) {
    const craftingResult = parseCraftingCommand(trimmedMessage, context.availableRecipes);
    if (craftingResult.isCraftingCommand) {
      return {
        isGameCommand: true,
        command: craftingResult.command,
        remainingText: craftingResult.remainingText,
        confidence: 0.9
      };
    }
  }

  return {
    isGameCommand: false,
    remainingText: trimmedMessage,
    confidence: 0
  };
}

function parseCharacterCommand(message: string): ParsedCommand {
  for (const { pattern, action } of CHARACTER_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const command: CharacterCommand = {
        type: 'character',
        action: action as CharacterCommand['action'],
        originalText: message
      };

      // Extract specific values based on action
      switch (action) {
        case 'level_up':
          command.value = match[1] ? parseInt(match[1]) : 1;
          break;
        case 'add_skill':
          command.target = match[1];
          break;
        case 'modify_stat':
          command.target = match[1];
          command.value = parseInt(match[2]);
          break;
        case 'add_experience':
          command.value = parseInt(match[1]);
          break;
      }

      return {
        isGameCommand: true,
        command,
        remainingText: '',
        confidence: 0.9
      };
    }
  }

  return { isGameCommand: false, remainingText: message, confidence: 0 };
}

function parseInventoryCommand(message: string): ParsedCommand {
  for (const { pattern, action } of INVENTORY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const command: InventoryCommand = {
        type: 'inventory',
        action: action as InventoryCommand['action'],
        originalText: message
      };

      // Extract specific values based on action
      switch (action) {
        case 'add_item':
        case 'remove_item':
          command.itemName = match[1];
          command.quantity = match[2] ? parseInt(match[2]) : 1;
          break;
        case 'equip_item':
          command.itemName = match[1];
          command.slot = match[2];
          break;
        case 'unequip_item':
        case 'enhance_item':
        case 'repair_item':
          command.itemName = match[1];
          break;
      }

      return {
        isGameCommand: true,
        command,
        remainingText: '',
        confidence: 0.9
      };
    }
  }

  return { isGameCommand: false, remainingText: message, confidence: 0 };
}

function parseCombatCommand(message: string): ParsedCommand {
  for (const { pattern, action } of COMBAT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const command: CombatCommand = {
        type: 'combat',
        action: action as CombatCommand['action'],
        originalText: message
      };

      // Extract specific values based on action
      switch (action) {
        case 'start_combat':
          command.target = match[1];
          break;
        case 'apply_damage':
          command.value = parseInt(match[1]);
          command.target = match[2];
          break;
        case 'heal':
          command.value = parseInt(match[1]);
          command.target = match[2];
          break;
        case 'add_status_effect':
          command.effectName = match[1];
          command.duration = match[2] ? parseInt(match[2]) : undefined;
          break;
        case 'remove_status_effect':
          command.effectName = match[1];
          break;
      }

      return {
        isGameCommand: true,
        command,
        remainingText: '',
        confidence: 0.9
      };
    }
  }

  return { isGameCommand: false, remainingText: message, confidence: 0 };
}

function parseQuestCommand(message: string): ParsedCommand {
  for (const { pattern, action } of QUEST_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const command: QuestCommand = {
        type: 'quest',
        action: action as QuestCommand['action'],
        originalText: message
      };

      // Extract specific values based on action
      switch (action) {
        case 'create_quest':
        case 'update_quest':
        case 'complete_quest':
        case 'fail_quest':
          command.questName = match[1];
          break;
        case 'add_objective':
          command.objective = match[1];
          command.questName = match[2];
          break;
      }

      return {
        isGameCommand: true,
        command,
        remainingText: '',
        confidence: 0.9
      };
    }
  }

  return { isGameCommand: false, remainingText: message, confidence: 0 };
}

function parseWorldCommand(message: string): ParsedCommand {
  for (const { pattern, action } of WORLD_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const command: WorldCommand = {
        type: 'world',
        action: action as WorldCommand['action'],
        originalText: message
      };

      // Extract specific values based on action
      switch (action) {
        case 'change_location':
        case 'set_weather':
        case 'advance_time':
          command.target = match[1];
          break;
        case 'modify_relationship':
          command.target = match[1];
          command.value = match[2] ? parseInt(match[2]) : 10;
          // Determine if it's positive or negative based on the verb
          if (message.includes('worsen') || message.includes('decrease') || message.includes('lower')) {
            command.value = -(command.value as number);
          }
          break;
      }

      return {
        isGameCommand: true,
        command,
        remainingText: '',
        confidence: 0.9
      };
    }
  }

  return { isGameCommand: false, remainingText: message, confidence: 0 };
}

function parseNarrativeCommand(message: string): ParsedCommand {
  for (const { pattern, action } of NARRATIVE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const command: NarrativeCommand = {
        type: 'narrative',
        action: action as NarrativeCommand['action'],
        originalText: message
      };

      // Extract specific values based on action
      switch (action) {
        case 'trigger_consequence':
        case 'start_arc':
        case 'end_arc':
        case 'add_memory':
          command.target = match[1];
          break;
      }

      return {
        isGameCommand: true,
        command,
        remainingText: '',
        confidence: 0.9
      };
    }
  }

  return { isGameCommand: false, remainingText: message, confidence: 0 };
}

export default {
  parseGameCommand,
  parseCraftingCommand,
  findMatchingRecipe,
  generateCraftingSuggestions,
  validateCraftingCommand,
  formatCraftingResult
};
