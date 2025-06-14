
'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story, including character creation with core stats, mana, level, XP, initial empty equipment, initial quests (with optional objectives, categories, and pre-defined rewards), initial tracked NPCs, starting skills/abilities, and separate languageReading/languageSpeaking skills.
 * THIS FLOW IS NOW LARGELY SUPERSEDED BY generateScenarioFoundation.ts + generateScenarioNarrativeElements.ts for series-based starts. Supports model selection.
 *
 * - generateStoryStart - A function that generates the initial scene description and story state.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z}from 'zod';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, Skill as SkillType, StoryArc as StoryArcType, GenerateStoryStartInput as GenerateStoryStartInputType, GenerateStoryStartOutput as GenerateStoryStartOutputType, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType, TemporaryEffect } from '@/types/story'; // StoryArcType
import { EquipSlotEnumInternal } from '@/types/zod-schemas';

const ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("Unique ID for this specific effect on this item instance, e.g., 'effect_sword_fire_dmg_001'. REQUIRED."),
  name: z.string().describe("Descriptive name of the effect, e.g., 'Fiery Aura', 'Eagle Eye'. REQUIRED."),
  description: z.string().describe("Narrative description of what the effect does or looks like. REQUIRED."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("Type of effect. For now, prioritize 'stat_modifier' or 'passive_aura' for equippable gear. REQUIRED."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number().int().describe("Number of turns the effect lasts (for consumables, should be positive).")]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a positive integer (representing turns) for temporary effects from consumables."),
  statModifiers: z.array(StatModifierSchemaInternal).optional().describe("If type is 'stat_modifier', an array of specific stat changes. Each must include 'stat', 'value' (number), and 'type' ('add' or 'multiply')."),
  sourceItemId: z.string().optional().describe("The ID of the item granting this effect (auto-filled by system if needed)."),
});

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory if any items are pre-assigned (though typically inventory starts empty). REQUIRED."),
  name: z.string().describe("The name of the item. REQUIRED."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function. REQUIRED."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If it is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect. For equippable gear with complex effects, prefer using 'activeEffects'."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. MUST BE a number if provided."),
  rarity: ItemRarityEnumInternal.optional().describe("The rarity of the item (e.g., 'common', 'uncommon', 'rare'). Most starting items should be 'common'."),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional().describe("An array of structured active effects this item provides. For equippable gear, these might include 'stat_modifier' effects with 'duration: permanent_while_equipped'. For consumables granting temporary buffs, define 'stat_modifier' effects here and provide a numeric 'duration' (e.g., 3 for 3 turns, should be positive). Each effect needs a unique id, name, description, type. If 'stat_modifier', include 'statModifiers' array detailing changes."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_basic_strike_001'. REQUIRED."),
    name: z.string().describe("The name of the skill or ability. REQUIRED."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or its basic effect. REQUIRED."),
    type: z.string().describe("A category for the skill, e.g., 'Combat', 'Utility', 'Passive', 'Racial Trait'. REQUIRED.")
});

const TemporaryEffectSchemaInternal = ActiveEffectSchemaInternal.extend({
    turnsRemaining: z.number().int().describe("Number of turns remaining for this effect (should be non-negative). REQUIRED."),
});


const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character. REQUIRED.'),
  class: z.string().describe('The class or archetype of the character. REQUIRED.'),
  description: z.string().describe('A brief backstory or description of the character. REQUIRED.'),
  health: z.number().describe('Current health points of the character. REQUIRED. MUST BE a number.'),
  maxHealth: z.number().describe('Maximum health points of the character. REQUIRED. MUST BE a number.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Assign 0 if not applicable to the class, or omit. MUST BE a number if provided.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Assign 0 if not applicable, or omit. MUST BE a number if provided.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Affects health. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory. Affects mana for magic users. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Affects mana regeneration or spell effectiveness. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  level: z.number().describe('The current level of the character. Initialize to 1. REQUIRED. MUST BE a number.'),
  experiencePoints: z.number().describe('Current experience points. Initialize to 0. REQUIRED. MUST BE a number.'),
  experienceToNextLevel: z.number().describe('Experience points needed to reach the next level. Initialize to a starting value, e.g., 100. REQUIRED. MUST BE a number.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 1-2 starting skills or abilities appropriate for the character's class. Each skill requires an id, name, description, and type."),
  currency: z.number().optional().describe("Character's starting currency (e.g., gold). Initialize to a small amount like 50, or 0. MUST BE a number if provided."),
  languageReading: z.number().optional().describe("Character's understanding of written local language (0-100). For generic starts, default to 100 unless the prompt implies a barrier, then set to a low value like 0-10. MUST BE a number if provided."),
  languageSpeaking: z.number().optional().describe("Character's understanding of spoken local language (0-100). For generic starts, default to 100 unless the prompt implies a barrier, then set to a low value like 0-10. MUST BE a number if provided."),
  activeTemporaryEffects: z.array(TemporaryEffectSchemaInternal).optional().describe("List of temporary buffs or debuffs currently affecting the character (should be non-negative turns remaining). Typically empty at game start. Managed by game logic."),
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
}).describe("A record of the character's equipped items. All 10 slots MUST be present, with an item object (including 'id', 'name', 'description', 'basePrice' (number), optional 'rarity', 'activeEffects' (if any, include numeric duration (should be positive) for consumables), and 'equipSlot' if applicable) or 'null'. REQUIRED.");

const QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest. REQUIRED."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should usually be false for new quests). REQUIRED.")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item needs id, name, description, basePrice (number), optional rarity, optional activeEffects (numeric duration (should be positive) for consumables), etc."),
  currency: z.number().optional().describe("Amount of currency awarded. MUST BE a number if provided."),
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_generic_001'. REQUIRED."),
  title: z.string().optional().describe("A short, engaging title for the quest."),
  description: z.string().describe("A clear description of the quest's overall objective. REQUIRED."),
  type: z.enum(['main', 'side', 'dynamic', 'arc_goal']).describe("The type of quest. REQUIRED."), // arc_goal
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests. REQUIRED."),
  storyArcId: z.string().optional().describe("If a 'main' quest, the ID of the Story Arc it belongs to."), // Renamed
  orderInStoryArc: z.number().optional().describe("If a 'main' quest, its suggested sequence within the Story Arc."), // Renamed
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Tutorial'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional(),
  updatedAt: z.string().optional().describe("Timestamp of the last update to this quest."),
});

