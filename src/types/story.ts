
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: string; // E.g., "Combat", "Utility", "Passive", "Series-Specific Trait"
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// New: Define StatModifier structure
export interface StatModifier {
  stat: keyof Pick<CharacterProfile, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' | 'maxHealth' | 'maxMana' | 'health' | 'mana' | 'level' | 'experiencePoints' | 'currency' | 'languageReading' | 'languageSpeaking'>;
  value: number; // Can be positive or negative
  type: 'add' | 'multiply'; // e.g. +5 strength, or *1.1 health (multiply might be for future use)
  description?: string; // Optional short description like "+5 Strength"
}

// New: Define ActiveEffect structure
export interface ActiveEffect {
  id: string; // Unique ID for the effect instance on an item
  name: string; // e.g., "Blessing of Strength", "Minor Health Boost"
  description: string; // Narrative description of the effect
  type: 'stat_modifier' | 'temporary_ability' | 'passive_aura'; // Start with stat_modifier and passive_aura
  duration?: 'permanent_while_equipped' | number; // Number of turns, or permanent
  statModifiers?: StatModifier[]; // Array of stat modifications
  // Placeholder for future: grantedAbilityId?: string;
  // Placeholder for future: onUseEffect?: DescribedEvent;
  // Placeholder for future: onEquipEffect?: DescribedEvent;
  // Placeholder for future: onUnequipEffect?: DescribedEvent;
  sourceItemId?: string; // ID of the item granting this effect
}

export interface Item {
  id: string;
  name: string;
  description: string;
  equipSlot?: 'weapon' | 'shield' | 'head' | 'body' | 'legs' | 'feet' | 'hands' | 'neck' | 'ring';
  isConsumable?: boolean;
  effectDescription?: string; // Narrative effect for consumables or simple items. For complex gear, prefer activeEffects.
  isQuestItem?: boolean;
  relevantQuestId?: string;
  basePrice?: number;
  price?: number;
  rarity?: ItemRarity;
  activeEffects?: ActiveEffect[]; // New: Array of structured active effects
}

export interface CharacterProfile {
  name: string;
  class: string;
  description: string;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
  skillsAndAbilities: Skill[];
  currency?: number;
  languageReading?: number;
  languageSpeaking?: number;
}

export type EquipmentSlot =
  | 'weapon'
  | 'shield'
  | 'head'
  | 'body'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'neck'
  | 'ring1'
  | 'ring2';

export interface QuestObjective {
  description: string;
  isCompleted: boolean;
}

export interface QuestRewards {
  experiencePoints?: number;
  items?: Item[];
  currency?: number;
}

export interface Quest {
  id: string;
  title?: string;
  description: string;
  type: 'main' | 'side' | 'dynamic' | 'chapter_goal';
  status: 'active' | 'completed' | 'failed';
  chapterId?: string;
  orderInChapter?: number;
  category?: string;
  objectives?: QuestObjective[];
  rewards?: QuestRewards;
  updatedAt?: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  order: number;
  mainQuestIds: string[];
  isCompleted: boolean;
  unlockCondition?: string;
}


export interface NPCDialogueEntry {
  playerInput?: string;
  npcResponse: string;
  turnId: string;
}

export interface NPCProfile {
  id: string;
  name: string;
  description: string;
  classOrRole?: string;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  firstEncounteredLocation?: string;
  firstEncounteredTurnId?: string;
  relationshipStatus: number;
  knownFacts: string[];
  dialogueHistory?: NPCDialogueEntry[];
  lastKnownLocation?: string;
  lastSeenTurnId?: string;
  seriesContextNotes?: string;
  shortTermGoal?: string;
  updatedAt?: string;
  isMerchant?: boolean;
  merchantInventory?: Item[];
  buysItemTypes?: string[];
  sellsItemTypes?: string[];
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  quests: Quest[];
  chapters: Chapter[];
  currentChapterId?: string;
  worldFacts: string[];
  trackedNPCs: NPCProfile[];
  storySummary?: string;
}

export interface CombatEventLogEntry {
  description: string;
  target?: 'player' | string;
  type: 'damage' | 'healing' | 'effect' | 'death' | 'action';
  value?: string | number;
}

export interface CombatHelperInfo {
  playerHealth: number;
  playerMaxHealth: number;
  playerMana?: number;
  playerMaxMana?: number;
  hostileNPCs: Array<{ id: string; name: string; health?: number; maxHealth?: number; description?: string }>;
  turnEvents: CombatEventLogEntry[];
}


export interface DisplayMessage {
  id: string;
  speakerType: 'Player' | 'GM' | 'NPC' | 'SystemHelper';
  speakerNameLabel: string;
  speakerDisplayName?: string;
  content?: string;
  avatarSrc?: string;
  avatarHint?: string;
  isPlayer: boolean;
  combatHelperInfo?: CombatHelperInfo;
}

export interface StoryTurn {
  id: string;
  messages: DisplayMessage[];
  storyStateAfterScene: StructuredStoryState;
}

