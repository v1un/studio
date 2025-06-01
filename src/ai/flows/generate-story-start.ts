
'use server';

/**
 * @fileOverview A flow for generating the initial scene of an interactive story, including character creation with core stats, mana, level, XP, initial empty equipment, initial quests (with optional objectives, categories, and pre-defined rewards), initial tracked NPCs, starting skills/abilities, and separate languageReading/languageSpeaking skills.
 * THIS FLOW IS NOW LARGELY SUPERSEDED BY generateScenarioFromSeries.ts for series-based starts. Supports model selection.
 *
 * - generateStoryStart - A function that generates the initial scene description and story state.
 * - GenerateStoryStartInput - The input type for the generateStoryStart function.
 * - GenerateStoryStartOutput - The return type for the generateStoryStart function.
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z}from 'zod';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, NPCProfile as NPCProfileType, Skill as SkillType, GenerateStoryStartInput as GenerateStoryStartInputType, GenerateStoryStartOutput as GenerateStoryStartOutputType, ItemRarity, ActiveEffect as ActiveEffectType, StatModifier as StatModifierType } from '@/types/story'; // Use exported types
import { EquipSlotEnumInternal } from '@/types/zod-schemas';

const ItemRarityEnumInternal = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const StatModifierSchemaInternal = z.object({
  stat: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'maxHealth', 'maxMana', 'health', 'mana', 'level', 'experiencePoints', 'currency', 'languageReading', 'languageSpeaking']),
  value: z.number(),
  type: z.enum(['add', 'multiply']),
  description: z.string().optional(),
});

const ActiveEffectSchemaInternal = z.object({
  id: z.string().describe("Unique ID for this specific effect on this item instance, e.g., 'effect_sword_fire_dmg_001'."),
  name: z.string().describe("Descriptive name of the effect, e.g., 'Fiery Aura', 'Eagle Eye'."),
  description: z.string().describe("Narrative description of what the effect does or looks like."),
  type: z.enum(['stat_modifier', 'temporary_ability', 'passive_aura']).describe("Type of effect. For now, prioritize 'stat_modifier' or 'passive_aura' for equippable gear."),
  duration: z.union([z.string().describe("Use 'permanent_while_equipped' for ongoing effects from gear."), z.number()]).optional().describe("Duration of the effect. Use 'permanent_while_equipped' for ongoing effects from gear. Use a number (representing turns) for temporary effects."),
  statModifiers: z.array(StatModifierSchemaInternal).optional().describe("If type is 'stat_modifier', an array of specific stat changes. Each must include 'stat', 'value' (number), and 'type' ('add' or 'multiply')."),
  sourceItemId: z.string().optional().describe("The ID of the item granting this effect (auto-filled by system if needed)."),
});

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Make it unique within the current inventory if any items are pre-assigned (though typically inventory starts empty)."),
  name: z.string().describe("The name of the item."),
  description: z.string().describe("A brief description of the item, its appearance, or its basic function."),
  equipSlot: EquipSlotEnumInternal.optional().describe("If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), specify the slot it occupies. Examples: 'weapon', 'head', 'body', 'ring'. If it is not an equippable type of item (e.g., a potion, a key, a generic diary/book), this field MUST BE OMITTED ENTIRELY."),
  isConsumable: z.boolean().optional().describe("True if the item is consumed on use (e.g., potion, scroll)."),
  effectDescription: z.string().optional().describe("Briefly describes the item's effect when used (e.g., 'Restores health', 'Reveals hidden paths'). Relevant if isConsumable or has a direct use effect. For equippable gear with complex effects, prefer using 'activeEffects'."),
  isQuestItem: z.boolean().optional().describe("True if this item is specifically required for a quest objective."),
  relevantQuestId: z.string().optional().describe("If isQuestItem is true, the ID of the quest this item is for."),
  basePrice: z.number().optional().describe("The base value or estimated worth of the item. Used for trading. MUST BE a number if provided."),
  rarity: ItemRarityEnumInternal.optional().describe("The rarity of the item (e.g., 'common', 'uncommon', 'rare'). Most starting items should be 'common'."),
  activeEffects: z.array(ActiveEffectSchemaInternal).optional().describe("An array of structured active effects this item provides. For equippable gear, these might include 'stat_modifier' effects. Each effect needs a unique id, name, description, type. If 'stat_modifier', include 'statModifiers' array detailing changes. 'duration' should be 'permanent_while_equipped' for gear stat mods."),
});

const SkillSchemaInternal = z.object({
    id: z.string().describe("A unique identifier for the skill, e.g., 'skill_basic_strike_001'."),
    name: z.string().describe("The name of the skill or ability."),
    description: z.string().describe("A clear description of what the skill does, its narrative impact, or its basic effect."),
    type: z.string().describe("A category for the skill, e.g., 'Combat', 'Utility', 'Passive', 'Racial Trait'.")
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character. MUST BE a number.'),
  maxHealth: z.number().describe('Maximum health points of the character. MUST BE a number.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Assign 0 if not applicable to the class, or omit. MUST BE a number if provided.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Assign 0 if not applicable, or omit. MUST BE a number if provided.'),
  strength: z.number().optional().describe('Character\'s physical power. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness. Affects health. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory. Affects mana for magic users. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition. Affects mana regeneration or spell effectiveness. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence. Assign a value between 5 and 15, or omit. MUST BE a number if provided.'),
  level: z.number().describe('The current level of the character. Initialize to 1. MUST BE a number.'),
  experiencePoints: z.number().describe('Current experience points. Initialize to 0. MUST BE a number.'),
  experienceToNextLevel: z.number().describe('Experience points needed to reach the next level. Initialize to a starting value, e.g., 100. MUST BE a number.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of 1-2 starting skills or abilities appropriate for the character's class. Each skill requires an id, name, description, and type."),
  currency: z.number().optional().describe("Character's starting currency (e.g., gold). Initialize to a small amount like 50, or 0. MUST BE a number if provided."),
  languageReading: z.number().optional().describe("Character's understanding of written local language (0-100). For generic starts, default to 100 unless the prompt implies a barrier (e.g., 'lost in a foreign land and cannot read signs'), then set to a low value like 0-10. MUST BE a number if provided."),
  languageSpeaking: z.number().optional().describe("Character's understanding of spoken local language (0-100). For generic starts, default to 100 unless the prompt implies a barrier (e.g., 'lost in a foreign land and can't understand anyone'), then set to a low value like 0-10. MUST BE a number if provided."),
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
}).describe("A record of the character's equipped items. All 10 slots MUST be present, with an item object (including 'basePrice' (number), optional 'rarity', 'activeEffects' (if any), and 'equipSlot' if applicable) or 'null'.");

const QuestStatusEnumInternal = z.enum(['active', 'completed', 'failed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed (should usually be false for new quests).")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded. MUST BE a number if provided."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item needs id, name, description, basePrice (number), optional rarity, optional activeEffects, etc."),
  currency: z.number().optional().describe("Amount of currency awarded. MUST BE a number if provided."),
}).describe("Potential rewards to be given upon quest completion. Defined when the quest is created. Omit if the quest has no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_generic_001'."),
  title: z.string().optional().describe("A short, engaging title for the quest."),
  description: z.string().describe("A clear description of the quest's overall objective."),
  type: z.enum(['main', 'side', 'dynamic', 'chapter_goal']).describe("The type of quest."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, typically 'active' for starting quests."),
  chapterId: z.string().optional().describe("If a 'main' quest, the ID of the Chapter it belongs to."),
  orderInChapter: z.number().optional().describe("If a 'main' quest, its suggested sequence within the chapter."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Tutorial'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. If the quest is simple, this can be omitted. For initial quests, all objectives should have 'isCompleted: false'."),
  rewards: QuestRewardsSchemaInternal.optional(),
  updatedAt: z.string().optional().describe("Timestamp of the last update to this quest."),
});

const NPCDialogueEntrySchemaInternal = z.object({
    playerInput: z.string().optional(),
    npcResponse: z.string(),
    turnId: z.string(),
});

const MerchantItemSchemaInternal = ItemSchemaInternal.extend({
  price: z.number().optional().describe("The price this merchant sells the item for. If not specified, can be derived from basePrice or context. MUST BE a number if provided."),
});

const NPCProfileSchemaInternal = z.object({
    id: z.string().describe("Unique identifier for the NPC, e.g., npc_bartender_giles_001."),
    name: z.string(),
    description: z.string(),
    classOrRole: z.string().optional(),
    firstEncounteredLocation: z.string().optional(),
    firstEncounteredTurnId: z.string().optional().describe("Use 'initial_turn_0' for NPCs known at game start."),
    relationshipStatus: z.number().describe("Numerical score for relationship. MUST BE a number."),
    knownFacts: z.array(z.string()),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional(),
    lastKnownLocation: z.string().optional(),
    lastSeenTurnId: z.string().optional().describe("Use 'initial_turn_0' for NPCs known at game start."),
    seriesContextNotes: z.string().optional(),
    shortTermGoal: z.string().optional(),
    updatedAt: z.string().optional(),
    isMerchant: z.boolean().optional(),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If merchant, list items for sale. Each needs id, name, description, basePrice (number), optional rarity, and price (number). Also include 'activeEffects' if any."),
    buysItemTypes: z.array(z.string()).optional(),
    sellsItemTypes: z.array(z.string()).optional(),
});

const ChapterSchemaInternal = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    mainQuestIds: z.array(z.string()),
    isCompleted: z.boolean(),
    unlockCondition: z.string().optional(),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal,
  currentLocation: z.string(),
  inventory: z.array(ItemSchemaInternal).describe("List of unequipped items. Each item requires id, name, description, basePrice (number), optional rarity, and optional 'activeEffects' (if any, include statModifiers with numeric values)."),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("List of quests. Rewards items should also include optional 'activeEffects' and 'rarity'."),
  chapters: z.array(ChapterSchemaInternal).optional(),
  currentChapterId: z.string().optional(),
  worldFacts: z.array(z.string()),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("NPCs encountered. Merchant inventory items also need optional 'activeEffects' and 'rarity'."),
  storySummary: z.string().optional(),
});

const GenerateStoryStartInputSchemaInternal = z.object({
  prompt: z.string(),
  characterNameInput: z.string().optional(),
  characterClassInput: z.string().optional(),
  usePremiumAI: z.boolean().optional(),
});

const GenerateStoryStartOutputSchemaInternal = z.object({
  sceneDescription: z.string(),
  storyState: StructuredStoryStateSchemaInternal,
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
    const modelConfig = { maxOutputTokens: 8000 };

    const storyStartPrompt = ai.definePrompt({
        name: 'generateStoryStartPrompt',
        model: modelName,
        input: {schema: GenerateStoryStartInputSchemaInternal},
        output: {schema: GenerateStoryStartOutputSchemaInternal},
        config: modelConfig,
        prompt: `You are a creative storyteller and game master. Your primary task is to generate a complete and valid JSON object that strictly adheres to the 'GenerateStoryStartOutputSchemaInternal'. ALL non-optional fields defined in the schema MUST be present in your output. ALL fields (including optional ones if you choose to include them) MUST use the correct data types as specified in their descriptions (e.g., numbers for prices, stats, currency; strings for names; booleans where appropriate). IDs for items, quests, skills, and NPCs MUST be unique.

Theme: "{{prompt}}".
User suggestions: Character Name: {{#if characterNameInput}}{{characterNameInput}}{{else}}(None provided){{/if}}, Character Class: {{#if characterClassInput}}{{characterClassInput}}{{else}}(None provided){{/if}}.

Based on the theme and user suggestions, generate the following:
1.  'sceneDescription': An engaging initial scene for the story.
2.  'storyState': The complete initial structured state:
    a.  'character': (Profile fields as described in CharacterProfileSchemaInternal)
    b.  'currentLocation': A fitting starting location string.
    c.  'inventory': An array of starting items. Typically initialize as an empty array \`[]\`. If items are included, each MUST have a unique 'id', 'name', 'description', 'basePrice' (MUST BE a number), and optional 'rarity'. 'equipSlot' MUST BE OMITTED if the item is not inherently equippable gear. Consider adding 'isConsumable', 'effectDescription'. For some items (especially gear of 'uncommon' rarity or higher), you MAY include 'activeEffects'. If so, each effect needs an 'id', 'name', 'description', 'type' (e.g., 'stat_modifier', 'passive_aura'), 'duration' (e.g., 'permanent_while_equipped' for gear, or a string description for how long a temporary effect lasts), and if 'stat_modifier', a 'statModifiers' array (each with 'stat', 'value' (number), 'type': 'add').
    d.  'equippedItems': All 10 equipment slots MUST be present, each 'null' or an item object. If an item, it MUST have 'id', 'name', 'description', 'equipSlot', 'basePrice' (number), optional 'rarity', and optional 'activeEffects' as described for inventory items.
    e.  'quests': An array of initial quests (can be empty). If included, each quest MUST have 'id', 'description', 'status: "active"'. 'title', 'category', 'objectives' are optional. Rewards (if any) MUST use numeric values for 'experiencePoints' and 'currency', and items in rewards follow the same structure as inventory items (including optional 'rarity' and 'activeEffects').
    f.  'chapters': Optionally, a single 'Prologue' chapter.
    g.  'currentChapterId': If chapters are included, set to the initial chapter's ID.
    h.  'worldFacts': 1-2 key facts. If language skills are low, include facts about the barrier.
    i.  'trackedNPCs': Array of NPC profiles (can be empty). If an NPC is a merchant, their 'merchantInventory' items should also follow the full item structure (including optional 'rarity' and 'activeEffects').
    j.  'storySummary': Initialize as an empty string "" or a very brief thematic intro.

Output ONLY the JSON object adhering to 'GenerateStoryStartOutputSchemaInternal'. Ensure all item definitions (inventory, equipped, rewards, merchant stock) include optional 'rarity' and may include 'activeEffects' (with correctly structured 'statModifiers' if type is 'stat_modifier').
`,
    });

    const {output} = await storyStartPrompt(input);
    if (!output) throw new Error("Failed to generate story start output.");

    // Basic Sanitation for key numeric and structural fields. More can be added.
    if (output.storyState.character) {
      const char = output.storyState.character;
      char.mana = char.mana ?? 0;
      char.maxMana = char.maxMana ?? 0;
      char.currency = char.currency ?? 0;
      char.languageReading = char.languageReading ?? 100;
      char.languageSpeaking = char.languageSpeaking ?? 100;
      char.skillsAndAbilities = char.skillsAndAbilities ?? [];
    }

    output.storyState.inventory = output.storyState.inventory ?? [];
    output.storyState.inventory.forEach((item: Partial<ItemType>) => {
        if (!item.id) item.id = `item_inv_start_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        item.basePrice = item.basePrice ?? 0;
        item.activeEffects = item.activeEffects ?? [];
        item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
            if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
            effect.statModifiers = effect.statModifiers ?? [];
            effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                if (typeof mod.value !== 'number') mod.value = 0;
                if (!mod.type) mod.type = 'add';
            });
        });
    });

    const defaultSlots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
    defaultSlots.forEach(slot => {
        const item = output.storyState.equippedItems[slot] as Partial<ItemType> | null;
        if (item) {
            if (!item.id) item.id = `item_eqp_start_${slot}_${Date.now()}`;
            item.basePrice = item.basePrice ?? 0;
            item.activeEffects = item.activeEffects ?? [];
            item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
                if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
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
                effect.statModifiers = effect.statModifiers ?? [];
                effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                    if (typeof mod.value !== 'number') mod.value = 0;
                    if (!mod.type) mod.type = 'add';
                });
            });
        });
      }
    });

    output.storyState.trackedNPCs = output.storyState.trackedNPCs ?? [];
    output.storyState.trackedNPCs.forEach(npc => {
        if (npc.merchantInventory) {
            npc.merchantInventory.forEach((item: Partial<ItemType>) => {
                 if (!item.id) item.id = `item_merch_start_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                item.basePrice = item.basePrice ?? 0;
                (item as any).price = (item as any).price ?? item.basePrice;
                item.activeEffects = item.activeEffects ?? [];
                item.activeEffects.forEach((effect: Partial<ActiveEffectType>, idx: number) => {
                    if(!effect.id) effect.id = `eff_${item.id}_${idx}`;
                    effect.statModifiers = effect.statModifiers ?? [];
                    effect.statModifiers.forEach((mod: Partial<StatModifierType>) => {
                        if (typeof mod.value !== 'number') mod.value = 0;
                        if (!mod.type) mod.type = 'add';
                    });
                });
            });
        }
    });


    return output!;
  }
);
