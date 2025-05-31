
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state, including core character stats, mana, level, XP, inventory, equipped items, quests (with objectives, categories, and rewards), world facts, and series-specific context.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene and updated state.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, QuestObjective as QuestObjectiveType, QuestRewards as QuestRewardsType } from '@/types/story';
import { lookupLoreTool } from '@/ai/tools/lore-tool';

const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Must be unique if multiple items of the same name exist."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
});
const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Must be a number; use 0 if not applicable, or omit.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Must be a number; use 0 if not applicable, or omit.'),
  strength: z.number().optional().describe('Character\'s physical power, or omit.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes, or omit.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness, or omit.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory, or omit.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition, or omit.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence, or omit.'),
  level: z.number().describe('The current level of the character.'),
  experiencePoints: z.number().describe('Current experience points of the character.'),
  experienceToNextLevel: z.number().describe('Experience points needed for the character to reach the next level.'),
});

const EquipmentSlotsSchemaInternal = z.object({
  weapon: ItemSchemaInternal.nullable().optional().describe("Weapon slot. Null if empty."),
  shield: ItemSchemaInternal.nullable().optional().describe("Shield slot. Null if empty."),
  head: ItemSchemaInternal.nullable().optional().describe("Head slot. Null if empty."),
  body: ItemSchemaInternal.nullable().optional().describe("Body slot. Null if empty."),
  legs: ItemSchemaInternal.nullable().optional().describe("Legs slot. Null if empty."),
  feet: ItemSchemaInternal.nullable().optional().describe("Feet slot. Null if empty."),
  hands: ItemSchemaInternal.nullable().optional().describe("Hands slot. Null if empty."),
  neck: ItemSchemaInternal.nullable().optional().describe("Neck slot. Null if empty."),
  ring1: ItemSchemaInternal.nullable().optional().describe("Ring 1 slot. Null if empty."),
  ring2: ItemSchemaInternal.nullable().optional().describe("Ring 2 slot. Null if empty."),
}).describe("A record of the character's equipped items. Keys are slot names (weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2), values are the item object or null if the slot is empty. All 10 slots must be present, with 'null' for empty ones.");

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed.")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, and optional 'equipSlot' (omit if not inherently equippable gear).")
}).describe("Potential rewards to be given upon quest completion, defined when the quest is created. Omit if no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_main_001' or 'quest_side_witch_forest_003'. Must be unique among all quests."),
  description: z.string().describe("A clear description of the quest's overall objective."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, either 'active' or 'completed'."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Personal Goal', 'Exploration'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. Use for more complex quests. If the quest is simple, this can be omitted."),
  rewards: QuestRewardsSchemaInternal.optional() // Description moved to QuestRewardsSchemaInternal
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, and XP.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of UNequipped items in the character\'s inventory. Each item is an object with id, name, description. If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED ENTIRELY.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("A list of all quests. Each quest is an object with 'id', 'description', 'status'. Optionally include 'category', a list of 'objectives' (each with 'description' and 'isCompleted'), and 'rewards' (which specify what the player will get on completion)."),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. These facts should reflect the character\'s current understanding and immediate environment. Add new facts as they are discovered, modify existing ones if they change, or remove them if they become outdated or irrelevant. Narrate significant changes to world facts if the character would perceive them.'),
});

export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;

const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string().describe('The current scene text.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The current structured state of the story (character, location, inventory, equipped items, XP, quests, etc.).'),
  seriesName: z.string().describe('The name of the series this story is based on, for contextual awareness.'),
  seriesStyleGuide: z.string().optional().describe('A brief style guide for the series to maintain tone and themes.'),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchemaInternal>;

const PromptInternalInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string().describe("Pre-formatted string of equipped items."),
  formattedQuestsString: z.string().describe("Pre-formatted string of quests with their statuses, categories, and objectives."),
});

const GenerateNextSceneOutputSchemaInternal = z.object({
  nextScene: z.string().describe('The generated text for the next scene.'),
  updatedStoryState: StructuredStoryStateSchemaInternal.describe('The updated structured story state after the scene, including any XP, level changes, inventory changes, equipment changes, and quest updates. Rewards for completed quests are applied automatically based on pre-defined rewards in the quest object.'),
});
export type GenerateNextSceneOutput = z.infer<typeof GenerateNextSceneOutputSchemaInternal>;