const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional(),
    npcResponse: z.string().describe("REQUIRED."),
    turnId: z.string().describe("REQUIRED."),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context. MUST BE a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_bartender_giles_001. REQUIRED."),
    name: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    classOrRole: z.string().optional(),
    firstEncounteredLocation: z.string().optional(),
    firstEncounteredTurnId: z.string().optional().describe("Use 'initial_turn_0' for NPCs known at game start."),
    relationshipStatus: z.number().describe("Numerical score for relationship. REQUIRED. MUST BE a number."),
    knownFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional(),
    lastKnownLocation: z.string().optional(),
    lastSeenTurnId: z.string().optional().describe("Use 'initial_turn_0' for NPCs known at game start."),
    seriesContextNotes: z.string().optional(),
    shortTermGoal: z.string().optional(),
    updatedAt: z.string().optional(),
    isMerchant: z.boolean().optional(),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If merchant, list items for sale. Each needs id, name, description, basePrice (number), optional rarity, and price (number). Also include 'activeEffects' (numeric duration (should be positive) for consumables) if any."),
    buysItemTypes: z.array(z.string()).optional(),
    sellsItemTypes: z.array(z.string()).optional(),
});

// Renamed from ChapterSchemaInternal
const StoryArcSchemaInternal = z.object({
    id: z.string().describe("REQUIRED."),
    title: z.string().describe("REQUIRED."),
    description: z.string().describe("REQUIRED."),
    order: z.number().describe("REQUIRED."),
    mainQuestIds: z.array(z.string()).describe("REQUIRED (can be empty array)."),
    isCompleted: z.boolean().describe("REQUIRED."),
    unlockCondition: z.string().optional(),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe("REQUIRED."),
  currentLocation: z.string().describe("REQUIRED."),
  inventory: z.array(ItemSchemaInternal).describe("REQUIRED (can be empty array). List of unequipped items. Each item requires id, name, description, basePrice (number), optional rarity, and optional 'activeEffects' (if any, include statModifiers with numeric values, and numeric duration (should be positive) for consumables)."),
  equippedItems: EquipmentSlotsSchemaInternal.describe("REQUIRED."),
  quests: z.array(QuestSchemaInternal).describe("REQUIRED (can be empty array). List of quests. Rewards items should also include optional 'activeEffects' (numeric duration (should be positive) for consumables) and 'rarity'."),
  storyArcs: z.array(StoryArcSchemaInternal).optional().describe("Optional array of story arcs."), // Renamed
  currentStoryArcId: z.string().optional().describe("Optional ID of the active story arc."), // Renamed
  worldFacts: z.array(z.string()).describe("REQUIRED (can be empty array)."),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("REQUIRED (can be empty array). NPCs encountered. Merchant inventory items also need optional 'activeEffects' (numeric duration (should be positive) for consumables) and 'rarity'."),
  storySummary: z.string().optional().describe("Optional running story summary."),
});

const GenerateStoryStartInputSchemaInternal = z.object({
  prompt: z.string(),
  characterNameInput: z.string().optional(),
  characterClassInput: z.string().optional(),
  usePremiumAI: z.boolean().optional(),
});

