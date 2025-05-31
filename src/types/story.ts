
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
  storyStateAfterScene: StructuredStoryState; // Changed from string
  userInputThatLedToScene?: string;
}
