
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

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  activeQuests: string[];
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
}

export interface LoreEntry {
  id: string; // unique ID for the entry
  keyword: string; // The term being defined (e.g., "Blade of Marmora", "Hogwarts")
  content: string; // The lore description
  category?: string; // Optional: e.g., "Character", "Location", "Artifact", "Concept"
  source: 'AI-Generated' | 'System' | 'User-Added'; // Who/what created this entry
  createdAt: string; // ISO date string
}
