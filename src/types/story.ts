
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
  updatedAt?: string; // Added in a previous step, keeping it
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  quests: Quest[];
  worldFacts: string[];
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

// Input/Output types for AI Flows (already defined in respective flow files, but good to have central reference if needed)
// For GenerateScenarioFromSeries
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

// For GenerateNextScene
export interface GenerateNextSceneInput {
  currentScene: string;
  userInput: string;
  storyState: StructuredStoryState;
  seriesName: string;
  seriesStyleGuide?: string;
}

export interface GenerateNextSceneOutput {
  nextScene: string;
  updatedStoryState: StructuredStoryState;
}
