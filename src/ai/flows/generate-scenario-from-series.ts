
'use server';

/**
 * @fileOverview A Genkit flow for generating an initial game scenario based on a real-life series.
 * This includes the starting scene, character state (potentially based on user input for name/class, including languageUnderstanding),
 * initial inventory, quests (with objectives, categories, and pre-defined rewards including currency), world facts,
 * a set of pre-populated lorebook entries relevant to the series, a brief series style guide,
 * initial profiles for any NPCs introduced in the starting scene or known major characters from the series (including merchant data, and optional health/mana for combatants),
 * and starting skills/abilities for the character.
 * This flow uses a multi-step generation process and supports model selection.
 *
 * - generateScenarioFromSeries - Function to generate the scenario.
 * - GenerateScenarioFromSeriesInput - Input type (series name, optional character name/class, usePremiumAI).
 * - GenerateScenarioFromSeriesOutput - Output type (scene, story state, initial lore, style guide).
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z} from 'zod';
import type { EquipmentSlot, RawLoreEntry, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, Skill as SkillType } from '@/types/story';
import { EquipSlotEnumInternal } from '@/types/zod-schemas';

// --- Schemas for AI communication (Internal, consistent with types/story.ts) ---

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory/equipment/rewards."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If the item is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. Should be a positive number or zero. MUST BE a number if provided."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_fireball_001'."),
    name: z.string().describe("The name of the skill or ability."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or basic effect."),
    type: z.string().describe("A category for the skill, e.g., 'Combat Ability', 'Utility Skill', 'Passive Trait', or a series-specific type like 'Ninjutsu Technique', 'Semblance'.")
});

const CharacterCoreProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the main character, appropriate for the series. This might be an existing character or an original character fitting the series, based on user input if provided.'),
  class: z.string().describe('The class, role, or archetype of the character within the series (e.g., "Shinobi", "Alchemist", "Keyblade Wielder"), based on user input if provided.'),
  description: z.string().describe('A brief backstory or description of the character, consistent with the series lore and their starting situation. If it is an Original Character (OC), explain their place or origin within the series. For characters who canonically start with language barriers, this description MUST reflect that initial inability to understand the local language.'),
  health: z.number().describe('Current health points of the character. MUST BE a number.'),
  maxHealth: z.number().describe('Maximum health points of the character. MUST BE a number.'),
  mana: z.number().optional().describe('Current mana or energy points (e.g., Chakra, Reiatsu, Magic Points). Assign 0 if not applicable, or omit if truly not part of the character concept. MUST BE a number if provided.'),
  maxMana: z.number().optional().describe('Maximum mana or energy points. Assign 0 if not applicable, or omit. MUST BE a number if provided.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, fitting for the character type, or omit. MUST BE a number if provided.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and knowledge. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  level: z.number().describe('Initialize to 1. MUST BE a number.'),
  experiencePoints: z.number().describe('Initialize to 0. MUST BE a number.'),
  experienceToNextLevel: z.number().describe('Initialize to a starting value, e.g., 100. MUST BE a number, and > 0.'),
  currency: z.number().optional().describe("Character's starting currency (e.g., gold, credits). Initialize to a small amount like 50, or 0. MUST BE a number if provided."),
  languageUnderstanding: z.number().optional().describe("Character's understanding of the current primary local language, on a scale of 0 (none) to 100 (fluent). Initialize appropriately for the series/character start (e.g., 0 for characters canonically starting with no understanding, 100 for most others unless specified otherwise by series lore). MUST BE a number if provided."),
});

const CharacterProfileSchemaInternal = CharacterCoreProfileSchemaInternal.extend({
    skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 2-3 starting skills, unique abilities, or passive traits appropriate for the character's class and the series. These should be thematically fitting and provide a starting flavor for the character's capabilities. Each skill requires an id, name, description, and type. For characters known for signature, fate-altering abilities (e.g., Subaru's 'Return by Death' in Re:Zero), ensure such an ability is included if appropriate for the specified character name/class and series."),
});

const EquipmentSlotsSchemaInternal = z.object({
  weapon: ItemSchemaInternal.nullable(),
  shield: ItemSchemaInternal.nullable(),
  head: ItemSchemaInternal.nullable(),
  body: ItemSchemaInternal.nullable(),
  legs: ItemSchemaInternal.nullable(),
  feet: ItemSchemaInternal.nullable(),
  hands: ItemSchemaInternal.nullable(),
  neck: ItemSchemaInternal.nullable(),
  ring1: ItemSchemaInternal.nullable(),
  ring2: ItemSchemaInternal.nullable(),
}).describe("Character's equipped items. All 10 slots MUST be present, with an item object (including 'basePrice' (as a number), and 'equipSlot' if applicable, otherwise OMIT 'equipSlot') or 'null' if the slot is empty.");

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should be false for initial quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice' (as a number), and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable to reward items."),
  currency: z.number().optional().describe("Amount of currency awarded. MUST BE a number if provided."),
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_series_main_001'."),
  description: z.string().describe("A clear description of the quest's overall objective, fitting the series."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Introduction', 'Personal Goal'). Omit if not clearly classifiable or if not applicable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional()
});

const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional().describe("The player's input that led to the NPC's response, if applicable. This helps track the conversation flow."),
    npcResponse: z.string().describe("The NPC's spoken dialogue or a summary of their significant verbal response."),
    turnId: z.string().describe("The ID of the story turn in which this dialogue occurred."),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context. MUST BE a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_series_charactername_001."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics, fitting the series."),
    classOrRole: z.string().optional().describe("e.g., 'Hokage', 'Soul Reaper Captain', 'Keyblade Master'."),
    health: z.number().optional().describe("Current health points if applicable (e.g., for a known combatant). Default to a reasonable value like 50-100 if setting. MUST BE a number if provided."),
    maxHealth: z.number().optional().describe("Maximum health points if applicable. MUST BE a number if provided."),
    mana: z.number().optional().describe("Current mana/energy if applicable (e.g., for a magic user). Default to a reasonable value like 20-50 if setting. MUST BE a number if provided."),
    maxMana: z.number().optional().describe("Maximum mana/energy if applicable. MUST BE a number."),
    firstEncounteredLocation: z.string().optional().describe("Location from the series where NPC is introduced, their typical location if pre-populated, or a general description like 'Known from series lore' if not a specific place."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met (use 'initial_turn_0' for all NPCs known at game start)."),
    relationshipStatus: z.number().describe("Numerical score representing relationship (e.g., -100 Hostile, 0 Neutral, 100 Allied). Set an initial appropriate value based on series context or 0 for Neutral for OCs. MUST BE a number."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player would know initially about this NPC based on the series, or empty if an OC. If this NPC is pre-populated and not directly in the scene, these facts should reflect general world knowledge/rumors, NOT direct player character knowledge from interaction."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Should be empty or omitted for initial scenario."),
    lastKnownLocation: z.string().optional().describe("Same as firstEncounteredLocation for initial setup if not directly in scene, or their current canonical location if different. If in scene, this is the current location."),
    lastSeenTurnId: z.string().optional().describe("Same as firstEncounteredTurnId for initial setup (use 'initial_turn_0')."),
    seriesContextNotes: z.string().optional().describe("Brief AI-internal note about their canon role/importance if an existing series character."),
    shortTermGoal: z.string().optional().describe("A simple, immediate goal this NPC might be pursuing. Can be set or updated by the AI based on events. Initialize as empty or a contextually relevant goal for series characters."),
    updatedAt: z.string().optional().describe("Timestamp of the last update (set to current time for new)."),
    isMerchant: z.boolean().optional().describe("Set to true if this NPC is a merchant and can buy/sell items."),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If isMerchant, a list of items the merchant has for sale. Each item includes its 'id', 'name', 'description', 'basePrice' (as a number), and a 'price' (as a number) they sell it for. Ensure 'equipSlot' is OMITTED for non-equippable items."),
    buysItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they are interested in buying (e.g., 'Herbs', 'Swords')."),
    sellsItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they typically sell (e.g., 'General Goods', 'Magic Scrolls')."),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string().describe('A specific starting location from the series relevant to the initial scene.'),
  inventory: z.array(ItemSchemaInternal).describe('Initial unequipped items relevant to the character and series. Each item must have id, name, description, and basePrice (as a number). If the item is an inherently equippable piece of gear, include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED. Can be empty. For consumable items, set `isConsumable: true` and provide `effectDescription`. For quest items, set `isQuestItem: true` and `relevantQuestId`.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("One or two initial quests that fit the series and starting scenario. Each quest is an object with id, description, status set to 'active', and optionally 'category', 'objectives' (with 'isCompleted: false'), and 'rewards' (which specify what the player will get on completion, including items with 'basePrice' (number) and currency (number)). These quests should be compelling and provide clear direction."),
  worldFacts: z.array(z.string()).describe('A few (3-5) key world facts from the series relevant to the start of the story, particularly those that impact the character or the immediate situation. If character.languageUnderstanding is 0, one fact should describe the effects (e.g., "Signs are unreadable, speech is incomprehensible").'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of significant NPCs. This MUST include profiles for any NPCs directly introduced in the 'sceneDescription'. Additionally, for the '{{seriesName}}' universe, you SHOULD prioritize pre-populating profiles for 2-4 other major, well-known characters who are canonically crucial to the player character's ({{characterNameInput}}) very early experiences or the immediate starting context of the series. If an NPC is a merchant, set 'isMerchant' to true and populate 'merchantInventory' with items including 'price' (number) and 'basePrice' (number). For all NPCs, ensure each profile has a unique 'id', 'name', 'description', numerical 'relationshipStatus', 'firstEncounteredLocation', 'firstEncounteredTurnId' (use 'initial_turn_0' for all NPCs known at game start), 'knownFacts', an optional 'shortTermGoal', and optionally 'seriesContextNotes'. Dialogue history should be empty. Include 'health'/'maxHealth' (numbers) for combat-oriented NPCs if known from series context."),
  storySummary: z.string().optional().describe("A brief, running summary of key story events and character developments. Initialize as empty or a very short intro for the series context."),
});

const RawLoreEntrySchemaInternal = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept'). If no category is applicable or known, this field should be omitted entirely."),
});

const GenerateScenarioFromSeriesInputSchema = z.object({
  seriesName: z.string().describe('The name of the real-life series (e.g., "Naruto", "Re:Zero", "Death Note", "RWBY").'),
  characterNameInput: z.string().optional().describe("Optional user-suggested character name (can be an existing character from the series or a new one)."),
  characterClassInput: z.string().optional().describe("Optional user-suggested character class or role."),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model."),
});
export type GenerateScenarioFromSeriesInput = z.infer<typeof GenerateScenarioFromSeriesInputSchema>;

const GenerateScenarioFromSeriesOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe('The engaging and detailed initial scene description that sets up the story in the chosen series, taking into account any specified character. If the character has languageUnderstanding: 0, the scene should reflect this (e.g., unreadable signs, indecipherable speech).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The complete initial structured state of the story, meticulously tailored to the series and specified character (if any). Includes initial NPC profiles in trackedNPCs (with merchant details and optional health/mana for combatants if applicable), starting skills/abilities for the character, and starting currency. Ensure all numeric fields like prices, stats, currency are numbers.'),
  initialLoreEntries: z.array(RawLoreEntrySchemaInternal).describe('An array of 6-8 key lore entries (characters, locations, concepts, items, etc.) from the series to pre-populate the lorebook. Ensure content is accurate to the series and relevant to the starting scenario and character.'),
  seriesStyleGuide: z.string().optional().describe("A very brief (2-3 sentences) summary of the key themes, tone, or unique aspects of the series (e.g., 'magical high school, friendship, fighting demons' or 'gritty cyberpunk, corporate espionage, body modification') to help guide future scene generation. If no strong, distinct style is easily summarized, this can be omitted."),
});
export type GenerateScenarioFromSeriesOutput = z.infer<typeof GenerateScenarioFromSeriesOutputSchemaInternal>;

const CharacterAndSceneInputSchema = GenerateScenarioFromSeriesInputSchema;
const CharacterAndSceneOutputSchema = z.object({
    sceneDescription: GenerateScenarioFromSeriesOutputSchemaInternal.shape.sceneDescription,
    characterCore: CharacterCoreProfileSchemaInternal.describe("The character's core profile, EXCLUDING skills and abilities, which will be generated in a subsequent step. Crucially, initialize 'languageUnderstanding' based on series canon. For example, if the `seriesName` and `characterNameInput` (if provided) suggest a character who canonically starts with no understanding of the local language (e.g., an 'isekai' protagonist in their initial moments), `languageUnderstanding` MUST be set to 0. The `description` field should also reflect this. Otherwise, set to 100 (fluent) or a series-appropriate value if known. If the AI omits `languageUnderstanding`, it will be defaulted to 100 later unless specific series logic dictates otherwise. Ensure all numeric fields like stats, currency are numbers."),
    currentLocation: StructuredStoryStateSchemaInternal.shape.currentLocation,
});

const InitialCharacterSkillsInputSchema = z.object({
    seriesName: z.string(),
    characterName: z.string(),
    characterClass: z.string(),
    characterDescription: z.string(),
});
const InitialCharacterSkillsOutputSchema = z.object({
    skillsAndAbilities: z.array(SkillSchemaInternal).optional(),
});

const MinimalContextForItemsFactsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterCoreProfileSchemaInternal.pick({ name: true, class: true, description: true, currency: true, languageUnderstanding: true }),
    sceneDescription: z.string(),
    currentLocation: z.string(),
});
const InitialInventoryOutputSchema = z.object({
    inventory: StructuredStoryStateSchemaInternal.shape.inventory,
});

const InitialMainGearOutputSchema = z.object({
    weapon: ItemSchemaInternal.nullable(),
    shield: ItemSchemaInternal.nullable(),
    body: ItemSchemaInternal.nullable(),
});

const InitialSecondaryGearOutputSchema = z.object({
    head: ItemSchemaInternal.nullable(),
    legs: ItemSchemaInternal.nullable(),
    feet: ItemSchemaInternal.nullable(),
    hands: ItemSchemaInternal.nullable(),
});

const InitialAccessoryGearOutputSchema = z.object({
    neck: ItemSchemaInternal.nullable(),
    ring1: ItemSchemaInternal.nullable(),
    ring2: ItemSchemaInternal.nullable(),
});
    
const InitialWorldFactsOutputSchema = z.object({
    worldFacts: StructuredStoryStateSchemaInternal.shape.worldFacts,
});

const InitialQuestsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal, 
    sceneDescription: z.string(),
    currentLocation: z.string(),
    characterNameInput: z.string().optional(),
});
const InitialQuestsOutputSchema = z.object({
    quests: StructuredStoryStateSchemaInternal.shape.quests,
});

const InitialTrackedNPCsInputSchema = z.object({
    seriesName: z.string(),
    character: CharacterProfileSchemaInternal, 
    sceneDescription: z.string(),
    currentLocation: z.string(),
    characterNameInput: z.string().optional(), 
});
const InitialTrackedNPCsOutputSchema = z.object({
    trackedNPCs: StructuredStoryStateSchemaInternal.shape.trackedNPCs,
});

const LoreGenerationInputSchema = z.object({
  seriesName: z.string(),
  characterName: z.string(),
  characterClass: z.string(),
  sceneDescription: z.string(),
  characterDescription: z.string(),
});

const StyleGuideInputSchema = z.object({
  seriesName: z.string(),
});

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
    const modelName = mainInput.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;

    const characterAndScenePrompt = ai.definePrompt({
        name: 'characterAndScenePrompt',
        model: modelName,
        input: { schema: CharacterAndSceneInputSchema },
        output: { schema: CharacterAndSceneOutputSchema },
        prompt: `You are a master storyteller setting up an interactive text adventure in the series: "{{seriesName}}".
Your output MUST be a JSON object strictly conforming to the 'CharacterAndSceneOutputSchema'. ALL fields specified as required in the schema ('sceneDescription', 'characterCore', 'currentLocation', and required fields within 'characterCore' like 'name', 'class', 'health', 'maxHealth', 'level', 'experiencePoints', 'experienceToNextLevel', 'description') MUST be present and correctly typed (e.g., numbers for stats, currency). Optional fields should only be included if applicable and must also be correctly typed.

User's character preferences:
- Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Class/Role: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

You MUST generate an object with 'sceneDescription', 'characterCore', and 'currentLocation'.

1.  'sceneDescription': A vivid initial scene. If the character's 'languageUnderstanding' (see below) is set to 0, the scene MUST reflect this (e.g., signs are gibberish, speech is incomprehensible sounds).
2.  'characterCore': CharacterCoreProfile object (EXCLUDING 'skillsAndAbilities').
    - If 'characterNameInput' is a known character, create their profile authentically.
    - For Original Characters (OCs) or unspecified characters, create a fitting protagonist.
    - Profile MUST include: 'name', 'class', 'description'. The 'description' MUST reflect any initial language barrier if 'languageUnderstanding' is 0.
    - Health/MaxHealth (e.g., 100, MUST BE numbers). Mana/MaxMana (0 if not applicable, MUST BE numbers). Stats (5-15, MUST BE numbers). Level 1 (MUST BE a number), 0 XP (MUST BE a number), XPToNextLevel (e.g., 100, MUST BE a number and > 0). Currency (e.g., 25-50, MUST BE a number).
    - **'languageUnderstanding' (MUST BE a number)**:
        - If the \`seriesName\` and \`characterNameInput\` (if provided) strongly suggest a character who canonically starts with no understanding of the local language (e.g., an 'isekai' protagonist in their initial moments, or a character known to be in a foreign land without prior knowledge of the local language), \`languageUnderstanding\` MUST be set to 0. The \`description\` field should also reflect this.
        - For other characters/series, if the series canon implies an initial language barrier for the protagonist, set 'languageUnderstanding' to 0 or a low value appropriate to the canon.
        - Otherwise, if not specified by canon for the starting situation, default 'languageUnderstanding' to 100 (fluent) or a series-appropriate value if known. If the AI omits 'languageUnderstanding', it will be defaulted to 100 in post-processing.
3.  'currentLocation': A specific, recognizable starting location from "{{seriesName}}".

Output ONLY the JSON object for CharacterAndSceneOutputSchema. Ensure all fields are correctly populated and typed.`,
    });

    const initialCharacterSkillsPrompt = ai.definePrompt({
        name: 'initialCharacterSkillsPrompt',
        model: modelName,
        input: { schema: InitialCharacterSkillsInputSchema },
        output: { schema: InitialCharacterSkillsOutputSchema },
        prompt: `For a character in the series "{{seriesName}}":
Name: {{characterName}}
Class/Role: {{characterClass}}
Description: {{characterDescription}}

Generate ONLY 'skillsAndAbilities': An array of 2-3 starting skills.
- Each skill: unique 'id', 'name', 'description', 'type'. All fields are required.
- For characters known for specific signature abilities relevant at the start (e.g., for "Re:Zero" and Subaru, "Return by Death" MUST be included if appropriate for the scenario start), ensure they are present.
Adhere strictly to the JSON schema. Output ONLY { "skillsAndAbilities": [...] }. If no skills, output { "skillsAndAbilities": [] }.`,
    });

    const initialInventoryPrompt = ai.definePrompt({
        name: 'initialInventoryPrompt',
        model: modelName,
        input: { schema: MinimalContextForItemsFactsInputSchema },
        output: { schema: InitialInventoryOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY 'inventory': An array of 0-3 unequipped starting items.
- Each item: unique 'id', 'name', 'description', 'basePrice' (MUST BE a number, e.g., 0, 10, 50). All these fields are required.
- 'equipSlot' if equippable gear (e.g., "weapon", "head"), OMITTED otherwise (e.g., for potions, keys).
- 'isConsumable', 'effectDescription' for consumables. 'isQuestItem', 'relevantQuestId' for quest items.
Adhere to JSON schema. Output ONLY { "inventory": [...] }.`,
    });

    const initialMainGearPrompt = ai.definePrompt({
        name: 'initialMainGearPrompt',
        model: modelName,
        input: { schema: MinimalContextForItemsFactsInputSchema },
        output: { schema: InitialMainGearOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY an object with 'weapon', 'shield', 'body' equipped items. Each field ('weapon', 'shield', 'body') MUST be present.
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), 'equipSlot' (must match slot key, e.g. "weapon")) or 'null'. All item fields are required if an item object is provided.
Adhere to JSON schema. Output ONLY { "weapon": ..., "shield": ..., "body": ... }.`,
    });

    const initialSecondaryGearPrompt = ai.definePrompt({
        name: 'initialSecondaryGearPrompt',
        model: modelName,
        input: { schema: MinimalContextForItemsFactsInputSchema },
        output: { schema: InitialSecondaryGearOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY an object with 'head', 'legs', 'feet', 'hands' equipped items. Each field ('head', 'legs', 'feet', 'hands') MUST be present.
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), 'equipSlot' (must match slot key, e.g. "head")) or 'null'. All item fields are required if an item object is provided.
Adhere to JSON schema. Output ONLY an object with these four keys.`,
    });

    const initialAccessoryGearPrompt = ai.definePrompt({
        name: 'initialAccessoryGearPrompt',
        model: modelName,
        input: { schema: MinimalContextForItemsFactsInputSchema },
        output: { schema: InitialAccessoryGearOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY an object with 'neck', 'ring1', 'ring2' equipped items. Each field ('neck', 'ring1', 'ring2') MUST be present.
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), 'equipSlot' (should be "neck" or "ring")) or 'null'. All item fields are required if an item object is provided. If 'equipSlot' is "ring", it's for ring1 or ring2.
Adhere to JSON schema. Output ONLY an object with these three keys.`,
    });
    
    const initialWorldFactsPrompt = ai.definePrompt({
        name: 'initialWorldFactsPrompt',
        model: modelName,
        input: { schema: MinimalContextForItemsFactsInputSchema },
        output: { schema: InitialWorldFactsOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

Generate ONLY 'worldFacts': An array of 3-5 key world facts (strings).
- If 'character.languageUnderstanding' is 0 (or very low, e.g., < 10), one fact MUST state the consequence, e.g., "Character {{character.name}} currently cannot understand the local spoken or written language, making interaction and reading impossible." or "Signs are unreadable and speech is incomprehensible."
Adhere to JSON schema. Output ONLY { "worldFacts": [...] }.`,
    });

    const initialQuestsPrompt = ai.definePrompt({
        name: 'initialQuestsPrompt',
        model: modelName,
        input: { schema: InitialQuestsInputSchema },
        output: { schema: InitialQuestsOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - {{character.description}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

**Contextual Quest Generation Guidance:**
-   Consider the character's immediate situation, background, and the canonical starting point of the series for this character, if known.
-   If 'character.languageUnderstanding' is very low (e.g., < 10, common for characters new to a world), initial quests MUST relate to this barrier or basic orientation, e.g., "Try to understand what's happening", "Find a way to communicate", "Seek immediate shelter or safety." Avoid quests requiring complex interaction or understanding tasks from unknown entities unless that is a core part of the canonical start.
-   For other characters, quests should feel like natural next steps from the 'sceneDescription' and 'currentLocation', and align with the series' initial plot if applicable.

Generate ONLY 'quests': 1-2 initial quests.
    - Each quest: 'id' (unique), 'description', 'status' ('active'). These fields are required.
    - Optional: 'category', 'objectives' (each objective: 'description', 'isCompleted: false').
    - MUST include 'rewards' if appropriate (experiencePoints (MUST BE a number), currency (MUST BE a number), items (each item: unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), optional 'equipSlot' - OMIT 'equipSlot' if not equippable gear)). All fields within 'rewards' and reward items are required if that structure is present.
Adhere to JSON schema. Output ONLY { "quests": [...] }. Ensure all fields are correctly populated and typed.`,
    });

    const initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'initialTrackedNPCsPrompt',
        model: modelName,
        input: { schema: InitialTrackedNPCsInputSchema },
        output: { schema: InitialTrackedNPCsOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Player Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) -
Initial Scene: {{sceneDescription}}
Player's Starting Location: {{currentLocation}}

Generate ONLY 'trackedNPCs': A list of NPC profiles.
    - NPCs IN THE SCENE: For any NPC directly mentioned or interacting in the 'Initial Scene':
        - Required Details: 'id' (unique), 'name', 'description', 'relationshipStatus' (MUST BE a number).
        - Contextual Details: 'firstEncounteredLocation' ('{{currentLocation}}'), 'lastKnownLocation' ('{{currentLocation}}').
        - If merchant: \`isMerchant: true\`, populate \`merchantInventory\` with items (each with unique \`id\`, \`name\`, \`description\`, \`basePrice\` (MUST BE a number), and merchant \`price\` (MUST BE a number). OMIT 'equipSlot' for non-equippable items in inventory.). All item fields are required if an item is present.
    - PRE-POPULATED MAJOR NPCs (NOT in scene): For '{{seriesName}}', **prioritize** pre-populating profiles for 2-4 other major, well-known characters canonically crucial to the player character's ({{characterNameInput}}) very early experiences or the immediate starting context of the series.
        - Required Details: 'id' (unique), 'name', 'description', 'relationshipStatus' (MUST BE a number).
        - Contextual Details: 'firstEncounteredLocation' (canonical), 'lastKnownLocation'.
        - If merchant: include merchant data as above.
    - For ALL NPCs: 'firstEncounteredTurnId' & 'lastSeenTurnId' = "initial_turn_0". Empty dialogue history. Optional 'seriesContextNotes', 'shortTermGoal', 'classOrRole', 'health' (number), 'maxHealth' (number), 'mana' (number), 'maxMana' (number).
Adhere strictly to JSON schema. Output ONLY { "trackedNPCs": [...] }. Ensure all fields are correctly populated and typed, especially numeric ones.`,
    });

    const loreEntriesPrompt = ai.definePrompt({
        name: 'generateLoreEntriesPrompt',
        model: modelName,
        input: { schema: LoreGenerationInputSchema },
        output: { schema: z.array(RawLoreEntrySchemaInternal) },
        prompt: `You are a lore master for "{{seriesName}}".
Context: Character "{{characterName}}" ({{characterClass}}).
Scene: {{sceneDescription}}
Character Background: {{characterDescription}}
Generate 6-8 key lore entries. Each entry MUST have a 'keyword' and 'content'. 'category' is optional.
Output ONLY JSON array.`,
    });

    const styleGuidePrompt = ai.definePrompt({
        name: 'generateSeriesStyleGuidePrompt',
        model: modelName,
        input: { schema: StyleGuideInputSchema },
        output: { schema: z.string().nullable() },
        prompt: `For "{{seriesName}}", provide a 2-3 sentence summary of key themes/tone. If unable, output an empty string ("").
Output ONLY the summary string or empty string. DO NOT output 'null'.`,
    });

    const { output: charSceneOutput } = await characterAndScenePrompt({
        seriesName: mainInput.seriesName,
        characterNameInput: mainInput.characterNameInput,
        characterClassInput: mainInput.characterClassInput,
        usePremiumAI: mainInput.usePremiumAI,
    });
    if (!charSceneOutput || !charSceneOutput.sceneDescription || !charSceneOutput.characterCore || !charSceneOutput.currentLocation) {
      console.error("Character/Scene generation failed:", charSceneOutput);
      throw new Error('Failed to generate character core, scene, or location.');
    }
    
    let { characterCore, sceneDescription, currentLocation } = charSceneOutput;

    // Apply defaults to characterCore early
    characterCore.mana = characterCore.mana ?? 0;
    characterCore.maxMana = characterCore.maxMana ?? 0;
    characterCore.currency = characterCore.currency ?? 0;
    characterCore.languageUnderstanding = characterCore.languageUnderstanding ?? 100; // Default to fluent if AI omits (unless prompt specifically sets it to 0)

    const skillsInput: z.infer<typeof InitialCharacterSkillsInputSchema> = {
        seriesName: mainInput.seriesName,
        characterName: characterCore.name,
        characterClass: characterCore.class,
        characterDescription: characterCore.description,
    };
    const { output: skillsOutput } = await initialCharacterSkillsPrompt(skillsInput);
    const characterSkills = skillsOutput?.skillsAndAbilities || [];

    const fullCharacterProfile: z.infer<typeof CharacterProfileSchemaInternal> = {
        ...characterCore, 
        skillsAndAbilities: characterSkills,
    };
    
    const minimalContextForItemsFactsInput: z.infer<typeof MinimalContextForItemsFactsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: { name: fullCharacterProfile.name, class: fullCharacterProfile.class, description: fullCharacterProfile.description, currency: fullCharacterProfile.currency, languageUnderstanding: fullCharacterProfile.languageUnderstanding },
        sceneDescription: sceneDescription,
        currentLocation: currentLocation,
    };

    const { output: inventoryOutput } = await initialInventoryPrompt(minimalContextForItemsFactsInput);
    if (!inventoryOutput || !inventoryOutput.inventory) throw new Error('Failed to generate initial inventory.');
    const inventory = inventoryOutput.inventory;

    const { output: mainGearRaw } = await initialMainGearPrompt(minimalContextForItemsFactsInput);
    const mainGearOutput = mainGearRaw || { weapon: null, shield: null, body: null };


    const { output: secondaryGearRaw } = await initialSecondaryGearPrompt(minimalContextForItemsFactsInput);
    const secondaryGearOutput = secondaryGearRaw || { head: null, legs: null, feet: null, hands: null };
    
    const { output: accessoryGearRaw } = await initialAccessoryGearPrompt(minimalContextForItemsFactsInput);
    const accessoryGearOutput = accessoryGearRaw || { neck: null, ring1: null, ring2: null };

    const equippedItemsIntermediate: Partial<Record<EquipmentSlot, ItemType | null>> = {
        weapon: mainGearOutput.weapon ?? null,
        shield: mainGearOutput.shield ?? null,
        body: mainGearOutput.body ?? null,
        head: secondaryGearOutput.head ?? null,
        legs: secondaryGearOutput.legs ?? null,
        feet: secondaryGearOutput.feet ?? null,
        hands: secondaryGearOutput.hands ?? null,
        neck: accessoryGearOutput.neck ?? null,
        ring1: accessoryGearOutput.ring1 ?? null,
        ring2: accessoryGearOutput.ring2 ?? null,
    };

    const { output: worldFactsOutput } = await initialWorldFactsPrompt(minimalContextForItemsFactsInput);
    if (!worldFactsOutput || !worldFactsOutput.worldFacts) throw new Error('Failed to generate initial world facts.');
    const worldFacts = worldFactsOutput.worldFacts;

    const questsInput: z.infer<typeof InitialQuestsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: fullCharacterProfile, 
        sceneDescription: sceneDescription,
        currentLocation: currentLocation,
        characterNameInput: mainInput.characterNameInput,
    };
    const { output: questsOutput } = await initialQuestsPrompt(questsInput);
    if (!questsOutput || !questsOutput.quests) throw new Error('Failed to generate initial quests.');
    const quests = questsOutput.quests;

    const npcsInput: z.infer<typeof InitialTrackedNPCsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: fullCharacterProfile, 
        sceneDescription: sceneDescription,
        currentLocation: currentLocation,
        characterNameInput: mainInput.characterNameInput,
    };
    const { output: npcsOutput } = await initialTrackedNPCsPrompt(npcsInput);
    if (!npcsOutput || !npcsOutput.trackedNPCs) throw new Error('Failed to generate initial tracked NPCs.');
    const trackedNPCs = npcsOutput.trackedNPCs;

    const storyState: z.infer<typeof StructuredStoryStateSchemaInternal> = {
        character: fullCharacterProfile,
        currentLocation: currentLocation,
        inventory: inventory,
        equippedItems: equippedItemsIntermediate as Required<typeof equippedItemsIntermediate>, 
        quests: quests,
        worldFacts: worldFacts,
        trackedNPCs: trackedNPCs,
        storySummary: `The adventure begins for ${fullCharacterProfile.name} in ${mainInput.seriesName}, at ${currentLocation}. Initial scene: ${sceneDescription.substring(0,100)}...`,
    };

    const loreInput: z.infer<typeof LoreGenerationInputSchema> = {
      seriesName: mainInput.seriesName,
      characterName: storyState.character.name,
      characterClass: storyState.character.class,
      sceneDescription: sceneDescription,
      characterDescription: storyState.character.description,
    };
    const { output: loreEntries } = await loreEntriesPrompt(loreInput);
    const initialLoreEntries = loreEntries || [];

    const { output: styleGuideRaw } = await styleGuidePrompt({ seriesName: mainInput.seriesName });
    const seriesStyleGuide = styleGuideRaw === null ? undefined : styleGuideRaw;

    let finalOutput: GenerateScenarioFromSeriesOutput = {
      sceneDescription: sceneDescription,
      storyState: storyState,
      initialLoreEntries: initialLoreEntries,
      seriesStyleGuide: seriesStyleGuide,
    };
    
    // Final sanitation pass AFTER all AI calls and initial object assembly
    if (finalOutput.storyState.character) {
      const char = finalOutput.storyState.character;
      char.name = char.name || "Unnamed Character";
      char.class = char.class || "Adventurer";
      char.description = char.description || "A mysterious adventurer.";
      char.health = typeof char.health === 'number' ? char.health : 100;
      char.maxHealth = typeof char.maxHealth === 'number' && char.maxHealth > 0 ? char.maxHealth : 100;
      if (char.health > char.maxHealth) char.health = char.maxHealth;
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
      char.experienceToNextLevel = char.experienceToNextLevel && char.experienceToNextLevel > 0 ? char.experienceToNextLevel : 100;
      char.currency = char.currency ?? 0;
      if (char.currency < 0) char.currency = 0;
      char.languageUnderstanding = char.languageUnderstanding ?? 100;
      if (char.languageUnderstanding < 0) char.languageUnderstanding = 0;
      if (char.languageUnderstanding > 100) char.languageUnderstanding = 100;
      char.skillsAndAbilities = char.skillsAndAbilities ?? [];
      char.skillsAndAbilities.forEach((skill, index) => {
          if (!skill.id) skill.id = `skill_generated_series_${Date.now()}_${index}`;
          skill.name = skill.name || "Unnamed Skill";
          skill.description = skill.description || "No description provided.";
          skill.type = skill.type || "Generic";
      });
    }

    if (finalOutput.storyState) {
      finalOutput.storyState.inventory = finalOutput.storyState.inventory ?? [];
      const invItemIds = new Set<string>();
      finalOutput.storyState.inventory.forEach((item, index) => {
        if (!item.id || item.id.trim() === "" || invItemIds.has(item.id)) {
            item.id = `item_inv_series_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
        }
        invItemIds.add(item.id);
        item.name = item.name || "Unnamed Item";
        item.description = item.description || "No description.";
        if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
      });

      finalOutput.storyState.quests = finalOutput.storyState.quests ?? [];
      const questIds = new Set<string>();
      finalOutput.storyState.quests.forEach((quest, index) => {
        if (!quest.id || quest.id.trim() === "" || questIds.has(quest.id)) {
            quest.id = `quest_series_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
        }
        questIds.add(quest.id);
        quest.description = quest.description || "No description.";
        quest.status = quest.status || 'active';
        if (quest.category === null || (quest.category as unknown) === '') delete (quest as Partial<QuestType>).category;
        quest.objectives = quest.objectives ?? [];
        quest.objectives.forEach(obj => {
            obj.description = obj.description || "Unnamed objective";
            obj.isCompleted = obj.isCompleted ?? false;
        });
        if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            quest.rewards.items.forEach((rItem, rIndex) => {
                if (!rItem.id) rItem.id = `item_reward_series_${Date.now()}_${rIndex}`;
                rItem.name = rItem.name || "Unnamed Reward Item";
                rItem.description = rItem.description || "No description.";
                rItem.basePrice = rItem.basePrice ?? 0;
                if (rItem.basePrice < 0) rItem.basePrice = 0;
            });
            quest.rewards.currency = quest.rewards.currency ?? undefined;
            if (quest.rewards.currency !== undefined && quest.rewards.currency < 0) quest.rewards.currency = 0;
            if (!quest.rewards.experiencePoints && (!quest.rewards.items || quest.rewards.items.length === 0) && quest.rewards.currency === undefined) {
                delete quest.rewards;
            } else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (!quest.rewards.items || quest.rewards.items.length === 0) delete quest.rewards.items;
                if (quest.rewards.currency === undefined) delete quest.rewards.currency;
            }
        } else {
          delete quest.rewards;
        }
      });
      
      finalOutput.storyState.worldFacts = finalOutput.storyState.worldFacts ?? [];
      finalOutput.storyState.worldFacts = finalOutput.storyState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');

      const defaultEquippedSlots: Record<EquipmentSlot, null> = { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null };
      const currentEquipped = finalOutput.storyState.equippedItems || {} as Record<EquipmentSlot, ItemType | null>;
      const processedEquippedItems: Record<EquipmentSlot, ItemType | null> = {...defaultEquippedSlots}; 
      const equippedItemIdSet = new Set<string>();

      for (const slotKey of Object.keys(defaultEquippedSlots) as EquipmentSlot[]) {
          const itemInSlot = currentEquipped[slotKey];
          if (itemInSlot && typeof itemInSlot === 'object' && itemInSlot.name) {
              if (!itemInSlot.id || itemInSlot.id.trim() === "" || equippedItemIdSet.has(itemInSlot.id) || invItemIds.has(itemInSlot.id)) {
                itemInSlot.id = `item_equip_series_${Date.now()}_${slotKey}_${Math.random().toString(36).substring(2,7)}`;
              }
              equippedItemIdSet.add(itemInSlot.id);
              itemInSlot.name = itemInSlot.name || "Unnamed Equipped Item";
              itemInSlot.description = itemInSlot.description || "No description.";
              if (itemInSlot.equipSlot === null || (itemInSlot.equipSlot as unknown) === '') delete (itemInSlot as Partial<ItemType>)!.equipSlot;
              itemInSlot.basePrice = itemInSlot.basePrice ?? 0;
              if (itemInSlot.basePrice! < 0) itemInSlot.basePrice = 0;
              processedEquippedItems[slotKey] = itemInSlot;
          } else {
              processedEquippedItems[slotKey] = null;
          }
      }
      finalOutput.storyState.equippedItems = processedEquippedItems;

      finalOutput.storyState.trackedNPCs = finalOutput.storyState.trackedNPCs ?? [];
      const npcIdSet = new Set<string>();
      finalOutput.storyState.trackedNPCs.forEach((npc, index) => {
        const processedNpc = {...npc} as Partial<NPCProfileType>;
        if (!processedNpc.id || processedNpc.id.trim() === "" || npcIdSet.has(processedNpc.id)) {
            processedNpc.id = `npc_series_${processedNpc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}_${Math.random().toString(36).substring(2,7)}`;
        }
        npcIdSet.add(processedNpc.id!);
        processedNpc.name = processedNpc.name || "Unnamed NPC";
        processedNpc.description = processedNpc.description || "No description provided.";
        processedNpc.relationshipStatus = typeof processedNpc.relationshipStatus === 'number' ? processedNpc.relationshipStatus : 0;
        processedNpc.firstEncounteredTurnId = processedNpc.firstEncounteredTurnId || "initial_turn_0";
        processedNpc.lastSeenTurnId = processedNpc.lastSeenTurnId || "initial_turn_0";
        processedNpc.updatedAt = new Date().toISOString();
        if (processedNpc.isMerchant) {
            processedNpc.merchantInventory = processedNpc.merchantInventory ?? [];
            processedNpc.merchantInventory.forEach((mItem, mIndex) => {
                if (!mItem.id || mItem.id.trim() === "" || invItemIds.has(mItem.id) || equippedItemIdSet.has(mItem.id)) {
                  mItem.id = `item_merchant_series_${Date.now()}_${mIndex}_${Math.random().toString(36).substring(2,7)}`;
                }
                invItemIds.add(mItem.id); // Add merchant items to invItemIds to ensure overall uniqueness for newly generated equipped/inv items
                mItem.name = mItem.name || "Unnamed Merchant Item";
                mItem.description = mItem.description || "No description.";
                mItem.basePrice = mItem.basePrice ?? 0;
                if(mItem.basePrice < 0) mItem.basePrice = 0;
                mItem.price = mItem.price ?? mItem.basePrice;
                if(mItem.price < 0) mItem.price = 0;
            });
        }
        finalOutput.storyState.trackedNPCs[index] = processedNpc as NPCProfileType;
      });
      finalOutput.storyState.storySummary = finalOutput.storyState.storySummary ?? "";
    }
    
    if (finalOutput.seriesStyleGuide === '' || finalOutput.seriesStyleGuide === undefined || finalOutput.seriesStyleGuide === null) delete finalOutput.seriesStyleGuide;

    return finalOutput;
  }
);

    
