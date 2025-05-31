
'use server';

/**
 * @fileOverview A Genkit flow for generating an initial game scenario based on a real-life series.
 * This includes the starting scene, character state, initial inventory, quests, world facts,
 * and a set of pre-populated lorebook entries relevant to the series.
 *
 * - generateScenarioFromSeries - Function to generate the scenario.
 * - GenerateScenarioFromSeriesInput - Input type (series name).
 * - GenerateScenarioFromSeriesOutput - Output type (scene, story state, initial lore).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot, RawLoreEntry } from '@/types/story';
import type { Item as ItemType } from '@/types/story'; // Ensure all necessary types are imported

// Schemas from generate-story-start.ts, potentially refactor to a shared location later
const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory/equipment."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is equippable, specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If not equippable, this field should be omitted."),
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the main character, appropriate for the series. This might be an existing character or an original character fitting the series.'),
  class: z.string().describe('The class, role, or archetype of the character within the series (e.g., "Shinobi", "Alchemist", "Keyblade Wielder").'),
  description: z.string().describe('A brief backstory or description of the character, consistent with the series lore and their starting situation.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or energy points (e.g., Chakra, Reiatsu, Magic Points). Assign 0 if not applicable, or omit if truly not part of the character concept.'),
  maxMana: z.number().optional().describe('Maximum mana or energy points. Assign 0 if not applicable, or omit.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, fitting for the character type, or omit.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Assign a value between 5 and 15, or omit.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and knowledge. Assign a value between 5 and 15, or omit.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Assign a value between 5 and 15, or omit.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit.'),
  level: z.number().describe('Initialize to 1.'),
  experiencePoints: z.number().describe('Initialize to 0.'),
  experienceToNextLevel: z.number().describe('Initialize to a starting value, e.g., 100.'),
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
}).describe("Character's equipped items. Initialize with null or series-appropriate starting gear. All 10 slots should be represented, with 'null' for empty ones. This object MUST contain all 10 slot keys.");


const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string().describe('A specific starting location from the series relevant to the initial scene.'),
  inventory: z.array(ItemSchemaInternal).describe('Initial unequipped items relevant to the character and series. Each item must have id, name, description. If equippable, include equipSlot; otherwise, omit equipSlot. Can be empty.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  activeQuests: z.array(z.string()).describe('One or two initial quest descriptions that fit the series and starting scenario.'),
  worldFacts: z.array(z.string()).describe('A few (2-3) key world facts from the series relevant to the start of the story.'),
});

const RawLoreEntrySchemaInternal = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept'). If no category is applicable or known, this field should be omitted."),
});

// Input and Output Schemas for this new flow
const GenerateScenarioFromSeriesInputSchema = z.object({
  seriesName: z.string().describe('The name of the real-life series (e.g., "Naruto", "Re:Zero", "Death Note", "RWBY").'),
});
export type GenerateScenarioFromSeriesInput = z.infer<typeof GenerateScenarioFromSeriesInputSchema>;

const GenerateScenarioFromSeriesOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe('The engaging initial scene description that sets up the story in the chosen series.'),
  storyState: StructuredStoryStateSchemaInternal.describe('The complete initial structured state of the story, tailored to the series.'),
  initialLoreEntries: z.array(RawLoreEntrySchemaInternal).describe('An array of 5-7 key lore entries (characters, locations, concepts) from the series to pre-populate the lorebook. Ensure content is accurate to the series.'),
});
export type GenerateScenarioFromSeriesOutput = z.infer<typeof GenerateScenarioFromSeriesOutputSchemaInternal>;


export async function generateScenarioFromSeries(input: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> {
  return generateScenarioFromSeriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScenarioFromSeriesPrompt',
  input: {schema: GenerateScenarioFromSeriesInputSchema},
  output: {schema: GenerateScenarioFromSeriesOutputSchemaInternal},
  prompt: `You are a master storyteller and game designer, tasked with creating an immersive starting scenario for an interactive text adventure based on the series: "{{seriesName}}".

Your goal is to generate:
1.  An engaging initial 'sceneDescription' that drops the player right into the world of "{{seriesName}}". Make it vivid and intriguing.
2.  A complete 'storyState' object, meticulously tailored to the "{{seriesName}}" universe:
    *   'character':
        *   Create a compelling protagonist. This could be an existing key character from the series if appropriate for a player to embody from the start (e.g., Naruto Uzumaki at the beginning of his journey), or an original character that fits seamlessly into the series' world and the generated scenario.
        *   Define their 'name', 'class' (e.g., "Shinobi", "Soul Reaper", "Student at Beacon"), and a 'description' providing a brief backstory relevant to the starting scene and series.
        *   Set initial 'health', 'maxHealth'.
        *   Set 'mana', 'maxMana'. These fields must be numbers. If the character concept doesn't use mana, set both to 0. Do not use 'null' or omit if the character type typically has mana, even if starting at 0.
        *   Assign appropriate initial values (between 5-15) for all six core stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma, reflecting the character's archetype in "{{seriesName}}". If a stat is not particularly relevant, you can provide a default like 10, or omit it if the schema allows (check .optional()). These must be numbers if provided.
        *   Initialize 'level' to 1, 'experiencePoints' to 0, and 'experienceToNextLevel' to 100.
    *   'currentLocation': A specific, recognizable starting location from "{{seriesName}}" that matches the 'sceneDescription'.
    *   'inventory': An array of 0-3 initial unequipped 'Item' objects. Each item must have a unique 'id', 'name', and 'description'. If the item is equippable, include its 'equipSlot' (e.g., 'weapon', 'head'). If it's not equippable, the 'equipSlot' field must be omitted entirely.
    *   'equippedItems': An object explicitly mapping all 10 equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') to either an 'Item' object (if they start with something equipped, consistent with the series) or null if the slot is empty.
    *   'activeQuests': An array containing one or two initial quest descriptions (strings) that are compelling, fit the "{{seriesName}}" lore, and are relevant to the starting 'sceneDescription'.
    *   'worldFacts': An array of 2-4 key 'worldFacts' (strings) about the "{{seriesName}}" universe that are immediately relevant or provide crucial context for the player at the start.
3.  A list of 5-7 'initialLoreEntries' to pre-populate the game's lorebook. Each entry should be an object with:
    *   'keyword': A significant term, character name, location, or concept from "{{seriesName}}".
    *   'content': A concise (2-3 sentences) and accurate description of the keyword according to "{{seriesName}}" lore.
    *   'category': (Optional) e.g., 'Character', 'Location', 'Ability', 'Organization'. If no specific category is applicable or known, the 'category' field should be omitted entirely, not set to null.

**Crucially:** If the \`sceneDescription\` mentions the character starting with a specific item in hand (like a weapon) or wearing a piece of gear, ensure that item is properly defined as an \`Item\` object (with a unique 'id', 'name', 'description', and 'equipSlot' if applicable) and placed in the correct slot within \`storyState.equippedItems\`. If the item is merely nearby or just found, it should be in \`storyState.inventory\`. For items in inventory, if they are not equippable, omit the 'equipSlot' field. Be consistent between the narrative and the structured state.

Ensure all generated content is faithful to the tone, style, and established lore of "{{seriesName}}".
The entire response must strictly follow the JSON schema for the output.
Make sure all IDs for items are unique.
The 'equippedItems' object in 'storyState' must include all 10 slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'), with 'null' for any empty slots.
Optional fields like 'mana', 'maxMana', or character stats should be numbers (e.g., 0 for mana if not applicable) if provided, or omitted if appropriate and allowed by the schema. Do not use 'null' for fields expecting numbers or strings unless the schema explicitly allows for 'nullable' types. For optional string fields like 'Item.equipSlot' or 'RawLoreEntry.category', omit the field if not applicable.
`,
});

const generateScenarioFromSeriesFlow = ai.defineFlow(
  {
    name: 'generateScenarioFromSeriesFlow',
    inputSchema: GenerateScenarioFromSeriesInputSchema,
    outputSchema: GenerateScenarioFromSeriesOutputSchemaInternal,
  },
  async (input: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> => {
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
      output.storyState.inventory.forEach(item => {
        if (item.equipSlot === null) {
          delete (item as Partial<ItemType>).equipSlot;
        }
      });
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
      output.storyState.equippedItems = newEquippedItems as any; // Cast as any due to dynamic nature from AI
    }
    
    if (output?.initialLoreEntries) {
        output.initialLoreEntries = output.initialLoreEntries ?? [];
        output.initialLoreEntries.forEach(entry => {
            if (entry.category === null) {
                delete (entry as Partial<RawLoreEntry>).category;
            }
        });
    } else if (output) {
        output.initialLoreEntries = [];
    }

    return output!;
  }
);

