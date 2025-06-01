
'use server';

/**
 * @fileOverview A Genkit flow for generating an initial game scenario based on a real-life series.
 * This includes the starting scene, character state (potentially based on user input for name/class, including languageUnderstanding),
 * initial inventory, quests (with objectives, categories, and pre-defined rewards including currency), world facts,
 * a set of pre-populated lorebook entries relevant to the series, a brief series style guide,
 * initial profiles for any NPCs introduced in the starting scene or known major characters from the series (including merchant data),
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
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. Should be a positive number or zero."),
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
  currency: z.number().optional().describe("Character's starting currency (e.g., gold, credits). Initialize to a small amount like 50, or 0."),
  languageUnderstanding: z.number().optional().describe("Character's understanding of the current primary local language, on a scale of 0 (none) to 100 (fluent). Initialize appropriately for the series/character start (e.g., 0 for characters canonically starting with no understanding, 100 for most others unless specified otherwise by series lore)."),
});

const CharacterProfileSchemaInternal = CharacterCoreProfileSchemaInternal.extend({
    skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 2-3 starting skills, unique abilities, or passive traits appropriate for the character's class and the series. These should be thematically fitting and provide a starting flavor for the character's capabilities. Each skill requires an id, name, description, and type. For characters known for signature, fate-altering abilities (e.g., Subaru's 'Return by Death' in Re:Zero), ensure such an ability is included if appropriate for the specified character name/class and series."),
});

const EquipmentSlotsSchemaInternal = z.object({
  weapon: ItemSchemaInternal.nullable().describe("Weapon slot. An item object or null if empty."),
  shield: ItemSchemaInternal.nullable().describe("Shield slot. An item object or null if empty."),
  head: ItemSchemaInternal.nullable().describe("Head slot. An item object or null if empty."),
  body: ItemSchemaInternal.nullable().describe("Body slot. An item object or null if empty."),
  legs: ItemSchemaInternal.nullable().describe("Legs slot. An item object or null if empty."),
  feet: ItemSchemaInternal.nullable().describe("Feet slot. An item object or null if empty."),
  hands: ItemSchemaInternal.nullable().describe("Hands slot. An item object or null if empty."),
  neck: ItemSchemaInternal.nullable().describe("Neck slot. An item object or null if empty."),
  ring1: ItemSchemaInternal.nullable().describe("Ring 1 slot. An item object or null if empty."),
  ring2: ItemSchemaInternal.nullable().describe("Ring 2 slot. An item object or null if empty."),
}).describe("Character's equipped items. All 10 slots MUST be present, with an item object or 'null' if the slot is empty.");

const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should be false for initial quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice', and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable to reward items."),
  currency: z.number().optional().describe("Amount of currency awarded."),
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
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_series_charactername_001."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics, fitting the series."),
    classOrRole: z.string().optional().describe("e.g., 'Hokage', 'Soul Reaper Captain', 'Keyblade Master'."),
    firstEncounteredLocation: z.string().optional().describe("Location from the series where NPC is introduced, their typical location if pre-populated, or a general description like 'Known from series lore' if not a specific place."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met (use 'initial_turn_0' for all NPCs known at game start)."),
    relationshipStatus: z.number().describe("Numerical score representing relationship (e.g., -100 Hostile, 0 Neutral, 100 Allied). Set an initial appropriate value based on series context or 0 for Neutral for OCs."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player would know initially about this NPC based on the series, or empty if an OC. If this NPC is pre-populated and not directly in the scene, these facts should reflect general world knowledge/rumors, NOT direct player character knowledge from interaction."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Should be empty or omitted for initial scenario."),
    lastKnownLocation: z.string().optional().describe("Same as firstEncounteredLocation for initial setup if not directly in scene, or their current canonical location if different. If in scene, this is the current location."),
    lastSeenTurnId: z.string().optional().describe("Same as firstEncounteredTurnId for initial setup (use 'initial_turn_0')."),
    seriesContextNotes: z.string().optional().describe("Brief AI-internal note about their canon role/importance if an existing series character."),
    shortTermGoal: z.string().optional().describe("A simple, immediate goal this NPC might be pursuing. Can be set or updated by the AI based on events. Initialize as empty or a contextually relevant goal for series characters."),
    updatedAt: z.string().optional().describe("Timestamp of the last update (set to current time for new)."),
    isMerchant: z.boolean().optional().describe("Set to true if this NPC is a merchant and can buy/sell items."),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If isMerchant, a list of items the merchant has for sale. Each item includes its 'id', 'name', 'description', 'basePrice', and a 'price' they sell it for."),
    buysItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they are interested in buying (e.g., 'Herbs', 'Swords')."),
    sellsItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they typically sell (e.g., 'General Goods', 'Magic Scrolls')."),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string().describe('A specific starting location from the series relevant to the initial scene.'),
  inventory: z.array(ItemSchemaInternal).describe('Initial unequipped items relevant to the character and series. Each item must have id, name, description, and basePrice. If the item is an inherently equippable piece of gear, include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED. Can be empty. For consumable items, set `isConsumable: true` and provide `effectDescription`. For quest items, set `isQuestItem: true` and `relevantQuestId`.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("One or two initial quests that fit the series and starting scenario. Each quest is an object with id, description, status set to 'active', and optionally 'category', 'objectives' (with 'isCompleted: false'), and 'rewards' (which specify what the player will get on completion, including items with 'basePrice' and currency). These quests should be compelling and provide clear direction."),
  worldFacts: z.array(z.string()).describe('A few (3-5) key world facts from the series relevant to the start of the story, particularly those that impact the character or the immediate situation. If character.languageUnderstanding is 0, one fact should describe the effects (e.g., "Signs are unreadable, speech is incomprehensible").'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of significant NPCs. This MUST include profiles for any NPCs directly introduced in the 'sceneDescription'. Additionally, for the '{{seriesName}}' universe, you SHOULD prioritize pre-populating profiles for 2-4 other major, well-known characters who are canonically crucial to the player character's ({{characterNameInput}}) very early experiences or the immediate starting context of the series. If an NPC is a merchant, set 'isMerchant' to true and populate 'merchantInventory' with items including 'price' and 'basePrice'. For all NPCs, ensure each profile has a unique 'id', 'name', 'description', numerical 'relationshipStatus', 'firstEncounteredLocation', 'firstEncounteredTurnId' (use 'initial_turn_0' for all NPCs known at game start), 'knownFacts', an optional 'shortTermGoal', and optionally 'seriesContextNotes'. Dialogue history should be empty."),
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
  storyState: StructuredStoryStateSchemaInternal.describe('The complete initial structured state of the story, meticulously tailored to the series and specified character (if any). Includes initial NPC profiles in trackedNPCs (with merchant details if applicable), starting skills/abilities for the character, and starting currency.'),
  initialLoreEntries: z.array(RawLoreEntrySchemaInternal).describe('An array of 6-8 key lore entries (characters, locations, concepts, items, etc.) from the series to pre-populate the lorebook. Ensure content is accurate to the series and relevant to the starting scenario and character.'),
  seriesStyleGuide: z.string().optional().describe("A very brief (2-3 sentences) summary of the key themes, tone, or unique aspects of the series (e.g., 'magical high school, friendship, fighting demons' or 'gritty cyberpunk, corporate espionage, body modification') to help guide future scene generation. If no strong, distinct style is easily summarized, this can be omitted."),
});
export type GenerateScenarioFromSeriesOutput = z.infer<typeof GenerateScenarioFromSeriesOutputSchemaInternal>;

const CharacterAndSceneInputSchema = GenerateScenarioFromSeriesInputSchema;
const CharacterAndSceneOutputSchema = z.object({
    sceneDescription: GenerateScenarioFromSeriesOutputSchemaInternal.shape.sceneDescription,
    characterCore: CharacterCoreProfileSchemaInternal.describe("The character's core profile, EXCLUDING skills and abilities, which will be generated in a subsequent step. Crucially, initialize 'languageUnderstanding' based on series canon. For example, if the `seriesName` and `characterNameInput` (if provided) suggest a character who canonically starts with no understanding of the local language (e.g., an 'isekai' protagonist in their initial moments), `languageUnderstanding` MUST be set to 0. The `description` field should also reflect this. Otherwise, set to 100 (fluent) or a series-appropriate value if known. If the AI omits `languageUnderstanding`, it will be defaulted to 100 later unless specific series logic dictates otherwise."),
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
    weapon: ItemSchemaInternal.nullable().describe("Weapon slot. An item object or null if empty."),
    shield: ItemSchemaInternal.nullable().describe("Shield slot. An item object or null if empty."),
    body: ItemSchemaInternal.nullable().describe("Body slot. An item object or null if empty."),
});

const InitialSecondaryGearOutputSchema = z.object({
    head: ItemSchemaInternal.nullable().describe("Head slot. An item object or null if empty."),
    legs: ItemSchemaInternal.nullable().describe("Legs slot. An item object or null if empty."),
    feet: ItemSchemaInternal.nullable().describe("Feet slot. An item object or null if empty."),
    hands: ItemSchemaInternal.nullable().describe("Hands slot. An item object or null if empty."),
});

const InitialAccessoryGearOutputSchema = z.object({
    neck: ItemSchemaInternal.nullable().describe("Neck slot. An item object or null if empty."),
    ring1: ItemSchemaInternal.nullable().describe("Ring 1 slot. An item object or null if empty."),
    ring2: ItemSchemaInternal.nullable().describe("Ring 2 slot. An item object or null if empty."),
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
    - Health/MaxHealth (e.g., 100). Mana/MaxMana (0 if not applicable). Stats (5-15). Level 1, 0 XP, XPToNextLevel (e.g., 100). Currency (e.g., 25-50).
    - **'languageUnderstanding'**:
        - If the \`seriesName\` and \`characterNameInput\` (if provided) strongly suggest a character who canonically starts with no understanding of the local language (e.g., an 'isekai' protagonist in their initial moments, or a character known to be in a foreign land without prior knowledge of the local language), \`languageUnderstanding\` MUST be set to 0. The \`description\` field should also reflect this.
        - For other characters/series, if the series canon implies an initial language barrier for the protagonist, set 'languageUnderstanding' to 0 or a low value appropriate to the canon.
        - Otherwise, if not specified by canon for the starting situation, default 'languageUnderstanding' to 100 (fluent) or a series-appropriate value if known. If the AI omits 'languageUnderstanding', it will be defaulted to 100 in post-processing.
3.  'currentLocation': A specific, recognizable starting location from "{{seriesName}}".

Output ONLY the JSON object for CharacterAndSceneOutputSchema.`,
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
- Each item: unique 'id', 'name', 'description', 'basePrice'.
- 'equipSlot' if equippable gear, OMITTED otherwise.
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
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice', 'equipSlot') or 'null'.
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
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice', 'equipSlot') or 'null'.
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
- Each slot: item object (unique 'id', 'name', 'description', 'basePrice', 'equipSlot') or 'null'.
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
Skills: {{#each character.skillsAndAbilities}} - {{this.name}}: {{this.description}} {{/each}}
Scene: {{sceneDescription}}
Location: {{currentLocation}}

**Contextual Quest Generation Guidance:**
-   Consider the character's immediate situation, background, and the canonical starting point of the series for this character, if known.
-   If 'character.languageUnderstanding' is very low (e.g., < 10, common for characters new to a world), initial quests MUST relate to this barrier or basic orientation, e.g., "Try to understand what's happening", "Find a way to communicate", "Seek immediate shelter or safety." Avoid quests requiring complex interaction or understanding tasks from unknown entities unless that is a core part of the canonical start.
-   For other characters, quests should feel like natural next steps from the 'sceneDescription' and 'currentLocation', and align with the series' initial plot if applicable.

Generate ONLY 'quests': 1-2 initial quests.
    - Each quest: 'id', 'description', 'status' ('active').
    - Optional: 'category', 'objectives' ('isCompleted: false').
    - MUST include 'rewards' if appropriate (experiencePoints, currency, items with 'basePrice').
Adhere to JSON schema. Output ONLY { "quests": [...] }.`,
    });

    const initialTrackedNPCsPrompt = ai.definePrompt({
        name: 'initialTrackedNPCsPrompt',
        model: modelName,
        input: { schema: InitialTrackedNPCsInputSchema },
        output: { schema: InitialTrackedNPCsOutputSchema },
        prompt: `For a story in "{{seriesName}}" starting with:
Player Character: {{character.name}} ({{character.class}}, Currency: {{character.currency}}, Language: {{character.languageUnderstanding}}/100) - Skills: {{#each character.skillsAndAbilities}} - {{this.name}}: {{this.description}} {{/each}}
Initial Scene: {{sceneDescription}}
Player's Starting Location: {{currentLocation}}

Generate ONLY 'trackedNPCs': A list of NPC profiles.
    - NPCs IN THE SCENE: For any NPC directly mentioned or interacting in the 'Initial Scene':
        - Details: 'firstEncounteredLocation' ('{{currentLocation}}'), 'relationshipStatus', 'knownFacts', 'lastKnownLocation' ('{{currentLocation}}').
        - If merchant: \`isMerchant: true\`, populate \`merchantInventory\` with items (each with unique \`id\`, \`name\`, \`description\`, \`basePrice\`, and merchant \`price\`).
    - PRE-POPULATED MAJOR NPCs (NOT in scene): For '{{seriesName}}', **prioritize** pre-populating profiles for 2-4 other major, well-known characters canonically crucial to the player character's ({{characterNameInput}}) very early experiences or the immediate starting context of the series (e.g., for a character who is known to meet certain key individuals immediately upon starting their journey in the series, those individuals should be included).
        - Details: 'firstEncounteredLocation' (canonical), 'relationshipStatus', 'knownFacts', 'lastKnownLocation'.
        - If merchant: include merchant data.
    - For ALL NPCs: Unique 'id', 'name', 'description'. 'firstEncounteredTurnId' & 'lastSeenTurnId' = "initial_turn_0". Empty dialogue history. Optional 'seriesContextNotes', 'shortTermGoal'.
Adhere strictly to JSON schema. Output ONLY { "trackedNPCs": [...] }. Ensure item basePrices and merchant prices are set.`,
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
    characterCore.strength = characterCore.strength ?? 10;
    characterCore.dexterity = characterCore.dexterity ?? 10;
    characterCore.constitution = characterCore.constitution ?? 10;
    characterCore.intelligence = characterCore.intelligence ?? 10;
    characterCore.wisdom = characterCore.wisdom ?? 10;
    characterCore.charisma = characterCore.charisma ?? 10;
    characterCore.currency = characterCore.currency ?? 0;
    characterCore.languageUnderstanding = characterCore.languageUnderstanding ?? 100; // Default to fluent if AI omits
    // Ensure languageUnderstanding is within bounds
    if (characterCore.languageUnderstanding < 0) characterCore.languageUnderstanding = 0;
    if (characterCore.languageUnderstanding > 100) characterCore.languageUnderstanding = 100;


    const skillsInput: z.infer<typeof InitialCharacterSkillsInputSchema> = {
        seriesName: mainInput.seriesName,
        characterName: characterCore.name,
        characterClass: characterCore.class,
        characterDescription: characterCore.description,
    };
    const { output: skillsOutput } = await initialCharacterSkillsPrompt(skillsInput);
    const characterSkills = skillsOutput?.skillsAndAbilities || [];

    const fullCharacterProfile: z.infer<typeof CharacterProfileSchemaInternal> = {
        ...characterCore, // characterCore now has defaults applied
        skillsAndAbilities: characterSkills,
    };
    
    const minimalContextForItemsFactsInput: z.infer<typeof MinimalContextForItemsFactsInputSchema> = {
        seriesName: mainInput.seriesName,
        character: { 
            name: fullCharacterProfile.name, 
            class: fullCharacterProfile.class, 
            description: fullCharacterProfile.description,
            currency: fullCharacterProfile.currency, // Already defaulted
            languageUnderstanding: fullCharacterProfile.languageUnderstanding, // Already defaulted and clamped
        },
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
    
    // Final robust post-processing for the character object
    if (finalOutput.storyState.character) {
      const char = finalOutput.storyState.character;
      // Defaults are re-applied here defensively, though characterCore should have them.
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.strength = char.strength ?? 10;
      char.dexterity = char.dexterity ?? 10;
      char.constitution = char.constitution ?? 10;
      char.intelligence = char.intelligence ?? 10;
      char.wisdom = typeof char.wisdom === 'number' ? Math.round(char.wisdom) : 10;
      char.charisma = char.charisma ?? 10;
      char.level = char.level ?? 1;
      char.experiencePoints = char.experiencePoints ?? 0;
      char.experienceToNextLevel = char.experienceToNextLevel ?? 100;
      if (char.experienceToNextLevel <= 0) char.experienceToNextLevel = 100;
      char.currency = char.currency ?? 0;
      if (char.currency < 0) char.currency = 0;
      
      char.languageUnderstanding = char.languageUnderstanding ?? 100;
      if (char.languageUnderstanding < 0) char.languageUnderstanding = 0;
      if (char.languageUnderstanding > 100) char.languageUnderstanding = 100;
      
      char.skillsAndAbilities = char.skillsAndAbilities ?? [];
      const skillIdSet = new Set<string>();
      char.skillsAndAbilities.forEach((skill, index) => {
        let baseId = skill.id || `skill_generated_scenario_${skill.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
        let newId = baseId;
        let counter = 0;
        while(skillIdSet.has(newId)){ newId = `${baseId}_u${counter++}`; }
        skill.id = newId;
        skillIdSet.add(skill.id);
        skill.name = skill.name || "Unnamed Skill";
        skill.description = skill.description || "No description provided.";
        skill.type = skill.type || "Generic";
      });
    }

    // Final robust post-processing for other parts of storyState
    if (finalOutput.storyState) {
      finalOutput.storyState.inventory = finalOutput.storyState.inventory ?? [];
      const itemInvIdSet = new Set<string>();
      finalOutput.storyState.inventory.forEach((item, index) => {
        let baseId = item.id || `item_generated_inv_scenario_${Date.now()}_${Math.random().toString(36).substring(7)}_${index}`;
        let newId = baseId;
        let counter = 0;
        while(itemInvIdSet.has(newId)){ newId = `${baseId}_u${counter++}`; }
        item.id = newId;
        itemInvIdSet.add(item.id);
        if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
        if (item.isConsumable === undefined) delete item.isConsumable;
        if (item.effectDescription === undefined || item.effectDescription === '') delete item.effectDescription;
        if (item.isQuestItem === undefined) delete item.isQuestItem;
        if (item.relevantQuestId === undefined || item.relevantQuestId === '') delete item.relevantQuestId;
        item.basePrice = item.basePrice ?? 0;
        if (item.basePrice < 0) item.basePrice = 0;
      });

      finalOutput.storyState.quests = finalOutput.storyState.quests ?? [];
      const questIdSet = new Set<string>();
      finalOutput.storyState.quests.forEach((quest, index) => {
        let baseId = quest.id || `quest_series_generated_scenario_${Date.now()}_${index}`;
        let newId = baseId;
        let counter = 0;
        while(questIdSet.has(newId)){ newId = `${baseId}_u${counter++}`; }
        quest.id = newId;
        questIdSet.add(quest.id);
        if (!quest.status) quest.status = 'active';
        if (quest.category === null || (quest.category as unknown) === '') delete (quest as Partial<QuestType>).category;
        quest.objectives = quest.objectives ?? [];
        quest.objectives.forEach(obj => {
          if (typeof obj.isCompleted !== 'boolean') obj.isCompleted = false;
          if (typeof obj.description !== 'string' || obj.description.trim() === '') obj.description = "Objective details missing";
        });
        if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            const questRewardItemIdSet = new Set<string>();
            quest.rewards.items.forEach((rewardItem, rIndex) => {
              let baseRId = rewardItem.id || `item_reward_scenario_${Date.now()}_${Math.random().toString(36).substring(7)}_${rIndex}`;
              let newRId = baseRId;
              let rCounter = 0;
              while(questRewardItemIdSet.has(newRId) || itemInvIdSet.has(newRId)) { newRId = `${baseRId}_u${rCounter++}`; }
              rewardItem.id = newRId;
              questRewardItemIdSet.add(rewardItem.id);
              if (rewardItem.equipSlot === null || (rewardItem.equipSlot as unknown) === '') delete (rewardItem as Partial<ItemType>).equipSlot;
              if (rewardItem.isConsumable === undefined) delete rewardItem.isConsumable;
              if (rewardItem.effectDescription === undefined || rewardItem.effectDescription === '') delete rewardItem.effectDescription;
              if (rewardItem.isQuestItem === undefined) delete rewardItem.isQuestItem;
              if (rewardItem.relevantQuestId === undefined || rewardItem.relevantQuestId === '') delete rewardItem.relevantQuestId;
              rewardItem.basePrice = rewardItem.basePrice ?? 0;
              if (rewardItem.basePrice < 0) rewardItem.basePrice = 0;
            });
            quest.rewards.currency = quest.rewards.currency ?? undefined;
             if (quest.rewards.currency !== undefined && quest.rewards.currency < 0) quest.rewards.currency = 0;
            if (!quest.rewards.experiencePoints && quest.rewards.items.length === 0 && quest.rewards.currency === undefined) delete quest.rewards;
            else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (quest.rewards.items.length === 0) delete quest.rewards.items;
                if (quest.rewards.currency === undefined) delete quest.rewards.currency;
            }
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
            let baseEqId = itemInSlot.id || `item_generated_equip_scenario_${Date.now()}_${Math.random().toString(36).substring(7)}_${slotKey}`;
            let newEqId = baseEqId;
            let eqCounter = 0;
            while(equippedItemIdSet.has(newEqId) || itemInvIdSet.has(newEqId)) { newEqId = `${baseEqId}_u${eqCounter++}`; }
            itemInSlot.id = newEqId;
            equippedItemIdSet.add(newEqId);
            if (!itemInSlot.equipSlot || (itemInSlot.equipSlot as unknown) === '') {
                 if (slotKey === 'ring1' || slotKey === 'ring2') itemInSlot.equipSlot = 'ring';
                 else if (EquipSlotEnumInternal.safeParse(slotKey).success) itemInSlot.equipSlot = slotKey as typeof EquipSlotEnumInternal._type;
                 else delete (itemInSlot as Partial<ItemType>).equipSlot; 
            }
            delete (itemInSlot as Partial<ItemType>)!.isConsumable;
            delete (itemInSlot as Partial<ItemType>)!.effectDescription;
            delete (itemInSlot as Partial<ItemType>)!.isQuestItem;
            delete (itemInSlot as Partial<ItemType>)!.relevantQuestId;
            itemInSlot.basePrice = itemInSlot.basePrice ?? 0;
            if (itemInSlot.basePrice < 0) itemInSlot.basePrice = 0;
            processedEquippedItems[slotKey] = itemInSlot;
          } else {
            processedEquippedItems[slotKey] = null; 
          }
      }
      finalOutput.storyState.equippedItems = processedEquippedItems;

      finalOutput.storyState.trackedNPCs = finalOutput.storyState.trackedNPCs ?? [];
      const npcIdSet = new Set<string>();
      finalOutput.storyState.trackedNPCs.forEach((npc, index) => {
          let baseId = npc.id || `npc_scenario_${npc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
          let newId = baseId;
          let counter = 0;
          while(npcIdSet.has(newId)) { newId = `${baseId}_u${counter++}`; }
          npc.id = newId;
          npcIdSet.add(npc.id);
          npc.name = npc.name || "Unnamed NPC";
          npc.description = npc.description || "No description provided.";
          npc.relationshipStatus = typeof npc.relationshipStatus === 'number' ? Math.max(-100, Math.min(100, npc.relationshipStatus)) : 0;
          npc.knownFacts = npc.knownFacts ?? [];
          npc.dialogueHistory = npc.dialogueHistory ?? [];
          npc.firstEncounteredTurnId = npc.firstEncounteredTurnId || "initial_turn_0";
          npc.updatedAt = new Date().toISOString(); 
          npc.lastKnownLocation = npc.lastKnownLocation || npc.firstEncounteredLocation; 
          npc.lastSeenTurnId = npc.lastSeenTurnId || npc.firstEncounteredTurnId; 
          if (npc.classOrRole === null || (npc.classOrRole as unknown) === '') delete npc.classOrRole;
          if (npc.firstEncounteredLocation === null || (npc.firstEncounteredLocation as unknown) === '') delete npc.firstEncounteredLocation;
          if (npc.lastKnownLocation === null || (npc.lastKnownLocation as unknown) === '') delete npc.lastKnownLocation;
          if (npc.seriesContextNotes === null || (npc.seriesContextNotes as unknown) === '') delete npc.seriesContextNotes;
          if (npc.shortTermGoal === null || (npc.shortTermGoal as unknown) === '') delete npc.shortTermGoal;
          npc.isMerchant = npc.isMerchant ?? false;
          npc.merchantInventory = npc.merchantInventory ?? [];
          const merchantItemInvIdSet = new Set<string>();
          npc.merchantInventory.forEach((item, mIndex) => {
            let baseMId = item.id || `item_merchant_scen_${Date.now()}_${Math.random().toString(36).substring(7)}_${mIndex}`;
            let newMId = baseMId; let mCounter = 0;
            while(merchantItemInvIdSet.has(newMId) || itemInvIdSet.has(newMId) || equippedItemIdSet.has(newMId)){ newMId = `${baseMId}_u${mCounter++}`; }
            item.id = newMId;
            merchantItemInvIdSet.add(newMId);
            item.basePrice = item.basePrice ?? 0;
            if (item.basePrice < 0) item.basePrice = 0;
            (item as any).price = (item as any).price ?? item.basePrice;
            if ((item as any).price < 0) (item as any).price = 0;
            if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
          });
          npc.buysItemTypes = npc.buysItemTypes ?? undefined;
          npc.sellsItemTypes = npc.sellsItemTypes ?? undefined;
      });
      finalOutput.storyState.storySummary = finalOutput.storyState.storySummary ?? "";
    }

    if (finalOutput.initialLoreEntries) {
        finalOutput.initialLoreEntries.forEach(entry => {
            if (entry.category === null || (entry.category as unknown) === '') delete (entry as Partial<RawLoreEntry>).category;
        });
    }
    
    if (finalOutput.seriesStyleGuide === '' || finalOutput.seriesStyleGuide === undefined) delete finalOutput.seriesStyleGuide;

    return finalOutput;
  }
);

