
"use client";

import { useState, useEffect } from "react";
import { generateScenarioFromSeries } from "@/ai/flows/generate-scenario-from-series";
import type { GenerateScenarioFromSeriesInput, GenerateScenarioFromSeriesOutput } from "@/ai/flows/generate-scenario-from-series";
import type { StoryTurn, GameSession } from "@/types/story";

import InitialPromptForm from "@/components/story-forge/initial-prompt-form";
import StoryDisplay from "@/components/story-forge/story-display";
import UserInputForm from "@/components/story-forge/user-input-form";
import StoryControls from "@/components/story-forge/story-controls";
import CharacterSheet from "@/components/story-forge/character-sheet";
import MinimalCharacterStatus from "@/components/story-forge/minimal-character-status";
import JournalDisplay from "@/components/story-forge/journal-display";
import LorebookDisplay from "@/components/story-forge/lorebook-display";

import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookUser, StickyNote, Library } from "lucide-react"; // Added icons for tabs
import { initializeLorebook, clearLorebook } from "@/lib/lore-manager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";

export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [activeTab, setActiveTab] = useState("story");
  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingPage(true);
    const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (activeId) {
      const sessionData = localStorage.getItem(`${SESSION_KEY_PREFIX}${activeId}`);
      if (sessionData) {
        try {
          const session: GameSession = JSON.parse(sessionData);
          setStoryHistory(session.storyHistory);
          setCurrentSessionId(session.id);
        } catch (e) {
          console.error("Failed to parse saved session:", e);
          localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
          localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
        }
      } else {
        localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      }
    }
    setIsLoadingPage(false);
  }, []);

  useEffect(() => {
    if (isLoadingPage) return;

    if (currentSessionId && storyHistory.length > 0) {
      const sessionKey = `${SESSION_KEY_PREFIX}${currentSessionId}`;
      const existingSessionRaw = localStorage.getItem(sessionKey);
      let sessionToSave: GameSession | null = null;

      if (existingSessionRaw) {
        try {
          const existingSession: GameSession = JSON.parse(existingSessionRaw);
          if (JSON.stringify(existingSession.storyHistory) !== JSON.stringify(storyHistory) ||
              existingSession.seriesName !== storyHistory[0]?.storyStateAfterScene.character.name) { 
            sessionToSave = {
              ...existingSession,
              storyHistory: storyHistory,
              lastPlayedAt: new Date().toISOString(),
              characterName: storyHistory[0].storyStateAfterScene.character.name,
              seriesName: existingSession.seriesName, 
            };
          } else if (new Date().getTime() - new Date(existingSession.lastPlayedAt).getTime() > 60000) {
             sessionToSave = {
              ...existingSession,
              lastPlayedAt: new Date().toISOString(),
            };
          }
        } catch (e) {
          console.error("Error parsing existing session for update:", e);
        }
      }
      
      if (sessionToSave) {
        localStorage.setItem(sessionKey, JSON.stringify(sessionToSave));
      }
    }
  }, [storyHistory, currentSessionId, isLoadingPage]);


  const currentTurn = storyHistory.length > 0 ? storyHistory[storyHistory.length - 1] : null;
  const character = currentTurn?.storyStateAfterScene.character;
  const storyState = currentTurn?.storyStateAfterScene;

  const handleStartStoryFromSeries = async (seriesName: string) => {
    setIsLoadingInteraction(true);
    try {
      const input: GenerateScenarioFromSeriesInput = { seriesName };
      const result: GenerateScenarioFromSeriesOutput = await generateScenarioFromSeries(input);
      
      initializeLorebook(result.initialLoreEntries);

      const firstTurn: StoryTurn = {
        id: crypto.randomUUID(),
        sceneDescription: result.sceneDescription,
        storyStateAfterScene: result.storyState,
      };
      
      const newSessionId = crypto.randomUUID();
      const newSession: GameSession = {
        id: newSessionId,
        storyPrompt: `Adventure in the world of: ${seriesName}`,
        characterName: result.storyState.character.name,
        storyHistory: [firstTurn],
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        seriesName: seriesName,
      };

      localStorage.setItem(`${SESSION_KEY_PREFIX}${newSession.id}`, JSON.stringify(newSession));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
      
      setStoryHistory([firstTurn]);
      setCurrentSessionId(newSession.id);
      setActiveTab("story"); // Default to story tab on new game
      toast({
        title: `Adventure in ${seriesName} Begun!`,
        description: `Playing as ${newSession.characterName}.`,
      });
    } catch (error) {
      console.error("Failed to start story from series:", error);
      toast({
        title: "Error Starting Scenario",
        description: "The AI encountered an issue creating the scenario. Please try a different series or try again.",
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentTurn || !currentSessionId) return;
    setIsLoadingInteraction(true);
    try {
      const { generateNextScene } = await import("@/ai/flows/generate-next-scene");
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
        title: "Error Generating Scene",
        description: "The AI encountered an issue. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
  };

  const handleUndo = () => {
    if (storyHistory.length > 1) {
      setStoryHistory((prevHistory) => prevHistory.slice(0, -1));
       toast({ title: "Last action undone."});
    } else if (storyHistory.length === 1) {
      handleRestart();
    }
  };

  const handleRestart = () => {
    if (currentSessionId) {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${currentSessionId}`);
    }
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    clearLorebook(); 
    setStoryHistory([]);
    setCurrentSessionId(null);
    setActiveTab("story");
    toast({
      title: "Story Session Cleared",
      description: "Ready for a new adventure!",
    });
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading your adventure...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background p-4 sm:p-8 selection:bg-primary/20 selection:text-primary">
      <header className="mb-6 text-center">
        <h1 className="font-headline text-5xl sm:text-6xl font-bold text-primary flex items-center justify-center">
          <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mr-3 text-accent" />
          Story Forge
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          Forge your legend in worlds you know, or discover new ones.
        </p>
      </header>

      <main className="w-full max-w-2xl">
        {isLoadingInteraction && (
          <div className="flex justify-center items-center p-4 rounded-md bg-card/80 backdrop-blur-sm shadow-md fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-foreground">AI is forging your tale...</p>
          </div>
        )}

        {!currentSessionId && !isLoadingInteraction && (
          <InitialPromptForm 
            onSubmitSeries={handleStartStoryFromSeries}
            isLoading={isLoadingInteraction} 
          />
        )}
        
        {currentSessionId && currentTurn && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="story" className="text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 mr-1 sm:mr-2" /> Story
              </TabsTrigger>
              <TabsTrigger value="character" className="text-xs sm:text-sm">
                <BookUser className="w-4 h-4 mr-1 sm:mr-2" /> Character
              </TabsTrigger>
              <TabsTrigger value="journal" className="text-xs sm:text-sm">
                <StickyNote className="w-4 h-4 mr-1 sm:mr-2" /> Journal
              </TabsTrigger>
              <TabsTrigger value="lorebook" className="text-xs sm:text-sm">
                <Library className="w-4 h-4 mr-1 sm:mr-2" /> Lorebook
              </TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="space-y-4">
              <StoryControls
                onUndo={handleUndo}
                onRestart={handleRestart}
                canUndo={storyHistory.length > 0}
                isLoading={isLoadingInteraction}
              />
              {character && <MinimalCharacterStatus character={character} currentLocation={storyState?.currentLocation} />}
              <StoryDisplay
                sceneDescription={currentTurn.sceneDescription}
                keyProp={currentTurn.id}
              />
              <UserInputForm onSubmit={handleUserAction} isLoading={isLoadingInteraction} />
            </TabsContent>

            <TabsContent value="character">
              {character && storyState && (
                <CharacterSheet character={character} storyState={storyState} />
              )}
            </TabsContent>

            <TabsContent value="journal">
              {storyState && (
                <JournalDisplay 
                  activeQuests={storyState.activeQuests} 
                  worldFacts={storyState.worldFacts} 
                />
              )}
            </TabsContent>
            
            <TabsContent value="lorebook">
              <LorebookDisplay />
            </TabsContent>
          </Tabs>
        )}
         {currentSessionId && !currentTurn && !isLoadingInteraction && (
            <div className="text-center p-6 bg-card rounded-lg shadow-md">
                <p className="text-lg text-muted-foreground mb-4">Your current session is empty or could not be fully loaded.</p>
                <Button onClick={handleRestart}>Start a New Adventure</Button>
            </div>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Story Forge. Powered by GenAI.</p>
      </footer>
    </div>
  );
}
