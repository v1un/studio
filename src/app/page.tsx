
"use client";

import { useState, useEffect } from "react";
import { generateScenarioFromSeries } from "@/ai/flows/generate-scenario-from-series";
import type { GenerateScenarioFromSeriesInput, GenerateScenarioFromSeriesOutput } from "@/ai/flows/generate-scenario-from-series";
import type { StoryTurn, GameSession, StructuredStoryState, Quest } from "@/types/story";

import InitialPromptForm from "@/components/story-forge/initial-prompt-form";
import StoryDisplay from "@/components/story-forge/story-display";
import UserInputForm from "@/components/story-forge/user-input-form";
import StoryControls from "@/components/story-forge/story-controls";
import CharacterSheet from "@/components/story-forge/character-sheet";
import MinimalCharacterStatus from "@/components/story-forge/minimal-character-status";
import JournalDisplay from "@/components/story-forge/journal-display";
import LorebookDisplay from "@/components/story-forge/lorebook-display";

import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookUser, StickyNote, Library } from "lucide-react";
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
          // Initialize lorebook if it's associated with this session (requires lore to be part of session or linked)
          // For now, lorebook is global. If a session has specific lore, this would be the place to load it.
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
          // Check if story history or character name (indicative of a new start) has changed
          if (JSON.stringify(existingSession.storyHistory) !== JSON.stringify(storyHistory) ||
              existingSession.characterName !== storyHistory[0]?.storyStateAfterScene.character.name) {
            sessionToSave = {
              ...existingSession,
              storyHistory: storyHistory,
              lastPlayedAt: new Date().toISOString(),
              characterName: storyHistory[0].storyStateAfterScene.character.name, // Update char name
              seriesName: existingSession.seriesName, // Preserve original series name
            };
          } else if (new Date().getTime() - new Date(existingSession.lastPlayedAt).getTime() > 60000) { // Update lastPlayedAt if unchanged for >1min
             sessionToSave = {
              ...existingSession,
              lastPlayedAt: new Date().toISOString(),
            };
          }
        } catch (e) {
          console.error("Error parsing existing session for update:", e);
          // Potentially corrupted session, consider clearing it or handling error
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

  const handleStartStoryFromSeries = async (data: { seriesName: string; characterName?: string; characterClass?: string }) => {
    setIsLoadingInteraction(true);
    try {
      const input: GenerateScenarioFromSeriesInput = {
        seriesName: data.seriesName,
        characterNameInput: data.characterName,
        characterClassInput: data.characterClass,
      };
      const result: GenerateScenarioFromSeriesOutput = await generateScenarioFromSeries(input);
      
      clearLorebook(); // Clear old lore before initializing new
      initializeLorebook(result.initialLoreEntries);

      const firstTurn: StoryTurn = {
        id: crypto.randomUUID(),
        sceneDescription: result.sceneDescription,
        storyStateAfterScene: result.storyState,
      };
      
      const newSessionId = crypto.randomUUID();
      const newSession: GameSession = {
        id: newSessionId,
        storyPrompt: `Adventure in the world of: ${data.seriesName}${data.characterName ? ` as ${data.characterName}` : ''}`,
        characterName: result.storyState.character.name,
        storyHistory: [firstTurn],
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        seriesName: data.seriesName,
      };

      localStorage.setItem(`${SESSION_KEY_PREFIX}${newSession.id}`, JSON.stringify(newSession));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
      
      setStoryHistory([firstTurn]);
      setCurrentSessionId(newSession.id);
      setActiveTab("story");
      toast({
        title: `Adventure in ${data.seriesName} Begun!`,
        description: `Playing as ${newSession.characterName}.`,
      });
    } catch (error) {
      console.error("Failed to start story from series:", error);
      toast({
        title: "Error Starting Scenario",
        description: "The AI encountered an issue creating the scenario. Please try a different series or adjust character inputs.",
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentTurn || !currentSessionId || !storyState) return;
    setIsLoadingInteraction(true);
    try {
      const { generateNextScene } = await import("@/ai/flows/generate-next-scene");
      const result = await generateNextScene({
        currentScene: currentTurn.sceneDescription,
        userInput: userInput,
        storyState: storyState,
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
      // If only one turn (initial scene), undoing means restarting.
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
        
        {currentSessionId && currentTurn && character && storyState && (
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
                canUndo={storyHistory.length > 0} // Can undo if there's any history
                isLoading={isLoadingInteraction}
              />
              <MinimalCharacterStatus character={character} storyState={storyState} />
              <StoryDisplay
                sceneDescription={currentTurn.sceneDescription}
                keyProp={currentTurn.id} // Use turn ID to trigger re-render and animation
              />
              <UserInputForm onSubmit={handleUserAction} isLoading={isLoadingInteraction} />
            </TabsContent>

            <TabsContent value="character">
              <CharacterSheet character={character} storyState={storyState} />
            </TabsContent>

            <TabsContent value="journal">
              <JournalDisplay 
                quests={storyState.quests as Quest[]} // Cast to Quest[]
                worldFacts={storyState.worldFacts} 
              />
            </TabsContent>
            
            <TabsContent value="lorebook">
              <LorebookDisplay />
            </TabsContent>
          </Tabs>
        )}
         {currentSessionId && !currentTurn && !isLoadingInteraction && (
            // This case handles if a session exists but storyHistory is empty or currentTurn couldn't be derived.
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

    