
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { generateScenarioFoundation, generateScenarioNarrativeElements } from "@/ai/flows/generate-scenario-from-series";
import { fleshOutStoryArcQuests as callFleshOutStoryArcQuests } from "@/ai/flows/flesh-out-chapter-quests";
import { discoverNextStoryArc as callDiscoverNextStoryArc } from "@/ai/flows/discover-next-story-arc-flow";
import { updateCharacterDescription as callUpdateCharacterDescription } from "@/ai/flows/update-character-description-flow";

import type {
    GenerateScenarioFoundationInput, GenerateScenarioFoundationOutput,
    GenerateScenarioNarrativeElementsInput, GenerateScenarioNarrativeElementsOutput,
    AIMessageSegment, DisplayMessage,
    FleshOutStoryArcQuestsInput, FleshOutStoryArcQuestsOutput,
    DiscoverNextStoryArcInput, DiscoverNextStoryArcOutput,
    UpdateCharacterDescriptionInput, UpdateCharacterDescriptionOutput,
    CombatHelperInfo, CombatEventLogEntry,
    DescribedEvent, // Generic DescribedEvent
    HealthChangeEvent, ManaChangeEvent, XPChangeEvent, LevelUpEvent, CurrencyChangeEvent, LanguageSkillChangeEvent, ItemFoundEvent, ItemLostEvent, ItemUsedEvent, ItemEquippedEvent, ItemUnequippedEvent, QuestAcceptedEvent, QuestObjectiveUpdateEvent, QuestCompletedEvent, QuestFailedEvent, NPCRelationshipChangeEvent, NPCStateChangeEvent, NewNPCIntroducedEvent, WorldFactAddedEvent, WorldFactRemovedEvent, WorldFactUpdatedEvent, SkillLearnedEvent, // Specific event types
    CharacterProfile, EquipmentSlot, Item as ItemType, StructuredStoryState, Quest, NPCProfile, StoryArc,
    StatModifier, RawLoreEntry, TemporaryEffect, ActiveEffect, StoryTurn, GameSession
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
import { Loader2, Sparkles, BookUser, StickyNote, Library, UsersIcon, BookPlus, MessageSquareDashedIcon, AlertTriangleIcon, ClipboardListIcon, TestTubeIcon, Milestone, SearchIcon, InfoIcon, EditIcon, BookmarkIcon } from "lucide-react";
import { initializeLorebook, clearLorebook } from "@/lib/lore-manager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";


const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";

const GM_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";
const PLAYER_AVATAR_PLACEHOLDER = "https://placehold.co/40x40.png";

const scenarioGenerationSteps = [
  "Phase 1: Laying Scenario Foundation...",
  "Generating character concepts and opening scene...",
  "Establishing core world details and items...",
  "Phase 2: Weaving Narrative Arcs & Elements...",
  "Crafting initial story arcs and main quests...",
  "Populating the world with notable figures...",
  "Compiling a rich tapestry of lore entries...",
  "Finalizing scenario details..."
];

// Helper function to create system messages
function createSystemMessage(content: string, type: DisplayMessage['speakerType'] = 'SystemHelper', label?: string): DisplayMessage {
  return {
    id: crypto.randomUUID(),
    speakerType: type,
    speakerNameLabel: label || (type === 'ArcNotification' ? 'STORY EVENT' : 'SYSTEM EVENT'),
    content: content,
    avatarSrc: undefined, 
    avatarHint: type === 'ArcNotification' ? "milestone flag" : "system gear",
    isPlayer: false,
  };
}


// Helper function to calculate effective character stats including item bonuses and temporary effects
function calculateEffectiveCharacterProfile(
  baseProfile: CharacterProfile,
  equippedItems: Partial<Record<EquipmentSlot, ItemType | null>>
): CharacterProfile {
  const effectiveProfile = produce(baseProfile, draft => {
    // Ensure activeTemporaryEffects is an array
    draft.activeTemporaryEffects = draft.activeTemporaryEffects || [];

    const applyModifier = (statName: keyof CharacterProfile, value: number, type: 'add' | 'multiply') => {
        const numericStats: (keyof CharacterProfile)[] = [
            'health', 'maxHealth', 'mana', 'maxMana',
            'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
            'level', 'experiencePoints', 'experienceToNextLevel', 'currency',
            'languageReading', 'languageSpeaking'
        ];
        if (numericStats.includes(statName)) {
            let currentValue = (draft[statName] as number | undefined) ?? 0;
            if (type === 'add') {
                currentValue += value;
            } else if (type === 'multiply') {
                currentValue *= value;
            }
            (draft[statName] as number) = currentValue;
        } else {
            console.warn(`calculateEffectiveCharacterProfile: Attempted to modify non-numeric or unknown stat '${String(statName)}'`);
        }
    };

    // Apply permanent effects from equipped items
    for (const slot in equippedItems) {
        const item = equippedItems[slot as EquipmentSlot];
        if (item && item.activeEffects) {
            for (const effect of item.activeEffects) {
                if (effect.type === 'stat_modifier' && effect.duration === 'permanent_while_equipped' && effect.statModifiers) {
                    for (const modifier of effect.statModifiers) {
                        applyModifier(modifier.stat as keyof CharacterProfile, modifier.value, modifier.type);
                    }
                }
            }
        }
    }

    // Apply temporary effects
    if (draft.activeTemporaryEffects) {
        for (const tempEffect of draft.activeTemporaryEffects) {
            if (tempEffect.type === 'stat_modifier' && tempEffect.statModifiers) {
                for (const modifier of tempEffect.statModifiers) {
                     applyModifier(modifier.stat as keyof CharacterProfile, modifier.value, modifier.type);
                }
            }
        }
    }


    // Ensure health and mana are within bounds
    if (draft.maxHealth <= 0) draft.maxHealth = 1;
    if (draft.health > draft.maxHealth) draft.health = draft.maxHealth;
    if (draft.health < 0) draft.health = 0;

    if (draft.mana !== undefined && draft.maxMana !== undefined) {
        if (draft.maxMana <= 0 && draft.mana > 0) draft.maxMana = draft.mana;
        else if (draft.maxMana <=0) draft.maxMana = 0;
        if (draft.mana > draft.maxMana) draft.mana = draft.maxMana;
        if (draft.mana < 0) draft.mana = 0;
    } else if (draft.mana !== undefined && draft.maxMana === undefined) {
        draft.maxMana = Math.max(0, draft.mana);
    }
  });

  return effectiveProfile;
}


export default function StoryForgePage() {
  const [storyHistory, setStoryHistory] = useState<StoryTurn[]>([]);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingType, setLoadingType] = useState<'scenario' | 'nextScene' | 'arcLoad' | 'discoveringArc' | 'updatingProfile' | null>(null);
  const [activeTab, setActiveTab] = useState("story");
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (isLoadingInteraction && loadingType === 'scenario') {
        setLoadingMessage(scenarioGenerationSteps[loadingStep]);
    } else if (isLoadingInteraction && loadingType === 'nextScene') {
        setLoadingMessage("AI is crafting the next part of your tale...");
    } else if (isLoadingInteraction && loadingType === 'arcLoad') {
        setLoadingMessage("The next story arc of your saga is unfolding...");
    } else if (isLoadingInteraction && loadingType === 'discoveringArc') {
        setLoadingMessage("AI is searching for the next chapter in your destiny...");
    } else if (isLoadingInteraction && loadingType === 'updatingProfile') {
        setLoadingMessage("Reflecting on your journey to update your character profile...");
    } else {
      setLoadingMessage(null);
    }

    if (isLoadingInteraction && loadingType === 'scenario' && loadingMessage !== scenarioGenerationSteps[loadingStep]) {
        setLoadingMessage(scenarioGenerationSteps[loadingStep]);
    }


    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [isLoadingInteraction, loadingType, loadingStep, loadingMessage]);


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
  const baseCharacterProfile = useMemo(() => currentStoryState?.character, [currentStoryState]);
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
    setLoadingStep(0);

    let foundationResult: GenerateScenarioFoundationOutput;
    let narrativeElementsResult: GenerateScenarioNarrativeElementsOutput;

    try {
      setLoadingStep(scenarioGenerationSteps.findIndex(s => s.includes("Phase 1")));
      const foundationInput: GenerateScenarioFoundationInput = {
        seriesName: data.seriesName,
        characterNameInput: data.characterName,
        characterClassInput: data.characterClass,
        usePremiumAI: data.usePremiumAI,
      };
      console.log("CLIENT: Starting scenario generation - Step 1: Foundation. Input:", foundationInput);
      foundationResult = await generateScenarioFoundation(foundationInput);
      console.log("CLIENT: Scenario Foundation generation successful. Result:", foundationResult);
      setLoadingStep(scenarioGenerationSteps.findIndex(s => s.includes("character concepts")) || 1);


      setLoadingStep(scenarioGenerationSteps.findIndex(s => s.includes("Phase 2")) || 3);
      const narrativeElementsInput: GenerateScenarioNarrativeElementsInput = {
        seriesName: data.seriesName,
        seriesPlotSummary: foundationResult.seriesPlotSummary,
        characterProfile: foundationResult.characterProfile, 
        sceneDescription: foundationResult.sceneDescription,
        currentLocation: foundationResult.currentLocation,
        characterNameInput: data.characterName,
        usePremiumAI: data.usePremiumAI,
      };
      console.log("CLIENT: Starting scenario generation - Step 2: Narrative Elements. Input:", narrativeElementsInput);
      narrativeElementsResult = await generateScenarioNarrativeElements(narrativeElementsInput);
      console.log("CLIENT: Scenario Narrative Elements generation successful. Result:", narrativeElementsResult);
      setLoadingStep(scenarioGenerationSteps.length - 1);


      clearLorebook();
      if (narrativeElementsResult.initialLoreEntries) {
        initializeLorebook(narrativeElementsResult.initialLoreEntries as RawLoreEntry[]);
      }

      const initialGMMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        speakerType: 'GM',
        speakerNameLabel: 'GAME-MASTER',
        speakerDisplayName: "admin",
        content: foundationResult.sceneDescription,
        avatarSrc: GM_AVATAR_PLACEHOLDER,
        avatarHint: "wizard staff",
        isPlayer: false,
      };

      const firstStoryArcId = narrativeElementsResult.storyArcs.find(arc => arc.order === 1)?.id;
      
      const filteredTrackedNPCs = narrativeElementsResult.trackedNPCs.filter(
        npc => npc.name !== foundationResult.characterProfile.name
      );

      const finalStoryState: StructuredStoryState = {
        character: foundationResult.characterProfile, 
        currentLocation: foundationResult.currentLocation,
        inventory: foundationResult.inventory,
        equippedItems: foundationResult.equippedItems,
        worldFacts: foundationResult.worldFacts,
        storySummary: `The adventure begins for ${foundationResult.characterProfile.name} in ${data.seriesName}, at ${foundationResult.currentLocation}. Initial scene: ${foundationResult.sceneDescription.substring(0,100)}...`,
        quests: narrativeElementsResult.quests,
        storyArcs: narrativeElementsResult.storyArcs,
        currentStoryArcId: firstStoryArcId,
        trackedNPCs: filteredTrackedNPCs,
      };


      const firstTurn: StoryTurn = {
        id: crypto.randomUUID(),
        messages: [initialGMMessage],
        storyStateAfterScene: finalStoryState,
      };

      const newSessionId = crypto.randomUUID();
      const newSession: GameSession = {
        id: newSessionId,
        storyPrompt: `Adventure in the world of: ${data.seriesName}${data.characterName ? ` as ${data.characterName}` : ''}`,
        characterName: finalStoryState.character.name,
        storyHistory: [firstTurn],
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        seriesName: data.seriesName,
        seriesStyleGuide: foundationResult.seriesStyleGuide,
        seriesPlotSummary: foundationResult.seriesPlotSummary,
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
    setLoadingStep(0);
  };

  const handleUserAction = async (userInput: string) => {
    if (!currentStoryState || !currentSession || !baseCharacterProfile) return;
    setIsLoadingInteraction(true);
    setLoadingType('nextScene');
    console.log("CLIENT: User action submitted:", userInput);

    const playerMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      speakerType: 'Player',
      speakerNameLabel: baseCharacterProfile.name,
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

      const storyStateForAI: StructuredStoryState = {
        ...currentStoryState,
        character: effectiveCharacterProfileForAI || baseCharacterProfile,
      };

      console.log("CLIENT: Calling generateNextScene with context:", { currentSceneContext, userInput, currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial' });
      console.log("CLIENT: Base Character Profile (before this turn's events/buffs):", baseCharacterProfile);
      console.log("CLIENT: Effective Character Profile for AI (includes buffs from previous turn):", effectiveCharacterProfileForAI);

      const result = await generateNextScene({
        currentScene: currentSceneContext,
        userInput: userInput,
        storyState: storyStateForAI, // AI receives state with effective stats
        seriesName: currentSession.seriesName,
        seriesStyleGuide: currentSession.seriesStyleGuide,
        currentTurnId: storyHistory[storyHistory.length -1]?.id || 'initial',
        usePremiumAI: currentSession.isPremiumSession,
      });
      console.log("CLIENT: generateNextScene successful. Result:", result);

      let clientSideWarnings: string[] = [];
      let systemMessagesForTurn: DisplayMessage[] = [];
      
      // The AI now returns the *full* updatedStoryState.
      // We use this directly, but first, we process `describedEvents` for UI feedback (toasts, specific system messages not related to arc changes).
      let finalUpdatedBaseStoryState = result.updatedStoryState;


      // Process `describedEvents` for immediate UI feedback (toasts, non-arc system messages)
      // This part modifies `systemMessagesForTurn` and `clientSideWarnings` but NOT `finalUpdatedBaseStoryState` directly for these events,
      // as the AI is now responsible for including these mechanical changes in its returned `updatedStoryState`.
      // However, we still need to create system messages for these events for the chat.
      if (result.describedEvents && Array.isArray(result.describedEvents)) {
        result.describedEvents.forEach(event => {
            switch (event.type) {
                case 'healthChange': {
                    const e = event as HealthChangeEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `Health ${e.amount > 0 ? 'restored' : 'lost'}: ${Math.abs(e.amount)} for ${e.characterTarget}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'manaChange': {
                    const e = event as ManaChangeEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Mana ${e.amount > 0 ? 'restored' : 'spent'}: ${Math.abs(e.amount)} for ${e.characterTarget}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                 case 'xpChange': {
                    const e = event as XPChangeEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Gained ${e.amount} XP. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'levelUp': {
                    const e = event as LevelUpEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Level Up! Reached Level ${e.newLevel}. ${e.rewardSuggestion || ''} ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'currencyChange': {
                    const e = event as CurrencyChangeEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `${e.amount >= 0 ? 'Gained' : 'Lost'} ${Math.abs(e.amount)} currency. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'languageSkillChange': {
                    const e = event as LanguageSkillChangeEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `${e.skillTarget.charAt(0).toUpperCase() + e.skillTarget.slice(1)} skill ${e.amount > 0 ? 'improved' : 'decreased'} by ${Math.abs(e.amount)}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemFound': {
                    const e = event as ItemFoundEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Item Found: ${e.itemName}${(e.quantity || 1) > 1 ? ` (x${e.quantity})` : ''}! ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemLost': {
                    const e = event as ItemLostEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `Item Lost: ${e.itemIdOrName}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemUsed': {
                    const e = event as ItemUsedEvent;
                    const usedItemFromAIState = finalUpdatedBaseStoryState.inventory.find(i => i.id === e.itemIdOrName || i.name === e.itemIdOrName) || 
                                                Object.values(finalUpdatedBaseStoryState.equippedItems).find(i => i && (i.id === e.itemIdOrName || i.name === e.itemIdOrName));
                    let effectMsg = e.reason || "No immediate effect described.";
                    
                    if (usedItemFromAIState && usedItemFromAIState.isConsumable && usedItemFromAIState.activeEffects) {
                        usedItemFromAIState.activeEffects.forEach(effectDef => {
                            if (typeof effectDef.duration === 'number' && effectDef.duration > 0) {
                                effectMsg += ` Effect '${effectDef.name}' active for ${effectDef.duration} turns.`;
                                systemMessagesForTurn.push(createSystemMessage(
                                    `Buff Applied: ${effectDef.name} from ${usedItemFromAIState.name} (Duration: ${effectDef.duration} turns).`
                                ));
                            }
                        });
                    }
                    systemMessagesForTurn.push(createSystemMessage(
                        `Item Used: ${e.itemIdOrName}. ${effectMsg}`.trim()
                    ));
                    if (usedItemFromAIState) { // Check if item was actually found to determine toast type
                        toast({ title: "Item Used", description: `${e.itemIdOrName} used.`});
                    } else {
                        clientSideWarnings.push(`AI reported item "${e.itemIdOrName}" was used, but it's not clear if it was in inventory before AI state update.`);
                    }
                    break;
                }
                case 'itemEquipped': {
                    const e = event as ItemEquippedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Equipped ${e.itemIdOrName} to ${e.slot}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'itemUnequipped': {
                    const e = event as ItemUnequippedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Unequipped ${e.itemIdOrName} from ${e.slot}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'questAccepted': {
                    const e = event as QuestAcceptedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `New Quest Accepted: "${e.questTitle || e.questDescription.substring(0,30)+ "..."}". ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'questObjectiveUpdate': {
                    const e = event as QuestObjectiveUpdateEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Quest objective for "${e.questIdOrDescription}" updated: "${e.objectiveDescription}" is now ${e.objectiveCompleted ? 'completed' : 'pending'}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'questCompleted': {
                    const e = event as QuestCompletedEvent;
                     systemMessagesForTurn.push(createSystemMessage(
                        `Quest "${e.questIdOrDescription}" Completed! ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                 case 'questFailed': {
                    const e = event as QuestFailedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Quest "${e.questIdOrDescription}" Failed. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'newNPCIntroduced': {
                    const e = event as NewNPCIntroducedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Met ${e.npcName} (${e.classOrRole || 'Unknown Role'}). ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                case 'npcRelationshipChange': {
                    const e = event as NPCRelationshipChangeEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Relationship with ${e.npcName} ${e.changeAmount > 0 ? 'improved' : 'worsened'} by ${Math.abs(e.changeAmount)}. ${e.reason || ''}`.trim()
                    ));
                    break;
                }
                 case 'skillLearned': {
                    const e = event as SkillLearnedEvent;
                    systemMessagesForTurn.push(createSystemMessage(
                        `Skill Learned: ${e.skillName} (${e.skillType})! ${e.reason || ''}`.trim()
                    ));
                    break;
                }
            }
        });
      }

      // --- Temporary Effect Duration Management (End of Turn) ---
      // This still needs to happen on the client side if AI is not explicitly managing turnsRemaining in its state update.
      // For now, let's assume AI *might* update it, but we also do a pass here.
      // It's safer if AI fully manages this in its returned state.
      // For this iteration, we will assume the AI's returned `finalUpdatedBaseStoryState.character.activeTemporaryEffects` is the source of truth for durations.
      // If an effect's duration ran out, the AI should have removed it.

      // Check for Story Arc Completion based on AI's updated state
      const previousStoryArcId = currentStoryState.currentStoryArcId; // Arc ID *before* this turn
      const arcJustCompleted = finalUpdatedBaseStoryState.storyArcs.find(arc => arc.id === previousStoryArcId && arc.isCompleted && !currentStoryState.storyArcs.find(sa => sa.id === arc.id && sa.isCompleted));

      if (arcJustCompleted) {
        console.log(`CLIENT: Story Arc "${arcJustCompleted.title}" (ID: ${arcJustCompleted.id}) completed by AI.`);
        systemMessagesForTurn.push(createSystemMessage(
            `EPISODE COMPLETE: ${arcJustCompleted.title}!\n\n${arcJustCompleted.completionSummary || "The story arc has concluded."}`,
            'ArcNotification', 'ARC FINALE'
        ));
        toast({
            title: "Episode Complete!",
            description: (
              <div className="flex items-start">
                <Milestone className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" />
                <span>{arcJustCompleted.title} finished. {arcJustCompleted.completionSummary || ""}</span>
              </div>
            ),
            duration: 8000,
          });
        
        setLoadingType('updatingProfile');
        try {
            const updateDescInput: UpdateCharacterDescriptionInput = {
                currentProfile: finalUpdatedBaseStoryState.character, 
                completedArc: arcJustCompleted,
                overallStorySummarySoFar: finalUpdatedBaseStoryState.storySummary || "",
                seriesName: currentSession.seriesName,
                usePremiumAI: currentSession.isPremiumSession,
            };
            const descUpdateResult: UpdateCharacterDescriptionOutput = await callUpdateCharacterDescription(updateDescInput);
            finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                draftState.character.description = descUpdateResult.updatedCharacterDescription;
            });
            systemMessagesForTurn.push(createSystemMessage(`You reflect on the events of the "${arcJustCompleted.title}" arc. Your understanding of yourself and your place in this world has subtly shifted.`, 'SystemHelper'));
            toast({
                title: "Character Reflection",
                description: ( <div className="flex items-start"> <EditIcon className="w-5 h-5 mr-2 mt-0.5 text-primary shrink-0" /> <span>Your character description has been updated.</span></div> ),
                duration: 7000
            });
        } catch (descError: any) {
            console.error("CLIENT: Failed to update character description:", descError);
            toast({ title: "Error Updating Character Profile", description: `Could not update character description. ${descError.message || ""}`, variant: "destructive" });
        }
        setLoadingType('nextScene'); 
        
        const nextStoryArcOrder = arcJustCompleted.order + 1;
        let nextStoryArcToFleshOut = finalUpdatedBaseStoryState.storyArcs.find(
          arc => arc.order === nextStoryArcOrder && !arc.isCompleted && (!arc.mainQuestIds || arc.mainQuestIds.length === 0)
        );

        if (!nextStoryArcToFleshOut && currentSession.seriesPlotSummary) { 
            console.log("CLIENT: No pre-outlined next arc. Attempting to discover a new major story arc.");
            setLoadingType('discoveringArc');
            try {
                const discoverInput: DiscoverNextStoryArcInput = {
                    seriesName: currentSession.seriesName,
                    seriesPlotSummary: currentSession.seriesPlotSummary,
                    completedOrGeneratedArcTitles: finalUpdatedBaseStoryState.storyArcs.map(arc => arc.title),
                    lastCompletedArcOrder: arcJustCompleted.order,
                    usePremiumAI: currentSession.isPremiumSession,
                };
                const discoveryResult: DiscoverNextStoryArcOutput = await callDiscoverNextStoryArc(discoverInput);

                if (discoveryResult.nextStoryArcOutline) {
                    const newArcOutline = discoveryResult.nextStoryArcOutline;
                    finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
                        draftState.storyArcs.push(newArcOutline);
                        draftState.currentStoryArcId = newArcOutline.id; 
                    });
                    nextStoryArcToFleshOut = newArcOutline; 
                    systemMessagesForTurn.push(createSystemMessage(`NEW CHAPTER BEGINS: ${newArcOutline.title}!\n\n${newArcOutline.description}`, 'ArcNotification', 'ARC INITIATED'));
                     toast({
                        title: "New Chapter Begins!",
                        description: ( <div className="flex items-start"> <BookmarkIcon className="w-5 h-5 mr-2 mt-0.5 text-primary shrink-0" /> <span>The saga continues with: {newArcOutline.title}</span> </div> ),
                        duration: 7000,
                    });
                } else {
                    systemMessagesForTurn.push(createSystemMessage("You've explored all major story arcs currently identifiable from the series plot.", 'ArcNotification', 'SAGA CONCLUSION?'));
                    toast({ title: "End of Known Saga", description: `You've explored all major story arcs currently identifiable for ${currentSession.seriesName}!` });
                }
            } catch (discoveryError: any) {
                console.error("CLIENT: Failed to discover next story arc:", discoveryError);
                toast({ title: "Error Discovering Next Arc", description: `Could not find the next part of the story. ${discoveryError.message || ""}`, variant: "destructive" });
            }
            setLoadingType('nextScene'); 
        }


        if (nextStoryArcToFleshOut && currentSession.seriesPlotSummary) {
          console.log(`CLIENT: Found next outlined story arc: "${nextStoryArcToFleshOut.title}". Attempting to flesh out quests.`);
          setLoadingType('arcLoad');
          
          try {
            const fleshOutInput: FleshOutStoryArcQuestsInput = {
              storyArcToFleshOut: nextStoryArcToFleshOut,
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
            const fleshedResult: FleshOutStoryArcQuestsOutput = await callFleshOutStoryArcQuests(fleshOutInput);

            finalUpdatedBaseStoryState = produce(finalUpdatedBaseStoryState, draftState => {
              draftState.quests.push(...fleshedResult.fleshedOutQuests);
              const arcIndex = draftState.storyArcs.findIndex(arc => arc.id === nextStoryArcToFleshOut!.id);
              if (arcIndex !== -1) {
                draftState.storyArcs[arcIndex].mainQuestIds = fleshedResult.fleshedOutQuests.map(q => q.id);
              }
              // Set currentStoryArcId explicitly only if it's not already set or different
              if (draftState.currentStoryArcId !== nextStoryArcToFleshOut!.id) {
                  draftState.currentStoryArcId = nextStoryArcToFleshOut!.id;
                  systemMessagesForTurn.push(createSystemMessage(`NEW CHAPTER BEGINS: ${nextStoryArcToFleshOut.title}!\n\n${nextStoryArcToFleshOut.description}`, 'ArcNotification', 'ARC INITIATED'));
                  toast({
                    title: `New Chapter: ${nextStoryArcToFleshOut.title}`,
                    description: ( <div className="flex items-start"> <BookmarkIcon className="w-5 h-5 mr-2 mt-0.5 text-primary shrink-0" /> <span>New main quests available.</span> </div> ),
                    duration: 7000,
                  });
              }
            });
          } catch (fleshOutError: any) {
            console.error("CLIENT: Failed to flesh out story arc quests:", fleshOutError);
            toast({ title: "Error Loading Next Story Arc", description: `Could not generate quests for "${nextStoryArcToFleshOut.title}". ${fleshOutError.message || ""}`, variant: "destructive" });
          }
          setLoadingType('nextScene');
        } else if (nextStoryArcToFleshOut && !currentSession.seriesPlotSummary) {
            console.warn("CLIENT: Next story arc is outlined, but no seriesPlotSummary found in session to flesh it out.");
        } else if (!nextStoryArcToFleshOut && arcJustCompleted) { // Check arcJustCompleted to ensure this only logs if an arc truly finished and no new one was found
            console.log("CLIENT: All pre-defined/discoverable story arcs seem to be completed.");
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

      let turnMessages = [playerMessage, ...aiDisplayMessages];
      if (systemMessagesForTurn.length > 0) {
          turnMessages = [...turnMessages, ...systemMessagesForTurn];
      }


      if (isCombatTurn) {
        console.log("CLIENT: Combat detected in turn.");
        const effectivePlayerProfileForCombatLog = calculateEffectiveCharacterProfile(finalUpdatedBaseStoryState.character, finalUpdatedBaseStoryState.equippedItems);

        finalUpdatedBaseStoryState.trackedNPCs.forEach(npc => {
          if (npc.shortTermGoal?.toLowerCase().includes('attack') ||
              npc.shortTermGoal?.toLowerCase().includes('hostile') ||
              (npc.health !== undefined && npc.maxHealth !== undefined && npc.health < npc.maxHealth && combatTurnEvents.some(e => e.target === npc.name && e.type === 'damage'))) {
            hostileNPCsInTurn.push({
              id: npc.id,
              name: npc.name,
              health: npc.health,
              maxHealth: npc.maxHealth,
              description: npc.description.substring(0,50) + "..."
            });
          }
        });

        const combatHelperData: CombatHelperInfo = {
          playerHealth: effectivePlayerProfileForCombatLog.health,
          playerMaxHealth: effectivePlayerProfileForCombatLog.maxHealth,
          playerMana: effectivePlayerProfileForCombatLog.mana,
          playerMaxMana: effectivePlayerProfileForCombatLog.maxMana,
          hostileNPCs: hostileNPCsInTurn,
          turnEvents: combatTurnEvents.slice(0, 5),
        };

        const combatHelperMessage: DisplayMessage = {
          id: crypto.randomUUID(),
          speakerType: 'SystemHelper',
          speakerNameLabel: 'COMBAT LOG',
          isPlayer: false,
          combatHelperInfo: combatHelperData,
          avatarHint: "system combat", 
        };
        turnMessages.push(combatHelperMessage);
      }

      const completedTurn: StoryTurn = {
        id: crypto.randomUUID(),
        messages: turnMessages,
        storyStateAfterScene: finalUpdatedBaseStoryState, 
      };

      setStoryHistory(prevHistory => {
        const historyWithoutPending = prevHistory.filter(turn => !turn.id.startsWith('pending-'));
        return [...historyWithoutPending, completedTurn];
      });

      if (result.newLoreEntries && result.newLoreEntries.length > 0) {
        const keywords = result.newLoreEntries.map(l => l.keyword).join(', ');
        toast({
          title: "New Lore Discovered!",
          description: ( <div className="flex items-start"> <BookPlus className="w-5 h-5 mr-2 mt-0.5 text-accent shrink-0" /> <span>Added entries for: {keywords}</span> </div> ),
          duration: 5000,
        });
      }
      
      const allWarningsThisTurn = [
          ...(result.dataCorrectionWarnings || []),
          ...clientSideWarnings
      ];

      if (allWarningsThisTurn.length > 0) {
        const newWarningsEntry = {
          timestamp: new Date().toISOString(),
          warnings: allWarningsThisTurn,
        };
        setCurrentSession(prevSession => {
          if (!prevSession) return null;
          const updatedWarnings = [...(prevSession.allDataCorrectionWarnings || []), newWarningsEntry];
          return { ...prevSession, allDataCorrectionWarnings: updatedWarnings };
        });
        allWarningsThisTurn.forEach(warning => {
          toast({
            title: "AI Data Notice",
            description: ( <div className="flex items-start"> <AlertTriangleIcon className="w-5 h-5 mr-2 mt-0.5 text-orange-500 shrink-0" /> <span>{warning}</span> </div> ),
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
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background selection:bg-primary/20 selection:text-primary">
        <header className="mb-2 text-center pt-4 sm:pt-6 shrink-0">
          <h1 className="font-headline text-5xl sm:text-6xl font-bold text-primary flex items-center justify-center">
            <MessageSquareDashedIcon className="w-10 h-10 sm:w-12 sm:h-12 mr-3 text-accent" />
            Story Forge
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Forge your legend in worlds you know, or discover new ones.
          </p>
        </header>

        <main className="flex flex-col flex-grow w-full max-w-2xl mx-auto px-4 sm:px-6"> {/* Removed overflow-hidden here */}
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-grow">
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
                      character={effectiveCharacterProfileForAI || baseCharacterProfile} 
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

              <TabsContent value="character" className="flex-grow"> {/* Removed overflow-y-auto */}
                <CharacterSheet 
                  character={effectiveCharacterProfileForAI || baseCharacterProfile} 
                  storyState={currentStoryState} 
                />
              </TabsContent>

              <TabsContent value="npcs" className="overflow-y-auto flex-grow">
                <NPCTrackerDisplay trackedNPCs={currentStoryState.trackedNPCs as NPCProfile[]} currentTurnId={storyHistory[storyHistory.length-1]?.id || 'initial'} />
              </TabsContent>

              <TabsContent value="journal" className="overflow-y-auto flex-grow">
                <JournalDisplay
                  quests={currentStoryState.quests as Quest[]}
                  storyArcs={currentStoryState.storyArcs as StoryArc[]}
                  currentStoryArcId={currentStoryState.currentStoryArcId}
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
    </TooltipProvider>
  );
}
