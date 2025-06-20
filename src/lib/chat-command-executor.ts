/**
 * Chat Command Executor
 * 
 * Executes parsed chat commands and applies changes to game state.
 * Provides safe, validated execution of all game system modifications.
 */

import type {
  GameCommand,
  CharacterCommand,
  InventoryCommand,
  CombatCommand,
  QuestCommand,
  WorldCommand,
  NarrativeCommand
} from './chat-command-parser';

import type {
  StructuredStoryState,
  CharacterProfile,
  Item,
  Quest,
  NPCProfile,
  RelationshipEntry,
  CombatState
} from '@/types/story';

import { generateUUID } from '@/lib/utils';

// === EXECUTION RESULT TYPES ===

export interface CommandExecutionResult {
  success: boolean;
  message: string;
  updatedStoryState?: StructuredStoryState;
  warnings?: string[];
  errors?: string[];
  systemMessages?: string[];
}

export interface ExecutionContext {
  storyState: StructuredStoryState;
  currentTurnId: string;
  isGMCommand?: boolean; // Whether this is executed by GM AI vs player
  safetyChecks?: boolean; // Whether to perform safety validation
}

// === MAIN EXECUTOR CLASS ===

export class ChatCommandExecutor {
  private context: ExecutionContext;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  /**
   * Executes any game command and returns the result
   */
  async executeCommand(command: GameCommand): Promise<CommandExecutionResult> {
    try {
      // Perform safety checks if enabled
      if (this.context.safetyChecks !== false) {
        const safetyResult = this.performSafetyChecks(command);
        if (!safetyResult.safe) {
          return {
            success: false,
            message: safetyResult.reason,
            errors: [safetyResult.reason]
          };
        }
      }

      // Route to appropriate handler
      switch (command.type) {
        case 'character':
          return await this.executeCharacterCommand(command);
        case 'inventory':
          return await this.executeInventoryCommand(command);
        case 'combat':
          return await this.executeCombatCommand(command);
        case 'quest':
          return await this.executeQuestCommand(command);
        case 'world':
          return await this.executeWorldCommand(command);
        case 'narrative':
          return await this.executeNarrativeCommand(command);
        case 'craft':
          return await this.executeCraftingCommand(command);
        default:
          return {
            success: false,
            message: 'Unknown command type',
            errors: ['Unrecognized command type']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Command execution failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // === CHARACTER COMMANDS ===

  private async executeCharacterCommand(command: CharacterCommand): Promise<CommandExecutionResult> {
    const updatedState = { ...this.context.storyState };
    const character = { ...updatedState.character };
    let message = '';
    const warnings: string[] = [];

    switch (command.action) {
      case 'level_up':
        const levels = (command.value as number) || 1;
        const oldLevel = character.level;
        character.level += levels;
        
        // Apply level-up bonuses (simplified)
        character.baseStats.health += levels * 10;
        character.baseStats.mana += levels * 5;
        character.currentHealth = character.baseStats.health;
        character.currentMana = character.baseStats.mana;
        
        message = `${character.name} gained ${levels} level(s)! Now level ${character.level}.`;
        break;

      case 'add_skill':
        if (!command.target) {
          return { success: false, message: 'Skill name is required' };
        }

        // Handle both string array and object array for skills
        const skillName = command.target;
        let hasSkill = false;

        if (Array.isArray(character.skills)) {
          if (character.skills.length > 0) {
            // Check if first element is string or object
            if (typeof character.skills[0] === 'string') {
              // Skills is array of strings
              hasSkill = character.skills.includes(skillName);
              if (!hasSkill) {
                (character.skills as string[]).push(skillName);
              }
            } else {
              // Skills is array of objects
              hasSkill = character.skills.some((s: any) =>
                s.name && s.name.toLowerCase() === skillName.toLowerCase()
              );
              if (!hasSkill) {
                const newSkill = {
                  id: generateUUID(),
                  name: skillName,
                  description: `Skill learned through experience: ${skillName}`,
                  level: 1,
                  experience: 0,
                  maxLevel: 10,
                  skillType: 'active' as const,
                  manaCost: 10,
                  cooldown: 0,
                  effects: []
                };
                (character.skills as any[]).push(newSkill);
              }
            }
          } else {
            // Empty array, add as string
            (character.skills as string[]).push(skillName);
          }
        } else {
          // Initialize as string array
          character.skills = [skillName];
        }

        if (hasSkill) {
          warnings.push(`${character.name} already has the skill: ${skillName}`);
          message = `${character.name} already knows ${skillName}.`;
        } else {
          message = `${character.name} learned new skill: ${skillName}!`;
        }
        break;

      case 'modify_stat':
        if (!command.target || typeof command.value !== 'number') {
          return { success: false, message: 'Stat name and value are required' };
        }
        
        const statName = command.target.toLowerCase();
        const value = command.value;
        
        // Map common stat names to actual properties
        const statMapping: Record<string, keyof typeof character.baseStats> = {
          'health': 'health',
          'hp': 'health',
          'mana': 'mana',
          'mp': 'mana',
          'strength': 'strength',
          'str': 'strength',
          'dexterity': 'dexterity',
          'dex': 'dexterity',
          'agility': 'agility',
          'agi': 'agility',
          'intelligence': 'intelligence',
          'int': 'intelligence',
          'wisdom': 'wisdom',
          'wis': 'wisdom',
          'constitution': 'constitution',
          'con': 'constitution',
          'charisma': 'charisma',
          'cha': 'charisma'
        };
        
        const actualStat = statMapping[statName];
        if (actualStat) {
          const oldValue = character.baseStats[actualStat];
          character.baseStats[actualStat] += value;
          
          // Update current values for health/mana
          if (actualStat === 'health') {
            character.currentHealth = Math.min(character.currentHealth + value, character.baseStats.health);
          } else if (actualStat === 'mana') {
            character.currentMana = Math.min(character.currentMana + value, character.baseStats.mana);
          }
          
          message = `${character.name}'s ${command.target} ${value > 0 ? 'increased' : 'decreased'} by ${Math.abs(value)} (${oldValue} → ${character.baseStats[actualStat]}).`;
        } else {
          return { success: false, message: `Unknown stat: ${command.target}` };
        }
        break;

      case 'add_experience':
        const exp = command.value as number;
        character.experience += exp;
        message = `${character.name} gained ${exp} experience! Total: ${character.experience}`;
        
        // Check for level up
        const expForNextLevel = character.level * 100; // Simple formula
        if (character.experience >= expForNextLevel) {
          const levelsGained = Math.floor(character.experience / expForNextLevel);
          character.level += levelsGained;
          character.experience = character.experience % expForNextLevel;
          character.baseStats.health += levelsGained * 10;
          character.baseStats.mana += levelsGained * 5;
          character.currentHealth = character.baseStats.health;
          character.currentMana = character.baseStats.mana;
          message += ` Level up! Now level ${character.level}.`;
        }
        break;

      case 'reset_stats':
        // Reset to base values (this is a dangerous operation)
        if (!this.context.isGMCommand) {
          warnings.push('Stat reset requires GM authorization');
          return { success: false, message: 'Stat reset requires GM authorization' };
        }
        
        character.level = 1;
        character.experience = 0;
        character.baseStats = {
          health: 100,
          mana: 50,
          strength: 10,
          agility: 10,
          intelligence: 10,
          wisdom: 10,
          constitution: 10,
          charisma: 10
        };
        character.currentHealth = character.baseStats.health;
        character.currentMana = character.baseStats.mana;
        character.skills = [];
        
        message = `${character.name}'s stats have been reset to default values.`;
        warnings.push('Character stats have been completely reset');
        break;

      default:
        return { success: false, message: `Unknown character action: ${command.action}` };
    }

    updatedState.character = character;

    return {
      success: true,
      message,
      updatedStoryState: updatedState,
      warnings: warnings.length > 0 ? warnings : undefined,
      systemMessages: [`Character command executed: ${command.action}`]
    };
  }

  // === SAFETY CHECKS ===

  private performSafetyChecks(command: GameCommand): { safe: boolean; reason: string } {
    // Prevent dangerous operations for non-GM commands
    if (!this.context.isGMCommand) {
      // Check for potentially destructive commands
      if (command.type === 'character' && command.action === 'reset_stats') {
        return { safe: false, reason: 'Stat reset requires GM authorization' };
      }
      
      // Check for excessive values
      if (command.type === 'character' && command.action === 'modify_stat') {
        const value = command.value as number;
        if (Math.abs(value) > 100) {
          return { safe: false, reason: 'Stat modification too large (max ±100)' };
        }
      }
      
      if (command.type === 'character' && command.action === 'add_experience') {
        const exp = command.value as number;
        if (exp > 10000) {
          return { safe: false, reason: 'Experience gain too large (max 10000)' };
        }
      }
    }

    return { safe: true, reason: '' };
  }

  // === INVENTORY COMMAND EXECUTION ===

  private async executeInventoryCommand(command: InventoryCommand): Promise<CommandExecutionResult> {
    const storyState = this.context.storyState;
    const character = storyState.character;

    try {
      switch (command.action) {
        case 'add_item':
          return await this.addItemToInventory(command);
        case 'remove_item':
          return await this.removeItemFromInventory(command);
        case 'equip_item':
          return await this.equipItem(command);
        case 'unequip_item':
          return await this.unequipItem(command);
        case 'enhance_item':
          return await this.enhanceItem(command);
        case 'repair_item':
          return await this.repairItem(command);
        default:
          return {
            success: false,
            message: `Unknown inventory action: ${command.action}`,
            errors: ['Invalid inventory action']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Inventory command failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async addItemToInventory(command: InventoryCommand): Promise<CommandExecutionResult> {
    const { itemName, quantity = 1 } = command;
    if (!itemName) {
      return { success: false, message: 'Item name is required' };
    }

    const newItem: Item = {
      id: generateUUID(),
      name: itemName,
      type: 'misc',
      rarity: 'common',
      value: 10,
      description: `A ${itemName.toLowerCase()}`,
      quantity: quantity,
      isEquipped: false
    };

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...this.context.storyState.character,
        inventory: [...this.context.storyState.character.inventory, newItem]
      }
    };

    return {
      success: true,
      message: `✓ Added ${quantity > 1 ? `${quantity}x ` : ''}${itemName} to inventory`,
      updatedStoryState,
      systemMessages: [`Inventory updated: +${quantity} ${itemName}`]
    };
  }

  private async removeItemFromInventory(command: InventoryCommand): Promise<CommandExecutionResult> {
    const { itemName, quantity = 1 } = command;
    if (!itemName) {
      return { success: false, message: 'Item name is required' };
    }

    const character = this.context.storyState.character;
    const itemIndex = character.inventory.findIndex(item =>
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (itemIndex === -1) {
      return { success: false, message: `Item "${itemName}" not found in inventory` };
    }

    const item = character.inventory[itemIndex];
    const newInventory = [...character.inventory];

    if (item.quantity && item.quantity > quantity) {
      newInventory[itemIndex] = { ...item, quantity: item.quantity - quantity };
    } else {
      newInventory.splice(itemIndex, 1);
    }

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        inventory: newInventory
      }
    };

    return {
      success: true,
      message: `✓ Removed ${quantity > 1 ? `${quantity}x ` : ''}${itemName} from inventory`,
      updatedStoryState,
      systemMessages: [`Inventory updated: -${quantity} ${itemName}`]
    };
  }

  private async equipItem(command: InventoryCommand): Promise<CommandExecutionResult> {
    const { itemName } = command;
    if (!itemName) {
      return { success: false, message: 'Item name is required' };
    }

    const character = this.context.storyState.character;
    const item = character.inventory.find(item =>
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (!item) {
      return { success: false, message: `Item "${itemName}" not found in inventory` };
    }

    // Unequip any currently equipped item of the same type
    const updatedInventory = character.inventory.map(invItem => {
      if (invItem.type === item.type && invItem.isEquipped) {
        return { ...invItem, isEquipped: false };
      }
      if (invItem.id === item.id) {
        return { ...invItem, isEquipped: true };
      }
      return invItem;
    });

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        inventory: updatedInventory
      }
    };

    return {
      success: true,
      message: `✓ Equipped ${itemName}`,
      updatedStoryState,
      systemMessages: [`Equipment updated: ${itemName} equipped`]
    };
  }

  private async unequipItem(command: InventoryCommand): Promise<CommandExecutionResult> {
    const { itemName } = command;
    if (!itemName) {
      return { success: false, message: 'Item name is required' };
    }

    const character = this.context.storyState.character;
    const item = character.inventory.find(item =>
      item.name.toLowerCase().includes(itemName.toLowerCase()) && item.isEquipped
    );

    if (!item) {
      return { success: false, message: `Equipped item "${itemName}" not found` };
    }

    const updatedInventory = character.inventory.map(invItem =>
      invItem.id === item.id ? { ...invItem, isEquipped: false } : invItem
    );

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        inventory: updatedInventory
      }
    };

    return {
      success: true,
      message: `✓ Unequipped ${itemName}`,
      updatedStoryState,
      systemMessages: [`Equipment updated: ${itemName} unequipped`]
    };
  }

  private async enhanceItem(command: InventoryCommand): Promise<CommandExecutionResult> {
    const { itemName } = command;
    if (!itemName) {
      return { success: false, message: 'Item name is required' };
    }

    const character = this.context.storyState.character;
    const itemIndex = character.inventory.findIndex(item =>
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (itemIndex === -1) {
      return { success: false, message: `Item "${itemName}" not found in inventory` };
    }

    const item = character.inventory[itemIndex];
    const enhancementLevel = (item.enhancementLevel || 0) + 1;
    const enhancedName = enhancementLevel > 1 ?
      `${item.name} +${enhancementLevel}` :
      `Enhanced ${item.name}`;

    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = {
      ...item,
      name: enhancedName,
      enhancementLevel,
      value: Math.floor(item.value * (1 + enhancementLevel * 0.5))
    };

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        inventory: updatedInventory
      }
    };

    return {
      success: true,
      message: `✓ Enhanced ${itemName} to ${enhancedName}`,
      updatedStoryState,
      systemMessages: [`Item enhanced: ${enhancedName} (Level ${enhancementLevel})`]
    };
  }

  private async repairItem(command: InventoryCommand): Promise<CommandExecutionResult> {
    const { itemName } = command;
    if (!itemName) {
      return { success: false, message: 'Item name is required' };
    }

    const character = this.context.storyState.character;
    const itemIndex = character.inventory.findIndex(item =>
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (itemIndex === -1) {
      return { success: false, message: `Item "${itemName}" not found in inventory` };
    }

    const item = character.inventory[itemIndex];
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = {
      ...item,
      condition: { current: 'excellent', durability: 100 }
    };

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        inventory: updatedInventory
      }
    };

    return {
      success: true,
      message: `✓ Repaired ${itemName} to excellent condition`,
      updatedStoryState,
      systemMessages: [`Item repaired: ${itemName} restored to full durability`]
    };
  }

