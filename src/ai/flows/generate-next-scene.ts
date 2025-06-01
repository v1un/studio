
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating the next scene in a story based on user input and structured story state, including core character stats (and languageUnderstanding), mana, level, XP, currency, inventory, equipped items, quests (with objectives, categories, and rewards), world facts, tracked NPCs (with merchant capabilities), skills/abilities, and series-specific context. It also allows the AI to propose new lore entries, updates a running story summary, and handles character leveling, trading, and language understanding progression. Supports model selection.
 *
 * - generateNextScene - A function that takes the current story state and user input, and returns the next scene, updated state, potentially new lore, an updated story summary, and handles character progression and trading.
 * - GenerateNextSceneInput - The input type for the generateNextScene function.
 * - GenerateNextSceneOutput - The return type for the generateNextScene function.
 */

import {ai, STANDARD_MODEL_NAME, PREMIUM_MODEL_NAME} from '@/ai/genkit';
import {z}from 'zod';
import type { EquipmentSlot, Item as ItemType, Quest as QuestType, ActiveNPCInfo as ActiveNPCInfoType, NPCProfile as NPCProfileType, Skill as SkillType, RawLoreEntry, AIMessageSegment } from '@/types/story';
import { lookupLoreTool } from '@/ai/tools/lore-tool';
import { addLoreEntry as saveNewLoreEntry } from '@/lib/lore-manager';

const EquipSlotEnumInternal = z.enum(['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring'])
  .describe("The equipment slot type, if the item is equippable (e.g., 'weapon', 'head', 'body', 'ring').");

const ItemSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the item, e.g., 'item_potion_123' or 'sword_ancient_001'. Must be unique if multiple items of the same name exist."),
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
    type: z.string().describe("A category for the skill, e.g., 'Combat Ability', 'Utility Skill', 'Passive Trait', or a series-specific type.")
});

const CharacterProfileSchemaInternal = z.object({
  name: z.string().describe('The name of the character.'),
  class: z.string().describe('The class or archetype of the character.'),
  description: z.string().describe('A brief backstory or description of the character.'),
  health: z.number().describe('Current health points of the character.'),
  maxHealth: z.number().describe('Maximum health points of the character.'),
  mana: z.number().optional().describe('Current mana or magic points of the character. Must be a number; use 0 if not applicable, or omit.'),
  maxMana: z.number().optional().describe('Maximum mana or magic points. Must be a number; use 0 if not applicable, or omit.'),
  strength: z.number().optional().describe('Character\'s physical power, or omit.'),
  dexterity: z.number().optional().describe('Character\'s agility and reflexes, or omit.'),
  constitution: z.number().optional().describe('Character\'s endurance and toughness, or omit.'),
  intelligence: z.number().optional().describe('Character\'s reasoning and memory, or omit.'),
  wisdom: z.number().optional().describe('Character\'s perception and intuition, or omit.'),
  charisma: z.number().optional().describe('Character\'s social skills and influence, or omit.'),
  level: z.number().describe('The current level of the character.'),
  experiencePoints: z.number().describe('Current experience points of the character.'),
  experienceToNextLevel: z.number().describe('Experience points needed for the character to reach the next level.'),
  skillsAndAbilities: z.array(SkillSchemaInternal).optional().describe("A list of the character's current skills and abilities. Each includes an id, name, description, and type."),
  currency: z.number().optional().describe("Character's current currency (e.g., gold). Default to 0 if not set."),
  languageUnderstanding: z.number().optional().describe("Character's understanding of the local language (0-100). If not present, assume 100 (fluent)."),
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
}).describe("A record of the character's equipped items. All 10 slots MUST be present, with an item object or 'null' if the slot is empty.");


const QuestStatusEnumInternal = z.enum(['active', 'completed']);
const QuestObjectiveSchemaInternal = z.object({
  description: z.string().describe("A clear description of this specific objective for the quest."),
  isCompleted: z.boolean().describe("Whether this specific objective is completed.")
});

const QuestRewardsSchemaInternal = z.object({
  experiencePoints: z.number().optional().describe("Amount of experience points awarded."),
  items: z.array(ItemSchemaInternal).optional().describe("An array of item objects awarded. Each item must have a unique ID, name, description, 'basePrice', and optional 'equipSlot' (omit if not inherently equippable gear). Also define `isConsumable`, `effectDescription`, etc., if applicable for reward items."),
  currency: z.number().optional().describe("Amount of currency awarded."),
}).describe("Rewards defined when the quest is created, to be given upon quest completion. Omit if no specific material rewards.");

