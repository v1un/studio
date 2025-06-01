
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
  languageUnderstanding?: number; // Scale of 0 (none) to 100 (fluent) for understanding the primary local language.
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
  description: string;
  status: 'active' | 'completed';
  category?: string;
  objectives?: QuestObjective[];
  rewards?: QuestRewards; // Potential rewards defined at quest creation
  updatedAt?: string;
}

export interface NPCDialogueEntry {
  playerInput?: string;
  npcResponse: string;
  turnId: string;
}

export interface NPCProfile {
  id: string; // Unique identifier, e.g., npc_borin_the_dwarf_001
  name: string;
  description: string; // Physical appearance, general demeanor, key characteristics
  classOrRole?: string; // e.g., "Merchant", "Guard Captain"
  firstEncounteredLocation?: string;
  firstEncounteredTurnId?: string; // ID of the StoryTurn when first met
  relationshipStatus: number; // Numerical score, e.g., -100 (Hostile) to 100 (Allied), 0 is Neutral.
  knownFacts: string[]; // Specific pieces of information player has learned
  dialogueHistory?: NPCDialogueEntry[]; // Logs key interaction moments
  lastKnownLocation?: string;
  lastSeenTurnId?: string;
  seriesContextNotes?: string; // AI-internal note about their role if from a known series
  shortTermGoal?: string; // A simple, immediate goal this NPC might be pursuing.
  updatedAt?: string; // Timestamp of the last update to this profile
  isMerchant?: boolean;
  merchantInventory?: Item[]; // Items the merchant sells (item should include its specific sale price)
  buysItemTypes?: string[]; // Optional: Categories of items they buy
  sellsItemTypes?: string[]; // Optional: Categories of items they sell
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  quests: Quest[];
  worldFacts: string[];
  trackedNPCs: NPCProfile[];
  storySummary?: string; // A brief, running summary of key story events and character developments.
}

export interface DisplayMessage {
  id: string; // Unique ID for key prop
  speakerType: 'Player' | 'GM' | 'NPC';
  speakerNameLabel: string; // "Player", "GAME-MASTER", or NPC's actual name for the label
  speakerDisplayName?: string; // For NPC, this would be their name. For GM, "admin". For Player, their character name.
  content: string;
  avatarSrc?: string; // URL for the avatar image
  avatarHint?: string; // For AI-assisted image search if placeholder
  isPlayer: boolean;
}

export interface StoryTurn {
  id: string;
  messages: DisplayMessage[];
  storyStateAfterScene: StructuredStoryState; // Retains the full state after AI processing for this turn
}

