
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state, including core character stats, mana, level, XP, inventory, and equipped items.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene and updated state.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType } from '@/types/story';
import { lookupLoreTool } from '@/ai/tools/lore-tool';


const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Must be unique if multiple items of the same name exist."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field should be omitted entirely."),
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
const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_main_001' or 'quest_side_witch_forest_003'. Must be unique among all quests."),
  description: z.string().describe("A clear description of the quest's objective."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, either 'active' or 'completed'.")
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, and XP.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of UNequipped items in the character\'s inventory. Each item is an object with id, name, description. If the item is an inherently equippable piece of gear, include its equipSlot; otherwise, the equipSlot field must be omitted entirely.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe('A list of all quests, each an object with id, description, and status (\'active\' or \'completed\').'),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state.'),
});
export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;


const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string().describe('The current scene text.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The current structured state of the story (character, location, inventory, equipped items, XP, quests, etc.).'),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchemaInternal>;

const PromptInternalInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string().describe("Pre-formatted string of equipped items."),
  formattedQuestsString: z.string().describe("Pre-formatted string of quests with their statuses."),
});

const GenerateNextSceneOutputSchemaInternal = z.object({
  nextScene: z.string().describe('The generated text for the next scene.'),
  updatedStoryState: StructuredStoryStateSchemaInternal.describe('The updated structured story state after the scene, including any XP, level changes, inventory changes, equipment changes, and quest updates.'),
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
  return quests.map(q => `- ${q.description} (Status: ${q.status}, ID: ${q.id})`).join("\n");
}


const prompt = ai.definePrompt({
  name: 'generateNextScenePrompt',
  input: {schema: PromptInternalInputSchema},
  output: {schema: GenerateNextSceneOutputSchemaInternal},
  tools: [lookupLoreTool],
  prompt: `You are a dynamic storyteller, continuing a story based on the player's actions and the current game state.

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
- {{this.name}} (ID: {{this.id}}): {{this.description}} {{#if this.equipSlot}}(Equippable: {{this.equipSlot}}){{/if}}
{{/each}}
{{else}}
Empty
{{/if}}

Quests (ID, Description, Status):
{{{formattedQuestsString}}}

Known World Facts:
{{#each storyState.worldFacts}}
- {{{this}}}
{{else}}
- None known.
{{/each}}

Available Equipment Slots: weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2. An item's 'equipSlot' property determines where it can go. 'ring' items can go in 'ring1' or 'ring2'.

If the player's input or the unfolding scene mentions a specific named entity (like a famous person, a unique location, a magical artifact, or a special concept) that seems like it might have established lore, use the 'lookupLoreTool' to get more information about it. Integrate this information naturally into your response if relevant. For example, if the player asks "What do you know about the Blade of Marmora?", use the tool.

Based on the current scene, player's input, and detailed story state, generate the next scene.
Describe any quest-related developments (new quests, progress, completion) clearly in the \`nextScene\` text.

Crucially, you must also update the story state. This includes:
- Character: Update all character fields as necessary.
  - **Important for 'mana' and 'maxMana'**: These fields MUST be numbers. If a character does not use mana or has no mana, set both 'mana' and 'maxMana' to 0. Do NOT use 'null' or omit these fields if the character profile is being updated; always provide a numeric value (e.g., 0). Similarly for other optional numeric stats, provide a number or omit if not applicable and allowed by schema, do not use 'null'.
  - If a quest is completed, this is a good time to award experience points (update \`character.experiencePoints\`) and potentially increase stats if a level up occurs.
- Location: Update if the character moved.
- Inventory:
  - If new items are found: Add them as objects to the \`inventory\` array. Each item object **must** have a unique \`id\`, a \`name\`, a \`description\`. **If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include an 'equipSlot' (e.g. 'weapon', 'head'). If it's not an equippable type of item (e.g., a potion, a key, a generic diary/book), the 'equipSlot' field MUST BE OMITTED ENTIRELY.** Describe these new items clearly in the \`nextScene\` text.
  - If an existing quest is completed as part of this scene, consider awarding a relevant item (with unique id, name, description, and optional equipSlot - omit if not equippable) and add it to the \`inventory\`.
  - If items are used, consumed, or lost: Remove them from \`inventory\` or \`equippedItems\` as appropriate.
- Equipped Items:
  - If the player tries to equip an item:
    1. Find the item in \`inventory\`.
    2. Check if it's equippable and has an \`equipSlot\`. If not, state it (e.g., "You cannot equip the diary.").
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
  - The \`quests\` array in \`updatedStoryState\` should contain all current quests as objects: \`{ id: string, description: string, status: 'active' | 'completed' }\`.
  - If a new quest is started: Add a new quest object to the \`quests\` array. It must have a unique \`id\`, a clear \`description\`, and its \`status\` must be set to \`'active'\`. Narrate this new quest in \`nextScene\`.
  - If an existing quest in \`quests\` is progressed: Update its \`description\` in the array if needed, or simply narrate the progress in \`nextScene\`. The status remains \`'active'\`.
  - If an existing quest from \`quests\` is completed: Find the quest object in the \`quests\` array (match by \`id\` if possible, or by conceptual understanding of the description). Update its \`status\` to \`'completed'\`. Do NOT remove it from the array. Clearly state the completion in \`nextScene\` and ensure any rewards (XP, items) are processed.
  - Ensure quest IDs are unique (e.g., by incrementing a counter or using a descriptive naming convention like 'main_01', 'side_forest_01').
- World Facts:
  - Add, modify, or remove strings in \`worldFacts\` as the world state changes. Narrate these if observable.

The next scene should logically follow the player's input and advance the narrative.
Ensure your entire response strictly adheres to the JSON schema for the output.
The 'updatedStoryState.character' must include all fields required by its schema.
The 'updatedStoryState.inventory' must be an array of item objects. For items, if 'equipSlot' is not applicable it must be omitted.
The 'updatedStoryState.equippedItems' must be an object mapping all 10 slot names to either an item object or null.
The 'updatedStoryState.quests' must be an array of quest objects, each with 'id', 'description', and 'status'.
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
          if (item.equipSlot === null || (item.equipSlot as unknown) === '') { 
            delete (item as Partial<ItemType>).equipSlot;
          }
        });

        output.updatedStoryState.quests = output.updatedStoryState.quests ?? [];
        // Ensure quest IDs are present if AI forgets
        output.updatedStoryState.quests.forEach((quest, index) => {
          if (!quest.id) {
            quest.id = `quest_generated_${Date.now()}_${index}`;
          }
          if (!quest.status) {
            quest.status = 'active'; // Default to active if status is missing
          }
        });

        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts ?? [];

        const defaultEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {
            weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null
        };

        const aiEquipped = output.updatedStoryState.equippedItems || {};
        const newEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {};
        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            newEquippedItems[slotKey] = aiEquipped[slotKey] !== undefined ? aiEquipped[slotKey] : null;
            if (newEquippedItems[slotKey] && (newEquippedItems[slotKey]!.equipSlot === null || (newEquippedItems[slotKey]!.equipSlot as unknown) === '')) {
              delete (newEquippedItems[slotKey] as Partial<ItemType>)!.equipSlot;
            }
        }
        output.updatedStoryState.equippedItems = newEquippedItems as any; // Cast back to expected type
    }
    return output!;
  }
);
