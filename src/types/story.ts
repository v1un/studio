
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
  // For merchant inventory specifically, price might be part of the item object if it's different from basePrice
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
