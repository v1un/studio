export interface StoryTurn {
  id: string;
  sceneDescription: string;
  storyStateAfterScene: string;
  userInputThatLedToScene?: string;
}
