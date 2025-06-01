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
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. Should be a positive number or zero. MUST be a number if provided."),
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
  health: z.number().describe('Current health points of the character. Must be a number.'),
  maxHealth: z.number().describe('Maximum health points of the character. Must be a number.'),
  mana: z.number().optional().describe('Current mana or energy points (e.g., Chakra, Reiatsu, Magic Points). Assign 0 if not applicable, or omit if truly not part of the character concept. Must be a number if provided.'),
  maxMana: z.number().optional().describe('Maximum mana or energy points. Assign 0 if not applicable, or omit. Must be a number if provided.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, fitting for the character type, or omit. Must be a number if provided.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit. Must be a number if provided.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Assign a value between 5 and 15, or omit. Must be a number if provided.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and knowledge. Assign a value between 5 and 15, or omit. Must be a number if provided.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Assign a value between 5 and 15, or omit. Must be a number if provided.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit. Must be a number if provided.'),
  level: z.number().describe('Initialize to 1. Must be a number.'),
  experiencePoints: z.number().describe('Initialize to 0. Must be a number.'),
  experienceToNextLevel: z.number().describe('Initialize to a starting value, e.g., 100. Must be a number.'),
  currency: z.number().optional().describe("Character's starting currency (e.g., gold, credits). Initialize to a small amount like 50, or 0. Must be a number if provided."),
  languageUnderstanding: z.number().optional().describe("Character's understanding of the current primary local language, on a scale of 0 (none) to 100 (fluent). Initialize appropriately for the series/character start (e.g., 0 for characters canonically starting with no understanding, 100 for most others unless specified otherwise by series lore). Must be a number if provided."),
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
}).describe("Character's equipped items. All 10 slots MUST be present, with an item object (including 'basePrice' as a number, and 'equipSlot' if applicable, otherwise OMIT 'equipSlot') or 'null' if the slot is empty.");

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should be false for initial quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. Must be a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice' (as a number), and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable to reward items."),
  currency: z.number().optional().describe("Amount of currency awarded. Must be a number if provided."),
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
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context. Must be a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_series_charactername_001."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics, fitting the series."),
    classOrRole: z.string().optional().describe("e.g., 'Hokage', 'Soul Reaper Captain', 'Keyblade Master'."),
    health: z.number().optional().describe("Current health points if applicable (e.g., for a known combatant). Default to a reasonable value like 50-100 if setting. Must be a number if provided."),
    maxHealth: z.number().optional().describe("Maximum health points if applicable. Must be a number if provided."),
    mana: z.number().optional().describe("Current mana/energy if applicable (e.g., for a magic user). Default to a reasonable value like 20-50 if setting. Must be a number if provided."),
    maxMana: z.number().optional().describe("Maximum mana/energy if applicable. Must be a number."),
    firstEncounteredLocation: z.string().optional().describe("Location from the series where NPC is introduced, their typical location if pre-populated, or a general description like 'Known from series lore' if not a specific place."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met (use 'initial_turn_0' for all NPCs known at game start)."),
    relationshipStatus: z.number().describe("Numerical score representing relationship (e.g., -100 Hostile, 0 Neutral, 100 Allied). Set an initial appropriate value based on series context or 0 for Neutral for OCs. Must be a number."),
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
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model and prompts."),
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
User's character preferences:
- Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(Not provided){{/if}}
- Class/Role: {{#if characterClassInput}}{{characterClassInput}}{{else}}(Not provided){{/if}}

You MUST generate an object with 'sceneDescription', 'characterCore', and 'currentLocation'.

1.  'sceneDescription': A vivid initial scene. If the character's 'languageUnderstanding' (see below) is set to 0, the scene MUST reflect this (e.g., signs are gibberish, speech is incomprehensible sounds).
2.  'characterCore': CharacterCoreProfile object (EXCLUDING 'skillsAndAbilities').
    - If 'characterNameInput' is a known character, create their profile authentically.
    - For Original Characters (OCs) or unspecified characters, create a fitting protagonist.
    - Profile MUST include: 'name', 'class', 'description'. The 'description' MUST reflect any initial language barrier if 'languageUnderstanding' is 0.
    - Health/MaxHealth (e.g., 100, numbers). Mana/MaxMana (0 if not applicable, numbers). Stats (5-15, numbers). Level 1 (number), 0 XP (number), XPToNextLevel (e.g., 100, number). Currency (e.g., 25-50, number).
    - **'languageUnderstanding' (number)**:
        - If the \`seriesName\` and \`characterNameInput\` (if provided) strongly suggest a character who canonically starts with no understanding of the local language (e.g., an 'isekai' protagonist in their initial moments, or a character known to be in a foreign land without prior knowledge of the local language), \`languageUnderstanding\` MUST be set to 0. The \`description\` field should also reflect this.
        - For other characters/series, if the series canon implies an initial language barrier for the protagonist, set 'languageUnderstanding' to 0 or a low value appropriate to the canon.
        - Otherwise, if not specified by canon for the starting situation, default 'languageUnderstanding' to 100 (fluent) or a series-appropriate value if known. If the AI omits 'languageUnderstanding', it will be defaulted to 100 in post-processing.
3.  'currentLocation': A specific, recognizable starting location from "{{seriesName}}".

Output ONLY the JSON object for CharacterAndSceneOutputSchema. Ensure all numeric fields are numbers.`,
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
- Each skill: unique 'id', 'name', 'description', 'type'.
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
- Each item: unique 'id', 'name', 'description', 'basePrice' (must be a number, e.g., 0, 10, 50).
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

Generate ONLY an object with 'weapon', 'shield', 'body' equipped items. Each field MUST be present.
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice' (as a number), 'equipSlot' (must match slot key, e.g. "weapon")) or 'null'.
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

Generate ONLY an object with 'head', 'legs', 'feet', 'hands' equipped items. Each field MUST be present.
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice' (as a number), 'equipSlot' (must match slot key, e.g. "head")) or 'null'.
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

Generate ONLY an object with 'neck', 'ring1', 'ring2' equipped items. Each field MUST be present.
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice' (as a number), 'equipSlot' (should be "neck" or "ring")) or 'null'. If 'equipSlot' is "ring", it's for ring1 or ring2.
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

Generate ONLY 'worldFacts': An array of 3-5 key world facts.
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
    - Each quest: 'id', 'description', 'status' ('active').
    - Optional: 'category', 'objectives' (with 'isCompleted: false').
    - MUST include 'rewards' if appropriate (experiencePoints (number), currency (number), items (each item: unique 'id', 'name', 'description', 'basePrice' (number), optional 'equipSlot' - OMIT 'equipSlot' if not equippable gear)).
Adhere to JSON schema. Output ONLY { "quests": [...] }. Ensure all numeric fields are numbers.`,
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
        - Details: 'firstEncounteredLocation' ('{{currentLocation}}'), 'relationshipStatus' (number), 'knownFacts', 'lastKnownLocation' ('{{currentLocation}}').
        - If merchant: \`isMerchant: true\`, populate \`merchantInventory\` with items (each with unique \`id\`, \`name\`, \`description\`, \`basePrice\` (number), and merchant \`price\` (number). OMIT 'equipSlot' for non-equippable items in inventory.).
    - PRE-POPULATED MAJOR NPCs (NOT in scene): For '{{seriesName}}', **prioritize** pre-populating profiles for 2-4 other major, well-known characters canonically crucial to the player character's ({{characterNameInput}}) very early experiences or the immediate starting context of the series (e.g., for a character who is known to meet certain key individuals immediately upon starting their journey in the series, those individuals should be included).
        - Details: 'firstEncounteredLocation' (canonical), 'relationshipStatus' (number), 'knownFacts', 'lastKnownLocation'.
        - If merchant: include merchant data as above.
    - For ALL NPCs: Unique 'id', 'name', 'description'. 'firstEncounteredTurnId' & 'lastSeenTurnId' = "initial_turn_0". Empty dialogue history. Optional 'seriesContextNotes', 'shortTermGoal'.
Adhere strictly to JSON schema. Output ONLY { "trackedNPCs": [...] }. Ensure item basePrices and merchant prices are numbers. RelationshipStatus must be a number.`,
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
Generate 6-8 key lore entries (keyword, content, optional category).
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
    
    if (finalOutput.storyState.character) {
      const char = finalOutput.storyState.character;
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.currency = char.currency ?? 0;
      
      char.languageUnderstanding = char.languageUnderstanding ?? 100;
    }

    if (finalOutput.storyState) {
      finalOutput.storyState.inventory = finalOutput.storyState.inventory ?? [];
      finalOutput.storyState.quests = finalOutput.storyState.quests ?? [];
      finalOutput.storyState.worldFacts = finalOutput.storyState.worldFacts ?? [];

      const defaultEquippedSlots: Record<EquipmentSlot, null> = { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null };
      const currentEquipped = finalOutput.storyState.equippedItems || {} as Record<EquipmentSlot, ItemType | null>;
      const processedEquippedItems: Record<EquipmentSlot, ItemType | null> = {...defaultEquippedSlots}; 

      for (const slotKey of Object.keys(defaultEquippedSlots) as EquipmentSlot[]) {
          const itemInSlot = currentEquipped[slotKey]; 
          processedEquippedItems[slotKey] = itemInSlot ?? null;
      }
      finalOutput.storyState.equippedItems = processedEquippedItems;

      finalOutput.storyState.trackedNPCs = finalOutput.storyState.trackedNPCs ?? [];
      finalOutput.storyState.storySummary = finalOutput.storyState.storySummary ?? "";
    }
    
    if (finalOutput.seriesStyleGuide === '' || finalOutput.seriesStyleGuide === undefined || finalOutput.seriesStyleGuide === null) delete finalOutput.seriesStyleGuide;

    return finalOutput;
  }
);

    