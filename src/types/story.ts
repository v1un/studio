
export interface Item {
  id: string;
  name: string;
  description: string;
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
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[]; // Changed from string[]
  activeQuests: string[]; // List of quest descriptions
  worldFacts: string[]; // Key observations or state changes
}

export interface StoryTurn {
  id: string;
  sceneDescription: string;
  storyStateAfterScene: StructuredStoryState;
  userInputThatLedToScene?: string;
}

export interface GameSession {
  id: string;
  storyPrompt: string; // The initial prompt that started this session
  characterName: string; // The name of the character in this session
  storyHistory: StoryTurn[];
  createdAt: string; // ISO date string
  lastPlayedAt: string; // ISO date string
}
