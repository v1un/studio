
export interface CharacterProfile {
  name: string;
  class: string;
  description: string;
  health: number;
  maxHealth: number;
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: string[]; // List of item names
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
  // turnCount can be derived: storyHistory.length
}
