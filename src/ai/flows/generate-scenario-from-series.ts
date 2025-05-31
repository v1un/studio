
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
const EquipSlotEnum = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body').");

const ItemSchema = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory/equipment."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnum.optional().describe("If the item is equippable, specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If not equippable, omit this field."),
});

const CharacterProfileSchema = z.object({
  name: z.string().describe('The name of the main character, appropriate for the series. This might be an existing character or an original character fitting the series.'),
  class: z.string().describe('The class, role, or archetype of the character within the series (e.g., "Shinobi", "Alchemist", "Keyblade Wielder").'),
  description: z.string().describe('A brief backstory or description of the character, consistent with the series lore and their starting situation.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or energy points (e.g., Chakra, Reiatsu, Magic Points). Assign 0 if not applicable.'),
  maxMana: z.number().optional().describe('Maximum mana or energy points. Assign 0 if not applicable.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, fitting for the character type.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Assign a value between 5 and 15.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and knowledge. Assign a value between 5 and 15.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Assign a value between 5 and 15.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15.'),
  level: z.number().describe('Initialize to 1.'),
  experiencePoints: z.number().describe('Initialize to 0.'),
  experienceToNextLevel: z.number().describe('Initialize to a starting value, e.g., 100.'),
});

const EquipmentSlotsSchema = z.record(z.nativeEnum(Object.values({
  Weapon: 'weapon', Shield: 'shield', Head: 'head', Body: 'body', Legs: 'legs', Feet: 'feet', Hands: 'hands', Neck: 'neck', Ring1: 'ring1', Ring2: 'ring2',
} as const satisfies Record<string, EquipmentSlot>)), ItemSchema.nullable())
  .describe("Character's equipped items. Initialize with null or series-appropriate starting gear.");

const StructuredStoryStateSchema = z.object({
  character: CharacterProfileSchema,
  currentLocation: z.string().describe('A specific starting location from the series relevant to the initial scene.'),
  inventory: z.array(ItemSchema).describe('Initial unequipped items relevant to the character and series. Each item must have id, name, description, and optionally equipSlot. Can be empty.'),
  equippedItems: EquipmentSlotsSchema,
  activeQuests: z.array(z.string()).describe('One or two initial quest descriptions that fit the series and starting scenario.'),
  worldFacts: z.array(z.string()).describe('A few (2-3) key world facts from the series relevant to the start of the story.'),
});

const RawLoreEntrySchema = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept')."),
});

// Input and Output Schemas for this new flow
const GenerateScenarioFromSeriesInputSchema = z.object({
  seriesName: z.string().describe('The name of the real-life series (e.g., "Naruto", "Re:Zero", "Death Note", "RWBY").'),
});
export type GenerateScenarioFromSeriesInput = z.infer<typeof GenerateScenarioFromSeriesInputSchema>;

const GenerateScenarioFromSeriesOutputSchema = z.object({
  sceneDescription: z.string().describe('The engaging initial scene description that sets up the story in the chosen series.'),
  storyState: StructuredStoryStateSchema.describe('The complete initial structured state of the story, tailored to the series.'),
  initialLoreEntries: z.array(RawLoreEntrySchema).describe('An array of 5-10 key lore entries (characters, locations, concepts) from the series to pre-populate the lorebook. Ensure content is accurate to the series.'),
});
export type GenerateScenarioFromSeriesOutput = z.infer<typeof GenerateScenarioFromSeriesOutputSchema>;


export async function generateScenarioFromSeries(input: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> {
  return generateScenarioFromSeriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScenarioFromSeriesPrompt',
  input: {schema: GenerateScenarioFromSeriesInputSchema},
  output: {schema: GenerateScenarioFromSeriesOutputSchema},
  prompt: `You are a master storyteller and game designer, tasked with creating an immersive starting scenario for an interactive text adventure based on the series: "{{seriesName}}".

Your goal is to generate:
1.  An engaging initial 'sceneDescription' that drops the player right into the world of "{{seriesName}}". Make it vivid and intriguing.
2.  A complete 'storyState' object, meticulously tailored to the "{{seriesName}}" universe:
    *   'character':
        *   Create a compelling protagonist. This could be an existing key character from the series if appropriate for a player to embody from the start (e.g., Naruto Uzumaki at the beginning of his journey), or an original character that fits seamlessly into the series' world and the generated scenario.
        *   Define their 'name', 'class' (e.g., "Shinobi", "Soul Reaper", "Student at Beacon"), and a 'description' providing a brief backstory relevant to the starting scene and series.
        *   Set initial 'health', 'maxHealth'.
        *   Set 'mana', 'maxMana' (or equivalent series-specific energy like Chakra, Reiatsu, Aura), ensuring it's 0 if not applicable.
        *   Assign appropriate initial values (between 5-15) for all six core stats: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma, reflecting the character's archetype in "{{seriesName}}".
        *   Initialize 'level' to 1, 'experiencePoints' to 0, and 'experienceToNextLevel' to 100.
    *   'currentLocation': A specific, recognizable starting location from "{{seriesName}}" that matches the 'sceneDescription'.
    *   'inventory': An array of 0-3 initial unequipped 'Item' objects (each with unique 'id', 'name', 'description', and optional 'equipSlot') that the character would realistically possess at the start of this scenario in "{{seriesName}}".
    *   'equippedItems': An object mapping all equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') to either an 'Item' object (if they start with something equipped, consistent with the series) or null. Often, characters start with minimal or no equipment.
    *   'activeQuests': An array containing one or two initial quest descriptions (strings) that are compelling, fit the "{{seriesName}}" lore, and are relevant to the starting 'sceneDescription'.
    *   'worldFacts': An array of 2-4 key 'worldFacts' (strings) about the "{{seriesName}}" universe that are immediately relevant or provide crucial context for the player at the start.
3.  A list of 5-7 'initialLoreEntries' to pre-populate the game's lorebook. Each entry should be an object with:
    *   'keyword': A significant term, character name, location, or concept from "{{seriesName}}" (e.g., for Naruto: 'Konohagakure', 'Nine-Tails', 'Sharingan'; for Re:Zero: 'Return by Death', 'Roswaal L Mathers', 'Witch Cult').
    *   'content': A concise (2-3 sentences) and accurate description of the keyword according to "{{seriesName}}" lore.
    *   'category': (Optional) e.g., 'Character', 'Location', 'Ability', 'Organization'.

Ensure all generated content is faithful to the tone, style, and established lore of "{{seriesName}}".
The entire response must strictly follow the JSON schema for the output.
Make sure all IDs for items are unique.
`,
});

const generateScenarioFromSeriesFlow = ai.defineFlow(
  {
    name: 'generateScenarioFromSeriesFlow',
    inputSchema: GenerateScenarioFromSeriesInputSchema,
    outputSchema: GenerateScenarioFromSeriesOutputSchema,
  },
  async (input: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> => {
    const {output} = await prompt(input);

    // Ensure default values for character stats if AI misses any optional ones
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

    // Ensure inventory, activeQuests, worldFacts are at least empty arrays
    if (output?.storyState) {
      output.storyState.inventory = output.storyState.inventory ?? [];
      output.storyState.activeQuests = output.storyState.activeQuests ?? [];
      output.storyState.worldFacts = output.storyState.worldFacts ?? [];
      
      // Ensure equippedItems is initialized correctly with all slots
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
    
    // Ensure initialLoreEntries is at least an empty array
    if (output) {
        output.initialLoreEntries = output.initialLoreEntries ?? [];
    }

    return output!;
  }
);
