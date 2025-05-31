
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
  items?: Item[];
}

export interface Quest {
  id: string;
  description: string;
  status: 'active' | 'completed';
  category?: string; 
  objectives?: QuestObjective[];
  rewards?: QuestRewards;
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
  id: string;
  storyPrompt: string; 
  characterName: string;
  storyHistory: StoryTurn[];
  createdAt: string;
  lastPlayedAt: string;
  seriesName?: string; 
}

export interface LoreEntry {
  id: string; 
  keyword: string; 
  content: string; 
  category?: string; 
  source: 'AI-Generated' | 'System' | 'User-Added' | 'AI-Generated-Scenario-Start';
  createdAt: string; 
}

export interface RawLoreEntry {
  keyword: string;
  content: string;
  category?: string;
}
