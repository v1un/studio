
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { generateScenarioFromSeries } from "@/ai/flows/generate-scenario-from-series";
import type { GenerateScenarioFromSeriesInput, GenerateScenarioFromSeriesOutput } from "@/types/story";
import type { StoryTurn, GameSession, StructuredStoryState, Quest, NPCProfile, RawLoreEntry, DisplayMessage } from "@/types/story";

import InitialPromptForm from "@/components/story-forge/initial-prompt-form";
import StoryDisplay from "@/components/story-forge/story-display";
import UserInputForm from "@/components/story-forge/user-input-form";
import StoryControls from "@/components/story-forge/story-controls";
import CharacterSheet from "@/components/story-forge/character-sheet";
import MinimalCharacterStatus from "@/components/story-forge/minimal-character-status";
import JournalDisplay from "@/components/story-forge/journal-display";
import LorebookDisplay from "@/components/story-forge/lorebook-display";
import NPCTrackerDisplay from "@/components/story-forge/npc-tracker-display";


import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookUser, StickyNote, Library, UsersIcon, BookPlus, MessageSquareDashedIcon } from "lucide-react";
import { initializeLorebook, clearLorebook, getLorebook } from "@/lib/lore-manager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";

const GM_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";
const PLAYER_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";

export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("story");
  const { toast } = useToast();

  const loadSession = useCallback(() => {
    setIsLoadingPage(true);
    const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (activeId) {
      const sessionData = localStorage.getItem(`${SESSION_KEY_PREFIX}${activeId}`);
      if (sessionData) {
        try {
          const session: GameSession = JSON.parse(sessionData);
          // Basic validation for the new message structure
          if (session.storyHistory.every(turn => Array.isArray(turn.messages))) {
            setStoryHistory(session.storyHistory);
            setCurrentSession(session);
          } else {
            // Attempt to migrate old data or clear if migration is too complex
            console.warn("Old session format detected. Clearing for new structure.");
            localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
            localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
            setCurrentSession(null);
            setStoryHistory([]);
          }
          
          if (getLorebook().length === 0 && session.storyHistory.length > 0 && session.storyHistory[0].messages.length > 0) {
            // This part would ideally load lore if it was tied to session start
          }
        } catch (e) {
          console.error("Failed to parse saved session:", e);
          localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
          localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
          setCurrentSession(null);
          setStoryHistory([]);
        }
      } else {
        localStorage.removeItem(ACTIVE_SESSION_ID_KEY); 
        setCurrentSession(null);
        setStoryHistory([]);
      }
    } else {
       setCurrentSession(null);
       setStoryHistory([]);
    }
    setIsLoadingPage(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (isLoadingPage || !currentSession) return;

    const sessionToSave: GameSession = {
        ...currentSession,
        storyHistory: storyHistory,
        lastPlayedAt: new Date().toISOString(),
        characterName: currentSession.characterName, // Character name set at session creation
      };
    
    const sessionKey = `${SESSION_KEY_PREFIX}${currentSession.id}`;
    localStorage.setItem(sessionKey, JSON.stringify(sessionToSave));
    
  }, [storyHistory, currentSession, isLoadingPage]);


  const currentStoryState = useMemo(() => storyHistory.length > 0 ? storyHistory[storyHistory.length - 1].storyStateAfterScene : null, [storyHistory]);
  const character = useMemo(() => currentStoryState?.character, [currentStoryState]);

  const handleStartStoryFromSeries = async (data: { seriesName: string; characterName?: string; characterClass?: string }) => {
    setIsLoadingInteraction(true);
    setLoadingMessage("AI is forging your initial world and character...");
    try {
      const input: GenerateScenarioFromSeriesInput = {
        seriesName: data.seriesName,
        characterNameInput: data.characterName,
        characterClassInput: data.characterClass,
      };
      const result: GenerateScenarioFromSeriesOutput = await generateScenarioFromSeries(input);
      
      clearLorebook(); 
      if (result.initialLoreEntries) {
        initializeLorebook(result.initialLoreEntries);
      }

      const initialMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        speakerType: 'GM',
        speakerNameLabel: 'GAME-MASTER',
        speakerDisplayName: "admin",
        content: result.sceneDescription,
        avatarSrc: GM_AVATAR_PLACEHOLDER,
        avatarHint: "profile male",
        isPlayer: false,
      };
      
      const firstTurn: StoryTurn = {
        id: crypto.randomUUID(),
        messages: [initialMessage],
        storyStateAfterScene: result.storyState,
      };
      
      const newSessionId = crypto.randomUUID();
      const newSession: GameSession = {
        id: newSessionId,
        storyPrompt: `Adventure in the world of: ${data.seriesName}${data.characterName ? ` as ${data.characterName}` : ''}`,
        characterName: result.storyState.character.name, // Set character name from AI result
        storyHistory: [firstTurn],
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        seriesName: data.seriesName,
        seriesStyleGuide: result.seriesStyleGuide,
      };

      localStorage.setItem(`${SESSION_KEY_PREFIX}${newSession.id}`, JSON.stringify(newSession));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
      
      setStoryHistory([firstTurn]);
      setCurrentSession(newSession);
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
    setLoadingMessage(null);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentStoryState || !currentSession || !character) return;
    setIsLoadingInteraction(true);
    setLoadingMessage("AI is crafting the next part of your tale...");

    const playerMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      speakerType: 'Player',
      speakerNameLabel: 'Player',
      speakerDisplayName: character.name,
      content: userInput,
      avatarSrc: PLAYER_AVATAR_PLACEHOLDER,
      avatarHint: "profile female", // Assuming player avatar hint for consistency
      isPlayer: true,
    };

    // Add player message immediately to history for responsiveness
    // The actual turn object is created after AI response
    setStoryHistory(prevHistory => {
        const lastTurn = prevHistory[prevHistory.length -1];
        // If this is the very first user action, create a new turn for this message
        if (lastTurn.messages.some(m => m.speakerType === 'GM') && lastTurn.messages.every(m => m.speakerType !== 'Player')) {
             return [...prevHistory, {
                id: crypto.randomUUID(), // Temporary turn ID for player message
                messages: [playerMessage],
                storyStateAfterScene: lastTurn.storyStateAfterScene // Carry over state temporarily
            }];
        }
        // Otherwise, append to the last turn's messages if it already contains user messages
        // Or if last turn was just GM. In a robust system, each action might start a new "pending" turn.
        // For simplicity now, let's assume player message can be appended or start a new turn contextually.
        // This logic might need refinement based on how turns are strictly defined.
        // A simpler approach for now: player message always initiates a new visual turn entry that AI completes.
         const newTurnForPlayerMessage: StoryTurn = {
            id: `pending-${crypto.randomUUID()}`, // A temporary ID
            messages: [playerMessage],
            storyStateAfterScene: lastTurn.storyStateAfterScene // Carry over state
        };
        return [...prevHistory, newTurnForPlayerMessage];
    });


    try {
      const { generateNextScene } = await import("@/ai/flows/generate-next-scene");
      
      // Determine the "currentScene" to send to AI. This is tricky with message history.
      // For now, let's send the content of the last GM message as "currentScene".
      // This might need refinement if AI needs more context.
      const lastGMMessages = storyHistory.flatMap(turn => turn.messages).filter(m => m.speakerType === 'GM');
      const currentSceneContext = lastGMMessages.length > 0 ? lastGMMessages[lastGMMessages.length -1].content : "The story continues.";


      const result = await generateNextScene({
        currentScene: currentSceneContext, 
        userInput: userInput,
        storyState: currentStoryState,
        seriesName: currentSession.seriesName,
        seriesStyleGuide: currentSession.seriesStyleGuide,
        currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial',
      });

      const aiMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        speakerType: 'GM', // For now, all AI output is GM. Phase 2 will differentiate NPCs.
        speakerNameLabel: 'GAME-MASTER',
        speakerDisplayName: "admin",
        content: result.nextScene,
        avatarSrc: GM_AVATAR_PLACEHOLDER,
        avatarHint: "profile male",
        isPlayer: false,
      };
      
      const completedTurn: StoryTurn = {
        id: crypto.randomUUID(), // Final turn ID
        messages: [playerMessage, aiMessage], // Contains both player and AI message for this interaction cycle
        storyStateAfterScene: result.updatedStoryState,
      };

      setStoryHistory(prevHistory => {
        // Replace the temporary turn (that only had player message) with the completed turn
        const historyWithoutPending = prevHistory.filter(turn => !turn.id.startsWith('pending-'));
        return [...historyWithoutPending, completedTurn];
      });


      if (result.newLoreEntries && result.newLoreEntries.length > 0) {
        const keywords = result.newLoreEntries.map(l => l.keyword).join(', ');
        toast({
          title: "New Lore Discovered!",
          description: (
            <div className="flex items-start">
              <BookPlus className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" />
              <span>Added entries for: {keywords}</span>
            </div>
          ),
          duration: 5000,
        });
      }

    } catch (error) {
      console.error("Failed to generate next scene:", error);
      toast({
        title: "Error Generating Scene",
        description: "The AI encountered an issue. Please try again.",
        variant: "destructive",
      });
       // Remove the temporary player message turn on error
        setStoryHistory(prevHistory => prevHistory.filter(turn => !turn.id.startsWith('pending-')));
    }
    setIsLoadingInteraction(false);
    setLoadingMessage(null);
  };

  const handleUndo = () => {
    if (storyHistory.length > 1) { // Only undo if there's more than the initial scene
      setStoryHistory((prevHistory) => prevHistory.slice(0, -1));
       toast({ title: "Last interaction undone."});
    } else if (storyHistory.length === 1) { // If only initial scene is left, effectively restart
      handleRestart();
    }
  };

  const handleRestart = () => {
    if (currentSession) {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${currentSession.id}`);
    }
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    clearLorebook(); 
    setStoryHistory([]);
    setCurrentSession(null);
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
          <MessageSquareDashedIcon className="w-10 h-10 sm:w-12 sm:h-12 mr-3 text-accent" />
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
            <p className="ml-3 text-lg text-foreground">{loadingMessage || "AI is working..."}</p>
          </div>
        )}

        {!currentSession && !isLoadingInteraction && (
          <InitialPromptForm 
            onSubmitSeries={handleStartStoryFromSeries}
            isLoading={isLoadingInteraction} 
          />
        )}
        
        {currentSession && character && currentStoryState && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4"> 
              <TabsTrigger value="story" className="text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 mr-1 sm:mr-2" /> Story
              </TabsTrigger>
              <TabsTrigger value="character" className="text-xs sm:text-sm">
                <BookUser className="w-4 h-4 mr-1 sm:mr-2" /> Character
              </TabsTrigger>
               <TabsTrigger value="npcs" className="text-xs sm:text-sm"> 
                <UsersIcon className="w-4 h-4 mr-1 sm:mr-2" /> NPCs
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
              <MinimalCharacterStatus character={character} storyState={currentStoryState} />
              <StoryDisplay
                storyHistory={storyHistory}
                isLoadingInteraction={isLoadingInteraction}
              />
              <UserInputForm onSubmit={handleUserAction} isLoading={isLoadingInteraction} />
            </TabsContent>

            <TabsContent value="character">
              <CharacterSheet character={character} storyState={currentStoryState} />
            </TabsContent>

            <TabsContent value="npcs"> 
              <NPCTrackerDisplay trackedNPCs={currentStoryState.trackedNPCs as NPCProfile[]} currentTurnId={storyHistory[storyHistory.length-1]?.id || 'initial'} />
            </TabsContent>

            <TabsContent value="journal">
              <JournalDisplay 
                quests={currentStoryState.quests as Quest[]} 
                worldFacts={currentStoryState.worldFacts} 
              />
            </TabsContent>
            
            <TabsContent value="lorebook">
              <LorebookDisplay />
            </TabsContent>
          </Tabs>
        )}
         {currentSession && (!character || !currentStoryState) && !isLoadingInteraction && ( 
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