export interface GameSession {
  id:string;
  storyPrompt: string;
  characterName: string;
  storyHistory: StoryTurn[]; // Array of story turns, each containing messages and state
  createdAt: string;
  lastPlayedAt: string;
  seriesName: string;
  seriesStyleGuide?: string;
  isPremiumSession?: boolean;
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

// Input/Output types for AI Flows
export interface GenerateScenarioFromSeriesInput {
  seriesName: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateScenarioFromSeriesOutput {
  sceneDescription: string; // AI's initial scene description
  storyState: StructuredStoryState;
  initialLoreEntries: RawLoreEntry[];
  seriesStyleGuide?: string;
}

export interface ActiveNPCInfo {
  name: string;
  description?: string;
  keyDialogueOrAction?: string;
}

// This represents a single piece of dialogue or narration from the AI
export interface AIMessageSegment {
    speaker: string; // 'GM' for Game Master/narration, or the NPC's name if an NPC is speaking
    content: string; // The text of the dialogue or narration
}

// --- Types for Multi-Step GenerateNextScene ---
export type EventType = 
  | 'healthChange' 
  | 'manaChange'
  | 'xpChange'
  | 'levelUp' // Generic level up, specific rewards handled by TypeScript or subsequent focused AI call
  | 'currencyChange'
  | 'languageImprovement'
  | 'itemFound'
  | 'itemLost'
  | 'itemUsed'
  | 'itemEquipped'
  | 'itemUnequipped'
  | 'questAccepted'
  | 'questObjectiveUpdate'
  | 'questCompleted'
  | 'questFailed' // Future
  | 'npcRelationshipChange'
  | 'npcStateChange' // e.g., becomes hostile, starts following player
  | 'newNPCIntroduced' // When an NPC is mentioned for the first time with enough detail to create a basic profile
  | 'worldFactAdded'
  | 'worldFactRemoved'
  | 'worldFactUpdated'
  | 'skillLearned'; // For new skills gained

export interface DescribedEventBase {
  type: EventType;
  reason?: string; // Optional narrative reason for the event
}

export interface HealthChangeEvent extends DescribedEventBase { type: 'healthChange'; characterTarget: 'player' | string; amount: number; } // amount can be negative
export interface ManaChangeEvent extends DescribedEventBase { type: 'manaChange'; characterTarget: 'player' | string; amount: number; }
export interface XPChangeEvent extends DescribedEventBase { type: 'xpChange'; amount: number; }
export interface LevelUpEvent extends DescribedEventBase { type: 'levelUp'; newLevel: number; rewardSuggestion?: string; } // e.g., "suggests increasing strength"
export interface CurrencyChangeEvent extends DescribedEventBase { type: 'currencyChange'; amount: number; }
export interface LanguageImprovementEvent extends DescribedEventBase { type: 'languageImprovement'; amount: number; }

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
export interface ItemUsedEvent extends DescribedEventBase { type: 'itemUsed'; itemIdOrName: string; } // Effects handled by TypeScript based on item properties
export interface ItemEquippedEvent extends DescribedEventBase { type: 'itemEquipped'; itemIdOrName: string; slot: EquipmentSlot; }
export interface ItemUnequippedEvent extends DescribedEventBase { type: 'itemUnequipped'; itemIdOrName: string; slot: EquipmentSlot; }

export interface QuestAcceptedEvent extends DescribedEventBase { 
  type: 'questAccepted'; 
  questIdSuggestion?: string; // AI can suggest an ID
  questDescription: string; 
  category?: string; 
  objectives?: { description: string }[]; 
  rewards?: { experiencePoints?: number; currency?: number; itemNames?: string[] };
}
export interface QuestObjectiveUpdateEvent extends DescribedEventBase { type: 'questObjectiveUpdate'; questIdOrDescription: string; objectiveDescription: string; objectiveCompleted: boolean; }
export interface QuestCompletedEvent extends DescribedEventBase { type: 'questCompleted'; questIdOrDescription: string; }
// export interface QuestFailedEvent extends DescribedEventBase { type: 'questFailed'; questIdOrDescription: string; }

export interface NPCRelationshipChangeEvent extends DescribedEventBase { type: 'npcRelationshipChange'; npcName: string; changeAmount: number; newStatus?: number; } // changeAmount e.g. +10, -20
export interface NPCStateChangeEvent extends DescribedEventBase { type: 'npcStateChange'; npcName: string; newState: string; } // e.g. "hostile", "friendly", "following"
export interface NewNPCIntroducedEvent extends DescribedEventBase {
  type: 'newNPCIntroduced';
  npcName: string;
  npcDescription: string;
  classOrRole?: string;
  initialRelationship?: number;
  isMerchant?: boolean;
}

export interface WorldFactAddedEvent extends DescribedEventBase { type: 'worldFactAdded'; fact: string; }
export interface WorldFactRemovedEvent extends DescribedEventBase { type: 'worldFactRemoved'; factDescription: string; } // AI describes the fact to remove
export interface WorldFactUpdatedEvent extends DescribedEventBase { type: 'worldFactUpdated'; oldFactDescription: string; newFact: string; }

export interface SkillLearnedEvent extends DescribedEventBase {
  type: 'skillLearned';
  skillName: string;
  skillDescription: string;
  skillType: string;
}


export type DescribedEvent = 
  | HealthChangeEvent | ManaChangeEvent | XPChangeEvent | LevelUpEvent | CurrencyChangeEvent | LanguageImprovementEvent
  | ItemFoundEvent | ItemLostEvent | ItemUsedEvent | ItemEquippedEvent | ItemUnequippedEvent
  | QuestAcceptedEvent | QuestObjectiveUpdateEvent | QuestCompletedEvent // | QuestFailedEvent
  | NPCRelationshipChangeEvent | NPCStateChangeEvent | NewNPCIntroducedEvent
  | WorldFactAddedEvent | WorldFactRemovedEvent | WorldFactUpdatedEvent
  | SkillLearnedEvent;

export interface NarrativeAndEventsOutput {
  generatedMessages: AIMessageSegment[];
  describedEvents?: DescribedEvent[];
  activeNPCsInScene?: ActiveNPCInfo[];
  newLoreProposals?: RawLoreEntry[];
  sceneSummaryFragment: string; // Summary of just this scene's events
}
// --- End Types for Multi-Step ---


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
  updatedStorySummary: string; // The new running summary of the story
  dataCorrectionWarnings?: string[]; // Warnings about data corrections made
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
