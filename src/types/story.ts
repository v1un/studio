
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: string; // E.g., "Combat", "Utility", "Passive", "Series-Specific Trait"
  // Future considerations:
  // manaCost?: number;
  // cooldownTurns?: number;
  // usageRequirements?: string[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  equipSlot?: 'weapon' | 'shield' | 'head' | 'body' | 'legs' | 'feet' | 'hands' | 'neck' | 'ring';
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

export type NPCRelationshipStatus = 'Friendly' | 'Neutral' | 'Hostile' | 'Allied' | 'Cautious' | 'Unknown';

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
  relationshipStatus: NPCRelationshipStatus;
  knownFacts: string[]; // Specific pieces of information player has learned
  dialogueHistory?: NPCDialogueEntry[]; // Logs key interaction moments
  lastKnownLocation?: string;
  lastSeenTurnId?: string;
  seriesContextNotes?: string; // AI-internal note about their role if from a known series
  updatedAt?: string; // Timestamp of the last update to this profile
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  quests: Quest[];
  worldFacts: string[];
  trackedNPCs: NPCProfile[];
}

export interface StoryTurn {
  id: string;
  sceneDescription: string;
  storyStateAfterScene: StructuredStoryState;
  userInputThatLedToScene?: string;
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
}

export interface LoreEntry {
  id: string;
  keyword: string;
  content: string;
  category?: string;
  source: 'AI-Generated' | 'System' | 'User-Added' | 'AI-Generated-Scenario-Start';
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
}

export interface GenerateScenarioFromSeriesOutput {
  sceneDescription: string;
  storyState: StructuredStoryState;
  initialLoreEntries: RawLoreEntry[];
  seriesStyleGuide?: string;
}

export interface ActiveNPCInfo {
  name: string;
  description?: string;
  keyDialogueOrAction?: string;
}

export interface GenerateNextSceneInput {
  currentScene: string;
  userInput: string;
  storyState: StructuredStoryState;
  seriesName: string;
  seriesStyleGuide?: string;
  currentTurnId: string;
}

export interface GenerateNextSceneOutput {
  nextScene: string;
  updatedStoryState: StructuredStoryState;
  activeNPCsInScene?: ActiveNPCInfo[];
}