export interface GameSession {
  id:string;
  storyPrompt: string;
  characterName: string;
  storyHistory: StoryTurn[];
  createdAt: string;
  lastPlayedAt: string;
  seriesName: string;
  seriesStyleGuide?: string;
  seriesPlotSummary?: string;
  isPremiumSession?: boolean;
  allDataCorrectionWarnings?: { timestamp: string; warnings: string[] }[];
}

export interface LoreEntry {
  id: string;
  keyword: string;
  content: string;
  category?: string;
  source: 'AI-Generated' | 'System' | 'User-Added' | 'AI-Generated-Scenario-Start' | 'AI-Discovered';
  createdAt: string;
  updatedAt?: string;
}

export interface RawLoreEntry {
  keyword: string;
  content: string;
  category?: string;
}

export interface GenerateScenarioFromSeriesInput {
  seriesName: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateScenarioFromSeriesOutput {
  sceneDescription: string;
  storyState: StructuredStoryState;
  initialLoreEntries: RawLoreEntry[];
  seriesStyleGuide?: string;
  seriesPlotSummary?: string;
}

export interface ActiveNPCInfo {
  name: string;
  description?: string;
  keyDialogueOrAction?: string;
}

export interface AIMessageSegment {
    speaker: string;
    content: string;
}

export type EventType =
  | 'healthChange'
  | 'manaChange'
  | 'xpChange'
  | 'levelUp'
  | 'currencyChange'
  | 'languageSkillChange'
  | 'itemFound'
  | 'itemLost'
  | 'itemUsed'
  | 'itemEquipped'
  | 'itemUnequipped'
  | 'questAccepted'
  | 'questObjectiveUpdate'
  | 'questCompleted'
  | 'questFailed'
  | 'npcRelationshipChange'
  | 'npcStateChange'
  | 'newNPCIntroduced'
  | 'worldFactAdded'
  | 'worldFactRemoved'
  | 'worldFactUpdated'
  | 'skillLearned';

export interface DescribedEventBase {
  type: EventType;
  reason?: string;
}

export interface HealthChangeEvent extends DescribedEventBase { type: 'healthChange'; characterTarget: 'player' | string; amount: number; }
export interface ManaChangeEvent extends DescribedEventBase { type: 'manaChange'; characterTarget: 'player' | string; amount: number; }
export interface XPChangeEvent extends DescribedEventBase { type: 'xpChange'; amount: number; }
export interface LevelUpEvent extends DescribedEventBase { type: 'levelUp'; newLevel: number; rewardSuggestion?: string; }
export interface CurrencyChangeEvent extends DescribedEventBase { type: 'currencyChange'; amount: number; }
export interface LanguageSkillChangeEvent extends DescribedEventBase { type: 'languageSkillChange'; skillTarget: 'reading' | 'speaking'; amount: number; }


export interface ItemFoundEvent extends DescribedEventBase {
  type: 'itemFound';
  itemName: string;
  itemDescription: string;
  quantity?: number;
  suggestedBasePrice?: number;
  equipSlot?: Item['equipSlot'];
  isConsumable?: boolean;
  effectDescription?: string; // Keep for simple effects, especially consumables
  isQuestItem?: boolean;
  relevantQuestId?: string;
  rarity?: ItemRarity;
  activeEffects?: ActiveEffect[]; // New: For more complex, structured effects
}
export interface ItemLostEvent extends DescribedEventBase { type: 'itemLost'; itemIdOrName: string; quantity?: number; }
export interface ItemUsedEvent extends DescribedEventBase { type: 'itemUsed'; itemIdOrName: string; } // Consider adding effect details if used item has active effects
export interface ItemEquippedEvent extends DescribedEventBase { type: 'itemEquipped'; itemIdOrName: string; slot: EquipmentSlot; }
export interface ItemUnequippedEvent extends DescribedEventBase { type: 'itemUnequipped'; itemIdOrName: string; slot: EquipmentSlot; }

export interface QuestAcceptedEvent extends DescribedEventBase {
  type: 'questAccepted';
  questIdSuggestion?: string;
  questTitle?: string;
  questDescription: string;
  questType?: Quest['type'];
  chapterId?: string;
  orderInChapter?: number;
  category?: string;
  objectives?: { description: string }[];
  // Ensure items in rewards can also have activeEffects
  rewards?: { experiencePoints?: number; currency?: number; items?: Array<Partial<Item> & { activeEffects?: ActiveEffect[] }> };
}
export interface QuestObjectiveUpdateEvent extends DescribedEventBase { type: 'questObjectiveUpdate'; questIdOrDescription: string; objectiveDescription: string; objectiveCompleted: boolean; }
export interface QuestCompletedEvent extends DescribedEventBase { type: 'questCompleted'; questIdOrDescription: string; }
export interface QuestFailedEvent extends DescribedEventBase { type: 'questFailed'; questIdOrDescription: string; }


export interface NPCRelationshipChangeEvent extends DescribedEventBase { type: 'npcRelationshipChange'; npcName: string; changeAmount: number; newStatus?: number; }
export interface NPCStateChangeEvent extends DescribedEventBase { type: 'npcStateChange'; npcName: string; newState: string; }
export interface NewNPCIntroducedEvent extends DescribedEventBase {
  type: 'newNPCIntroduced';
  npcName: string;
  npcDescription: string;
  classOrRole?: string;
  initialRelationship?: number;
  isMerchant?: boolean;
  initialHealth?: number;
  initialMana?: number;
  merchantSellsItemTypes?: string[];
  merchantBuysItemTypes?: string[];
}

export interface WorldFactAddedEvent extends DescribedEventBase { type: 'worldFactAdded'; fact: string; }
export interface WorldFactRemovedEvent extends DescribedEventBase { type: 'worldFactRemoved'; factDescription: string; }
export interface WorldFactUpdatedEvent extends DescribedEventBase { type: 'worldFactUpdated'; oldFactDescription: string; newFact: string; }

export interface SkillLearnedEvent extends DescribedEventBase {
  type: 'skillLearned';
  skillName: string;
  skillDescription: string;
  skillType: string;
}


export type DescribedEvent =
  | HealthChangeEvent | ManaChangeEvent | XPChangeEvent | LevelUpEvent | CurrencyChangeEvent | LanguageSkillChangeEvent
  | ItemFoundEvent | ItemLostEvent | ItemUsedEvent | ItemEquippedEvent | ItemUnequippedEvent
  | QuestAcceptedEvent | QuestObjectiveUpdateEvent | QuestCompletedEvent | QuestFailedEvent
  | NPCRelationshipChangeEvent | NPCStateChangeEvent | NewNPCIntroducedEvent
  | WorldFactAddedEvent | WorldFactRemovedEvent | WorldFactUpdatedEvent
  | SkillLearnedEvent;

export interface NarrativeAndEventsOutput {
  generatedMessages: AIMessageSegment[];
  describedEvents?: DescribedEvent[];
  activeNPCsInScene?: ActiveNPCInfo[];
  newLoreProposals?: RawLoreEntry[];
  sceneSummaryFragment: string;
}

export interface GenerateNextSceneInput {
  currentScene: string;
  userInput: string;
  storyState: StructuredStoryState;
  seriesName: string;
  seriesStyleGuide?: string;
  currentTurnId: string;
  usePremiumAI?: boolean;
}

export interface GenerateNextSceneOutput {
  generatedMessages: AIMessageSegment[];
  updatedStoryState: StructuredStoryState;
  activeNPCsInScene?: ActiveNPCInfo[];
  newLoreEntries?: RawLoreEntry[];
  updatedStorySummary: string;
  dataCorrectionWarnings?: string[];
}

export interface GenerateStoryStartInput {
  prompt: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateStoryStartOutput {
  sceneDescription: string;
  storyState: StructuredStoryState;
}

// Types for FleshOutChapterQuests flow
export interface FleshOutChapterQuestsInput {
  chapterToFleshOut: Chapter;
  seriesName: string;
  seriesPlotSummary: string;
  overallStorySummarySoFar: string;
  characterContext: { name: string; class: string; level: number; };
  usePremiumAI?: boolean;
}

export interface FleshOutChapterQuestsOutput {
  fleshedOutQuests: Quest[];
}

// --- Placeholder types for future systems ---

export interface Faction {
  id: string;
  name: string;
  description: string;
  // More fields like allies, enemies, leader etc.
}

export interface CharacterReputation {
  factionId: string;
  reputationScore: number; // e.g., -100 (Hostile) to 100 (Exalted)
  // More fields like status (e.g., "Outcast", "Member", "Champion")
}

export interface PlayerReputation {
  factionReputations: CharacterReputation[];
}

export interface SkillSpecialization {
  id: string;
  name: string;
  description: string;
  baseSkillId?: string; // If it branches from a core skill
  grantsAbilities: Skill[]; // New abilities unlocked by this specialization
  // Requirements: e.g., level, specific skill levels
}

export interface ResourceItem extends Item {
  resourceType: 'herb' | 'ore' | 'monster_part' | 'wood' | 'gem';
  // Potentially: gatheringToolRequired?: string;
}

export interface CraftingRecipeIngredient {
  itemId: string; // ID of the item (could be resource or other item)
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string; // e.g., "Minor Healing Potion Recipe"
  description: string;
  ingredients: CraftingRecipeIngredient[];
  outputItemId: string; // ID of the item crafted
  outputQuantity: number;
  requiredSkill?: { skillId: string; level: number }; // e.g., Alchemy Lvl 5
  discovered?: boolean; // If the player has learned this recipe
}

// Add to CharacterProfile (example for placeholders)
// export interface CharacterProfile {
//   // ... existing fields
//   reputation?: PlayerReputation;
//   knownRecipes?: string[]; // IDs of CraftingRecipe
//   specializations?: SkillSpecialization[];
// }

// Add to StructuredStoryState (example for placeholders)
// export interface StructuredStoryState {
//   // ... existing fields
//   worldFactions?: Faction[];
//   availableRecipes?: CraftingRecipe[]; // Globally known or discoverable recipes
// }