const QuestSchemaInternal = z.object({
  id: z.string().describe("A unique identifier for the quest, e.g., 'quest_main_001' or 'quest_side_witch_forest_003'. Must be unique among all quests."),
  description: z.string().describe("A clear description of the quest's overall objective."),
  status: QuestStatusEnumInternal.describe("The current status of the quest, either 'active' or 'completed'."),
  category: z.string().optional().describe("An optional category for the quest (e.g., 'Main Story', 'Side Quest', 'Personal Goal', 'Exploration'). Omit if not clearly classifiable."),
  objectives: z.array(QuestObjectiveSchemaInternal).optional().describe("An optional list of specific sub-objectives for this quest. Use for more complex quests. If the quest is simple, this can be omitted."),
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
    id: z.string().describe("Unique identifier for the NPC. If creating a new NPC profile, make this unique (e.g., npc_[name]_[unique_suffix]). If updating, use existing ID."),
    name: z.string().describe("NPC's name."),
    description: z.string().describe("Physical appearance, general demeanor, key characteristics. Update if new details are learned."),
    classOrRole: z.string().optional().describe("e.g., 'Merchant', 'Guard Captain', 'Mysterious Stranger'."),
    firstEncounteredLocation: z.string().optional().describe("Location where NPC was first met. Set only when creating new profile."),
    firstEncounteredTurnId: z.string().optional().describe("ID of the story turn when first met. Set only when creating new profile."),
    relationshipStatus: z.number().describe("Numerical score representing the player's relationship with the NPC (e.g., -100 Hostile, 0 Neutral, 100 Allied). Update based on interactions."),
    knownFacts: z.array(z.string()).describe("Specific pieces of information player has learned about this NPC. Add new facts as they are discovered."),
    dialogueHistory: z.array(NPCDialogueEntrySchemaInternal).optional().describe("Log of key interaction moments. Add new significant dialogues."),
    lastKnownLocation: z.string().optional().describe("Last known location of the NPC. Update if they move or are seen elsewhere."),
    lastSeenTurnId: z.string().optional().describe("ID of the story turn when NPC was last seen or interacted with. Update with current turn ID."),
    seriesContextNotes: z.string().optional().describe("AI-internal note about their role if from a known series (not for player). Set once if applicable."),
    shortTermGoal: z.string().optional().describe("A simple, immediate goal this NPC might be pursuing, influencing their actions or comments. Can be set or updated by the AI based on events."),
    updatedAt: z.string().optional().describe("Timestamp of the last update to this profile. Update with current time."),
    isMerchant: z.boolean().optional().describe("Set to true if this NPC is a merchant and can buy/sell items."),
    merchantInventory: z.array(MerchantItemSchemaInternal).optional().describe("If isMerchant, a list of items the merchant has for sale. Each item includes its 'id', 'name', 'description', 'basePrice', and a 'price' they sell it for. New items added to their stock should also have these details."),
    buysItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they are interested in buying (e.g., 'Potions', 'Old Books'). Influences AI decision on what they might buy."),
    sellsItemTypes: z.array(z.string()).optional().describe("If isMerchant, optional list of item categories they typically sell (e.g., 'Adventuring Gear', 'Herbs')."),
});

const StructuredStoryStateSchemaInternal = z.object({
  character: CharacterProfileSchemaInternal.describe('The profile of the main character, including core stats, level, XP, currency, skills/abilities, and languageUnderstanding (0-100).'),
  currentLocation: z.string().describe('The current location of the character in the story.'),
  inventory: z.array(ItemSchemaInternal).describe('A list of UNequipped items in the character\'s inventory. Each item is an object with id, name, description, and basePrice. If the item is an inherently equippable piece of gear (like armor, a weapon, a magic ring), include its equipSlot; otherwise, the equipSlot field MUST BE OMITTED ENTIRELY. Also include `isConsumable`, `effectDescription`, `isQuestItem`, `relevantQuestId` if applicable.'),
  equippedItems: EquipmentSlotsSchemaInternal,
  quests: z.array(QuestSchemaInternal).describe("A list of all quests. Each quest is an object with 'id', 'description', 'status', its 'rewards' (defined at quest creation specifying what the player will get on completion, including currency and items with basePrice), optionally 'category', and a list of 'objectives' (each with 'description' and 'isCompleted')."),
  worldFacts: z.array(z.string()).describe('Key facts or observations about the game world state. These facts should reflect the character\'s current understanding and immediate environment, including the presence of significant NPCs. Add new facts as they are discovered, modify existing ones if they change, or remove them if they become outdated or irrelevant. Narrate significant changes to worldFacts if the character would perceive them. A worldFact like "Language barrier makes communication difficult" should be present if languageUnderstanding is low, and removed if it improves significantly.'),
  trackedNPCs: z.array(NPCProfileSchemaInternal).describe("A list of detailed profiles for significant NPCs encountered. Update existing profiles or add new ones as NPCs are introduced or interacted with. If an NPC is a merchant, include 'isMerchant', 'merchantInventory', 'buysItemTypes', 'sellsItemTypes'."),
  storySummary: z.string().optional().describe("A brief, running summary of key story events and character developments so far. This summary will be updated each turn."),
});

export type StructuredStoryState = z.infer<typeof StructuredStoryStateSchemaInternal>;

const GenerateNextSceneInputSchemaInternal = z.object({
  currentScene: z.string().describe('A summary of the last few GM messages. This provides context for the AI.'),
  userInput: z.string().describe('The user input (action or dialogue).'),
  storyState: StructuredStoryStateSchemaInternal.describe('The current structured state of the story (character including languageUnderstanding, location, inventory, equipped items, XP, currency, quests, worldFacts, trackedNPCs, skills/abilities, storySummary etc.).'),
  seriesName: z.string().describe('The name of the series this story is based on, for contextual awareness.'),
  seriesStyleGuide: z.string().optional().describe('A brief style guide for the series to maintain tone and themes.'),
  currentTurnId: z.string().describe('The ID of the current story turn, for logging in NPC dialogue history etc.'),
  usePremiumAI: z.boolean().optional().describe("Whether to use the premium AI model."),
});
export type GenerateNextSceneInput = z.infer<typeof GenerateNextSceneInputSchemaInternal>;

const PromptInternalInputSchema = GenerateNextSceneInputSchemaInternal.extend({
  formattedEquippedItemsString: z.string().describe("Pre-formatted string of equipped items."),
  formattedQuestsString: z.string().describe("Pre-formatted string of quests with their statuses, categories, objectives, and potential rewards (including currency)."),
  formattedTrackedNPCsString: z.string().describe("Pre-formatted string summarizing tracked NPCs, including their short-term goals and merchant status/wares if any."),
  formattedSkillsString: z.string().describe("Pre-formatted string of character's skills and abilities."),
});

const ActiveNPCInfoSchemaInternal = z.object({
    name: z.string().describe("The name of the NPC, if known or identifiable."),
    description: z.string().optional().describe("A brief description of the NPC if newly introduced or particularly relevant."),
    keyDialogueOrAction: z.string().optional().describe("A key line of dialogue spoken by the NPC or a significant action they took in this scene.")
});

const RawLoreEntrySchemaInternal = z.object({
  keyword: z.string().describe("The specific term, character name, location, or concept from the series (e.g., 'Hokage', 'Death Note', 'Subaru Natsuki', 'Emerald Sustrai')."),
  content: z.string().describe("A concise (2-3 sentences) description or piece of lore about the keyword, accurate to the specified series."),
  category: z.string().optional().describe("An optional category for the lore entry (e.g., 'Character', 'Location', 'Ability', 'Organization', 'Concept'). If no category is applicable or known, this field should be omitted entirely."),
});