  // === COMBAT COMMAND EXECUTION ===

  private async executeCombatCommand(command: CombatCommand): Promise<CommandExecutionResult> {
    try {
      switch (command.action) {
        case 'start_combat':
          return await this.startCombat(command);
        case 'end_combat':
          return await this.endCombat(command);
        case 'apply_damage':
          return await this.applyDamage(command);
        case 'heal':
          return await this.healCharacter(command);
        case 'add_status_effect':
          return await this.addStatusEffect(command);
        case 'remove_status_effect':
          return await this.removeStatusEffect(command);
        default:
          return {
            success: false,
            message: `Unknown combat action: ${command.action}`,
            errors: ['Invalid combat action']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Combat command failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async startCombat(command: CombatCommand): Promise<CommandExecutionResult> {
    const { target } = command;
    const character = this.context.storyState.character;

    // Create basic combat state
    const combatState: CombatState = {
      isActive: true,
      phase: 'player_turn',
      participants: [
        {
          id: character.id,
          name: character.name,
          type: 'player',
          health: character.health || 100,
          maxHealth: character.maxHealth || 100,
          mana: character.mana || 50,
          maxMana: character.maxMana || 50,
          actionPoints: 3,
          maxActionPoints: 3,
          statusEffects: []
        }
      ],
      currentTurnId: character.id,
      turnOrder: [character.id],
      round: 1
    };

    // Add enemy if specified
    if (target) {
      const enemyId = generateUUID();
      combatState.participants.push({
        id: enemyId,
        name: target,
        type: 'enemy',
        health: 80,
        maxHealth: 80,
        actionPoints: 2,
        maxActionPoints: 2,
        statusEffects: []
      });
      combatState.turnOrder.push(enemyId);
    }

    const updatedStoryState = {
      ...this.context.storyState,
      activeCombat: combatState
    };

    const enemyText = target ? ` against ${target}` : '';
    return {
      success: true,
      message: `✓ Combat started${enemyText}!`,
      updatedStoryState,
      systemMessages: [`Combat initiated - Round 1 begins`]
    };
  }

  private async endCombat(command: CombatCommand): Promise<CommandExecutionResult> {
    const updatedStoryState = {
      ...this.context.storyState,
      activeCombat: undefined
    };

    return {
      success: true,
      message: '✓ Combat ended',
      updatedStoryState,
      systemMessages: ['Combat concluded']
    };
  }

  private async applyDamage(command: CombatCommand): Promise<CommandExecutionResult> {
    const { value: damage, target } = command;
    if (!damage || damage <= 0) {
      return { success: false, message: 'Damage amount is required and must be positive' };
    }

    const character = this.context.storyState.character;
    const newHealth = Math.max(0, (character.health || 100) - damage);

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        health: newHealth
      }
    };

    const targetText = target ? ` to ${target}` : '';
    return {
      success: true,
      message: `✓ Applied ${damage} damage${targetText} (Health: ${newHealth})`,
      updatedStoryState,
      systemMessages: [`Damage dealt: ${damage} points`]
    };
  }

  private async healCharacter(command: CombatCommand): Promise<CommandExecutionResult> {
    const { value: healing } = command;
    if (!healing || healing <= 0) {
      return { success: false, message: 'Healing amount is required and must be positive' };
    }

    const character = this.context.storyState.character;
    const maxHealth = character.maxHealth || 100;
    const newHealth = Math.min(maxHealth, (character.health || 100) + healing);

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        health: newHealth
      }
    };

    return {
      success: true,
      message: `✓ Healed ${healing} HP (Health: ${newHealth}/${maxHealth})`,
      updatedStoryState,
      systemMessages: [`Healing applied: ${healing} points restored`]
    };
  }