const GenerateStoryStartOutputSchemaInternal = z.object({
  sceneDescription: z.string().describe("REQUIRED."),
  storyState: StructuredStoryStateSchemaInternal.describe("REQUIRED."),
});

export async function generateStoryStart(input: GenerateStoryStartInputType): Promise<GenerateStoryStartOutputType> {
  return generateStoryStartFlow(input);
}

const generateStoryStartFlow = ai.defineFlow(
  {
    name: 'generateStoryStartFlow',
    inputSchema: GenerateStoryStartInputSchemaInternal,
    outputSchema: GenerateStoryStartOutputSchemaInternal,
  },
  async (input: GenerateStoryStartInputType) => {
    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;
    const modelConfig = input.usePremiumAI
        ? { maxOutputTokens: 32000 }
        : { maxOutputTokens: 8000 };

    const storyStartPrompt = ai.definePrompt({
        name: 'generateStoryStartPrompt',
        model: modelName,
        input: {schema: GenerateStoryStartInputSchemaInternal},
        output: {schema: GenerateStoryStartOutputSchemaInternal},
        config: modelConfig,
        prompt: `IMPORTANT_INSTRUCTION: Your entire response MUST be a single, valid JSON object that strictly adheres to the 'GenerateStoryStartOutputSchemaInternal'. ALL non-optional fields defined in the schema (marked as REQUIRED in their descriptions or by Zod schema structure) MUST be present in your output, including nested required fields (e.g., CharacterProfile's name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel; Item's id, name, description; Quest's id, description, type, status; EquipmentSlots having all 10 slots specified as item or null). ALL fields (including optional ones if you choose to include them) MUST use the correct data types as specified in their descriptions (e.g., numbers for prices, stats, currency; strings for names; booleans where appropriate). IDs for items, quests, skills, and NPCs MUST be unique.

Theme: "{{prompt}}".
User suggestions: Character Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(None provided){{/if}}, Character Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(None provided){{/if}}.

Based on the theme and user suggestions, generate the following, ensuring all REQUIRED fields in 'GenerateStoryStartOutputSchemaInternal' are populated:
1.  'sceneDescription': An engaging initial scene for the story. (REQUIRED)
2.  'storyState': The complete initial structured state: (REQUIRED)
    a.  'character': (Profile fields as described in CharacterProfileSchemaInternal - name, class, description, health, maxHealth, level, experiencePoints, experienceToNextLevel are REQUIRED. 'activeTemporaryEffects' should be an empty array \`[]\`. Other fields are optional but encouraged.)
    b.  'currentLocation': A fitting starting location string. (REQUIRED)
    c.  'inventory': An array of starting items. Typically initialize as an empty array \`[]\`. If items are included, each MUST have a unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), and optional 'rarity'. 'equipSlot' MUST BE OMITTED if the item is not inherently equippable gear. For consumables (e.g. potions) providing temporary buffs, 'activeEffects' should include 'statModifiers' and a numeric 'duration' (in turns, should be positive).
    d.  'equippedItems': All 10 equipment slots ('weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2') MUST be present, each 'null' or an item object. If an item, it MUST have 'id', 'name', 'description', 'equipSlot', 'basePrice' (number), optional 'rarity', and optional 'activeEffects' (with 'duration: "permanent_while_equipped"' for gear).
    e.  'quests': An array of initial quests (can be empty). If included, each quest MUST have 'id', 'description', 'type', 'status: "active"'. 'title', 'category', 'objectives' are optional. Rewards (if any) MUST use numeric values for 'experiencePoints' and 'currency', and items in rewards follow the same structure as inventory items (including potential 'activeEffects' with numeric 'duration' (should be positive) for consumables).
    f.  'storyArcs': Optionally, a single 'Prologue' or 'Introduction' story arc. If included, each story arc MUST have 'id', 'title', 'description', 'order', 'mainQuestIds' (can be empty), 'isCompleted'. (Optional array)
    g.  'currentStoryArcId': If story arcs are included, set to the initial story arc's ID. (Optional)
    h.  'worldFacts': 1-2 key facts. If language skills are low, include facts about the barrier. (REQUIRED field, can be empty array)
    i.  'trackedNPCs': Array of NPC profiles (can be empty). If an NPC is included, it MUST have 'id', 'name', 'description', 'relationshipStatus', 'knownFacts' (can be empty array). If an NPC is a merchant, their 'merchantInventory' items should also follow the full item structure (including optional 'activeEffects' with numeric 'duration' (should be positive) for consumables).
    j.  'storySummary': Initialize as an empty string "" or a very brief thematic intro. (Optional)

Output ONLY the JSON object adhering to 'GenerateStoryStartOutputSchemaInternal'. Ensure all item definitions (inventory, equipped, rewards, merchant stock) include optional 'rarity' and may include 'activeEffects' (with correctly structured 'statModifiers' if type is 'stat_modifier', and appropriate 'duration' like 'permanent_while_equipped' for gear, or numeric turns (should be positive) for consumables).
`,
    });

    const {output} = await storyStartPrompt(input);
    if (!output) throw new Error("Failed to generate story start output.");

    // Basic Sanitation for key numeric and structural fields.
    if (output.storyState.character) {
      const char = output.storyState.character;
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.currency = char.currency ?? 0;
      char.languageReading = char.languageReading ?? 100;
      char.languageSpeaking = char.languageSpeaking ?? 100;
      char.skillsAndAbilities = char.skillsAndAbilities ?? [];
      char.activeTemporaryEffects = char.activeTemporaryEffects ?? []; // Initialize
    }

    output.storyState.inventory = output.storyState.inventory ?? [];
    output.storyState.inventory.forEach((item: Partial<ItemType>) => {
        if (!item.id) item.id = `item_inv_start_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        item.basePrice = item.basePrice ?? 0;
        item.activeEffects = item.activeEffects ?? [];
        item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
            if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
            effect.name = effect.name || "Unnamed Effect";
            effect.description = effect.description || "No effect description";
            effect.type = effect.type || "passive_aura";
            effect.statModifiers = effect.statModifiers ?? [];
            effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                if (typeof mod.value !== 'number') mod.value = 0;
                if (!mod.type) mod.type = 'add';
            });
            if (typeof effect.duration === 'number' && effect.duration <= 0) {
                effect.duration = 1; // Ensure positive duration for consumables
            }
        });
    });

    const defaultSlots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
    output.storyState.equippedItems = output.storyState.equippedItems || {};
    defaultSlots.forEach(slot => {
        const item = output.storyState.equippedItems[slot] as Partial<ItemType> | null | undefined;
        if (item) {
            if (!item.id) item.id = `item_eqp_start_${slot}_${Date.now()}`;
            item.basePrice = item.basePrice ?? 0;
            item.activeEffects = item.activeEffects ?? [];
            item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
                if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
                effect.name = effect.name || "Unnamed Effect";
                effect.description = effect.description || "No effect description";
                effect.type = effect.type || "passive_aura";
                effect.duration = effect.duration ?? 'permanent_while_equipped'; // Default to permanent for equipped
                effect.statModifiers = effect.statModifiers ?? [];
                effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                    if (typeof mod.value !== 'number') mod.value = 0;
                    if (!mod.type) mod.type = 'add';
                });
            });
        } else {
            (output.storyState.equippedItems as any)[slot] = null;
        }
    });


    output.storyState.quests = output.storyState.quests ?? [];
    output.storyState.quests.forEach(quest => {
      if (quest.rewards && quest.rewards.items) {
        quest.rewards.items.forEach((item: Partial<ItemType>) => {
          if (!item.id) item.id = `item_reward_start_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          item.basePrice = item.basePrice ?? 0;
          item.activeEffects = item.activeEffects ?? [];
           item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
                if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
                effect.name = effect.name || "Unnamed Effect";
                effect.description = effect.description || "No effect description";
                effect.type = effect.type || "passive_aura";
                effect.statModifiers = effect.statModifiers ?? [];
                effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                    if (typeof mod.value !== 'number') mod.value = 0;
                    if (!mod.type) mod.type = 'add';
                });
                if (typeof effect.duration === 'number' && effect.duration <= 0) {
                   effect.duration = 1;
                }
            });
        });
      }
    });

    output.storyState.trackedNPCs = output.storyState.trackedNPCs ?? [];
    output.storyState.trackedNPCs.forEach(npc => {
        npc.knownFacts = npc.knownFacts ?? [];
        if (npc.merchantInventory) {
            npc.merchantInventory.forEach((item: Partial<ItemType>) => {
                 if (!item.id) item.id = `item_merch_start_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                item.basePrice = item.basePrice ?? 0;
                (item as any).price = (item as any).price ?? item.basePrice;
                item.activeEffects = item.activeEffects ?? [];
                item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
                    if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
                    effect.name = effect.name || "Unnamed Effect";
                    effect.description = effect.description || "No effect description";
                    effect.type = effect.type || "passive_aura";
                    effect.statModifiers = effect.statModifiers ?? [];
                    effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                        if (typeof mod.value !== 'number') mod.value = 0;
                        if (!mod.type) mod.type = 'add';
                    });
                    if (typeof effect.duration === 'number' && effect.duration <= 0) {
                       effect.duration = 1;
                    }
                });
            });
        }
    });

    output.storyState.worldFacts = output.storyState.worldFacts ?? [];
    output.storyState.storyArcs = output.storyState.storyArcs ?? []; // Renamed


    return output!;
  }
);


    