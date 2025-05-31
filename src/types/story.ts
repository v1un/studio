
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
  level: number; // New
  experiencePoints: number; // New
  experienceToNextLevel: number; // New
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
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
