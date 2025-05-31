"use client";

import { useState, useEffect } from "react";
import { generateStoryStart } from "@/ai/flows/generate-story-start";
import { generateNextScene } from "@/ai/flows/generate-next-scene";
import type { StoryTurn } from "@/types/story";
import InitialPromptForm from "@/components/story-forge/initial-prompt-form";
import StoryDisplay from "@/components/story-forge/story-display";
import UserInputForm from "@/components/story-forge/user-input-form";
import StoryControls from "@/components/story-forge/story-controls";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button"; // Ensure Button is imported

export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const currentTurn = storyHistory.length > 0 ? storyHistory[storyHistory.length - 1] : null;

  const handleStartStory = async (prompt: string) => {
    setIsLoading(true);
    try {
      const result = await generateStoryStart({ prompt });
      const initialStoryState = "The story has just begun. No specific items or character details are known yet.";
      const firstTurn: StoryTurn = {
        id: crypto.randomUUID(),
        sceneDescription: result.sceneDescription,
        storyStateAfterScene: initialStoryState,
      };
      setStoryHistory([firstTurn]);
    } catch (error) {
      console.error("Failed to start story:", error);
      toast({
        title: "Error",
        description: "Could not start the story. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentTurn) return;
    setIsLoading(true);
    try {
      const result = await generateNextScene({
        currentScene: currentTurn.sceneDescription,
        userInput: userInput,
        storyState: currentTurn.storyStateAfterScene,
      });
      const nextTurnItem: StoryTurn = {
        id: crypto.randomUUID(),
        sceneDescription: result.nextScene,
        storyStateAfterScene: result.updatedStoryState,
        userInputThatLedToScene: userInput,
      };
      setStoryHistory((prevHistory) => [...prevHistory, nextTurnItem]);
    } catch (error) {
      console.error("Failed to generate next scene:", error);
      toast({
        title: "Error",
        description: "Could not generate the next scene. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleUndo = () => {
    if (storyHistory.length > 1) {
      setStoryHistory((prevHistory) => prevHistory.slice(0, -1));
    } else if (storyHistory.length === 1) {
      // If only one turn (initial scene), undoing means restarting
      handleRestart();
    }
  };

  const handleRestart = () => {
    setStoryHistory([]);
    toast({
      title: "Story Restarted",
      description: "Let the new adventure begin!",
    });
  };
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-4 sm:p-8 selection:bg-primary/20 selection:text-primary">
      <header className="mb-8 text-center">
        <h1 className="font-headline text-5xl sm:text-6xl font-bold text-primary flex items-center justify-center">
          <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mr-3 text-accent" />
          Story Forge
        </h1>
        <p className="text-muted-foreground text-lg mt-2">
          Craft your own epic tales with the power of AI.
        </p>
      </header>

      <main className="w-full max-w-2xl space-y-6">
        {isLoading && (
          <div className="flex justify-center items-center p-4 rounded-md bg-card/50 backdrop-blur-sm shadow-md">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-foreground">AI is thinking...</p>
          </div>
        )}

        {!currentTurn && !isLoading && (
          <InitialPromptForm onSubmit={handleStartStory} isLoading={isLoading} />
        )}

        {currentTurn && (
          <>
            <StoryControls
              onUndo={handleUndo}
              onRestart={handleRestart}
              canUndo={storyHistory.length > 0}
              isLoading={isLoading}
            />
            <StoryDisplay
              sceneDescription={currentTurn.sceneDescription}
              keyProp={currentTurn.id}
            />
            <UserInputForm onSubmit={handleUserAction} isLoading={isLoading} />
          </>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Story Forge. Powered by GenAI.</p>
      </footer>
    </div>
  );
}