const AIMessageSegmentSchemaInternal = z.object({
  speaker: z.string().describe("Use 'GM' for general narration, world descriptions, or outcomes of player actions. For Non-Player Character dialogue, use the NPC's exact name as defined in `trackedNPCs` (e.g., 'Elara the Wise', 'Guard Captain Rex'). Ensure the NPC name matches an existing tracked NPC if they are speaking."),
  content: z.string().describe("The narrative text or the NPC's spoken dialogue. Keep segments relatively focused; if GM narration shifts to NPC dialogue, or one NPC stops speaking and another starts, create a new message segment."),
});

const GenerateNextSceneOutputSchemaInternal = z.object({
  generatedMessages: z.array(AIMessageSegmentSchemaInternal).describe("An array of message segments that constitute the AI's response. This should include all narration and NPC dialogue, broken down by speaker."),
  updatedStoryState: StructuredStoryStateSchemaInternal.describe('The updated structured story state after the scene. This includes any character stat changes (including languageUnderstanding), XP, currency, level changes, inventory changes, equipment changes, quest updates, world fact updates (remove language barrier fact if understanding improves significantly), NPC profile updates/additions, new skills. Rewards for completed quests are applied. Items must have a basePrice.'),
  activeNPCsInScene: z.array(ActiveNPCInfoSchemaInternal).optional().describe("A list of NPCs who were active (spoke, performed significant actions) in this generated scene. Include their name, an optional brief description, and an optional key piece of dialogue or action. Omit if no distinct NPCs were notably active."),
  newLoreEntries: z.array(RawLoreEntrySchemaInternal).optional().describe("An array of new lore entries discovered or revealed in this scene. Each entry should have 'keyword', 'content', and optional 'category'."),
  updatedStorySummary: z.string().describe("The new running summary of the story, concisely incorporating key events, decisions, and consequences from this scene, building upon the previous summary. Pay special attention to: significant changes in relationships with key NPCs, major unresolved plot threads or new mysteries introduced, important items gained or lost if they have plot significance, and choices made by the player that had significant, lasting consequences."),
});
export type GenerateNextSceneOutput = z.infer<typeof GenerateNextSceneOutputSchemaInternal>;