  private async addStatusEffect(command: CombatCommand): Promise<CommandExecutionResult> {
    const { effectName, duration = 3 } = command;
    if (!effectName) {
      return { success: false, message: 'Status effect name is required' };
    }

    const character = this.context.storyState.character;
    const statusEffect = {
      id: generateUUID(),
      name: effectName,
      type: effectName.toLowerCase() as any,
      duration: duration,
      description: `${effectName} effect`,
      effects: []
    };

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        statusEffects: [...(character.statusEffects || []), statusEffect]
      }
    };

    return {
      success: true,
      message: `✓ Applied ${effectName} status effect (${duration} turns)`,
      updatedStoryState,
      systemMessages: [`Status effect added: ${effectName}`]
    };
  }

  private async removeStatusEffect(command: CombatCommand): Promise<CommandExecutionResult> {
    const { effectName } = command;
    if (!effectName) {
      return { success: false, message: 'Status effect name is required' };
    }

    const character = this.context.storyState.character;
    const statusEffects = character.statusEffects || [];
    const updatedEffects = statusEffects.filter(effect =>
      !effect.name.toLowerCase().includes(effectName.toLowerCase())
    );

    if (updatedEffects.length === statusEffects.length) {
      return { success: false, message: `Status effect "${effectName}" not found` };
    }

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        statusEffects: updatedEffects
      }
    };

    return {
      success: true,
      message: `✓ Removed ${effectName} status effect`,
      updatedStoryState,
      systemMessages: [`Status effect removed: ${effectName}`]
    };
  }
  // === QUEST COMMAND EXECUTION ===

  private async executeQuestCommand(command: QuestCommand): Promise<CommandExecutionResult> {
    try {
      switch (command.action) {
        case 'create_quest':
          return await this.createQuest(command);
        case 'update_quest':
          return await this.updateQuest(command);
        case 'complete_quest':
          return await this.completeQuest(command);
        case 'fail_quest':
          return await this.failQuest(command);
        case 'add_objective':
          return await this.addQuestObjective(command);
        default:
          return {
            success: false,
            message: `Unknown quest action: ${command.action}`,
            errors: ['Invalid quest action']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Quest command failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async createQuest(command: QuestCommand): Promise<CommandExecutionResult> {
    const { questName, description } = command;
    if (!questName) {
      return { success: false, message: 'Quest name is required' };
    }

    const newQuest: Quest = {
      id: generateUUID(),
      title: questName,
      description: description || `A quest to ${questName.toLowerCase()}`,
      status: 'active',
      objectives: [{
        id: generateUUID(),
        description: `Complete the ${questName} quest`,
        isCompleted: false,
        isOptional: false
      }],
      rewards: {
        experience: 100,
        items: [],
        currency: 50
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedStoryState = {
      ...this.context.storyState,
      activeQuests: [...(this.context.storyState.activeQuests || []), newQuest]
    };

    return {
      success: true,
      message: `✓ Created quest: ${questName}`,
      updatedStoryState,
      systemMessages: [`New quest added: ${questName}`]
    };
  }

  private async updateQuest(command: QuestCommand): Promise<CommandExecutionResult> {
    const { questName, description } = command;
    if (!questName) {
      return { success: false, message: 'Quest name is required' };
    }

    const activeQuests = this.context.storyState.activeQuests || [];
    const questIndex = activeQuests.findIndex(quest =>
      quest.title.toLowerCase().includes(questName.toLowerCase())
    );

    if (questIndex === -1) {
      return { success: false, message: `Quest "${questName}" not found` };
    }

    const updatedQuests = [...activeQuests];
    updatedQuests[questIndex] = {
      ...updatedQuests[questIndex],
      description: description || updatedQuests[questIndex].description,
      updatedAt: new Date().toISOString()
    };

    const updatedStoryState = {
      ...this.context.storyState,
      activeQuests: updatedQuests
    };

    return {
      success: true,
      message: `✓ Updated quest: ${questName}`,
      updatedStoryState,
      systemMessages: [`Quest updated: ${questName}`]
    };
  }

  private async completeQuest(command: QuestCommand): Promise<CommandExecutionResult> {
    const { questName } = command;
    if (!questName) {
      return { success: false, message: 'Quest name is required' };
    }

    const activeQuests = this.context.storyState.activeQuests || [];
    const questIndex = activeQuests.findIndex(quest =>
      quest.title.toLowerCase().includes(questName.toLowerCase())
    );

    if (questIndex === -1) {
      return { success: false, message: `Quest "${questName}" not found` };
    }

    const quest = activeQuests[questIndex];
    const completedQuest = {
      ...quest,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
      objectives: quest.objectives.map(obj => ({ ...obj, isCompleted: true }))
    };

    // Remove from active quests and add to completed
    const updatedActiveQuests = activeQuests.filter((_, index) => index !== questIndex);
    const completedQuests = [...(this.context.storyState.completedQuests || []), completedQuest];

    // Apply rewards
    const character = this.context.storyState.character;
    const experienceGain = quest.rewards?.experience || 0;
    const currencyGain = quest.rewards?.currency || 0;

    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        experience: (character.experience || 0) + experienceGain,
        currency: (character.currency || 0) + currencyGain
      },
      activeQuests: updatedActiveQuests,
      completedQuests
    };

    return {
      success: true,
      message: `✓ Completed quest: ${questName} (+${experienceGain} XP, +${currencyGain} currency)`,
      updatedStoryState,
      systemMessages: [`Quest completed: ${questName}`, `Rewards: ${experienceGain} XP, ${currencyGain} currency`]
    };
  }

  private async failQuest(command: QuestCommand): Promise<CommandExecutionResult> {
    const { questName } = command;
    if (!questName) {
      return { success: false, message: 'Quest name is required' };
    }

    const activeQuests = this.context.storyState.activeQuests || [];
    const questIndex = activeQuests.findIndex(quest =>
      quest.title.toLowerCase().includes(questName.toLowerCase())
    );

    if (questIndex === -1) {
      return { success: false, message: `Quest "${questName}" not found` };
    }

    const quest = activeQuests[questIndex];
    const failedQuest = {
      ...quest,
      status: 'failed' as const,
      failedAt: new Date().toISOString()
    };

    // Remove from active quests and add to failed
    const updatedActiveQuests = activeQuests.filter((_, index) => index !== questIndex);
    const failedQuests = [...(this.context.storyState.failedQuests || []), failedQuest];

    const updatedStoryState = {
      ...this.context.storyState,
      activeQuests: updatedActiveQuests,
      failedQuests
    };

    return {
      success: true,
      message: `✓ Failed quest: ${questName}`,
      updatedStoryState,
      systemMessages: [`Quest failed: ${questName}`]
    };
  }

  private async addQuestObjective(command: QuestCommand): Promise<CommandExecutionResult> {
    const { questName, objective } = command;
    if (!questName || !objective) {
      return { success: false, message: 'Quest name and objective are required' };
    }

    const activeQuests = this.context.storyState.activeQuests || [];
    const questIndex = activeQuests.findIndex(quest =>
      quest.title.toLowerCase().includes(questName.toLowerCase())
    );

    if (questIndex === -1) {
      return { success: false, message: `Quest "${questName}" not found` };
    }

    const newObjective = {
      id: generateUUID(),
      description: objective,
      isCompleted: false,
      isOptional: false
    };

    const updatedQuests = [...activeQuests];
    updatedQuests[questIndex] = {
      ...updatedQuests[questIndex],
      objectives: [...updatedQuests[questIndex].objectives, newObjective],
      updatedAt: new Date().toISOString()
    };

    const updatedStoryState = {
      ...this.context.storyState,
      activeQuests: updatedQuests
    };

    return {
      success: true,
      message: `✓ Added objective to ${questName}: ${objective}`,
      updatedStoryState,
      systemMessages: [`Quest objective added: ${objective}`]
    };
  }
  // === WORLD COMMAND EXECUTION ===

  private async executeWorldCommand(command: WorldCommand): Promise<CommandExecutionResult> {
    try {
      switch (command.action) {
        case 'change_location':
          return await this.changeLocation(command);
        case 'modify_relationship':
          return await this.modifyRelationship(command);
        case 'update_faction':
          return await this.updateFaction(command);
        case 'set_weather':
          return await this.setWeather(command);
        case 'advance_time':
          return await this.advanceTime(command);
        default:
          return {
            success: false,
            message: `Unknown world action: ${command.action}`,
            errors: ['Invalid world action']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `World command failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async changeLocation(command: WorldCommand): Promise<CommandExecutionResult> {
    const { target: locationName } = command;
    if (!locationName) {
      return { success: false, message: 'Location name is required' };
    }

    const updatedStoryState = {
      ...this.context.storyState,
      currentLocation: {
        name: locationName as string,
        description: `You are now in ${locationName}`,
        type: 'area',
        connections: []
      }
    };

    return {
      success: true,
      message: `✓ Moved to ${locationName}`,
      updatedStoryState,
      systemMessages: [`Location changed: ${locationName}`]
    };
  }

  private async modifyRelationship(command: WorldCommand): Promise<CommandExecutionResult> {
    const { target: characterName, value } = command;
    if (!characterName) {
      return { success: false, message: 'Character name is required' };
    }

    const relationshipChange = typeof value === 'number' ? value :
                              typeof value === 'string' && value.includes('improve') ? 10 :
                              typeof value === 'string' && value.includes('worsen') ? -10 : 5;

    const relationships = this.context.storyState.relationships || [];
    const existingIndex = relationships.findIndex(rel =>
      rel.characterName.toLowerCase().includes((characterName as string).toLowerCase())
    );

    let updatedRelationships: RelationshipEntry[];
    let message: string;

    if (existingIndex >= 0) {
      // Update existing relationship
      const existing = relationships[existingIndex];
      const newValue = Math.max(-100, Math.min(100, existing.relationshipValue + relationshipChange));

      updatedRelationships = [...relationships];
      updatedRelationships[existingIndex] = {
        ...existing,
        relationshipValue: newValue,
        lastInteraction: new Date().toISOString()
      };

      message = `✓ Relationship with ${characterName} ${relationshipChange > 0 ? 'improved' : 'worsened'} by ${Math.abs(relationshipChange)} (${newValue})`;
    } else {
      // Create new relationship
      const newRelationship: RelationshipEntry = {
        characterId: generateUUID(),
        characterName: characterName as string,
        relationshipValue: relationshipChange,
        relationshipType: 'acquaintance',
        lastInteraction: new Date().toISOString(),
        interactionHistory: []
      };

      updatedRelationships = [...relationships, newRelationship];
      message = `✓ New relationship with ${characterName}: ${relationshipChange}`;
    }

    const updatedStoryState = {
      ...this.context.storyState,
      relationships: updatedRelationships
    };

    return {
      success: true,
      message,
      updatedStoryState,
      systemMessages: [`Relationship updated: ${characterName}`]
    };
  }

  private async updateFaction(command: WorldCommand): Promise<CommandExecutionResult> {
    const { target: factionName, value } = command;
    if (!factionName) {
      return { success: false, message: 'Faction name is required' };
    }

    const factionChange = typeof value === 'number' ? value : 10;
    const factions = this.context.storyState.factionStandings || [];
    const existingIndex = factions.findIndex(faction =>
      faction.name.toLowerCase().includes((factionName as string).toLowerCase())
    );

    let updatedFactions: any[];
    let message: string;

    if (existingIndex >= 0) {
      // Update existing faction
      const existing = factions[existingIndex];
      const newStanding = Math.max(-100, Math.min(100, existing.standing + factionChange));

      updatedFactions = [...factions];
      updatedFactions[existingIndex] = {
        ...existing,
        standing: newStanding
      };

      message = `✓ Faction standing with ${factionName} changed by ${factionChange} (${newStanding})`;
    } else {
      // Create new faction standing
      const newFaction = {
        id: generateUUID(),
        name: factionName as string,
        standing: factionChange,
        reputation: 'neutral'
      };

      updatedFactions = [...factions, newFaction];
      message = `✓ New faction standing with ${factionName}: ${factionChange}`;
    }

    const updatedStoryState = {
      ...this.context.storyState,
      factionStandings: updatedFactions
    };

    return {
      success: true,
      message,
      updatedStoryState,
      systemMessages: [`Faction standing updated: ${factionName}`]
    };
  }

  private async setWeather(command: WorldCommand): Promise<CommandExecutionResult> {
    const { target: weather } = command;
    if (!weather) {
      return { success: false, message: 'Weather condition is required' };
    }

    const updatedStoryState = {
      ...this.context.storyState,
      environmentalFactors: {
        ...this.context.storyState.environmentalFactors,
        weather: weather as string,
        lastWeatherChange: new Date().toISOString()
      }
    };

    return {
      success: true,
      message: `✓ Weather changed to ${weather}`,
      updatedStoryState,
      systemMessages: [`Weather updated: ${weather}`]
    };
  }

  private async advanceTime(command: WorldCommand): Promise<CommandExecutionResult> {
    const { target } = command;
    const timeAmount = target || '1 hour';

    const updatedStoryState = {
      ...this.context.storyState,
      environmentalFactors: {
        ...this.context.storyState.environmentalFactors,
        timeOfDay: this.calculateNewTime(timeAmount as string),
        lastTimeChange: new Date().toISOString()
      }
    };

    return {
      success: true,
      message: `✓ Time advanced by ${timeAmount}`,
      updatedStoryState,
      systemMessages: [`Time advanced: ${timeAmount}`]
    };
  }

  private calculateNewTime(timeAmount: string): string {
    // Simple time calculation - in a real implementation this would be more sophisticated
    const currentTime = this.context.storyState.environmentalFactors?.timeOfDay || 'morning';
    const timeMap: Record<string, string> = {
      'morning': 'afternoon',
      'afternoon': 'evening',
      'evening': 'night',
      'night': 'morning'
    };

    if (timeAmount.includes('hour')) {
      const hours = parseInt(timeAmount) || 1;
      let newTime = currentTime;
      for (let i = 0; i < Math.min(hours, 4); i++) {
        newTime = timeMap[newTime] || 'morning';
      }
      return newTime;
    }

    return timeMap[currentTime] || 'morning';
  }
  // === NARRATIVE COMMAND EXECUTION ===

  private async executeNarrativeCommand(command: NarrativeCommand): Promise<CommandExecutionResult> {
    try {
      switch (command.action) {
        case 'trigger_consequence':
          return await this.triggerConsequence(command);
        case 'start_arc':
          return await this.startArc(command);
        case 'end_arc':
          return await this.endArc(command);
        case 'add_memory':
          return await this.addMemory(command);
        case 'trigger_loop':
          return await this.triggerLoop(command);
        default:
          return {
            success: false,
            message: `Unknown narrative action: ${command.action}`,
            errors: ['Invalid narrative action']
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Narrative command failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  private async triggerConsequence(command: NarrativeCommand): Promise<CommandExecutionResult> {
    const { target: consequenceName, description } = command;
    if (!consequenceName) {
      return { success: false, message: 'Consequence name is required' };
    }

    const consequence = {
      id: generateUUID(),
      type: 'narrative' as const,
      description: description || `Consequence: ${consequenceName}`,
      triggeredAt: new Date().toISOString(),
      effects: []
    };

    const consequences = this.context.storyState.consequences || [];
    const updatedStoryState = {
      ...this.context.storyState,
      consequences: [...consequences, consequence]
    };

    return {
      success: true,
      message: `✓ Triggered consequence: ${consequenceName}`,
      updatedStoryState,
      systemMessages: [`Narrative consequence activated: ${consequenceName}`]
    };
  }

  private async startArc(command: NarrativeCommand): Promise<CommandExecutionResult> {
    const { target: arcName, description } = command;
    if (!arcName) {
      return { success: false, message: 'Arc name is required' };
    }

    const arc = {
      id: generateUUID(),
      name: arcName,
      description: description || `Story arc: ${arcName}`,
      status: 'active' as const,
      startedAt: new Date().toISOString(),
      objectives: [],
      consequences: []
    };

    const arcs = this.context.storyState.activeArcs || [];
    const updatedStoryState = {
      ...this.context.storyState,
      activeArcs: [...arcs, arc]
    };

    return {
      success: true,
      message: `✓ Started story arc: ${arcName}`,
      updatedStoryState,
      systemMessages: [`New story arc begun: ${arcName}`]
    };
  }

  private async endArc(command: NarrativeCommand): Promise<CommandExecutionResult> {
    const { target: arcName } = command;
    if (!arcName) {
      return { success: false, message: 'Arc name is required' };
    }

    const activeArcs = this.context.storyState.activeArcs || [];
    const arcIndex = activeArcs.findIndex(arc =>
      arc.name.toLowerCase().includes(arcName.toLowerCase())
    );

    if (arcIndex === -1) {
      return { success: false, message: `Arc "${arcName}" not found` };
    }

    const arc = activeArcs[arcIndex];
    const completedArc = {
      ...arc,
      status: 'completed' as const,
      completedAt: new Date().toISOString()
    };

    const updatedActiveArcs = activeArcs.filter((_, index) => index !== arcIndex);
    const completedArcs = [...(this.context.storyState.completedArcs || []), completedArc];

    const updatedStoryState = {
      ...this.context.storyState,
      activeArcs: updatedActiveArcs,
      completedArcs
    };

    return {
      success: true,
      message: `✓ Completed story arc: ${arcName}`,
      updatedStoryState,
      systemMessages: [`Story arc completed: ${arcName}`]
    };
  }

  private async addMemory(command: NarrativeCommand): Promise<CommandExecutionResult> {
    const { target: memoryTitle, description } = command;
    if (!memoryTitle) {
      return { success: false, message: 'Memory title is required' };
    }

    const memory = {
      id: generateUUID(),
      title: memoryTitle,
      description: description || memoryTitle,
      timestamp: new Date().toISOString(),
      importance: 'medium' as const,
      tags: []
    };

    const memories = this.context.storyState.memories || [];
    const updatedStoryState = {
      ...this.context.storyState,
      memories: [...memories, memory]
    };

    return {
      success: true,
      message: `✓ Added memory: ${memoryTitle}`,
      updatedStoryState,
      systemMessages: [`Memory recorded: ${memoryTitle}`]
    };
  }

  private async triggerLoop(command: NarrativeCommand): Promise<CommandExecutionResult> {
    const loopState = {
      isActive: true,
      loopCount: (this.context.storyState.temporalLoopState?.loopCount || 0) + 1,
      savePoint: new Date().toISOString(),
      retainedMemories: this.context.storyState.memories || []
    };

    const updatedStoryState = {
      ...this.context.storyState,
      temporalLoopState: loopState
    };

    return {
      success: true,
      message: `✓ Temporal loop activated (Loop #${loopState.loopCount})`,
      updatedStoryState,
      systemMessages: [`Time loop initiated - Loop ${loopState.loopCount}`]
    };
  }

  // === CRAFTING COMMAND EXECUTION ===

  private async executeCraftingCommand(command: any): Promise<CommandExecutionResult> {
    const { recipeName, quantity = 1 } = command;
    if (!recipeName) {
      return { success: false, message: 'Recipe name is required' };
    }

    // Create a basic crafted item
    const craftedItem: Item = {
      id: generateUUID(),
      name: recipeName,
      type: 'crafted',
      rarity: 'common',
      value: 25,
      description: `A crafted ${recipeName.toLowerCase()}`,
      quantity: quantity,
      isEquipped: false
    };

    const character = this.context.storyState.character;
    const updatedStoryState = {
      ...this.context.storyState,
      character: {
        ...character,
        inventory: [...character.inventory, craftedItem]
      }
    };

    return {
      success: true,
      message: `✓ Crafted ${quantity > 1 ? `${quantity}x ` : ''}${recipeName}`,
      updatedStoryState,
      systemMessages: [`Item crafted: ${recipeName}`]
    };
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Creates a command executor with the given context
 */
export function createCommandExecutor(context: ExecutionContext): ChatCommandExecutor {
  return new ChatCommandExecutor(context);
}

/**
 * Quick execution helper for single commands
 */
export async function executeGameCommand(
  command: GameCommand,
  storyState: StructuredStoryState,
  currentTurnId: string,
  isGMCommand: boolean = false
): Promise<CommandExecutionResult> {
  const executor = createCommandExecutor({
    storyState,
    currentTurnId,
    isGMCommand,
    safetyChecks: !isGMCommand
  });
  
  return await executor.executeCommand(command);
}