export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

function formatEquippedItems(equippedItems: Partial<Record<EquipmentSlot, ItemType | null>> | undefined | null): string {
  if (!equippedItems || typeof equippedItems !== 'object') {
    return "Equipment status: Not available or invalid data.";
  }
  let output = "";
  const slots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
  for (const slot of slots) {
    const item = equippedItems[slot];
    output += `- ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? item.name : 'Empty'}\n`;
  }
  return output.trim();
}

function formatQuests(quests: QuestType[] | undefined | null): string {
  if (!quests || !Array.isArray(quests) || quests.length === 0) {
    return "None";
  }
  return quests.map(q => {
    let questStr = `- ${q.description} (Status: ${q.status}, ID: ${q.id})`;
    if (q.category) {
      questStr += ` [Category: ${q.category}]`;
    }
    if (q.objectives && q.objectives.length > 0) {
      questStr += "\n  Objectives:\n";
      q.objectives.forEach(obj => {
        questStr += `    - ${obj.description} (${obj.isCompleted ? 'Completed' : 'Pending'})\n`;
      });
    }
    // Display potential rewards for active quests, and confirmed for completed.
    if (q.rewards) {
        const rewardLabel = q.status === 'completed' ? "Rewards Received" : "Potential Rewards";
        questStr += `\n  ${rewardLabel}:\n`;
        if (q.rewards.experiencePoints) {
            questStr += `    - XP: ${q.rewards.experiencePoints}\n`;
        }
        if (q.rewards.items && q.rewards.items.length > 0) {
            q.rewards.items.forEach(item => {
            questStr += `    - Item: ${item.name}\n`;
            });
        }
    }
    return questStr;
  }).join("\n");
}

