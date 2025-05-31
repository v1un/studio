
'use server';

/**
 * @fileOverview A Genkit flow for generating an initial game scenario based on a real-life series.
 * This includes the starting scene, character state (potentially based on user input for name/class),
 * initial inventory, quests (with objectives, categories, and pre-defined rewards), world facts,
 * a set of pre-populated lorebook entries relevant to the series, a brief series style guide,
 * initial profiles for any NPCs introduced in the starting scene or known major characters from the series,
 * and starting skills/abilities for the character.
 * This flow uses a multi-step generation process to manage complexity.
 *
 * - generateScenarioFromSeries - Function to generate the scenario.
 * - GenerateScenarioFromSeriesInput - Input type (series name, optional character name/class).
 * - GenerateScenarioFromSeriesOutput - Output type (scene, story state, initial lore, style guide).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { EquipmentSlot, RawLoreEntry, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, Skill as SkillType } from '@/types/story';

// --- Schemas for AI communication (Internal, consistent with types/story.ts) ---
const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body', 'ring').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory/equipment/rewards."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_fireball_001'."),
    name: z.string().describe("The name of the skill or ability."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or basic effect."),
    type: z.string().describe("A category for the skill, e.g., 'Combat Ability', 'Utility Skill', 'Passive Trait', or a series-specific type like 'Ninjutsu Technique', 'Semblance'.")
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
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 2-3 starting skills, unique abilities, or passive traits appropriate for the character's class and the series. These should be thematically fitting and provide a starting flavor for the character's capabilities. Each skill requires an id, name, description, and type. For characters known for signature, fate-altering abilities (e.g., Subaru's 'Return by Death' in Re:Zero), ensure such an ability is included if appropriate for the specified character name/class and series."),
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
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable to reward items.")
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_series_main_001'."),
  description: z.string().describe("A clear description of the quest's overall objective, fitting the series."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Introduction', 'Personal Goal'). Omit if not clearly classifiable or if not applicable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional()
});

const NPCRelationshipStatusEnumInternal = z.enum(['Friendly', 'Neutral', 'Hostile', 'Allied', 'Cautious', 'Unknown']);
const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional().describe("The player's input that led to the NPC's response, if applicable. This helps track the conversation flow."),
    npcResponse: z.string().describe("The NPC's spoken dialogue or a summary of their significant verbal response."),
    turnId: z.string().describe("The ID of the story turn in which this dialogue occurred."),
});
const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_series_charactername_001."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics, fitting the series."),
    classOrRole: z.string().optional().describe("e.g., 'Hokage', 'Soul Reaper Captain', 'Keyblade Master'."),
    firstEncounteredLocation: z.string().optional().describe("Location from the series where NPC is introduced, their typical location if pre-populated, or a general description like 'Known from series lore' if not a specific place."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met (use 'initial_turn_0' for all NPCs known at game start)."),
    relationshipStatus: NPCRelationshipStatusEnumInternal.describe("Player's initial relationship with the NPC (e.g., 'Neutral', 'Unknown', or specific to series context)."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player would know initially about this NPC based on the series, or empty if an OC. If this NPC is pre-populated and not directly in the scene, these facts should reflect general world knowledge/rumors, NOT direct player character knowledge from interaction."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Should be empty or omitted for initial scenario."),
    lastKnownLocation: z.string().optional().describe("Same as firstEncounteredLocation for initial setup if not directly in scene, or their current canonical location if different. If in scene, this is the current location."),
    lastSeenTurnId: z.string().optional().describe("Same as firstEncounteredTurnId for initial setup (use 'initial_turn_0')."),
    seriesContextNotes: z.string().optional().describe("Brief AI-internal note about their canon role/importance if an existing series character."),
    updatedAt: z.string().optional().describe("Timestamp of the last update (set to current time for new)."),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string().describe('A specific starting location from the series relevant to the initial scene.'),
  inventory: z.array(ItemSchemaInternal).describe('Initial unequipped items relevant to the character and series. Each item must have id, name, description. If the item is an inherently equippable piece of gear, include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED. Can be empty. For consumable items, set `isConsumable: true` and provide `effectDescription`. For quest items, set `isQuestItem: true` and `relevantQuestId`.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("One or two initial quests that fit the series and starting scenario. Each quest is an object with id, description, status set to 'active', and optionally 'category', 'objectives' (with 'isCompleted: false'), and 'rewards' (which specify what the player will get on completion, including item details like `isConsumable`). These quests should be compelling and provide clear direction."),
  worldFacts: z.array(z.string()).describe('A few (3-5) key world facts from the series relevant to the start of the story, particularly those that impact the character or the immediate situation.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of significant NPCs. This MUST include profiles for any NPCs directly introduced in the 'sceneDescription'. Additionally, you MAY include profiles for 2-4 other major, well-known characters from the '{{seriesName}}' universe that the player character might know about or who are highly relevant to the series context, even if not in the immediate first scene. For all NPCs, ensure each profile has a unique 'id', 'name', 'description', 'relationshipStatus', 'firstEncounteredLocation' (their canonical location if not in scene), 'firstEncounteredTurnId' (use 'initial_turn_0' for all NPCs known at game start), 'knownFacts' (general world knowledge if not in scene), and optionally 'seriesContextNotes'. Dialogue history should be empty.")
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
  storyState: StructuredStoryStateSchemaInternal.describe('The complete initial structured state of the story, meticulously tailored to the series and specified character (if any). Includes initial NPC profiles in trackedNPCs and starting skills/abilities for the character.'),
  initialLoreEntries: z.array(RawLoreEntrySchemaInternal).describe('An array of 6-8 key lore entries (characters, locations, concepts, items, etc.) from the series to pre-populate the lorebook. Ensure content is accurate to the series and relevant to the starting scenario and character.'),
  seriesStyleGuide: z.string().optional().describe("A very brief (2-3 sentences) summary of the key themes, tone, or unique aspects of the series (e.g., 'magical high school, friendship, fighting demons' or 'gritty cyberpunk, corporate espionage, body modification') to help guide future scene generation. If no strong, distinct style is easily summarized, this can be omitted."),
});
export type GenerateScenarioFromSeriesOutput = z.infer<typeof GenerateScenarioFromSeriesOutputSchemaInternal>;


// --- Prompts for Multi-Step Generation ---

// STEP 1: Character, Scene, Location, Skills
const CharacterAndSceneInputSchema = GenerateScenarioFromSeriesInputSchema;
const CharacterAndSceneOutputSchema = z.object({
    sceneDescription: GenerateScenarioFromSeriesOutputSchemaInternal.shape.sceneDescription,
    character: CharacterProfileSchemaInternal,
    currentLocation: StructuredStoryStateSchemaInternal.shape.currentLocation,
});
const characterAndScenePrompt = ai.definePrompt({
  name: 'characterAndScenePrompt',
  input: { schema: CharacterAndSceneInputSchema },
  output: { schema: CharacterAndSceneOutputSchema },
  prompt: `You are a master storyteller setting up an interactive text adventure in the series: "{{seriesName}}".
User's character preferences:
- Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Class/Role: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

Generate ONLY:
1.  'sceneDescription': A vivid initial scene.
2.  'character': A full character profile.
    - If 'characterNameInput' is a known character, create them authentically.
    - If it's an OC, or only 'characterClassInput' is given, create a fitting new character. Explain their place in the series.
    - If no input, create a compelling character for "{{seriesName}}".
    - Ensure stats (5-15), mana (0 if not applicable), level 1, 0 XP, XPToNextLevel (e.g., 100).
    - Include 'skillsAndAbilities': an array of 2-3 starting skills, unique abilities, or passive traits. Each skill needs an 'id' (unique, e.g., "skill_[name]_001"), 'name', 'description' (what it does narratively/mechanically), and a 'type' (e.g., "Combat Ability", "Utility Skill", "Passive Trait", or a series-specific type like "Ninjutsu Technique" or "Semblance") appropriate for the character's class and "{{seriesName}}".
    - **Crucially**: If the series is "{{seriesName}}" and the character being generated is known for a signature, fate-altering ability (e.g., for "Re:Zero" and a character like Subaru, this would be "Return by Death"; for other series, it might be a unique superpower or prophetic vision), ensure this ability is included in 'skillsAndAbilities' with a fitting name, detailed description of its effects and narrative implications, and an appropriate type like "Unique Ability" or "Cursed Power".
3.  'currentLocation': A specific, recognizable starting location from "{{seriesName}}" relevant to the character and scene.
Adhere strictly to the JSON schema. Ensure skill IDs are unique.`,
});

// STEP 2: Initial Inventory, Equipment, World Facts
const InitialItemsAndFactsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal,
    sceneDescription: z.string(),
    currentLocation: z.string(),
});
const InitialItemsAndFactsOutputSchema = z.object({
    inventory: StructuredStoryStateSchemaInternal.shape.inventory,
    equippedItems: StructuredStoryStateSchemaInternal.shape.equippedItems,
    worldFacts: StructuredStoryStateSchemaInternal.shape.worldFacts,
});
const initialItemsAndFactsPrompt = ai.definePrompt({
  name: 'initialItemsAndFactsPrompt',
  input: { schema: InitialItemsAndFactsInputSchema },
  output: { schema: InitialItemsAndFactsOutputSchema },
  prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY:
1.  'inventory': 0-3 unequipped starting items (unique id, name, description. 'equipSlot' if equippable gear, otherwise omit 'equipSlot'). For consumable items (like potions), set \`isConsumable: true\` and provide an \`effectDescription\`. If an item is a quest item, set \`isQuestItem: true\` and optionally \`relevantQuestId\`.
2.  'equippedItems': All 10 slots ('weapon', 'shield', etc.) mapped to an item object or null. Item must have 'equipSlot' if equippable. Ensure consistency with scene.
3.  'worldFacts': 3-5 key world facts relevant to the start.
Adhere strictly to the JSON schema. Ensure all item IDs are unique.`,
});

// STEP 3: Initial Quests
const InitialQuestsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal,
    sceneDescription: z.string(),
    currentLocation: z.string(),
});
const InitialQuestsOutputSchema = z.object({
    quests: StructuredStoryStateSchemaInternal.shape.quests,
});
const initialQuestsPrompt = ai.definePrompt({
  name: 'initialQuestsPrompt',
  input: { schema: InitialQuestsInputSchema },
  output: { schema: InitialQuestsOutputSchema },
  prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY:
1.  'quests': 1-2 initial quests (unique id, description, status 'active').
    - Optionally include 'category', 'objectives' (with 'isCompleted: false').
    - MUST include 'rewards' (experiencePoints and/or items with unique id, name, description, optional 'equipSlot'). For items in rewards, also define \`isConsumable\`, \`effectDescription\`, \`isQuestItem\`, \`relevantQuestId\` if applicable. If no material rewards, omit 'rewards' or use {}.
Adhere strictly to the JSON schema. Ensure quest and item IDs are unique.`,
});

// STEP 4: Initial Tracked NPCs
const InitialTrackedNPCsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal,
    sceneDescription: z.string(),
    currentLocation: z.string(), // Player character's starting location
});
const InitialTrackedNPCsOutputSchema = z.object({
    trackedNPCs: StructuredStoryStateSchemaInternal.shape.trackedNPCs,
});
const initialTrackedNPCsPrompt = ai.definePrompt({
  name: 'initialTrackedNPCsPrompt',
  input: { schema: InitialTrackedNPCsInputSchema },
  output: { schema: InitialTrackedNPCsOutputSchema },
  prompt: `For a story in "{{seriesName}}" starting with:
Player Character: {{character.name}} ({{character.class}})
Initial Scene: {{sceneDescription}}
Player's Starting Location: {{currentLocation}}

Generate ONLY:
1. 'trackedNPCs': A list of NPC profiles.
    - NPCs IN THE SCENE: For any NPC directly mentioned or interacting in the 'Initial Scene':
        - 'firstEncounteredLocation' MUST be '{{currentLocation}}' (the Player's Starting Location).
        - 'relationshipStatus' should be based on their initial interaction in the scene (e.g., 'Neutral', 'Hostile if attacking').
        - 'knownFacts' can include details observed by the player character in the 'Initial Scene', or be empty if no specific facts are revealed directly.
        - 'lastKnownLocation' MUST be '{{currentLocation}}'.
    - PRE-POPULATED MAJOR NPCs (NOT in scene): You MAY also include profiles for 2-4 other major, well-known characters from the '{{seriesName}}' universe who are NOT in the 'Initial Scene'.
        - 'firstEncounteredLocation': Set this to their canonical or widely-known location from series lore (e.g., "Hogwarts Castle", "The Jedi Temple", "Their shop in the Market District"). DO NOT use '{{currentLocation}}' for these NPCs.
        - 'relationshipStatus': Typically 'Unknown' or 'Neutral' towards the player character, unless a strong canonical reason dictates otherwise (e.g. a known villain to a hero).
        - 'knownFacts': 1-2 pieces of COMMON KNOWLEDGE or widely known rumors about this character within '{{seriesName}}'. These facts represent general world knowledge, NOT necessarily direct knowledge by the player character at this moment.
        - 'lastKnownLocation': Set this to their canonical or widely-known location, similar to their 'firstEncounteredLocation'.
    - For ALL NPCs (both in-scene and pre-populated):
        - Ensure each profile has a unique 'id', 'name', and 'description' (fitting the series).
        - 'classOrRole' (optional, e.g., 'Hokage', 'Soul Reaper Captain').
        - 'firstEncounteredTurnId' MUST be "initial_turn_0".
        - 'lastSeenTurnId' MUST be "initial_turn_0".
        - 'dialogueHistory' should be empty or omitted.
        - 'seriesContextNotes' (optional, for major characters, about their canon role).
Adhere strictly to the JSON schema. Ensure NPC IDs are unique. Ensure all required fields for NPCProfile are present.`,
});


// STEP 5: Generate Lore Entries
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

// STEP 6: Generate Series Style Guide
const StyleGuideInputSchema = z.object({
  seriesName: z.string(),
});
const styleGuidePrompt = ai.definePrompt({
  name: 'generateSeriesStyleGuidePrompt',
  input: { schema: StyleGuideInputSchema },
  output: { schema: z.string().nullable() },
  prompt: `You are a literary analyst. For the series "{{seriesName}}", your task is to provide a very brief (2-3 sentences) summary of its key themes, tone, or unique narrative aspects. This will serve as a style guide.

- If you can generate a suitable, concise summary for "{{seriesName}}", please provide it as a string.
- If you determine that you cannot provide a good, concise summary (for example, if the series is too complex to summarize in 2-3 sentences effectively, or if you lack sufficient specific information to do so confidently for any reason), you MUST output an empty string ("").

Please output ONLY the summary string or an empty string. DO NOT output the word 'null' or the JavaScript null value.`,
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
  async (mainInput: GenerateScenarioFromSeriesInput): Promise<GenerateScenarioFromSeriesOutput> => {
    // Step 1: Generate character, scene, and location
    const { output: charSceneOutput } = await characterAndScenePrompt(mainInput);
    if (!charSceneOutput || !charSceneOutput.sceneDescription || !charSceneOutput.character || !charSceneOutput.currentLocation) {
      console.error("Character/Scene generation failed or returned unexpected structure:", charSceneOutput);
      throw new Error('Failed to generate character, scene, or location.');
    }

    // Step 2: Generate initial items and facts
    const itemsFactsInput: z.infer<typeof InitialItemsAndFactsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: charSceneOutput.character,
        sceneDescription: charSceneOutput.sceneDescription,
        currentLocation: charSceneOutput.currentLocation,
    };
    const { output: itemsFactsOutput } = await initialItemsAndFactsPrompt(itemsFactsInput);
    if (!itemsFactsOutput) {
        console.error("Initial items/facts generation failed:", itemsFactsOutput);
        throw new Error('Failed to generate initial items and facts.');
    }

    // Step 3: Generate initial quests
    const questsInput: z.infer<typeof InitialQuestsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: charSceneOutput.character,
        sceneDescription: charSceneOutput.sceneDescription,
        currentLocation: charSceneOutput.currentLocation,
    };
    const { output: questsOutput } = await initialQuestsPrompt(questsInput);
    if (!questsOutput) {
        console.error("Initial quests generation failed:", questsOutput);
        throw new Error('Failed to generate initial quests.');
    }

    // Step 4: Generate initial tracked NPCs
    const npcsInput: z.infer<typeof InitialTrackedNPCsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: charSceneOutput.character,
        sceneDescription: charSceneOutput.sceneDescription,
        currentLocation: charSceneOutput.currentLocation,
    };
    const { output: npcsOutput } = await initialTrackedNPCsPrompt(npcsInput);
    if (!npcsOutput) {
        console.error("Initial tracked NPCs generation failed:", npcsOutput);
        throw new Error('Failed to generate initial tracked NPCs.');
    }

    // Assemble storyState
    const storyState: z.infer<typeof StructuredStoryStateSchemaInternal> = {
        character: charSceneOutput.character,
        currentLocation: charSceneOutput.currentLocation,
        inventory: itemsFactsOutput.inventory || [],
        equippedItems: itemsFactsOutput.equippedItems || { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null },
        quests: questsOutput.quests || [],
        worldFacts: itemsFactsOutput.worldFacts || [],
        trackedNPCs: npcsOutput.trackedNPCs || [],
    };

    // Step 5: Generate lore entries
    const loreInput: z.infer<typeof LoreGenerationInputSchema> = {
      seriesName: mainInput.seriesName,
      characterName: storyState.character.name,
      characterClass: storyState.character.class,
      sceneDescription: charSceneOutput.sceneDescription,
      characterDescription: storyState.character.description,
    };
    const { output: loreEntries } = await loreEntriesPrompt(loreInput);

    // Step 6: Generate series style guide
    const { output: styleGuideRaw } = await styleGuidePrompt({ seriesName: mainInput.seriesName });

    // Assemble the final output
    let finalOutput: GenerateScenarioFromSeriesOutput = {
      sceneDescription: charSceneOutput.sceneDescription,
      storyState: storyState,
      initialLoreEntries: loreEntries || [],
      seriesStyleGuide: styleGuideRaw === null ? undefined : styleGuideRaw,
    };

    // --- Post-processing (applied to the fully assembled finalOutput.storyState) ---
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
      
      char.skillsAndAbilities = char.skillsAndAbilities ?? [];
      char.skillsAndAbilities.forEach((skill, index) => {
        if (!skill.id) {
            skill.id = `skill_generated_scenario_${Date.now()}_${index}`;
        }
        skill.name = skill.name || "Unnamed Skill";
        skill.description = skill.description || "No description provided.";
        skill.type = skill.type || "Generic";
      });
    }

    if (finalOutput.storyState) {
      finalOutput.storyState.inventory = finalOutput.storyState.inventory ?? [];
      finalOutput.storyState.inventory.forEach(item => {
        if (!item.id) {
            item.id = `item_generated_inv_scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
        if (item.equipSlot === null || (item.equipSlot as unknown) === '') {
          delete (item as Partial<ItemType>).equipSlot;
        }
        if (item.isConsumable === undefined) delete item.isConsumable;
        if (item.effectDescription === undefined || item.effectDescription === '') delete item.effectDescription;
        if (item.isQuestItem === undefined) delete item.isQuestItem;
        if (item.relevantQuestId === undefined || item.relevantQuestId === '') delete item.relevantQuestId;
      });

      finalOutput.storyState.quests = finalOutput.storyState.quests ?? [];
      finalOutput.storyState.quests.forEach((quest, index) => {
        if (!quest.id) {
          quest.id = `quest_series_generated_scenario_${Date.now()}_${index}`;
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
        
        if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            quest.rewards.items.forEach(rewardItem => {
              if (!rewardItem.id) {
                rewardItem.id = `item_reward_scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              }
              if (rewardItem.equipSlot === null || (rewardItem.equipSlot as unknown) === '') {
                delete (rewardItem as Partial<ItemType>).equipSlot;
              }
              if (rewardItem.isConsumable === undefined) delete rewardItem.isConsumable;
              if (rewardItem.effectDescription === undefined || rewardItem.effectDescription === '') delete rewardItem.effectDescription;
              if (rewardItem.isQuestItem === undefined) delete rewardItem.isQuestItem;
              if (rewardItem.relevantQuestId === undefined || rewardItem.relevantQuestId === '') delete rewardItem.relevantQuestId;
            });
            if (quest.rewards.experiencePoints === undefined && quest.rewards.items.length === 0) {
              delete quest.rewards;
            } else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (quest.rewards.items.length === 0) delete quest.rewards.items;
            }
        }
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
                newEquippedItems[slotKey]!.id = `item_generated_equip_scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            }
            if (newEquippedItems[slotKey]!.equipSlot === null || (newEquippedItems[slotKey]!.equipSlot as unknown) === '') {
              delete (newEquippedItems[slotKey] as Partial<ItemType>)!.equipSlot;
            }
             // Ensure new item properties are not present or undefined for equipped items
            delete (newEquippedItems[slotKey] as Partial<ItemType>)!.isConsumable;
            delete (newEquippedItems[slotKey] as Partial<ItemType>)!.effectDescription;
            delete (newEquippedItems[slotKey] as Partial<ItemType>)!.isQuestItem;
            delete (newEquippedItems[slotKey] as Partial<ItemType>)!.relevantQuestId;
          }
      }
      finalOutput.storyState.equippedItems = newEquippedItems as any;

      finalOutput.storyState.trackedNPCs = finalOutput.storyState.trackedNPCs ?? [];
      const npcIdSet = new Set<string>();
      finalOutput.storyState.trackedNPCs.forEach((npc, index) => {
          if (!npc.id) {
              let baseId = `npc_scenario_${npc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
              let newId = baseId;
              let counter = 0;
              while(npcIdSet.has(newId)) {
                 newId = `${baseId}_u${counter++}`;
              }
              npc.id = newId;
          }
           while(npcIdSet.has(npc.id)){
             let baseId = npc.id;
             let counter = 0;
             let tempNewId = npc.id;
             while(npcIdSet.has(tempNewId)) { // Check against already processed in this loop
                tempNewId = `${baseId}_u${counter++}`;
             }
             npc.id = tempNewId;
          }
          npcIdSet.add(npc.id);

          npc.name = npc.name || "Unnamed NPC";
          npc.description = npc.description || "No description provided.";
          npc.relationshipStatus = npc.relationshipStatus || 'Unknown';
          npc.knownFacts = npc.knownFacts ?? [];
          npc.dialogueHistory = npc.dialogueHistory ?? [];
          
          npc.firstEncounteredTurnId = npc.firstEncounteredTurnId || "initial_turn_0";
          npc.updatedAt = npc.updatedAt || new Date().toISOString(); 
          npc.lastKnownLocation = npc.lastKnownLocation || npc.firstEncounteredLocation; 
          npc.lastSeenTurnId = npc.lastSeenTurnId || npc.firstEncounteredTurnId; 
          
          if (npc.classOrRole === null || (npc.classOrRole as unknown) === '') delete npc.classOrRole;
          if (npc.firstEncounteredLocation === null || (npc.firstEncounteredLocation as unknown) === '') delete npc.firstEncounteredLocation;
          if (npc.lastKnownLocation === null || (npc.lastKnownLocation as unknown) === '') delete npc.lastKnownLocation;
          if (npc.seriesContextNotes === null || (npc.seriesContextNotes as unknown) === '') delete npc.seriesContextNotes;
      });
    }

    if (finalOutput.initialLoreEntries) {
        finalOutput.initialLoreEntries.forEach(entry => {
            if (entry.category === null || (entry.category as unknown) === '') {
                delete (entry as Partial<RawLoreEntry>).category;
            }
        });
    }
    
    if (finalOutput.seriesStyleGuide === '' || finalOutput.seriesStyleGuide === undefined) {
        delete finalOutput.seriesStyleGuide;
    }

    return finalOutput;
  }
);
