
export interface Item {
  id: string;
  name: string;
  description: string;
  equipSlot?: 'weapon' | 'shield' | 'head' | 'body' | 'legs' | 'feet' | 'hands' | 'neck' | 'ring'; // Simplified for now, 'ring' can be generic
  // Future: type, rarity, effects, equipSlot etc.
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
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>; // Item object or null if empty
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