const prompt = ai.definePrompt({
  name: 'generateNextScenePrompt',
  input: {schema: PromptInternalInputSchema},
  output: {schema: GenerateNextSceneOutputSchemaInternal},
  tools: [lookupLoreTool],
  prompt: `You are a dynamic storyteller, continuing a story based on the player's actions and the current game state.
This story is set in the universe of: {{seriesName}}.
{{#if seriesStyleGuide}}
Series Style Guide: {{seriesStyleGuide}}
{{/if}}

Current Scene:
{{currentScene}}

Player Input:
{{userInput}}

Current Character:
- Name: {{storyState.character.name}}, the {{storyState.character.class}} (Level: {{storyState.character.level}})
- Health: {{storyState.character.health}}/{{storyState.character.maxHealth}}
- Mana: {{#if storyState.character.mana}}{{storyState.character.mana}}/{{storyState.character.maxMana}}{{else}}N/A{{/if}}
- XP: {{storyState.character.experiencePoints}}/{{storyState.character.experienceToNextLevel}}
- Stats:
  - Strength: {{storyState.character.strength}}
  - Dexterity: {{storyState.character.dexterity}}
  - Constitution: {{storyState.character.constitution}}
  - Intelligence: {{storyState.character.intelligence}}
  - Wisdom: {{storyState.character.wisdom}}
  - Charisma: {{storyState.character.charisma}}

Equipped Items:
{{{formattedEquippedItemsString}}}

Current Location: {{storyState.currentLocation}}

Current Inventory (Unequipped Items):
{{#if storyState.inventory.length}}
{{#each storyState.inventory}}
- {{this.name}} (ID: {{this.id}}): {{this.description}} {{#if this.equipSlot}}(Equippable Gear: {{this.equipSlot}}){{/if}}
{{/each}}
{{else}}
Empty
{{/if}}

Quests (Rewards are pre-defined; they are granted by the system upon completion):
{{{formattedQuestsString}}}

Known World Facts:
{{#each storyState.worldFacts}}
- {{{this}}}
{{else}}
- None known.
{{/each}}

Available Equipment Slots: weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2. An item's 'equipSlot' property determines where it can go. 'ring' items can go in 'ring1' or 'ring2'.

If the player's input or the unfolding scene mentions a specific named entity (like a famous person, a unique location, a magical artifact, or a special concept) that seems like it might have established lore *within the "{{seriesName}}" universe*, use the 'lookupLoreTool' (providing the current 'seriesName' to it) to get more information about it. Integrate this information naturally into your response if relevant.

Based on the current scene, player's input, and detailed story state, generate the next scene.
Describe any quest-related developments (new quests, progress, completion) clearly in the \`nextScene\` text.
When a quest is completed, the system will automatically handle granting the pre-defined rewards. You should narrate that the quest is complete and the rewards are received.

Crucially, you must also update the story state. This includes:
- Character: Update all character fields as necessary.
  - **Important for 'mana' and 'maxMana'**: These fields MUST be numbers. If a character does not use mana or has no mana, set both 'mana' and 'maxMana' to 0. Do NOT use 'null' or omit these fields if the character profile is being updated; always provide a numeric value (e.g., 0). Similarly for other optional numeric stats.
  - If a quest is completed, this is a good time to award experience points (update \`character.experiencePoints\`) and potentially increase stats if a level up occurs. Note: The system applies XP from quest rewards automatically, but you can narrate other XP gains.
- Location: Update if the character moved.
- Inventory:
  - If new items are found (excluding pre-defined quest rewards, which are handled by the system): Add them as objects to the \`inventory\` array. Each item object **must** have a unique \`id\`, a \`name\`, a \`description\`. **If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include an 'equipSlot' (e.g. 'weapon', 'head'). If it's not an equippable type of item (e.g., a potion, a key, a generic diary/book), the 'equipSlot' field MUST BE OMITTED ENTIRELY.** Describe these new items clearly in the \`nextScene\` text.
  - If items are used, consumed, or lost: Remove them from \`inventory\` or \`equippedItems\` as appropriate.
- Equipped Items:
  - If the player tries to equip an item:
    1. Find the item in \`inventory\`.
    2. Check if it's equippable and has an \`equipSlot\`. If not, state it (e.g., "You cannot equip the diary."). Only items that are actual gear (weapons, armor, equippable accessories) should have an \`equipSlot\`. Items like books or potions are not equippable and should not have an \`equipSlot\` field.
    3. If the target slot is occupied, move the existing item from \`equippedItems[slot]\` to \`inventory\`.
    4. Move the new item from \`inventory\` to \`equippedItems[slot]\`.
    5. Narrate the action.
  - If the player tries to unequip an item:
    1. Find it in \`equippedItems\`.
    2. Move it to \`inventory\`.
    3. Set \`equippedItems[slot]\` to null.
    4. Narrate the action.
  - Ensure an item is either in \`inventory\` OR \`equippedItems\`, never both.
  - The 'updatedStoryState.equippedItems' object must include all 10 slots, with 'null' for empty ones.
- Quests:
  - The \`quests\` array in \`updatedStoryState\` should contain all current quests as objects. Each quest object must include \`id: string\`, \`description: string\`, and \`status: 'active' | 'completed'\`. It will also include its pre-defined \`rewards\` if any.
  - If a new quest is started: Add a new quest object to the \`quests\` array. It must have a unique \`id\`. Assign a suitable \`category\` (e.g., "Main Story", "Side Quest", "Personal Goal", "Exploration") fitting for "{{seriesName}}"; if no category is clear, omit the \`category\` field. If the quest is complex, you can break it down into an array of \`objectives\`, where each objective has a \`description\` and \`isCompleted: false\`.
    - **Pre-defined Quest Rewards**: When creating a new quest, you MUST also define a 'rewards' object for it. This object should specify the 'experiencePoints' (number, optional) and/or 'items' (array of Item objects, optional) that the player will receive upon completing this quest. For 'items' in rewards, each item needs a unique 'id', 'name', 'description', and an optional 'equipSlot' (omitting 'equipSlot' if not inherently equippable gear). If a quest has no specific material rewards, you can omit the 'rewards' field or provide an empty object {} for it.
  - If an existing quest in \`quests\` is progressed:
    - If it has \`objectives\`, update the \`isCompleted\` status of relevant objectives to \`true\`.
    - You can update the main quest \`description\` if needed.
    - Narrate the progress in \`nextScene\`. The quest status remains \`'active'\` until fully completed (all essential objectives are done).
  - **VERY IMPORTANT for quest completion**: When updating objectives: if ALL objectives for a given quest are marked as \`isCompleted: true\`, you MUST then update the parent quest's \`status\` to \`'completed'\`.
  - If an existing quest from \`quests\` is completed: Find the quest object in the \`quests\` array. Update its \`status\` to \`'completed'\`. If it has \`objectives\`, ensure all relevant ones are marked \`isCompleted: true\`. Do NOT remove it from the array. Clearly state the completion in \`nextScene\`.
    - **Quest Rewards are Pre-defined**: The system will automatically apply the rewards (XP and items) associated with this quest from its existing \`rewards\` field. You do not need to redefine or specify rewards again here. Your narration should reflect that the quest is done and rewards are obtained.
  - Ensure quest IDs are unique.
  - If a quest's \`category\` is not applicable, omit the field. If objectives are not needed, omit the \`objectives\` array.
- World Facts:
  - You should actively manage the \`worldFacts\` array. These facts should reflect the character's current understanding and immediate environment within the "{{seriesName}}" context.
  - **Adding Facts**: If the character makes a new, significant observation or learns a piece of information relevant to the immediate situation that isn't broad enough for the lorebook, add it as a string to \`worldFacts\`.
  - **Modifying Facts**: If an existing fact needs refinement based on new developments, you can suggest replacing the old fact with a new one (effectively removing the old and adding the new).
  - **Removing Facts**: If a fact becomes outdated or irrelevant due to story progression (e.g., a temporary condition is resolved, an immediate danger passes), you can remove it from the \`worldFacts\` array.
  - **Narrate Changes**: If you add, modify, or remove a world fact in a way that the character would perceive or that's significant for the player to know, briefly mention this in the \`nextScene\` (e.g., "You now realize the guard captain is missing," or "The strange humming sound from the basement has stopped.").

The next scene should logically follow the player's input and advance the narrative, respecting the style and lore of {{seriesName}}.
Ensure your entire response strictly adheres to the JSON schema for the output.
The 'updatedStoryState.character' must include all fields required by its schema.
The 'updatedStoryState.inventory' must be an array of item objects. For items, if 'equipSlot' is not applicable (because the item is not inherently equippable gear), it must be omitted.
The 'updatedStoryState.equippedItems' must be an object mapping all 10 slot names to either an item object or null.
The 'updatedStoryState.quests' must be an array of quest objects, each with 'id', 'description', and 'status', and potentially 'rewards', 'category', and 'objectives'.
`,
});

