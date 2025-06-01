
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { generateScenarioFromSeries } from "@/ai/flows/generate-scenario-from-series";
import { fleshOutChapterQuests as callFleshOutChapterQuests } from "@/ai/flows/flesh-out-chapter-quests";
import type { 
    GenerateScenarioFromSeriesInput, GenerateScenarioFromSeriesOutput, 
    AIMessageSegment, DisplayMessage, 
    FleshOutChapterQuestsInput, FleshOutChapterQuestsOutput, 
    CombatHelperInfo, CombatEventLogEntry, 
    HealthChangeEvent, NPCStateChangeEvent, DescribedEvent,
    CharacterProfile, EquipmentSlot, Item as ItemType, StructuredStoryState, Quest, NPCProfile, Chapter,
    StatModifier // Imported for calculateEffectiveCharacterProfile
} from "@/types/story";
import { produce } from "immer";

import InitialPromptForm from "@/components/story-forge/initial-prompt-form";
import StoryDisplay from "@/components/story-forge/story-display";
import UserInputForm from "@/components/story-forge/user-input-form";
import StoryControls from "@/components/story-forge/story-controls";
import CharacterSheet from "@/components/story-forge/character-sheet";
import MinimalCharacterStatus from "@/components/story-forge/minimal-character-status";
import JournalDisplay from "@/components/story-forge/journal-display";
import LorebookDisplay from "@/components/story-forge/lorebook-display";
import NPCTrackerDisplay from "@/components/story-forge/npc-tracker-display";
import DataCorrectionLogDisplay from "@/components/story-forge/data-correction-log-display";

import { simpleTestAction } from '@/ai/actions/simple-test-action';

import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, BookUser, StickyNote, Library, UsersIcon, BookPlus, MessageSquareDashedIcon, AlertTriangleIcon, ClipboardListIcon, TestTubeIcon, Milestone } from "lucide-react";
import { initializeLorebook, clearLorebook } from "@/lib/lore-manager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";

const GM_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";
const PLAYER_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";

const scenarioGenerationSteps = [
  "Initializing AI Forge...",
  "Drafting initial scene and character concept...",
  "Summarizing series plot points...",
  "Defining character's core attributes...",
  "Forging starting skills & abilities...",
  "Gathering initial inventory items...",
  "Equipping character for adventure...",
  "Establishing key world facts...",
  "Outlining main story chapters & first quests...",
  "Populating the world with notable figures...",
  "Compiling essential series lore...",
  "Crafting a unique style guide for your story...",
  "Finalizing scenario details..."
];

// Helper function to calculate effective character stats including item bonuses
function calculateEffectiveCharacterProfile(
  baseProfile: CharacterProfile,
  equippedItems: Partial<Record<EquipmentSlot, ItemType | null>>
): CharacterProfile {
  const effectiveProfile = JSON.parse(JSON.stringify(baseProfile)) as CharacterProfile;

  const addStat = (statName: keyof CharacterProfile, value: number) => {
    const numericStats: (keyof CharacterProfile)[] = [
      'health', 'maxHealth', 'mana', 'maxMana', 
      'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
      'level', 'experiencePoints', 'experienceToNextLevel', 'currency', 
      'languageReading', 'languageSpeaking'
    ];
    if (numericStats.includes(statName)) {
      const currentValue = (effectiveProfile[statName] as number | undefined) ?? 0;
      (effectiveProfile[statName] as number) = currentValue + value;
    }
  };

  for (const slot in equippedItems) {
    const item = equippedItems[slot as EquipmentSlot];
    if (item && item.activeEffects) {
      for (const effect of item.activeEffects) {
        if (effect.type === 'stat_modifier' && effect.duration === 'permanent_while_equipped' && effect.statModifiers) {
          for (const modifier of effect.statModifiers) {
            if (modifier.type === 'add') {
              const statKey = modifier.stat as keyof CharacterProfile;
              // Ensure the stat key is actually a property of CharacterProfile before attempting to modify
              if (Object.prototype.hasOwnProperty.call(effectiveProfile, statKey) || Object.prototype.hasOwnProperty.call(CharacterProfile.prototype, statKey) || statKey in effectiveProfile) {
                 addStat(statKey, modifier.value);
              } else {
                console.warn(`calculateEffectiveCharacterProfile: Attempted to modify unknown stat '${statKey}'`);
              }
            }
            // TODO: Implement 'multiply' type modifiers if needed, ensuring correct order of operations
          }
        }
      }
    }
  }

  // Ensure health doesn't exceed new maxHealth and isn't negative
  if (effectiveProfile.maxHealth <= 0) effectiveProfile.maxHealth = 1; // Prevent maxHealth from being 0 or less
  if (effectiveProfile.health > effectiveProfile.maxHealth) {
    effectiveProfile.health = effectiveProfile.maxHealth;
  }
  if (effectiveProfile.health < 0) {
    effectiveProfile.health = 0;
  }

  // Ensure mana doesn't exceed new maxMana and isn't negative
  if (effectiveProfile.mana !== undefined && effectiveProfile.maxMana !== undefined) {
    if (effectiveProfile.maxMana <= 0 && effectiveProfile.mana > 0) effectiveProfile.maxMana = effectiveProfile.mana; // ensure maxMana is at least mana
    else if (effectiveProfile.maxMana <=0) effectiveProfile.maxMana = 0;

    if (effectiveProfile.mana > effectiveProfile.maxMana) {
      effectiveProfile.mana = effectiveProfile.maxMana;
    }
    if (effectiveProfile.mana < 0) {
      effectiveProfile.mana = 0;
    }
  } else if (effectiveProfile.mana !== undefined && effectiveProfile.maxMana === undefined) {
    effectiveProfile.maxMana = Math.max(0, effectiveProfile.mana);
  }


  // Optional: Ensure core attributes don't drop below a certain value (e.g., 1)
  // const coreAttributes: (keyof CharacterProfile)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  // for (const attr of coreAttributes) {
  //   if (typeof effectiveProfile[attr] === 'number' && (effectiveProfile[attr] as number) < 1) {
  //     // (effectiveProfile[attr] as number) = 1; // Uncomment if stats shouldn't drop below 1
  //   }
  // }

  return effectiveProfile;
}


