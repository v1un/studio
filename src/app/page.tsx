
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { generateScenarioFromSeries } from "@/ai/flows/generate-scenario-from-series";
import type { GenerateScenarioFromSeriesInput, GenerateScenarioFromSeriesOutput, AIMessageSegment } from "@/types/story";
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

const scenarioGenerationSteps = [
  "Initializing AI Forge...",
  "Drafting initial scene and character concept...",
  "Defining character's core attributes...",
  "Forging starting skills & abilities...",
  "Gathering initial inventory items...",
  "Equipping character for adventure...",
  "Establishing key world facts...",
  "Unveiling first quests...",
  "Populating the world with notable figures...",
  "Compiling essential series lore...",
  "Crafting a unique style guide for your story...",
  "Finalizing scenario details..."
];

export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<'scenario' | 'nextScene' | null>(null); // Added loadingType
  const [activeTab, setActiveTab] = useState("story");
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isLoadingInteraction && loadingType === 'scenario') {
        let stepIndex = 0;
        setLoadingMessage(scenarioGenerationSteps[stepIndex]); // Set initial step message for scenario

        intervalId = setInterval(() => {
            stepIndex = (stepIndex + 1) % scenarioGenerationSteps.length;
            setLoadingMessage(scenarioGenerationSteps[stepIndex]);
        }, 2500);
    } else if (isLoadingInteraction && loadingType === 'nextScene') {
        setLoadingMessage("AI is crafting the next part of your tale..."); // Set message for next scene
    }
    // No explicit else to clear loadingMessage here; it's cleared when isLoadingInteraction turns false in the handlers.

    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [isLoadingInteraction, loadingType]);


  const loadSession = useCallback(() => {
    setIsLoadingPage(true);
    const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    if (activeId) {
      const sessionData = localStorage.getItem(`${SESSION_KEY_PREFIX}${activeId}`);
      if (sessionData) {
        try {
          const session: GameSession = JSON.parse(sessionData);
          if (session.storyHistory && session.storyHistory.every(turn => Array.isArray(turn.messages))) {
            setStoryHistory(session.storyHistory);
            setCurrentSession(session);
          } else {
            console.warn("Old session format detected or missing story history. Clearing.");
            localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
            localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
            setCurrentSession(null);
            setStoryHistory([]);
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
      };
    
    const sessionKey = `${SESSION_KEY_PREFIX}${currentSession.id}`;
    localStorage.setItem(sessionKey, JSON.stringify(sessionToSave));
    
  }, [storyHistory, currentSession, isLoadingPage]);


  const currentStoryState = useMemo(() => storyHistory.length > 0 ? storyHistory[storyHistory.length - 1].storyStateAfterScene : null, [storyHistory]);
  const character = useMemo(() => currentStoryState?.character, [currentStoryState]);

  const handleStartStoryFromSeries = async (data: { seriesName: string; characterName?: string; characterClass?: string; usePremiumAI: boolean }) => {
    setIsLoadingInteraction(true);
    setLoadingType('scenario'); 
    try {
      const input: GenerateScenarioFromSeriesInput = {
        seriesName: data.seriesName,
        characterNameInput: data.characterName,
        characterClassInput: data.characterClass,
        usePremiumAI: data.usePremiumAI,
      };
      const result: GenerateScenarioFromSeriesOutput = await generateScenarioFromSeries(input);
      
      clearLorebook(); 
      if (result.initialLoreEntries) {
        initializeLorebook(result.initialLoreEntries);
      }

      const initialGMMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        speakerType: 'GM',
        speakerNameLabel: 'GAME-MASTER',
        speakerDisplayName: "admin",
        content: result.sceneDescription,
        avatarSrc: GM_AVATAR_PLACEHOLDER,
        avatarHint: "wizard staff",
        isPlayer: false,
      };
      
      const firstTurn: StoryTurn = {
        id: crypto.randomUUID(),
        messages: [initialGMMessage],
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
        seriesStyleGuide: result.seriesStyleGuide,
        isPremiumSession: data.usePremiumAI,
      };

      localStorage.setItem(`${SESSION_KEY_PREFIX}${newSession.id}`, JSON.stringify(newSession));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
      
      setStoryHistory([firstTurn]);
      setCurrentSession(newSession);
      setActiveTab("story");
      toast({
        title: `Adventure in ${data.seriesName} Begun!`,
        description: `Playing as ${newSession.characterName}. ${data.usePremiumAI ? "(Premium AI Active)" : ""}`,
      });
    } catch (error: any) {
      console.error("Failed to start story from series:", error);
      toast({
        title: "Error Starting Scenario",
        description: `The AI encountered an issue: ${error.message || "Please try a different series or adjust inputs."}`,
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
    setLoadingType(null);
    setLoadingMessage(null);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentStoryState || !currentSession || !character) return;
    setIsLoadingInteraction(true);
    setLoadingType('nextScene');

    const playerMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      speakerType: 'Player',
      speakerNameLabel: character.name, 
      speakerDisplayName: character.name,
      content: userInput,
      avatarSrc: PLAYER_AVATAR_PLACEHOLDER,
      avatarHint: "knight shield",
      isPlayer: true,
    };

    setStoryHistory(prevHistory => {
        const lastTurn = prevHistory[prevHistory.length -1];
         const newTurnForPlayerMessage: StoryTurn = {
            id: `pending-${crypto.randomUUID()}`,
            messages: [playerMessage],
            storyStateAfterScene: lastTurn.storyStateAfterScene 
        };
        return [...prevHistory, newTurnForPlayerMessage];
    });


    try {
      const { generateNextScene } = await import("@/ai/flows/generate-next-scene");
      
      const lastGMMessagesContent = storyHistory
        .flatMap(turn => turn.messages)
        .filter(m => m.speakerType === 'GM')
        .slice(-3) 
        .map(m => m.content)
        .join("\n...\n"); 

      const currentSceneContext = lastGMMessagesContent || "The story has just begun.";


      const result = await generateNextScene({
        currentScene: currentSceneContext, 
        userInput: userInput,
        storyState: currentStoryState,
        seriesName: currentSession.seriesName,
        seriesStyleGuide: currentSession.seriesStyleGuide,
        currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial',
        usePremiumAI: currentSession.isPremiumSession,
      });

      const aiDisplayMessages: DisplayMessage[] = result.generatedMessages.map((aiMsg: AIMessageSegment) => {
        const isGM = aiMsg.speaker.toUpperCase() === 'GM'; 
        const speakerLabel = isGM ? 'GAME-MASTER' : aiMsg.speaker;
        const speakerDisplayName = isGM ? 'admin' : aiMsg.speaker;
        
        return {
          id: crypto.randomUUID(),
          speakerType: isGM ? 'GM' : 'NPC',
          speakerNameLabel: speakerLabel,
          speakerDisplayName: speakerDisplayName,
          content: aiMsg.content,
          avatarSrc: GM_AVATAR_PLACEHOLDER, 
          avatarHint: isGM ? "wizard staff" : "merchant friendly", 
          isPlayer: false,
        };
      });
      
      const completedTurn: StoryTurn = {
        id: crypto.randomUUID(),
        messages: [playerMessage, ...aiDisplayMessages], 
        storyStateAfterScene: result.updatedStoryState,
      };

      setStoryHistory(prevHistory => {
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

    } catch (error: any) {
      console.error("Failed to generate next scene:", error);
      toast({
        title: "Error Generating Scene",
        description: `The AI encountered an issue: ${error.message || "Please try again."}`,
        variant: "destructive",
      });
        setStoryHistory(prevHistory => prevHistory.filter(turn => !turn.id.startsWith('pending-')));
    }
    setIsLoadingInteraction(false);
    setLoadingType(null);
    setLoadingMessage(null);
  };

  const handleUndo = () => {
    if (storyHistory.length > 1) { 
      setStoryHistory((prevHistory) => prevHistory.slice(0, -1));
       toast({ title: "Last interaction undone."});
    } else if (storyHistory.length === 1) { 
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
    <div className="flex flex-col h-screen overflow-hidden bg-background selection:bg-primary/20 selection:text-primary">
      <header className="mb-2 text-center pt-4 sm:pt-6 shrink-0">
        <h1 className="font-headline text-5xl sm:text-6xl font-bold text-primary flex items-center justify-center">
          <MessageSquareDashedIcon className="w-10 h-10 sm:w-12 sm:h-12 mr-3 text-accent" />
          Story Forge
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          Forge your legend in worlds you know, or discover new ones.
        </p>
      </header>

      <main className="flex flex-col flex-grow w-full max-w-2xl mx-auto overflow-hidden px-4 sm:px-6">
        {isLoadingInteraction && (
          <div className="flex justify-center items-center p-4 rounded-md bg-card/80 backdrop-blur-sm shadow-md fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-foreground">{loadingMessage || "AI is working..."}</p>
          </div>
        )}

        {!currentSession && !isLoadingInteraction && (
          <div className="flex-grow flex items-center justify-center">
            <InitialPromptForm 
              onSubmitSeries={handleStartStoryFromSeries}
              isLoading={isLoadingInteraction} 
            />
          </div>
        )}
        
        {currentSession && character && currentStoryState && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow overflow-hidden">
            <TabsList className="grid w-full grid-cols-5 mb-4 shrink-0"> 
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

            <TabsContent value="story" className="flex flex-col flex-grow space-y-4 overflow-hidden">
              <div className="shrink-0">
                <StoryControls
                    onUndo={handleUndo}
                    onRestart={handleRestart}
                    canUndo={storyHistory.length > 0}
                    isLoading={isLoadingInteraction}
                />
              </div>
              <div className="shrink-0">
                <MinimalCharacterStatus 
                    character={character} 
                    storyState={currentStoryState} 
                    isPremiumSession={currentSession.isPremiumSession}
                />
              </div>
              <StoryDisplay
                storyHistory={storyHistory}
                isLoadingInteraction={isLoadingInteraction}
              />
              <div className="shrink-0 pt-2">
                <UserInputForm onSubmit={handleUserAction} isLoading={isLoadingInteraction} />
              </div>
            </TabsContent>

            <TabsContent value="character" className="overflow-y-auto flex-grow">
              <CharacterSheet character={character} storyState={currentStoryState} />
            </TabsContent>

            <TabsContent value="npcs" className="overflow-y-auto flex-grow"> 
              <NPCTrackerDisplay trackedNPCs={currentStoryState.trackedNPCs as NPCProfile[]} currentTurnId={storyHistory[storyHistory.length-1]?.id || 'initial'} />
            </TabsContent>

            <TabsContent value="journal" className="overflow-y-auto flex-grow">
              <JournalDisplay 
                quests={currentStoryState.quests as Quest[]} 
                worldFacts={currentStoryState.worldFacts} 
              />
            </TabsContent>
            
            <TabsContent value="lorebook" className="overflow-y-auto flex-grow">
              <LorebookDisplay />
            </TabsContent>
          </Tabs>
        )}
         {currentSession && (!character || !currentStoryState) && !isLoadingInteraction && ( 
            <div className="text-center p-6 bg-card rounded-lg shadow-md flex-grow flex flex-col items-center justify-center">
                <p className="text-lg text-muted-foreground mb-4">Your current session is empty or could not be fully loaded.</p>
                <Button onClick={handleRestart}>Start a New Adventure</Button>
            </div>
        )}
      </main>
      <footer className="mt-4 text-center text-sm text-muted-foreground pb-4 sm:pb-6 shrink-0">
        <p>&copy; {new Date().getFullYear()} Story Forge. Powered by GenAI.</p>
      </footer>
    </div>
  );
}

    