const generateNextSceneFlow = ai.defineFlow(
  {
    name: 'generateNextSceneFlow',
    inputSchema: GenerateNextSceneInputSchemaInternal,
    outputSchema: GenerateNextSceneOutputSchemaInternal,
  },
  async (input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> => {
    const formattedEquippedItemsString = formatEquippedItems(input.storyState.equippedItems);
    const formattedQuestsString = formatQuests(input.storyState.quests);

    const promptPayload: z.infer<typeof PromptInternalInputSchema> = {
      ...input,
      formattedEquippedItemsString: formattedEquippedItemsString,
      formattedQuestsString: formattedQuestsString,
    };

    const {output} = await prompt(promptPayload);

    if (output?.updatedStoryState.character && input.storyState.character) {
      const updatedChar = output.updatedStoryState.character;
      const originalChar = input.storyState.character;
      updatedChar.mana = updatedChar.mana ?? originalChar.mana ?? 0;
      updatedChar.maxMana = updatedChar.maxMana ?? originalChar.maxMana ?? 0;
      updatedChar.strength = updatedChar.strength ?? originalChar.strength ?? 10;
      updatedChar.dexterity = updatedChar.dexterity ?? originalChar.dexterity ?? 10;
      updatedChar.constitution = updatedChar.constitution ?? originalChar.constitution ?? 10;
      updatedChar.intelligence = updatedChar.intelligence ?? originalChar.intelligence ?? 10;
      updatedChar.wisdom = updatedChar.wisdom ?? originalChar.wisdom ?? 10;
      updatedChar.charisma = updatedChar.charisma ?? originalChar.charisma ?? 10;
      updatedChar.level = updatedChar.level ?? originalChar.level ?? 1;
      updatedChar.experiencePoints = updatedChar.experiencePoints ?? originalChar.experiencePoints ?? 0;
      updatedChar.experienceToNextLevel = updatedChar.experienceToNextLevel ?? originalChar.experienceToNextLevel ?? 100;
      if (updatedChar.experienceToNextLevel <= 0) {
         updatedChar.experienceToNextLevel = (originalChar.experienceToNextLevel > 0 ? originalChar.experienceToNextLevel : 100) * 1.5;
         if (updatedChar.experienceToNextLevel <= updatedChar.experiencePoints && updatedChar.experiencePoints > 0) {
            updatedChar.experienceToNextLevel = updatedChar.experiencePoints + 50;
         }
      }
    }

     if (output?.updatedStoryState) {
        output.updatedStoryState.inventory = output.updatedStoryState.inventory ?? [];
        output.updatedStoryState.inventory.forEach(item => {
          if (!item.id) {
            item.id = `item_generated_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          }
          if (item.equipSlot === null || (item.equipSlot as unknown) === '') { 
            delete (item as Partial<ItemType>).equipSlot;
          }
        });

        output.updatedStoryState.quests = output.updatedStoryState.quests ?? [];
        output.updatedStoryState.quests.forEach((quest, index) => {
          if (!quest.id) {
            quest.id = `quest_generated_${Date.now()}_${index}`;
          }
          if (!quest.status) {
            quest.status = 'active'; 
          }
          if (quest.category === null || (quest.category as unknown) === '') {
            delete (quest as Partial<QuestType>).category;
          }
          quest.objectives = quest.objectives ?? [];
          quest.objectives.forEach(obj => {
            if (typeof obj.isCompleted !== 'boolean') {
              obj.isCompleted = false;
            }
            if (typeof obj.description !== 'string' || obj.description.trim() === '') {
                obj.description = "Objective details missing";
            }
          });
          
          // Apply rewards if quest status changes to completed and rewards exist
          const previousQuestState = input.storyState.quests.find(pq => pq.id === quest.id);
          if (quest.status === 'completed' && previousQuestState?.status === 'active' && quest.rewards && output.updatedStoryState.character) {
            if (typeof quest.rewards.experiencePoints === 'number') {
              output.updatedStoryState.character.experiencePoints += quest.rewards.experiencePoints;
            }
            if (quest.rewards.items && Array.isArray(quest.rewards.items)) {
              quest.rewards.items.forEach(rewardItem => {
                const cleanedRewardItem = { ...rewardItem }; // Clone to avoid mutating original rewards
                 if (!cleanedRewardItem.id) { // Ensure rewarded items have IDs if AI forgets
                    cleanedRewardItem.id = `item_reward_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                }
                if (cleanedRewardItem.equipSlot === null || (cleanedRewardItem.equipSlot as unknown) === '') {
                  delete (cleanedRewardItem as Partial<ItemType>).equipSlot;
                }
                output.updatedStoryState.inventory.push(cleanedRewardItem);
              });
            }
          }
          
          // Clean up quest.rewards object if it's empty or contains only empty/undefined fields
          if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? []; // Ensure items array exists for cleaning
             quest.rewards.items.forEach(rewardItem => { // Clean reward items
                if (!rewardItem.id) {
                    rewardItem.id = `item_reward_next_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                }
                if (rewardItem.equipSlot === null || (rewardItem.equipSlot as unknown) === '') {
                    delete (rewardItem as Partial<ItemType>).equipSlot;
                }
            });
            if (quest.rewards.experiencePoints === undefined && quest.rewards.items.length === 0) {
              delete quest.rewards;
            } else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (quest.rewards.items.length === 0) delete quest.rewards.items;
            }
          }
        });

        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts ?? [];
        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');


        const defaultEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {
            weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null
        };

        const aiEquipped = output.updatedStoryState.equippedItems || {};
        const newEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {};
        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            newEquippedItems[slotKey] = aiEquipped[slotKey] !== undefined ? aiEquipped[slotKey] : null;
            if (newEquippedItems[slotKey]) {
                if (!newEquippedItems[slotKey]!.id) {
                     newEquippedItems[slotKey]!.id = `item_equipped_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                }
                if (newEquippedItems[slotKey]!.equipSlot === null || (newEquippedItems[slotKey]!.equipSlot as unknown) === '') {
                  delete (newEquippedItems[slotKey] as Partial<ItemType>)!.equipSlot;
                }
            }
        }
        output.updatedStoryState.equippedItems = newEquippedItems as any; 
    }
    return output!;
  }
);