export async function generateNextScene(input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> {
  return generateNextSceneFlow(input);
}

function formatEquippedItems(equippedItems: Partial<Record<EquipmentSlot, ItemType | null>> | undefined | null): string {
  if (!equippedItems || typeof equippedItems !== 'object') return "Equipment status: Not available.";
  let output = "";
  const slots: EquipmentSlot[] = ['weapon', 'shield', 'head', 'body', 'legs', 'feet', 'hands', 'neck', 'ring1', 'ring2'];
  for (const slot of slots) {
    const item = equippedItems[slot];
    output += `- ${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? `${item.name} (Value: ${item.basePrice ?? 0})` : 'Empty'}\n`;
  }
  return output.trim();
}

function formatQuests(quests: QuestType[] | undefined | null): string {
  if (!quests || !Array.isArray(quests) || quests.length === 0) return "None";
  return quests.map(q => {
    let questStr = `- ${q.description} (Status: ${q.status}, ID: ${q.id})`;
    if (q.category) questStr += ` [Category: ${q.category}]`;
    if (q.objectives && q.objectives.length > 0) {
      questStr += "\n  Objectives:\n";
      q.objectives.forEach(obj => { questStr += `    - ${obj.description} (${obj.isCompleted ? 'Completed' : 'Pending'})\n`; });
    }
    if (q.rewards) {
        const rewardLabel = q.status === 'completed' ? "Rewards Received" : "Potential Rewards";
        questStr += `\n  ${rewardLabel}:\n`;
        if (q.rewards.experiencePoints) questStr += `    - XP: ${q.rewards.experiencePoints}\n`;
        if (q.rewards.currency) questStr += `    - Currency: ${q.rewards.currency}\n`;
        if (q.rewards.items && q.rewards.items.length > 0) {
            q.rewards.items.forEach(item => { questStr += `    - Item: ${item.name} (Value: ${item.basePrice ?? 0})\n`; });
        }
    }
    return questStr;
  }).join("\n");
}

function formatTrackedNPCs(npcs: NPCProfileType[] | undefined | null): string {
    if (!npcs || !Array.isArray(npcs) || npcs.length === 0) return "None known or tracked.";
    return npcs.map(npc => {
        let relationshipLabel = "Unknown";
        if (npc.relationshipStatus <= -75) relationshipLabel = "Arch-Nemesis";
        else if (npc.relationshipStatus <= -25) relationshipLabel = "Hostile";
        else if (npc.relationshipStatus < 25) relationshipLabel = "Neutral";
        else if (npc.relationshipStatus < 75) relationshipLabel = "Friendly";
        else if (npc.relationshipStatus >= 75) relationshipLabel = "Staunch Ally";
        let npcStr = `- ${npc.name} (ID: ${npc.id}, Relationship: ${relationshipLabel} [${npc.relationshipStatus}])`;
        if (npc.classOrRole) npcStr += ` [${npc.classOrRole}]`;
        if (npc.isMerchant) npcStr += ` [Merchant]`;
        if (npc.lastKnownLocation) npcStr += ` (Last seen: ${npc.lastKnownLocation})`;
        if (npc.shortTermGoal) npcStr += `\n  Current Goal: ${npc.shortTermGoal}`;
        npcStr += `\n  Description: ${npc.description}`;
        if (npc.isMerchant && npc.merchantInventory && npc.merchantInventory.length > 0) {
            npcStr += "\n  Wares for Sale:\n";
            npc.merchantInventory.forEach(item => { npcStr += `    - ${item.name} (Price: ${item.price ?? item.basePrice ?? 0}, ID: ${item.id})\n`; });
        }
        if (npc.knownFacts && npc.knownFacts.length > 0) {
            npcStr += "\n  Known Facts:\n";
            npc.knownFacts.forEach(fact => npcStr += `    - ${fact}\n`);
        }
        return npcStr;
    }).join("\n");
}

function formatSkills(skills: SkillType[] | undefined | null): string {
    if (!skills || !Array.isArray(skills) || skills.length === 0) return "None known.";
    return skills.map(skill => `- ${skill.name} (Type: ${skill.type}): ${skill.description}`).join("\n");
}

const generateNextSceneFlow = ai.defineFlow(
  {
    name: 'generateNextSceneFlow',
    inputSchema: GenerateNextSceneInputSchemaInternal,
    outputSchema: GenerateNextSceneOutputSchemaInternal,
  },
  async (input: GenerateNextSceneInput): Promise<GenerateNextSceneOutput> => {
    const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;

    const prompt = ai.definePrompt({
        name: 'generateNextScenePrompt',
        model: modelName,
        input: {schema: PromptInternalInputSchema},
        output: {schema: GenerateNextSceneOutputSchemaInternal},
        tools: [lookupLoreTool],
        prompt: `You are a dynamic storyteller, continuing a story based on the player's actions and the current game state.
This story is set in the universe of: {{seriesName}}.
{{#if seriesStyleGuide}}Series Style Guide: {{seriesStyleGuide}}{{/if}}

Story Summary So Far:
{{#if storyState.storySummary}}{{{storyState.storySummary}}}{{else}}The story has just begun.{{/if}}

Context from Previous Scene/Messages (Summary): {{currentScene}}
Player Input: {{userInput}}

Current Player Character:
- Name: {{storyState.character.name}}, the {{storyState.character.class}} (Level: {{storyState.character.level}})
- Health: {{storyState.character.health}}/{{storyState.character.maxHealth}}
- Mana: {{#if storyState.character.mana}}{{storyState.character.mana}}/{{storyState.character.maxMana}}{{else}}N/A{{/if}}
- Language Understanding: {{storyState.character.languageUnderstanding}}/100 (0=None, 10-40=Basic, 41-70=Conversational, 71-99=Good, 100=Fluent)
- Currency: {{storyState.character.currency}}
- XP: {{storyState.character.experiencePoints}}/{{storyState.character.experienceToNextLevel}}
- Stats: Str:{{storyState.character.strength}}, Dex:{{storyState.character.dexterity}}, Con:{{storyState.character.constitution}}, Int:{{storyState.character.intelligence}}, Wis:{{storyState.character.wisdom}}, Cha:{{storyState.character.charisma}}
- Skills & Abilities:
{{{formattedSkillsString}}}

Equipped Items:
{{{formattedEquippedItemsString}}}
Current Location: {{storyState.currentLocation}}

Inventory (Unequipped):
{{#if storyState.inventory.length}}{{#each storyState.inventory}}- {{this.name}} (ID:{{this.id}}, Val:{{this.basePrice}}): {{this.description}} {{#if this.equipSlot}}(Equip: {{this.equipSlot}}){{/if}}{{#if this.isConsumable}}(Consumable: {{this.effectDescription}}){{/if}}{{#if this.isQuestItem}}(Quest Item{{#if this.relevantQuestId}} for {{this.relevantQuestId}}){{/if}}){{/if}}
{{/each}}{{else}}Empty{{/if}}

Quests:
{{{formattedQuestsString}}}

Known World Facts (Reflect immediate environment, character's understanding, NPC presence. If languageUnderstanding is low, a fact should state this):
{{#each storyState.worldFacts}}- {{{this}}}{{else}}- None known.{{/each}}

Tracked NPCs:
{{{formattedTrackedNPCsString}}}

Available Equipment Slots: weapon, shield, head, body, legs, feet, hands, neck, ring1, ring2. All items must have a 'basePrice'. Merchant items have 'price'.

If player input implies lore lookup in "{{seriesName}}", use 'lookupLoreTool'.

**Language Understanding Mechanic:**
- The character's 'languageUnderstanding' (0-100) dictates their comprehension.
- **0-10 (None):** In 'generatedMessages', GM narration MUST describe attempts to read text (e.g., signs, books) as seeing indecipherable symbols. NPC dialogue heard by the character should be described by GM as incomprehensible sounds or gestures, even if the 'AIMessageSegment' for the NPC includes the actual foreign dialogue for the player's OOC knowledge.
- **11-40 (Basic):** Character might pick out keywords or simple phrases. GM narration should reflect this partial understanding (e.g., "You catch a few words, something about 'danger' and 'market'").
- **41-70 (Conversational):** Character understands most common speech, but complex sentences, slang, or rapid speech might be confusing. GM can note this.
- **71-99 (Good):** Mostly fluent, occasional minor misunderstandings of idioms or highly technical terms.
- **100 (Fluent):** No language barrier.
- **Progression:** Based on player actions (e.g., "I try to study the language," "I ask for translation help"), significant interactions, or narrative events (e.g., magical aid, quest reward), you MUST update 'updatedStoryState.character.languageUnderstanding' by a small, reasonable amount (e.g., +5 to +15 points). Narrate this improvement (e.g., "You feel like you're starting to get a grasp of a few common phrases.").
- **World Fact Update:** If 'languageUnderstanding' improves significantly (e.g., crosses a threshold like 20 or 40), any 'worldFact' explicitly stating a complete language barrier MUST be removed or updated in 'updatedStoryState.worldFacts'.

**Output Format - IMPORTANT (generatedMessages array):**
- Each element: { "speaker": "GM" or "NPC Name", "content": "Narration or dialogue" }.
- Example: [ { "speaker": "GM", "content": "The tavern door creaks." }, { "speaker": "Innkeeper Borin", "content": "What brings you?" } ]

**Story Summary & Context:**
Update 'storyState.storySummary'. Incorporate key events from this scene.

**Narrative Integrity & Player Impact:**
Respect player choices but maintain coherence with {{seriesName}} universe. Guide gently if severe lore contradiction. Consequences of actions MUST be reflected in 'generatedMessages', 'updatedStoryState' (worldFacts, NPC states, quests, character.languageUnderstanding), and 'updatedStorySummary'. Weave in series plot points organically if player actions align.
If the player's actions or the evolving story naturally approach a known major plot point, character arc, or iconic scenario from the '{{seriesName}}' universe, consider weaving elements of it into the 'generatedMessages' or having NPCs react in ways that acknowledge this potential trajectory. This should serve to enrich the experience with series-specific depth *if opportunities arise organically*, rather than forcing the player onto a specific path against their will. The primary goal remains collaborative storytelling driven by player agency.

**Special Abilities (e.g., "Return by Death"):**
If character has such an ability and faces a 'fatal' event:
1. Describe the event.
2. Describe the 'return' experience (character retains memories).
3. Resume from a coherent checkpoint.
4. Reflect emotional toll/consequences in 'updatedStoryState' (e.g., languageUnderstanding might be temporarily affected if trauma is severe, or specific worldFacts related to the cause of death might appear).

**Skill Usage:** Narrate activation & consequences. Reflect effects in 'updatedStoryState'.

**NPC Management:** Create/update profiles. Relationship dynamics. NPC memory & proactivity. If merchant: handle wares, buying/selling (deduct/add currency, items from/to inventories).
**Environmental Interaction & Item Use:** Narrate outcomes. If item found, add to inventory (with unique ID, basePrice). Update worldFacts/quests.
**Quests & World State:** Describe developments. Branch/update objectives. World reactivity.
**Character Progression:** Award skills/stats for quests/milestones.
- **Leveling Up:** When XP >= XPToNextLevel: increment level, subtract old XPToNextLevel from XP, set new higher XPToNextLevel. Grant +1 to a core stat OR one new skill. Narrate level up and reward.

Crucially, update story state fields: character (health, mana, XP, level, currency, skills, stats, **languageUnderstanding**), inventory, equippedItems, quests, trackedNPCs, worldFacts.
Ensure 'updatedStorySummary' is provided.
`,
    });

    const formattedEquippedItemsString = formatEquippedItems(input.storyState.equippedItems);
    const formattedQuestsString = formatQuests(input.storyState.quests);
    const formattedTrackedNPCsString = formatTrackedNPCs(input.storyState.trackedNPCs);
    const formattedSkillsString = formatSkills(input.storyState.character.skillsAndAbilities);

    const promptPayload: z.infer<typeof PromptInternalInputSchema> = {
      ...input,
      formattedEquippedItemsString: formattedEquippedItemsString,
      formattedQuestsString: formattedQuestsString,
      formattedTrackedNPCsString: formattedTrackedNPCsString,
      formattedSkillsString: formattedSkillsString,
    };
    
    let outputFromPrompt;
    try {
        const response = await prompt(promptPayload);
        outputFromPrompt = response.output; 
    } catch (e: any) {
        console.error(`[${modelName}] Error during prompt execution for generateNextScenePrompt:`, e);
        if (e.details) console.error("Error details:", e.details);
        // Return a minimal valid output to prevent downstream errors and inform the user.
        // This is a stop-gap for catastrophic AI failure.
        return {
            generatedMessages: [{ speaker: 'GM', content: `(Critical AI Error: The AI model failed to generate a response for the current scene. Details: ${e.message}. Please try a different action, or if this persists, consider restarting the session.)` }],
            updatedStoryState: input.storyState, // Return original state to prevent data loss
            updatedStorySummary: input.storyState.storySummary || "Error generating summary due to AI failure.",
            activeNPCsInScene: [],
            newLoreEntries: [],
        };
    }

    if (!outputFromPrompt) {
        console.warn(`[${modelName}] Null or undefined output from prompt for generateNextScenePrompt after successful execution, but no exception was caught. This indicates a potential issue with prompt output structure or model behavior.`);
        return {
            generatedMessages: [{ speaker: 'GM', content: "(Critical AI Error: The AI model returned an empty or invalid structure for the scene. Please try again or restart.)" }],
            updatedStoryState: input.storyState,
            updatedStorySummary: input.storyState.storySummary || "Error generating summary.",
            activeNPCsInScene: [],
            newLoreEntries: [],
        };
    }
    
    const output: GenerateNextSceneOutput = outputFromPrompt as GenerateNextSceneOutput;


    if (!output.generatedMessages || !Array.isArray(output.generatedMessages) || output.generatedMessages.length === 0) {
      output.generatedMessages = [{ speaker: 'GM', content: "(AI response issue: No messages generated.)" }];
    } else {
        output.generatedMessages.forEach(msg => {
            if (typeof msg.speaker !== 'string' || msg.speaker.trim() === '') msg.speaker = 'GM';
            if (typeof msg.content !== 'string') msg.content = '(AI content error)';
        });
    }

    if (output.newLoreEntries && Array.isArray(output.newLoreEntries)) {
      for (const lore of output.newLoreEntries) {
        if (lore.keyword && lore.keyword.trim() !== "" && lore.content && lore.content.trim() !== "") {
          try { saveNewLoreEntry({ keyword: lore.keyword, content: lore.content, category: lore.category, source: 'AI-Discovered'}); }
          catch (e) { console.error("Error saving AI discovered lore:", e); }
        }
      }
    }

    if (output.updatedStoryState.character && input.storyState.character) {
      const updatedChar = output.updatedStoryState.character;
      const originalChar = input.storyState.character;

      updatedChar.mana = updatedChar.mana ?? originalChar.mana ?? 0;
      updatedChar.maxMana = updatedChar.maxMana ?? originalChar.maxMana ?? 0;
      updatedChar.strength = updatedChar.strength ?? originalChar.strength ?? 10;
      updatedChar.dexterity = updatedChar.dexterity ?? originalChar.dexterity ?? 10;
      updatedChar.constitution = updatedChar.constitution ?? originalChar.constitution ?? 10;
      updatedChar.intelligence = updatedChar.intelligence ?? originalChar.intelligence ?? 10;
      updatedChar.wisdom = updatedChar.wisdom ?? originalChar.wisdom ?? 10;
      updatedChar.charisma = updatedChar.charisma ?? originalChar.charisma ?? 10;
      updatedChar.currency = updatedChar.currency ?? originalChar.currency ?? 0;
      if (updatedChar.currency < 0) updatedChar.currency = 0;

      updatedChar.languageUnderstanding = updatedChar.languageUnderstanding ?? originalChar.languageUnderstanding ?? 100;
      if (updatedChar.languageUnderstanding < 0) updatedChar.languageUnderstanding = 0;
      if (updatedChar.languageUnderstanding > 100) updatedChar.languageUnderstanding = 100;
      
      let originalXpToNextLevel = originalChar.experienceToNextLevel;
      if (originalXpToNextLevel <=0) originalXpToNextLevel = 100; 

      updatedChar.level = updatedChar.level ?? originalChar.level ?? 1;
      updatedChar.experiencePoints = updatedChar.experiencePoints ?? originalChar.experiencePoints ?? 0;
      updatedChar.experienceToNextLevel = updatedChar.experienceToNextLevel ?? originalChar.experienceToNextLevel ?? 100;

      const didLevelUp = updatedChar.level > originalChar.level || 
                         (originalChar.experiencePoints >= originalXpToNextLevel && updatedChar.level === originalChar.level +1);

      if (didLevelUp && updatedChar.level === originalChar.level + 1) { 
        if(updatedChar.experiencePoints >= originalXpToNextLevel && originalChar.experiencePoints >= originalXpToNextLevel) {
            updatedChar.experiencePoints = originalChar.experiencePoints - originalXpToNextLevel;
        } else if (updatedChar.experiencePoints < originalXpToNextLevel && originalChar.experiencePoints >= originalXpToNextLevel ) {
            // AI might have already subtracted XP
        } else {
             updatedChar.experiencePoints = originalChar.experiencePoints; 
        }
        const expectedNewXpToNextLevel = Math.floor(originalXpToNextLevel * 1.5);
        if (updatedChar.experienceToNextLevel <= updatedChar.experiencePoints || updatedChar.experienceToNextLevel < originalXpToNextLevel) {
           updatedChar.experienceToNextLevel = expectedNewXpToNextLevel > updatedChar.experiencePoints 
                                              ? expectedNewXpToNextLevel 
                                              : updatedChar.experiencePoints + Math.max(50, Math.floor(originalXpToNextLevel * 0.5));
        }
      } else {
         if (updatedChar.experienceToNextLevel <= 0 || updatedChar.experienceToNextLevel < updatedChar.experiencePoints) {
            updatedChar.experienceToNextLevel = originalXpToNextLevel > updatedChar.experiencePoints ? originalXpToNextLevel : updatedChar.experiencePoints + 50;
         }
      }
      
      updatedChar.skillsAndAbilities = updatedChar.skillsAndAbilities ?? originalChar.skillsAndAbilities ?? [];
      const skillIdSet = new Set<string>();
      updatedChar.skillsAndAbilities.forEach((skill, index) => {
        if (!skill.id || skill.id.trim() === "" || skillIdSet.has(skill.id)) { 
            let baseId = `skill_generated_next_${skill.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}_${index}`;
            let newId = baseId; let counter = 0;
            while(skillIdSet.has(newId)){ newId = `${baseId}_u${counter++}`; }
            skill.id = newId;
        }
        skillIdSet.add(skill.id);
        skill.name = skill.name || "Unnamed Skill";
        skill.description = skill.description || "No description provided.";
        skill.type = skill.type || "Generic";
      });
    }

     if (output.updatedStoryState) {
        output.updatedStoryState.inventory = output.updatedStoryState.inventory ?? [];
        const invItemIds = new Set<string>();
        output.updatedStoryState.inventory.forEach((item, index) => {
          if (!item.id || item.id.trim() === "" || invItemIds.has(item.id)) {
            let baseId = `item_generated_inv_next_${Date.now()}_${Math.random().toString(36).substring(7)}_${index}`;
            let newId = baseId; let counter = 0;
            while(invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
            item.id = newId;
          }
          invItemIds.add(item.id);
          if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
          if (item.isConsumable === undefined) delete item.isConsumable;
          if (item.effectDescription === undefined || item.effectDescription === '') delete item.effectDescription;
          if (item.isQuestItem === undefined) delete item.isQuestItem;
          if (item.relevantQuestId === undefined || item.relevantQuestId === '') delete item.relevantQuestId;
          item.basePrice = item.basePrice ?? 0;
          if (item.basePrice < 0) item.basePrice = 0;
        });

        output.updatedStoryState.quests = output.updatedStoryState.quests ?? [];
        const questIds = new Set<string>();
        output.updatedStoryState.quests.forEach((quest, index) => {
          if (!quest.id || quest.id.trim() === "" || questIds.has(quest.id)) {
            let baseId = `quest_generated_next_${Date.now()}_${index}`;
            let newId = baseId; let counter = 0;
            while(questIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
            quest.id = newId;
          }
          questIds.add(quest.id);
          if (!quest.status) quest.status = 'active';
          if (quest.category === null || (quest.category as unknown) === '') delete (quest as Partial<QuestType>).category;
          quest.objectives = quest.objectives ?? [];
          quest.objectives.forEach(obj => {
            if (typeof obj.isCompleted !== 'boolean') obj.isCompleted = false;
            if (typeof obj.description !== 'string' || obj.description.trim() === '') obj.description = "Objective details missing";
          });
          const previousQuestState = input.storyState.quests.find(pq => pq.id === quest.id);
          if (quest.status === 'completed' && previousQuestState?.status === 'active' && quest.rewards && output.updatedStoryState.character) {
            if (typeof quest.rewards.experiencePoints === 'number') output.updatedStoryState.character.experiencePoints += quest.rewards.experiencePoints;
            if (typeof quest.rewards.currency === 'number' && output.updatedStoryState.character.currency !== undefined) {
              output.updatedStoryState.character.currency += quest.rewards.currency;
              if (output.updatedStoryState.character.currency < 0) output.updatedStoryState.character.currency = 0;
            }
            if (quest.rewards.items && Array.isArray(quest.rewards.items)) {
              quest.rewards.items.forEach(rewardItem => {
                const cleanedRewardItem = { ...rewardItem };
                const rewardItemIds = new Set<string>();
                 if (!cleanedRewardItem.id || cleanedRewardItem.id.trim() === "" || rewardItemIds.has(cleanedRewardItem.id) || invItemIds.has(cleanedRewardItem.id)) {
                    let baseId = `item_reward_next_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                    let newId = baseId; let counter = 0;
                    while(rewardItemIds.has(newId) || invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    cleanedRewardItem.id = newId;
                }
                rewardItemIds.add(cleanedRewardItem.id); invItemIds.add(cleanedRewardItem.id); 
                if (cleanedRewardItem.equipSlot === null || (cleanedRewardItem.equipSlot as unknown) === '') delete (cleanedRewardItem as Partial<ItemType>).equipSlot;
                if (cleanedRewardItem.isConsumable === undefined) delete cleanedRewardItem.isConsumable;
                if (cleanedRewardItem.effectDescription === undefined || cleanedRewardItem.effectDescription === '') delete cleanedRewardItem.effectDescription;
                if (cleanedRewardItem.isQuestItem === undefined) delete cleanedRewardItem.isQuestItem;
                if (cleanedRewardItem.relevantQuestId === undefined || cleanedRewardItem.relevantQuestId === '') delete cleanedRewardItem.relevantQuestId;
                cleanedRewardItem.basePrice = cleanedRewardItem.basePrice ?? 0;
                 if (cleanedRewardItem.basePrice < 0) cleanedRewardItem.basePrice = 0;
                output.updatedStoryState.inventory.push(cleanedRewardItem);
              });
            }
          }
          if (quest.rewards) {
            quest.rewards.items = quest.rewards.items ?? [];
            const rewardDefItemIds = new Set<string>();
             quest.rewards.items.forEach((rewardItem, rIndex) => {
                if (!rewardItem.id || rewardItem.id.trim() === "" || rewardDefItemIds.has(rewardItem.id)) {
                    let baseId = `item_reward_next_def_${Date.now()}_${Math.random().toString(36).substring(7)}_${rIndex}`;
                    let newId = baseId; let counter = 0;
                    while(rewardDefItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    rewardItem.id = newId;
                }
                rewardDefItemIds.add(rewardItem.id);
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
            if (quest.rewards.experiencePoints === undefined && quest.rewards.items.length === 0 && quest.rewards.currency === undefined) delete quest.rewards;
            else {
                if (quest.rewards.experiencePoints === undefined) delete quest.rewards.experiencePoints;
                if (quest.rewards.items.length === 0) delete quest.rewards.items;
                if (quest.rewards.currency === undefined) delete quest.rewards.currency;
            }
          }
        });

        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts ?? [];
        output.updatedStoryState.worldFacts = output.updatedStoryState.worldFacts.filter(fact => typeof fact === 'string' && fact.trim() !== '');

        const defaultEquippedItems: Record<EquipmentSlot, ItemType | null> = { weapon: null, shield: null, head: null, body: null, legs: null, feet: null, hands: null, neck: null, ring1: null, ring2: null };
        const aiEquipped = output.updatedStoryState.equippedItems || {} as Record<EquipmentSlot, ItemType | null>;
        const newEquippedItems: Record<EquipmentSlot, ItemType | null> = {...defaultEquippedItems};
        const equippedItemIds = new Set<string>();

        for (const slotKey of Object.keys(defaultEquippedItems) as EquipmentSlot[]) {
            const item = aiEquipped[slotKey]; 
            if (item && typeof item === 'object' && item.name) { 
                if (!item.id || item.id.trim() === "" || equippedItemIds.has(item.id) || invItemIds.has(item.id)) {
                     let baseId = `item_equipped_next_${Date.now()}_${Math.random().toString(36).substring(7)}_${slotKey}`;
                     let newId = baseId; let counter = 0;
                     while(equippedItemIds.has(newId) || invItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                     item.id = newId;
                }
                equippedItemIds.add(item.id);
                if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>)!.equipSlot;
                delete (item as Partial<ItemType>)!.isConsumable;
                delete (item as Partial<ItemType>)!.effectDescription;
                delete (item as Partial<ItemType>)!.isQuestItem;
                delete (item as Partial<ItemType>)!.relevantQuestId;
                item.basePrice = item.basePrice ?? 0;
                if (item.basePrice < 0) item.basePrice = 0;
                newEquippedItems[slotKey] = item;
            } else {
                newEquippedItems[slotKey] = null; 
            }
        }
        output.updatedStoryState.equippedItems = newEquippedItems;

        output.updatedStoryState.trackedNPCs = output.updatedStoryState.trackedNPCs ?? [];
        const npcIdMap = new Map<string, NPCProfileType>();
        const existingNpcIdsFromInput = new Set(input.storyState.trackedNPCs.map(npc => npc.id));
        
        for (const npc of output.updatedStoryState.trackedNPCs) {
            let currentNpcId = npc.id;
            if (!currentNpcId || currentNpcId.trim() === "" || (!existingNpcIdsFromInput.has(currentNpcId) && npcIdMap.has(currentNpcId))) {
                 let baseId = `npc_${npc.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}_${Date.now()}`;
                 let newId = baseId; let counter = 0;
                 while(npcIdMap.has(newId) || existingNpcIdsFromInput.has(newId)) { newId = `${baseId}_u${counter++}`; }
                 currentNpcId = newId;
            }
            npc.id = currentNpcId; 
            if (npcIdMap.has(npc.id)) { console.warn(`Duplicate NPC ID ${npc.id} in AI output. Skipping duplicate.`); continue; }
            
            const processedNpc = { ...npc }; // Create a mutable copy

            // Delete extraneous fields not in schema
            delete (processedNpc as any).currentGoal;


            // Handle null or empty optional string fields
            if (processedNpc.classOrRole === null || (processedNpc.classOrRole as unknown) === '') delete processedNpc.classOrRole;
            if (processedNpc.firstEncounteredLocation === null || (processedNpc.firstEncounteredLocation as unknown) === '') delete processedNpc.firstEncounteredLocation;
            if (processedNpc.lastKnownLocation === null || (processedNpc.lastKnownLocation as unknown) === '') delete processedNpc.lastKnownLocation;
            if (processedNpc.seriesContextNotes === null || (processedNpc.seriesContextNotes as unknown) === '') delete processedNpc.seriesContextNotes;
            if (processedNpc.shortTermGoal === null || (processedNpc.shortTermGoal as unknown) === '') delete processedNpc.shortTermGoal;

            // Handle optional array fields if null
            if (processedNpc.buysItemTypes === null) delete processedNpc.buysItemTypes;
            else processedNpc.buysItemTypes = processedNpc.buysItemTypes ?? undefined; // Ensure it's array or undefined

            if (processedNpc.sellsItemTypes === null) delete processedNpc.sellsItemTypes;
            else processedNpc.sellsItemTypes = processedNpc.sellsItemTypes ?? undefined; // Ensure it's array or undefined


            processedNpc.name = processedNpc.name || "Unnamed NPC";
            processedNpc.description = processedNpc.description || "No description provided.";
            const originalNpcProfile = input.storyState.trackedNPCs.find(onpc => onpc.id === processedNpc.id);
            if (typeof processedNpc.relationshipStatus !== 'number') processedNpc.relationshipStatus = originalNpcProfile?.relationshipStatus ?? 0;
            else processedNpc.relationshipStatus = Math.max(-100, Math.min(100, processedNpc.relationshipStatus));
            
            processedNpc.knownFacts = processedNpc.knownFacts ?? [];
            processedNpc.dialogueHistory = processedNpc.dialogueHistory ?? [];
            processedNpc.dialogueHistory.forEach(dh => { if(!dh.turnId) dh.turnId = input.currentTurnId; });
            
            const originalNpc = input.storyState.trackedNPCs.find(onpc => onpc.id === processedNpc.id);
            if (!originalNpc) { 
                processedNpc.firstEncounteredLocation = processedNpc.firstEncounteredLocation || input.storyState.currentLocation;
                processedNpc.firstEncounteredTurnId = processedNpc.firstEncounteredTurnId || input.currentTurnId;
            } else { 
                 processedNpc.firstEncounteredLocation = originalNpc.firstEncounteredLocation;
                 processedNpc.firstEncounteredTurnId = originalNpc.firstEncounteredTurnId;
                 if (processedNpc.seriesContextNotes === undefined && originalNpc.seriesContextNotes !== null) {
                     processedNpc.seriesContextNotes = originalNpc.seriesContextNotes;
                 }
            }
            processedNpc.lastKnownLocation = processedNpc.lastKnownLocation || processedNpc.firstEncounteredLocation || input.storyState.currentLocation; 
            processedNpc.lastSeenTurnId = input.currentTurnId; 
            processedNpc.updatedAt = new Date().toISOString(); 
            
            processedNpc.isMerchant = processedNpc.isMerchant ?? originalNpc?.isMerchant ?? false;
            processedNpc.merchantInventory = processedNpc.merchantInventory ?? originalNpc?.merchantInventory ?? [];
            const merchantItemIds = new Set<string>();
            processedNpc.merchantInventory.forEach((item, mIndex) => {
                if (!item.id || item.id.trim() === "" || merchantItemIds.has(item.id) || invItemIds.has(item.id) || equippedItemIds.has(item.id) ) {
                    let baseId = `item_merchant_next_${Date.now()}_${Math.random().toString(36).substring(7)}_${mIndex}`;
                    let newId = baseId; let counter = 0;
                    while(merchantItemIds.has(newId) || invItemIds.has(newId) || equippedItemIds.has(newId)){ newId = `${baseId}_u${counter++}`; }
                    item.id = newId;
                }
                merchantItemIds.add(item.id);
                item.basePrice = item.basePrice ?? 0;
                 if (item.basePrice < 0) item.basePrice = 0;
                item.price = item.price ?? item.basePrice;
                if (item.price < 0) item.price = 0;
                if (item.equipSlot === null || (item.equipSlot as unknown) === '') delete (item as Partial<ItemType>).equipSlot;
            });
            npcIdMap.set(processedNpc.id, processedNpc as NPCProfileType);
        }
        output.updatedStoryState.trackedNPCs = Array.from(npcIdMap.values());
        output.updatedStoryState.storySummary = output.updatedStorySummary || input.storyState.storySummary || "";
    }

    if (output && output.activeNPCsInScene) {
      output.activeNPCsInScene = output.activeNPCsInScene.filter(npc => npc.name && npc.name.trim() !== '');
      output.activeNPCsInScene.forEach(npc => {
        if (npc.description === null || npc.description === '') delete npc.description;
        if (npc.keyDialogueOrAction === null || npc.keyDialogueOrAction === '') delete npc.keyDialogueOrAction;
      });
      if (output.activeNPCsInScene.length === 0) delete output.activeNPCsInScene;
    }
    
    output.newLoreEntries = output.newLoreEntries && Array.isArray(output.newLoreEntries) ? output.newLoreEntries : undefined;
    if (output.newLoreEntries) {
        output.newLoreEntries = output.newLoreEntries.filter(lore => lore.keyword && lore.keyword.trim() !== "" && lore.content && lore.content.trim() !== "");
        output.newLoreEntries.forEach(lore => { if (lore.category === null || (lore.category as unknown) === '') delete lore.category; });
        if (output.newLoreEntries.length === 0) delete output.newLoreEntries;
    }
    return output!;
  }
);
