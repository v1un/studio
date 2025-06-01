
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: string; // E.g., "Combat", "Utility", "Passive", "Series-Specific Trait"
}

export interface Item {
  id: string;
  name: string;
  description: string;
  equipSlot?: 'weapon' | 'shield' | 'head' | 'body' | 'legs' | 'feet' | 'hands' | 'neck' | 'ring';
  isConsumable?: boolean;
  effectDescription?: string; // E.g., "Restores 20 HP", "Grants temporary invisibility"
  isQuestItem?: boolean;
  relevantQuestId?: string;
  basePrice?: number; // Base value of the item
  price?: number; // The price a merchant sells this item for
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
  currency?: number; // Player's currency
  languageReading?: number; // Scale of 0 (none) to 100 (fluent) for understanding written language.
  languageSpeaking?: number; // Scale of 0 (none) to 100 (fluent) for understanding spoken language.
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
  items?: Item[]; // Items to be awarded
  currency?: number; // Currency awarded
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
  mainQuestIds: string[]; // Initially, for outlined chapters, this might be empty.
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

export interface DisplayMessage {
  id: string;
  speakerType: 'Player' | 'GM' | 'NPC';
  speakerNameLabel: string;
  speakerDisplayName?: string;
  content: string;
  avatarSrc?: string;
  avatarHint?: string;
  isPlayer: boolean;
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
  seriesPlotSummary?: string; // Added to store plot summary for fleshing out chapters
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
  seriesPlotSummary?: string; // Added to pass plot summary to client
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
  effectDescription?: string;
  isQuestItem?: boolean;
  relevantQuestId?: string;
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
  questType?: Quest['type']; // To allow AI to suggest type for dynamic quests
  chapterId?: string;       // If it's part of a chapter
  orderInChapter?: number;
  category?: string;
  objectives?: { description: string }[];
  rewards?: { experiencePoints?: number; currency?: number; items?: Partial<Item>[] };
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
  characterContext: { name: string; class: string; level: number; }; // Minimal context
  usePremiumAI?: boolean;
}

export interface FleshOutChapterQuestsOutput {
  fleshedOutQuests: Quest[];
}
