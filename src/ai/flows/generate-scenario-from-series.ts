
'use server';

/**
 * @fileOverview A Genkit flow for generating an initial game scenario based on a real-life series.
 * This includes the starting scene, character state (potentially based on user input for name/class),
 * initial inventory, quests (with objectives, categories, but no rewards initially), world facts,
 * a set of pre-populated lorebook entries relevant to the series, and a brief series style guide.
 * This flow uses a multi-step generation process.
 *
 * - generateScenarioFromSeries - Function to generate the scenario.
 * - GenerateScenarioFromSeriesInput - Input type (series name, optional character name/class).
 * - GenerateScenarioFromSeriesOutput - Output type (scene, story state, initial lore, style guide).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot, RawLoreEntry, Item as ItemType, Quest as QuestType, QuestObjective as QuestObjectiveType, QuestRewards as QuestRewardsType } from '@/types/story';

// --- Schemas for AI communication (Internal, consistent with types/story.ts) ---
const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory/equipment."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the main character, appropriate for the series. This might be an existing character or an original character fitting the series, based on user input if provided.'),
  class: z.string().describe('The class, role, or archetype of the character within the series (e.g., "Shinobi", "Alchemist", "Keyblade Wielder"), based on user input if provided.'),
  description: z.string().describe('A brief backstory or description of the character, consistent with the series lore and their starting situation. If it is an Original Character (OC), explain their place or origin within the series.'),
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

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should be false for initial quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded.")
}).describe("Rewards for completing the quest. This field should be omitted for initial quests as they are not yet completed.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_series_main_001'."),
  description: z.string().describe("A clear description of the quest's overall objective, fitting the series."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Introduction', 'Personal Goal'). Omit if not clearly classifiable or if not applicable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional().describe("Optional rewards. For initial quests with 'active' status, this field MUST be omitted.")
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string().describe('A specific starting location from the series relevant to the initial scene.'),
  inventory: z.array(ItemSchemaInternal).describe('Initial unequipped items relevant to the character and series. Each item must have id, name, description. If the item is an inherently equippable piece of gear, include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED. Can be empty.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("One or two initial quests that fit the series and starting scenario. Each quest is an object with id, description, status set to 'active', and optionally 'category' and 'objectives' (with 'isCompleted: false'). The 'rewards' field must be omitted for these initial quests. Quests should be compelling and provide clear direction."),
  worldFacts: z.array(z.string()).describe('A few (3-5) key world facts from the series relevant to the start of the story, particularly those that impact the character or the immediate situation.'),
});

const RawLoreEntrySchemaInternal = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept'). If no category is applicable or known, this field should be omitted entirely."),
});

// --- Input/Output Schemas for the main exported flow ---
const GenerateScenarioFromSeriesInputSchema = z.object({
  seriesName: z.string().describe('The name of the real-life series (e.g., "Naruto", "Re:Zero", "Death Note", "RWBY").'),
  characterNameInput: z.string().optional().describe("Optional user-suggested character name (can be an existing character from the series or a new one)."),
  characterClassInput: z.string().optional().describe("Optional user-suggested character class or role."),
});
export type GenerateScenarioFromSeriesInput = z.infer<typeof GenerateScenarioFromSeriesInputSchema>;

const GenerateScenarioFromSeriesOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe('The engaging and detailed initial scene description that sets up the story in the chosen series, taking into account any specified character.'),
  storyState: StructuredStoryStateSchemaInternal.describe('The complete initial structured state of the story, meticulously tailored to the series and specified character (if any).'),
  initialLoreEntries: z.array(RawLoreEntrySchemaInternal).describe('An array of 6-8 key lore entries (characters, locations, concepts, items, etc.) from the series to pre-populate the lorebook. Ensure content is accurate to the series and relevant to the starting scenario and character.'),
  seriesStyleGuide: z.string().optional().describe("A very brief (2-3 sentences) summary of the key themes, tone, or unique aspects of the series (e.g., 'magical high school, friendship, fighting demons' or 'gritty cyberpunk, corporate espionage, body modification') to help guide future scene generation. If no strong, distinct style is easily summarized, this can be omitted."),
});
export type GenerateScenarioFromSeriesOutput = z.infer<typeof GenerateScenarioFromSeriesOutputSchemaInternal>;


// --- Prompts for Multi-Step Generation ---

// STEP 1: Generate Core Scenario (scene, story state excluding lore/style guide)
const coreScenarioPrompt = ai.definePrompt({
  name: 'generateCoreScenarioPrompt',
  input: { schema: GenerateScenarioFromSeriesInputSchema },
  output: {
    schema: z.object({
      sceneDescription: GenerateScenarioFromSeriesOutputSchemaInternal.shape.sceneDescription,
      storyState: StructuredStoryStateSchemaInternal,
    }),
  },
  prompt: `You are a master storyteller and game designer, tasked with creating an immersive and detailed starting scenario for an interactive text adventure based on the series: "{{seriesName}}".
User's character preferences:
- Preferred Character Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Preferred Character Class/Role: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

Your goal is to generate ONLY the following two things:
1.  An engaging, vivid, and detailed initial 'sceneDescription' that drops the player right into the world of "{{seriesName}}". This scene should be tailored to the character being generated.
2.  A complete 'storyState' object, meticulously tailored to the "{{seriesName}}" universe and the character. This 'storyState' object MUST contain:
    *   'character':
        - If 'characterNameInput' is provided and you recognize it as an existing character from "{{seriesName}}", generate the profile for *that specific character*. Their class, description, stats, and starting items should be authentic to them at a plausible starting point in their story.
        - If 'characterNameInput' suggests an Original Character (OC), or if only 'characterClassInput' is provided, create a new character fitting that name/class. Their 'description' must explain their place or origin within the "{{seriesName}}" universe and how they fit into the initial scene.
        - If no character preferences are given, create a compelling character (existing or new) suitable for "{{seriesName}}".
        - Ensure all character stats are set (strength, dexterity, constitution, intelligence, wisdom, charisma, typically 5-15), mana fields are numbers (0 if not applicable), level is 1, XP is 0, and experienceToNextLevel is a reasonable starting value (e.g., 100).
    *   'currentLocation': A specific, recognizable, and richly described starting location from "{{seriesName}}" relevant to the character and scene.
    *   'inventory': An array of 0-3 initial unequipped 'Item' objects. Each item must have a unique 'id', 'name', and 'description'. **If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include its 'equipSlot'. If it's not an equippable type of item (e.g., a potion, a key, a generic diary/book), the 'equipSlot' field MUST BE OMITTED ENTIRELY.** Items should be logical for the character.
    *   'equippedItems': An object explicitly mapping all 10 equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') to an 'Item' object or null. **If an item is placed in an equipment slot, it must be an inherently equippable type of item and have its 'equipSlot' property correctly defined.** This should be consistent with the scene description (e.g., if the character is described holding a weapon, it should be equipped).
    *   'quests': An array containing one or two initial quest objects. Each quest object must have a unique 'id' (e.g., 'quest_{{seriesName}}_start_01'), a 'description' (string) that is compelling and fits the series lore and character, and 'status' set to 'active'. Optionally, assign a 'category' (e.g., "Main Story", "Introduction", "Side Quest", "Personal Goal") – if no category is clear or applicable, omit the 'category' field. For added depth, if a quest is complex, provide an array of 'objectives', each with a 'description' and 'isCompleted: false'. If objectives are not needed, omit the 'objectives' array. **The 'rewards' field for these initial 'active' quests MUST be omitted.** These quests should provide clear initial direction.
    *   'worldFacts': An array of 3-5 key 'worldFacts' (strings) about the "{{seriesName}}" universe, particularly those relevant to the character's starting situation or the immediate environment.

**Crucially:** Ensure absolute consistency between the 'sceneDescription' and the 'storyState'. If the narrative mentions the character holding, wearing, or finding an item, it MUST be reflected in 'storyState.equippedItems' or 'storyState.inventory' with all required properties (id, name, description, and 'equipSlot' if it's equippable gear, otherwise 'equipSlot' omitted).

DO NOT generate 'initialLoreEntries' or 'seriesStyleGuide' in THIS step.
The entire response for this step must strictly follow the JSON schema for the 'sceneDescription' and 'storyState' output. Make sure all IDs for items and quests are unique.
Optional fields like 'mana', 'maxMana', or character stats should be numbers (e.g., 0 for mana if not applicable). For optional string fields like 'Item.equipSlot' or 'Quest.category', omit the field if not applicable.
`,
});

// STEP 2: Generate Lore Entries
const LoreGenerationInputSchema = z.object({
  seriesName: z.string(),
  characterName: z.string(),
  characterClass: z.string(),
  sceneDescription: z.string(),
  characterDescription: z.string(),
});
const loreEntriesPrompt = ai.definePrompt({
  name: 'generateLoreEntriesPrompt',
  input: { schema: LoreGenerationInputSchema },
  output: { schema: z.array(RawLoreEntrySchemaInternal) },
  prompt: `You are a lore master for the series "{{seriesName}}".
Context: The story begins with a character named "{{characterName}}", a "{{characterClass}}".
Initial Scene: {{sceneDescription}}
Character Background: {{characterDescription}}

Based on this, generate 6-8 key lore entries. Each entry should be an object with 'keyword', 'content', and an optional 'category'. If 'category' is not applicable for a lore entry, omit the field.
The lore should be highly relevant to the character's starting situation and the "{{seriesName}}" universe.
Output ONLY the JSON array of lore entries, strictly adhering to the schema.
Example: [{"keyword": "Magic Wand", "content": "A basic tool for beginner mages.", "category": "Item"}]`,
});

// STEP 3: Generate Series Style Guide
const StyleGuideInputSchema = z.object({
  seriesName: z.string(),
});
const styleGuidePrompt = ai.definePrompt({
  name: 'generateSeriesStyleGuidePrompt',
  input: { schema: StyleGuideInputSchema },
  output: { schema: z.string().nullable() }, // Allow AI to output null if no guide is generated
  prompt: `You are a literary analyst. For the series "{{seriesName}}", provide a very brief (2-3 sentences) summary of its key themes, tone, or unique narrative aspects. This will serve as a style guide.
If the series is very obscure or a distinct style is hard to summarize concisely, you MUST output an empty string (\`""\`). DO NOT output null.
Output ONLY the style guide string.`,
});

// --- Main Exported Flow ---
export async function generateScenarioFromSeries(input: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> {
  return generateScenarioFromSeriesFlow(input);
}

const generateScenarioFromSeriesFlow = ai.defineFlow(
  {
    name: 'generateScenarioFromSeriesFlow',
    inputSchema: GenerateScenarioFromSeriesInputSchema,
    outputSchema: GenerateScenarioFromSeriesOutputSchemaInternal,
  },
  async (input: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> => {
    // Step 1: Generate core scenario and character
    const { output: coreOutput } = await coreScenarioPrompt(input);
    if (!coreOutput || !coreOutput.sceneDescription || !coreOutput.storyState) {
      console.error("Core scenario generation failed or returned unexpected structure:", coreOutput);
      throw new Error('Failed to generate core scenario data.');
    }

    // Step 2: Generate lore entries
    const loreInput: z.infer<typeof LoreGenerationInputSchema> = {
      seriesName: input.seriesName,
      characterName: coreOutput.storyState.character.name,
      characterClass: coreOutput.storyState.character.class,
      sceneDescription: coreOutput.sceneDescription,
      characterDescription: coreOutput.storyState.character.description,
    };
    const { output: loreEntries } = await loreEntriesPrompt(loreInput);

    // Step 3: Generate series style guide
    const { output: styleGuideRaw } = await styleGuidePrompt({ seriesName: input.seriesName }); // Can be string | null

    // Assemble the final output
    let finalOutput: GenerateScenarioFromSeriesOutput = {
      sceneDescription: coreOutput.sceneDescription,
      storyState: coreOutput.storyState,
      initialLoreEntries: loreEntries || [],
      seriesStyleGuide: styleGuideRaw === null ? undefined : styleGuideRaw, // Convert null to undefined
    };

    // --- Post-processing ---
    if (finalOutput.storyState.character) {
      const char = finalOutput.storyState.character;
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

    if (finalOutput.storyState) {
      finalOutput.storyState.inventory = finalOutput.storyState.inventory ?? [];
      finalOutput.storyState.inventory.forEach(item => {
        if (!item.id) {
            item.id = `item_generated_inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
        if (item.equipSlot === null || (item.equipSlot as unknown) === '') {
          delete (item as Partial<ItemType>).equipSlot;
        }
      });

      finalOutput.storyState.quests = finalOutput.storyState.quests ?? [];
      finalOutput.storyState.quests.forEach((quest, index) => {
        if (!quest.id) {
          quest.id = `quest_series_generated_${Date.now()}_${index}`;
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
        delete (quest as Partial<QuestType>).rewards; // Initial quests should not have rewards
      });

      finalOutput.storyState.worldFacts = finalOutput.storyState.worldFacts ?? [];
      finalOutput.storyState.worldFacts = finalOutput.storyState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');

      const defaultEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {
          weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null
      };
      const aiEquipped = finalOutput.storyState.equippedItems || {};
      const newEquippedItems: Partial<Record<EquipmentSlot, ItemType | null>> = {};
      for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
          newEquippedItems[slotKey] = aiEquipped[slotKey] !== undefined ? aiEquipped[slotKey] : null;
          if (newEquippedItems[slotKey]) {
             if (!newEquippedItems[slotKey]!.id) {
                newEquippedItems[slotKey]!.id = `item_generated_equip_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            }
            if (newEquippedItems[slotKey]!.equipSlot === null || (newEquippedItems[slotKey]!.equipSlot as unknown) === '') {
              delete (newEquippedItems[slotKey] as Partial<ItemType>)!.equipSlot;
            }
          }
      }
      finalOutput.storyState.equippedItems = newEquippedItems as any;
    }

    if (finalOutput.initialLoreEntries) {
        finalOutput.initialLoreEntries.forEach(entry => {
            if (entry.category === null || (entry.category as unknown) === '') {
                delete (entry as Partial<RawLoreEntry>).category;
            }
        });
    }
    
    // Ensure seriesStyleGuide is omitted if it's an empty string or was originally null (now undefined)
    if (finalOutput.seriesStyleGuide === '' || finalOutput.seriesStyleGuide === undefined) {
        delete finalOutput.seriesStyleGuide;
    }

    return finalOutput;
  }
);