export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<'scenario' | 'nextScene' | 'chapterLoad' | null>(null);
  const [activeTab, setActiveTab] = useState("story");
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isLoadingInteraction && loadingType === 'scenario') {
        let stepIndex = 0;
        setLoadingMessage(scenarioGenerationSteps[stepIndex]);

        intervalId = setInterval(() => {
            stepIndex = (stepIndex + 1) % scenarioGenerationSteps.length;
            setLoadingMessage(scenarioGenerationSteps[stepIndex]);
        }, 2500);
    } else if (isLoadingInteraction && loadingType === 'nextScene') {
        setLoadingMessage("AI is crafting the next part of your tale...");
    } else if (isLoadingInteraction && loadingType === 'chapterLoad') {
        setLoadingMessage("The next chapter of your saga is unfolding...");
    }

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
            console.warn("CLIENT: Old session format detected or missing story history. Clearing.");
            localStorage.removeItem(`${SESSION_KEY_PREFIX}${activeId}`);
            localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
            setCurrentSession(null);
            setStoryHistory([]);
          }
        } catch (e) {
          console.error("CLIENT: Failed to parse saved session:", e);
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
  
  // This is the character profile with base stats (before item effects)
  const baseCharacterProfile = useMemo(() => currentStoryState?.character, [currentStoryState]);

  // This is the character profile with item effects applied, used for AI input
  const effectiveCharacterProfileForAI = useMemo(() => {
    if (!baseCharacterProfile || !currentStoryState?.equippedItems) {
      return baseCharacterProfile; 
    }
    return calculateEffectiveCharacterProfile(
      baseCharacterProfile,
      currentStoryState.equippedItems
    );
  }, [baseCharacterProfile, currentStoryState?.equippedItems]);


  const handleStartStoryFromSeries = async (data: { seriesName: string; characterName?: string; characterClass?: string; usePremiumAI: boolean }) => {
    setIsLoadingInteraction(true);
    setLoadingType('scenario');
    const input: GenerateScenarioFromSeriesInput = {
      seriesName: data.seriesName,
      characterNameInput: data.characterName,
      characterClassInput: data.characterClass,
      usePremiumAI: data.usePremiumAI,
    };
    console.log("CLIENT: Starting scenario generation with input:", input);

    try {
      const result: GenerateScenarioFromSeriesOutput = await generateScenarioFromSeries(input);
      console.log("CLIENT: Scenario generation successful. Result:", result);

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
        seriesPlotSummary: result.seriesPlotSummary, // Storing the plot summary
        isPremiumSession: data.usePremiumAI,
        allDataCorrectionWarnings: [],
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
      console.error("CLIENT: Failed to start story from series:", error);
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
    if (!currentStoryState || !currentSession || !baseCharacterProfile) return; // Use baseCharacterProfile for check
    setIsLoadingInteraction(true);
    setLoadingType('nextScene');
    console.log("CLIENT: User action submitted:", userInput);


    const playerMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      speakerType: 'Player',
      speakerNameLabel: baseCharacterProfile.name, // Display base name
      speakerDisplayName: baseCharacterProfile.name,
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
      
      // Prepare the story state to be sent to the AI, using the effective character profile
      const storyStateForAI: StructuredStoryState = {
        ...currentStoryState,
        character: effectiveCharacterProfileForAI || baseCharacterProfile, // Fallback to base if effective is somehow null
      };
      
      console.log("CLIENT: Calling generateNextScene with context:", { currentSceneContext, userInput, currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial' });
      console.log("CLIENT: Base Character Profile for turn:", baseCharacterProfile);
      console.log("CLIENT: Effective Character Profile for AI:", effectiveCharacterProfileForAI);


      const result = await generateNextScene({
        currentScene: currentSceneContext,
        userInput: userInput,
        storyState: storyStateForAI, // Pass the state with effective character profile to AI
        seriesName: currentSession.seriesName,
        seriesStyleGuide: currentSession.seriesStyleGuide,
        currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial',
        usePremiumAI: currentSession.isPremiumSession,
      });
      console.log("CLIENT: generateNextScene successful. Result:", result);

      // IMPORTANT: result.updatedStoryState contains the character profile with BASE stats updated by events.
      // We must use THIS as the new source of truth for the base character state.
      let finalUpdatedBaseStoryState = result.updatedStoryState;


      const previousChapterId = currentStoryState.currentChapterId;
      // Check completion against the base state that was just updated by AI events.
      const currentChapterInNewBaseState = finalUpdatedBaseStoryState.chapters.find(c => c.id === previousChapterId);


      if (previousChapterId && currentChapterInNewBaseState?.isCompleted) {
        console.log(`CLIENT: Chapter "${currentChapterInNewBaseState.title}" (ID: ${previousChapterId}) completed.`);
        const nextChapterOrder = currentChapterInNewBaseState.order + 1;
        const nextChapterToFleshOut = finalUpdatedBaseStoryState.chapters.find(
          c => c.order === nextChapterOrder && !c.isCompleted && (!c.mainQuestIds || c.mainQuestIds.length === 0)
        );

        if (nextChapterToFleshOut && currentSession.seriesPlotSummary) {
          console.log(`CLIENT: Found next outlined chapter: "${nextChapterToFleshOut.title}". Attempting to flesh out quests.`);
          setLoadingType('chapterLoad');
          toast({
            title: "Chapter Complete!",
            description: (
              <div className="flex items-start">
                <Milestone className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" />
                <span>{currentChapterInNewBaseState.title} finished. Preparing the next chapter...</span>
              </div>
            ),
            duration: 6000,
          });

          try {
            const fleshOutInput: FleshOutChapterQuestsInput = {
              chapterToFleshOut: nextChapterToFleshOut,
              seriesName: currentSession.seriesName,
              seriesPlotSummary: currentSession.seriesPlotSummary,
              overallStorySummarySoFar: finalUpdatedBaseStoryState.storySummary || "",
              characterContext: { 
                name: finalUpdatedBaseStoryState.character.name, 
                class: finalUpdatedBaseStoryState.character.class, 
                level: finalUpdatedBaseStoryState.character.level 
              },
              usePremiumAI: currentSession.isPremiumSession,
            };
            console.log("CLIENT: Calling fleshOutChapterQuests with input:", fleshOutInput);
            const fleshedResult: FleshOutChapterQuestsOutput = await callFleshOutChapterQuests(fleshOutInput);
            console.log("CLIENT: fleshOutChapterQuests successful. Result:", fleshedResult);

            // Apply changes from fleshing out quests to the finalUpdatedBaseStoryState
            finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
              draftState.quests.push(...fleshedResult.fleshedOutQuests);
              const chapterIndex = draftState.chapters.findIndex(c => c.id === nextChapterToFleshOut.id);
              if (chapterIndex !== -1) {
                draftState.chapters[chapterIndex].mainQuestIds = fleshedResult.fleshedOutQuests.map(q => q.id);
              }
              draftState.currentChapterId = nextChapterToFleshOut.id;
            });
            toast({
              title: `Chapter Started: ${nextChapterToFleshOut.title}`,
              description: `New main quests are available in your journal.`,
              duration: 5000,
            });
          } catch (fleshOutError: any) {
            console.error("CLIENT: Failed to flesh out chapter quests:", fleshOutError);
            toast({
              title: "Error Loading Next Chapter",
              description: `Could not generate quests for "${nextChapterToFleshOut.title}". ${fleshOutError.message || ""}`,
              variant: "destructive",
            });
          }
          setLoadingType('nextScene'); // Revert loading type after chapter load attempt
        } else if (nextChapterToFleshOut && !currentSession.seriesPlotSummary) {
            console.warn("CLIENT: Next chapter is outlined, but no seriesPlotSummary found in session to flesh it out.");
        } else if (!nextChapterToFleshOut && currentChapterInNewBaseState?.isCompleted) {
            toast({ title: "Main Story Progress!", description: "You've completed all available chapters for now!" });
        }
      }

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

      let isCombatTurn = false;
      const combatTurnEvents: CombatEventLogEntry[] = [];
      const hostileNPCsInTurn: CombatHelperInfo['hostileNPCs'] = [];

      if (result.describedEvents) {
        result.describedEvents.forEach(event => {
          if (event.type === 'healthChange') {
            const e = event as HealthChangeEvent;
            if (e.amount < 0) isCombatTurn = true;
            combatTurnEvents.push({
              description: `${e.characterTarget === 'player' ? finalUpdatedBaseStoryState.character.name : e.characterTarget} ${e.amount < 0 ? 'took' : 'recovered'} ${Math.abs(e.amount)} health. ${e.reason || ''}`.trim(),
              target: e.characterTarget,
              type: e.amount < 0 ? 'damage' : 'healing',
              value: Math.abs(e.amount)
            });
          } else if (event.type === 'npcStateChange') {
            const e = event as NPCStateChangeEvent;
            if (e.newState.toLowerCase().includes('hostile') || e.newState.toLowerCase().includes('attacking')) {
              isCombatTurn = true;
            }
            combatTurnEvents.push({
                description: `NPC ${e.npcName}'s state changed to ${e.newState}. ${e.reason || ''}`.trim(),
                target: e.npcName,
                type: 'effect'
            });
          } else if (event.type === 'itemUsed' && (event.reason?.toLowerCase().includes('combat') || event.itemIdOrName.toLowerCase().includes('potion'))){
            combatTurnEvents.push({
                description: `Item used: ${event.itemIdOrName}. ${event.reason || ''}`.trim(),
                type: 'action'
            });
          }
        });
      }

      if (isCombatTurn) {
        console.log("CLIENT: Combat detected in turn.");
        // Use effective stats for display in combat log if needed, but here we list NPCs from base state
        const currentEffectivePlayerProfile = calculateEffectiveCharacterProfile(finalUpdatedBaseStoryState.character, finalUpdatedBaseStoryState.equippedItems);

        finalUpdatedBaseStoryState.trackedNPCs.forEach(npc => {
          if (npc.shortTermGoal?.toLowerCase().includes('attack') || 
              npc.shortTermGoal?.toLowerCase().includes('hostile') ||
              (npc.health !== undefined && npc.maxHealth !== undefined && npc.health < npc.maxHealth && combatTurnEvents.some(e => e.target === npc.name && e.type === 'damage'))) { 
            hostileNPCsInTurn.push({
              id: npc.id,
              name: npc.name,
              health: npc.health, // Display actual NPC health
              maxHealth: npc.maxHealth,
              description: npc.description.substring(0,50) + "..."
            });
          }
        });

        const combatHelperData: CombatHelperInfo = {
          playerHealth: currentEffectivePlayerProfile.health, // Show effective health for player in log
          playerMaxHealth: currentEffectivePlayerProfile.maxHealth,
          playerMana: currentEffectivePlayerProfile.mana,
          playerMaxMana: currentEffectivePlayerProfile.maxMana,
          hostileNPCs: hostileNPCsInTurn,
          turnEvents: combatTurnEvents.slice(0, 5), 
        };
        
        const combatHelperMessage: DisplayMessage = {
          id: crypto.randomUUID(),
          speakerType: 'SystemHelper',
          speakerNameLabel: 'COMBAT LOG',
          isPlayer: false,
          combatHelperInfo: combatHelperData,
        };
        aiDisplayMessages.push(combatHelperMessage);
      }

      const completedTurn: StoryTurn = {
        id: crypto.randomUUID(),
        messages: [playerMessage, ...aiDisplayMessages],
        storyStateAfterScene: finalUpdatedBaseStoryState, // This state has base character stats updated by events
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

      if (result.dataCorrectionWarnings && result.dataCorrectionWarnings.length > 0) {
        const newWarningsEntry = {
          timestamp: new Date().toISOString(),
          warnings: result.dataCorrectionWarnings,
        };
        setCurrentSession(prevSession => {
          if (!prevSession) return null;
          const updatedWarnings = [...(prevSession.allDataCorrectionWarnings || []), newWarningsEntry];
          return { ...prevSession, allDataCorrectionWarnings: updatedWarnings };
        });
        result.dataCorrectionWarnings.forEach(warning => {
          toast({
            title: "AI Data Correction",
            description: (
              <div className="flex items-start">
                <AlertTriangleIcon className="w-5 h-5 mr-2 mt-0.5 text-orange-500 shrink-0" />
                <span>{warning}</span>
              </div>
            ),
            duration: 7000,
          });
        });
      }

    } catch (error: any) {
      console.error("CLIENT: Failed to generate next scene:", error);
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

  const handleClearCorrectionLogs = () => {
    if (currentSession) {
        setCurrentSession(prev => {
            if (!prev) return null;
            const updatedSession = { ...prev, allDataCorrectionWarnings: [] };
            localStorage.setItem(`${SESSION_KEY_PREFIX}${prev.id}`, JSON.stringify(updatedSession));
            return updatedSession;
        });
        toast({ title: "Correction logs cleared for this session." });
    }
  };

  const handleTestSimpleAction = async () => {
    console.log("CLIENT: Calling simpleTestAction...");
    setIsLoadingInteraction(true);
    try {
      const result = await simpleTestAction({ name: "StoryForge User" });
      console.log("CLIENT: simpleTestAction result:", result);
      toast({
        title: "Simple Test Action Successful",
        description: `Greeting: ${result.greeting} (Server Time: ${new Date(result.timestamp).toLocaleTimeString()})`,
      });
    } catch (error: any) {
      console.error("CLIENT: Error calling simpleTestAction:", error);
      toast({
        title: "Simple Test Action Failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
    setIsLoadingInteraction(false);
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

        {currentSession && baseCharacterProfile && currentStoryState && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow overflow-hidden">
            <TabsList className="grid w-full grid-cols-6 mb-4 shrink-0">
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
              <TabsTrigger value="dev-logs" className="text-xs sm:text-sm">
                <ClipboardListIcon className="w-4 h-4 mr-1 sm:mr-2" /> Dev Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="flex flex-col flex-grow space-y-4 overflow-hidden">
              <div className="shrink-0 flex justify-between items-center">
                <StoryControls
                    onUndo={handleUndo}
                    onRestart={handleRestart}
                    canUndo={storyHistory.length > 0}
                    isLoading={isLoadingInteraction}
                />
                <Button
                  variant="outline"
                  onClick={handleTestSimpleAction}
                  disabled={isLoadingInteraction}
                  className="ml-2"
                  size="sm"
                >
                  <TestTubeIcon className="mr-2 h-4 w-4 text-purple-500" />
                  Test Action
                </Button>
              </div>
              <div className="shrink-0">
                <MinimalCharacterStatus
                    character={baseCharacterProfile} 
                    storyState={currentStoryState} // Minimal status might want base + equipped items for display, not just pure base
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
              <CharacterSheet character={baseCharacterProfile} storyState={currentStoryState} />
            </TabsContent>

            <TabsContent value="npcs" className="overflow-y-auto flex-grow">
              <NPCTrackerDisplay trackedNPCs={currentStoryState.trackedNPCs as NPCProfile[]} currentTurnId={storyHistory[storyHistory.length-1]?.id || 'initial'} />
            </TabsContent>

            <TabsContent value="journal" className="overflow-y-auto flex-grow">
              <JournalDisplay
                quests={currentStoryState.quests as Quest[]}
                chapters={currentStoryState.chapters as Chapter[]}
                currentChapterId={currentStoryState.currentChapterId}
                worldFacts={currentStoryState.worldFacts}
              />
            </TabsContent>

            <TabsContent value="lorebook" className="overflow-y-auto flex-grow">
              <LorebookDisplay />
            </TabsContent>

            <TabsContent value="dev-logs" className="overflow-y-auto flex-grow">
              <DataCorrectionLogDisplay
                warnings={currentSession?.allDataCorrectionWarnings || []}
                onClearLogs={handleClearCorrectionLogs}
              />
            </TabsContent>
          </Tabs>
        )}
         {currentSession && (!baseCharacterProfile || !currentStoryState) && !isLoadingInteraction && (
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
