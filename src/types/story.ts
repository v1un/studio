
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: string; // E.g., "Combat", "Utility", "Passive", "Series-Specific Trait"
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface StatModifier {
  stat: keyof Pick<CharacterProfile, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' | 'maxHealth' | 'maxMana' | 'health' | 'mana' | 'level' | 'experiencePoints' | 'currency' | 'languageReading' | 'languageSpeaking'>;
  value: number;
  type: 'add' | 'multiply';
  description?: string;
}

export interface ActiveEffect {
  id: string;
  name: string;
  description: string;
  type: 'stat_modifier' | 'temporary_ability' | 'passive_aura';
  duration?: 'permanent_while_equipped' | number; // number is for turns (consumables)
  statModifiers?: StatModifier[];
  sourceItemId?: string;
}

export interface TemporaryEffect extends ActiveEffect {
  turnsRemaining: number;
  // Inherits id, name, description, type, statModifiers, sourceItemId from ActiveEffect
  // duration here would be the original total duration, turnsRemaining is what counts down
}

export interface Item {
  id: string;
  name: string;
  description: string;
  equipSlot?: EquipmentSlot;
  isConsumable?: boolean;
  effectDescription?: string; // Narrative effect description
  isQuestItem?: boolean;
  relevantQuestId?: string;
  basePrice?: number;
  price?: number; // For merchants
  rarity?: ItemRarity;
  activeEffects?: ActiveEffect[]; // Can now include effects with numeric duration for consumables
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
  activeTemporaryEffects?: TemporaryEffect[]; // New field for active buffs/debuffs
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
  type: 'main' | 'side' | 'dynamic' | 'arc_goal';
  status: 'active' | 'completed' | 'failed';
  storyArcId?: string | null; // Allow null for bridging quests
  orderInStoryArc?: number;
  category?: string;
  objectives?: QuestObjective[];
  rewards?: QuestRewards;
  updatedAt?: string;
}

export interface StoryArc {
  id: string;
  title: string;
  description: string;
  order: number;
  mainQuestIds: string[];
  isCompleted: boolean;
  unlockConditions?: string[]; // Changed from unlockCondition: string
  completionSummary?: string;
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
  storyArcs: StoryArc[];
  currentStoryArcId?: string | null; // Allow null
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
  speakerType: 'Player' | 'GM' | 'NPC' | 'SystemHelper' | 'ArcNotification'; // Added ArcNotification
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

// Input/Output for the generateScenarioFoundationFlow
export interface GenerateScenarioFoundationInput {
  seriesName: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateScenarioFoundationOutput {
  sceneDescription: string;
  characterProfile: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  worldFacts: string[];
  seriesStyleGuide?: string;
  seriesPlotSummary: string;
}

// Input/Output for the generateScenarioNarrativeElementsFlow
export interface GenerateScenarioNarrativeElementsInput {
  seriesName: string;
  seriesPlotSummary: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  characterNameInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateScenarioNarrativeElementsOutput {
  quests: Quest[];
  storyArcs: StoryArc[];
  trackedNPCs: NPCProfile[];
  initialLoreEntries: RawLoreEntry[];
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
  effectDescription?: string; // Narrative effect description
  isQuestItem?: boolean;
  relevantQuestId?: string;
  rarity?: ItemRarity;
  activeEffects?: ActiveEffect[]; // Can now include effects with numeric duration
}
export interface ItemLostEvent extends DescribedEventBase { type: 'itemLost'; itemIdOrName: string; quantity?: number; }
export interface ItemUsedEvent extends DescribedEventBase { type: 'itemUsed'; itemIdOrName: string; }
export interface ItemEquippedEvent extends DescribedEventBase { type: 'itemEquipped'; itemIdOrName: string; slot: EquipmentSlot; }
export interface ItemUnequippedEvent extends DescribedEventBase { type: 'itemUnequipped'; itemIdOrName: string; slot: EquipmentSlot; }

export interface QuestAcceptedEvent extends DescribedEventBase {
  type: 'questAccepted';
  questIdSuggestion?: string;
  questTitle?: string;
  questDescription: string;
  questType?: Quest['type'];
  storyArcId?: string;
  orderInStoryArc?: number;
  category?: string;
  objectives?: { description: string }[];
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
  describedEvents?: DescribedEvent[];
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

export interface FleshOutStoryArcQuestsInput {
  storyArcToFleshOut: StoryArc;
  seriesName: string;
  seriesPlotSummary: string;
  overallStorySummarySoFar: string;
  characterContext: { name: string; class: string; level: number; };
  usePremiumAI?: boolean;
}

export interface FleshOutStoryArcQuestsOutput {
  fleshedOutQuests: Quest[];
}

export interface DiscoverNextStoryArcInput {
  seriesName: string;
  seriesPlotSummary: string;
  completedOrGeneratedArcTitles: string[];
  lastCompletedArcOrder: number;
  lastCompletedArcSummary?: string;
  usePremiumAI?: boolean;
}

export interface DiscoverNextStoryArcOutput {
  nextStoryArcOutline: StoryArc | null;
}

export interface UpdateCharacterDescriptionInput {
    currentProfile: CharacterProfile;
    completedArc: StoryArc;
    overallStorySummarySoFar: string;
    seriesName: string;
    usePremiumAI?: boolean;
}

export interface UpdateCharacterDescriptionOutput {
    updatedCharacterDescription: string;
}

export interface GenerateBridgingQuestInput {
  seriesName: string;
  currentLocation: string;
  characterProfile: { name: string; class: string; level: number; };
  overallStorySummarySoFar: string;
  previousArcCompletionSummary: string;
  usePremiumAI?: boolean;
}

export interface GenerateBridgingQuestOutput {
  bridgingQuest: Quest | null;
  bridgingNarrativeHook?: string;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
}

export interface CharacterReputation {
  factionId: string;
  reputationScore: number;
}

export interface PlayerReputation {
  factionReputations: CharacterReputation[];
}

export interface SkillSpecialization {
  id: string;
  name: string;
  description: string;
  baseSkillId?: string;
  grantsAbilities: Skill[];
}

export interface ResourceItem extends Item {
  resourceType: 'herb' | 'ore' | 'monster_part' | 'wood' | 'gem';
}

export interface CraftingRecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: CraftingRecipeIngredient[];
  outputItemId: string;
  outputQuantity: number;
  requiredSkill?: { skillId: string; level: number };
  discovered?: boolean;
}
