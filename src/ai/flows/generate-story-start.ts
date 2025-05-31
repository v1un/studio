
'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story, including character creation with core stats, mana, level, XP, and initial empty equipment.
 * THIS FLOW IS NOW LARGELY SUPERSEDED BY generateScenarioFromSeries.ts for series-based starts.
 * It can be kept for a more generic, non-series specific start if desired, or removed.
 *
 * - generateStoryStart - A function that generates the initial scene description and story state.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot } from '@/types/story';
import type { Item as ItemType } from '@/types/story';


const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body').");


const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory if any items are pre-assigned (though typically inventory starts empty)."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is equippable, specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If not equippable, omit this field."),
});
export type Item = z.infer<typeof ItemSchemaInternal>;

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Assign 0 if not applicable to the class.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Assign 0 if not applicable.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Affects health. Assign a value between 5 and 15.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory. Affects mana for magic users. Assign a value between 5 and 15.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Affects mana regeneration or spell effectiveness. Assign a value between 5 and 15.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15.'),
  level: z.number().describe('The current level of the character. Initialize to 1.'),
  experiencePoints: z.number().describe('Current experience points. Initialize to 0.'),
  experienceToNextLevel: z.number().describe('Experience points needed to reach the next level. Initialize to a starting value, e.g., 100.'),
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
}).describe("A record of the character's equipped items. Keys are slot names (weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2), values are the item object or null if the slot is empty. Initialize all 10 slots to null.");


const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, and XP.'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of items in the character\'s inventory. Initialize as an empty array: []. Each item must be an object with id, name, description, and optionally equipSlot.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  activeQuests: z.array(z.string()).describe('A list of active quest descriptions. Initialize as an empty array if no quest is generated.'),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. Initialize with one or two relevant facts.'),
});
export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;


const GenerateStoryStartInputSchemaInternal = z.object({
  prompt: z.string().describe('A prompt to kickstart the story (e.g., \'A lone knight enters a dark forest\').'),
  characterNameInput: z.string().optional().describe('Optional user-suggested character name.'),
  characterClassInput: z.string().optional().describe('Optional user-suggested character class.'),
});
export type GenerateStoryStartInput = z.infer<typeof GenerateStoryStartInputSchemaInternal>;

const GenerateStoryStartOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe('The generated initial scene description.'),
  storyState: StructuredStoryStateSchemaInternal.describe('The initial structured state of the story, including character details, stats, level, XP, and empty equipment slots.'),
});
export type GenerateStoryStartOutput = z.infer<typeof GenerateStoryStartOutputSchemaInternal>;

export async function generateStoryStart(input: GenerateStoryStartInput): Promise<GenerateStoryStartOutput> {
  return generateStoryStartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStoryStartPrompt',
  input: {schema: GenerateStoryStartInputSchemaInternal},
  output: {schema: GenerateStoryStartOutputSchemaInternal},
  prompt: `You are a creative storyteller and game master.
The user wants to start a new story with the following theme: "{{prompt}}".

User's character suggestions:
- Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

Based on the theme and any user suggestions, generate the following:
1.  An initial scene description for the story.
2.  A character profile:
    -   Invent a suitable name and class if not provided by the user or if the suggestions are too vague.
    -   Provide a brief backstory or description for the character.
    -   Set initial health and maxHealth (e.g., 100 health, 100 maxHealth).
    -   Set initial mana and maxMana. If the class is not a magic user, set both to 0 or a low symbolic value like 10.
    -   Assign initial values (between 5 and 15, average 10) for the six core stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. These stats should generally align with the character's class.
    -   Initialize the character at \`level\` 1, with 0 \`experiencePoints\`, and set an initial \`experienceToNextLevel\` (e.g., 100).
3.  An initial structured story state, including:
    -   The character profile you just created.
    -   A starting location relevant to the scene.
    -   An empty inventory (initialize as an empty array: []). Any starting items should include an 'id', 'name', 'description', and if equippable, an 'equipSlot' (e.g., 'weapon', 'head', 'body').
    -   Initialize 'equippedItems' as an object with all 10 equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') set to null, as the character starts with nothing equipped.
    -   If appropriate, one simple starting quest in 'activeQuests' array. Otherwise, an empty array.
    -   One or two initial 'worldFacts'.

Your entire response must strictly follow the JSON schema defined for the output.
The 'storyState' must be a JSON object with 'character', 'currentLocation', 'inventory', 'equippedItems', 'activeQuests', and 'worldFacts'.
The 'character' object must have all fields: 'name', 'class', 'description', 'health', 'maxHealth', 'mana', 'maxMana', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'level', 'experiencePoints', 'experienceToNextLevel'.
The 'equippedItems' must be an object with all 10 specified slots initially set to null.
`,
});

const generateStoryStartFlow = ai.defineFlow(
  {
    name: 'generateStoryStartFlow',
    inputSchema: GenerateStoryStartInputSchemaInternal,
    outputSchema: GenerateStoryStartOutputSchemaInternal,
  },
  async input => {
    const {output} = await prompt(input);
    if (output?.storyState.character) {
      const char = output.storyState.character;
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.strength = char.strength ?? 10;
      char.dexterity = char.dexterity ?? 10;
      char.constitution = char.constitution ?? 10;
      char.intelligence = char.intelligence ?? 10;
      char.wisdom = char.wisdom ?? 10;
      char.charisma = char.charisma ?? 10;
      char.level = char.level ?? 1;
      char.experiencePoints = char.experiencePoints ?? 0;
      char.experienceToNextLevel = char.experienceToNextLevel ?? 100;
      if (char.experienceToNextLevel <= 0) char.experienceToNextLevel = 100;
    }
    if (output?.storyState) {
        output.storyState.inventory = output.storyState.inventory ?? [];
        output.storyState.activeQuests = output.storyState.activeQuests ?? [];
        output.storyState.worldFacts = output.storyState.worldFacts ?? [];
        
        const defaultEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {
            weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null
        };
        const aiEquipped = output.storyState.equippedItems || {};
        const newEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {};
        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            newEquippedItems[slotKey] = aiEquipped[slotKey] !== undefined ? aiEquipped[slotKey] : null;
        }
        output.storyState.equippedItems = newEquippedItems;
    }
    return output!;
  }
);
