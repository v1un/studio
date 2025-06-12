
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: string; // E.g., "Combat", "Utility", "Passive", "Series-Specific Trait"
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface StatModifier {
  stat: keyof Pick<CharacterProfile, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' | 'maxHealth' | 'maxMana' | 'health' | 'mana' | 'level' | 'experiencePoints' | 'currency' | 'languageReading' | 'languageSpeaking'>;
  value: number;
  type: 'add' | 'multiply';
  description?: string;
}

export interface ActiveEffect {
  id: string;
  name: string;
  description: string;
  type: 'stat_modifier' | 'temporary_ability' | 'passive_aura';
  duration?: 'permanent_while_equipped' | number; // number is for turns (consumables)
  statModifiers?: StatModifier[];
  sourceItemId?: string;
}

export interface TemporaryEffect extends ActiveEffect {
  turnsRemaining: number;
  // Inherits id, name, description, type, statModifiers, sourceItemId from ActiveEffect
  // duration here would be the original total duration, turnsRemaining is what counts down
}

export interface Item {
  id: string;
  name: string;
  description: string;
  equipSlot?: EquipmentSlot;
  isConsumable?: boolean;
  effectDescription?: string; // Narrative effect description
  isQuestItem?: boolean;
  relevantQuestId?: string;
  basePrice?: number;
  price?: number; // For merchants
  rarity?: ItemRarity;
  activeEffects?: ActiveEffect[]; // Can now include effects with numeric duration for consumables
}

export interface CharacterProfile {
  name: string;
  class: string;
  description: string;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
  skillsAndAbilities: Skill[];
  currency?: number;
  languageReading?: number;
  languageSpeaking?: number;
  activeTemporaryEffects?: TemporaryEffect[]; // New field for active buffs/debuffs
}

export type EquipmentSlot =
  | 'weapon'
  | 'shield'
  | 'head'
  | 'body'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'neck'
  | 'ring1'
  | 'ring2';

export interface QuestObjective {
  description: string;
  isCompleted: boolean;
}

export interface QuestRewards {
  experiencePoints?: number;
  items?: Item[];
  currency?: number;
}

export interface Quest {
  id: string;
  title?: string;
  description: string;
  type: 'main' | 'side' | 'dynamic' | 'arc_goal';
  status: 'active' | 'completed' | 'failed';
  storyArcId?: string | null; // Allow null for bridging quests
  orderInStoryArc?: number;
  category?: string;
  objectives?: QuestObjective[];
  rewards?: QuestRewards;
  updatedAt?: string;
}

export interface StoryArc {
  id: string;
  title: string;
  description: string;
  order: number;
  mainQuestIds: string[];
  isCompleted: boolean;
  unlockConditions?: string[]; // Changed from unlockCondition: string
  completionSummary?: string;
}


export interface NPCDialogueEntry {
  playerInput?: string;
  npcResponse: string;
  turnId: string;
}

export interface NPCProfile {
  id: string;
  name: string;
  description: string;
  classOrRole?: string;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  firstEncounteredLocation?: string;
  firstEncounteredTurnId?: string;
  relationshipStatus: number; // Legacy field - will be migrated to new relationship system
  knownFacts: string[];
  dialogueHistory?: NPCDialogueEntry[];
  lastKnownLocation?: string;
  lastSeenTurnId?: string;
  seriesContextNotes?: string;
  shortTermGoal?: string;
  updatedAt?: string;
  isMerchant?: boolean;
  merchantInventory?: Item[];
  buysItemTypes?: string[];
  sellsItemTypes?: string[];

  // === NEW ENHANCED NPC TRACKING ===
  emotionalState?: EmotionalState; // NPC's current emotional state
  personalityTraits?: string[]; // Core personality characteristics
  motivations?: string[]; // What drives this NPC
  fears?: string[]; // What this NPC is afraid of
  loyalties?: string[]; // Who/what this NPC is loyal to
  secrets?: string[]; // Information this NPC is hiding
  factionAffiliations?: string[]; // Which factions this NPC belongs to
  personalGoals?: string[]; // Long-term goals of this NPC
  memoryOfPlayer?: NPCPlayerMemory; // What this NPC remembers about the player
  behaviorPatterns?: NPCBehaviorPattern[]; // How this NPC typically behaves
  availabilitySchedule?: NPCAvailability; // When/where this NPC can be found
}

// NPC-specific interfaces for enhanced tracking
export interface NPCPlayerMemory {
  firstMeeting: {
    turnId: string;
    location: string;
    circumstances: string;
    firstImpression: string;
  };
  significantInteractions: {
    turnId: string;
    interactionType: string;
    outcome: string;
    emotionalImpact: string;
    memoryStrength: number; // 0 to 100
  }[];
  playerReputation: string; // How this NPC views the player
  trustLevel: number; // 0 to 100
  knownPlayerSecrets: string[];
  observedPlayerBehaviors: string[];
  lastUpdated: string;
}

export interface NPCBehaviorPattern {
  situation: string;
  typicalResponse: string;
  emotionalTriggers: string[];
  decisionFactors: string[];
  predictability: number; // 0 to 100
  adaptability: number; // 0 to 100
}

export interface NPCAvailability {
  defaultLocation: string;
  timeBasedLocations: {
    timeOfDay: string;
    location: string;
    activity: string;
    approachability: number; // 0 to 100
  }[];
  specialConditions: {
    condition: string;
    location: string;
    availability: boolean;
  }[];
  lastSeen: {
    turnId: string;
    location: string;
    timestamp: string;
  };
}

// === NEW ENHANCED TRACKING SYSTEMS ===

// Relationship and Emotional State Tracking
export interface RelationshipEntry {
  npcId: string;
  npcName: string;
  relationshipScore: number; // -100 to +100
  trustLevel: number; // 0 to 100
  fearLevel: number; // 0 to 100
  respectLevel: number; // 0 to 100
  lastInteractionTurn?: string;
  relationshipHistory: RelationshipHistoryEntry[];
  emotionalState: EmotionalState;
}

export interface RelationshipHistoryEntry {
  turnId: string;
  timestamp: string;
  interactionType: 'conversation' | 'combat' | 'trade' | 'quest' | 'betrayal' | 'help' | 'romance' | 'conflict';
  relationshipChange: number;
  emotionalImpact: 'positive' | 'negative' | 'neutral' | 'traumatic' | 'bonding';
  description: string;
  consequences?: string[];
}

export interface EmotionalState {
  primaryMood: 'confident' | 'anxious' | 'angry' | 'melancholic' | 'excited' | 'fearful' | 'content' | 'frustrated' | 'hopeful' | 'despairing';
  stressLevel: number; // 0 to 100
  fatigueLevel: number; // 0 to 100
  mentalHealthScore: number; // 0 to 100
  traumaticEvents: TraumaticEvent[];
  moodModifiers: MoodModifier[];
  lastEmotionalUpdate?: string;
}

export interface TraumaticEvent {
  id: string;
  turnId: string;
  eventType: 'death_witnessed' | 'betrayal' | 'loss' | 'violence' | 'failure' | 'abandonment';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  recoveryProgress: number; // 0 to 100
  ongoingEffects: string[];
  timestamp: string;
}

export interface MoodModifier {
  id: string;
  source: string;
  effect: string;
  modifier: number; // -50 to +50
  duration: number; // turns remaining, -1 for permanent
  category: 'environmental' | 'social' | 'physical' | 'psychological' | 'magical';
}

// Faction and Reputation System
export interface FactionStanding {
  factionId: string;
  factionName: string;
  reputationScore: number; // -100 to +100
  standingLevel: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied' | 'revered';
  knownBy: boolean; // whether the faction knows of the player
  specialTitles: string[];
  reputationHistory: ReputationHistoryEntry[];
  currentConsequences: string[]; // active effects of reputation
}

export interface ReputationHistoryEntry {
  turnId: string;
  timestamp: string;
  action: string;
  reputationChange: number;
  newStandingLevel: string;
  witnesses?: string[];
  consequences?: string[];
}

// Environmental Context System
export interface EnvironmentalContext {
  currentLocation: string;
  locationDetails: LocationDetails;
  weatherConditions: WeatherConditions;
  timeContext: TimeContext;
  environmentalHazards: EnvironmentalHazard[];
  atmosphericModifiers: AtmosphericModifier[];
  locationHistory: LocationHistoryEntry[];
}

export interface LocationDetails {
  locationType: 'city' | 'wilderness' | 'dungeon' | 'building' | 'landmark' | 'transport' | 'other';
  size: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  population?: number;
  safetyLevel: number; // 0 to 100
  wealthLevel: number; // 0 to 100
  magicalLevel: number; // 0 to 100
  politicalStability: number; // 0 to 100
  availableServices: string[];
  notableFeatures: string[];
  connectedLocations: string[];
  locationLore?: string;
  persistentChanges: PersistentLocationChange[];
}

export interface WeatherConditions {
  condition: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy' | 'extreme';
  temperature: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
  visibility: number; // 0 to 100
  weatherEffects: string[];
  seasonalContext?: string;
}

export interface TimeContext {
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'dusk' | 'night' | 'midnight';
  dayOfWeek?: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  timeEffects: string[];
  availableActions: string[];
  activeNPCs: string[]; // NPCs available at this time
}

export interface EnvironmentalHazard {
  id: string;
  type: 'natural' | 'magical' | 'political' | 'social' | 'physical';
  name: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'deadly';
  isActive: boolean;
  effects: string[];
  duration?: number; // turns remaining
}

export interface AtmosphericModifier {
  id: string;
  source: string;
  effect: string;
  moodImpact: number; // -20 to +20
  interactionModifier: number; // -10 to +10
  description: string;
  isTemporary: boolean;
  duration?: number;
}

export interface PersistentLocationChange {
  id: string;
  turnId: string;
  changeType: 'destruction' | 'construction' | 'renovation' | 'occupation' | 'abandonment' | 'transformation';
  description: string;
  permanentEffects: string[];
  timestamp: string;
  causedBy?: string; // player action, NPC, event, etc.
}

export interface LocationHistoryEntry {
  turnId: string;
  timestamp: string;
  visitDuration?: number;
  significantEvents: string[];
  npcsEncountered: string[];
  itemsFound?: string[];
  questsProgressed?: string[];
}

// Long-term Narrative Thread Management
export interface NarrativeThread {
  id: string;
  title: string;
  description: string;
  category: 'main_plot' | 'character_development' | 'world_building' | 'relationship' | 'mystery' | 'prophecy' | 'personal_goal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'dormant' | 'active' | 'escalating' | 'resolving' | 'resolved' | 'abandoned';
  timeSensitive: boolean;
  urgencyLevel: number; // 0 to 100
  relatedCharacters: string[];
  relatedLocations: string[];
  relatedFactions: string[];
  keyEvents: NarrativeEvent[];
  potentialOutcomes: string[];
  playerInfluence: number; // 0 to 100 - how much player actions affect this thread
  lastMentioned?: string; // turnId
  resolutionConditions?: string[];
  consequences: string[];
}

export interface NarrativeEvent {
  turnId: string;
  timestamp: string;
  eventType: 'introduction' | 'development' | 'complication' | 'revelation' | 'climax' | 'resolution';
  description: string;
  playerInvolvement: 'none' | 'witness' | 'participant' | 'catalyst' | 'decision_maker';
  impact: 'minor' | 'moderate' | 'major' | 'pivotal';
  consequences: string[];
}

export interface LongTermStorySummary {
  overallNarrative: string;
  majorMilestones: MajorMilestone[];
  characterDevelopmentArcs: CharacterDevelopmentArc[];
  worldStateChanges: WorldStateChange[];
  unresolvedMysteries: string[];
  establishedRelationships: string[];
  significantChoices: SignificantChoice[];
  thematicElements: string[];
  lastUpdated: string;
}

export interface MajorMilestone {
  turnId: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'story_progression' | 'character_growth' | 'world_change' | 'relationship_milestone' | 'power_gain' | 'loss_event';
  significance: 'minor' | 'moderate' | 'major' | 'legendary';
  longTermImpact: string[];
}

export interface CharacterDevelopmentArc {
  aspect: 'personality' | 'skills' | 'relationships' | 'goals' | 'fears' | 'beliefs' | 'reputation';
  startingState: string;
  currentState: string;
  developmentEvents: string[];
  growthDirection: 'positive' | 'negative' | 'complex' | 'cyclical';
  futureImplications: string[];
}

export interface WorldStateChange {
  turnId: string;
  timestamp: string;
  changeType: 'political' | 'environmental' | 'social' | 'magical' | 'economic' | 'technological';
  description: string;
  scope: 'local' | 'regional' | 'national' | 'global';
  permanence: 'temporary' | 'lasting' | 'permanent' | 'unknown';
  playerCaused: boolean;
  ongoingEffects: string[];
}

export interface SignificantChoice {
  turnId: string;
  timestamp: string;
  choiceDescription: string;
  alternativesConsidered: string[];
  reasoningFactors: string[];
  immediateConsequences: string[];
  longTermConsequences: string[];
  moralAlignment?: 'good' | 'neutral' | 'evil' | 'complex';
  characterGrowth?: string;
  relationshipImpacts: { npcId: string; impact: string }[];
}

// Player Agency and Preference System
export interface PlayerPreferences {
  playstyle: PlaystylePreferences;
  contentPreferences: ContentPreferences;
  difficultyPreferences: DifficultyPreferences;
  narrativePreferences: NarrativePreferences;
  interactionHistory: InteractionPattern[];
  adaptiveSettings: AdaptiveSettings;
  lastAnalyzed: string;
}

export interface PlaystylePreferences {
  combatVsDiplomacy: number; // -100 (pure diplomacy) to +100 (pure combat)
  explorationVsStory: number; // -100 (pure story) to +100 (pure exploration)
  cautionVsRisk: number; // -100 (very cautious) to +100 (very risky)
  soloVsGroup: number; // -100 (prefers solo) to +100 (prefers group activities)
  planningVsImpulsive: number; // -100 (very impulsive) to +100 (very planned)
  moralAlignment: number; // -100 (evil choices) to +100 (good choices)
  preferredApproaches: string[];
  avoidedApproaches: string[];
}

export interface ContentPreferences {
  preferredQuestTypes: string[];
  favoriteNPCTypes: string[];
  preferredLocations: string[];
  contentComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  pacePreference: 'slow' | 'moderate' | 'fast' | 'variable';
  detailLevel: 'minimal' | 'moderate' | 'detailed' | 'very_detailed';
  humorLevel: number; // 0 to 100
  romanceInterest: number; // 0 to 100
  politicalInvolvement: number; // 0 to 100
}

export interface DifficultyPreferences {
  combatDifficulty: number; // 0 to 100
  puzzleDifficulty: number; // 0 to 100
  socialDifficulty: number; // 0 to 100
  resourceManagement: number; // 0 to 100
  timePresure: number; // 0 to 100
  consequenceSeverity: number; // 0 to 100
  adaptiveDifficulty: boolean;
  preferredChallengeTypes: string[];
}

export interface NarrativePreferences {
  storyFocus: 'character_driven' | 'plot_driven' | 'world_driven' | 'balanced';
  preferredThemes: string[];
  emotionalIntensity: number; // 0 to 100
  moralComplexity: number; // 0 to 100
  mysteryLevel: number; // 0 to 100
  prophecyInterest: number; // 0 to 100
  characterBackstoryDepth: number; // 0 to 100
}

export interface InteractionPattern {
  turnId: string;
  timestamp: string;
  actionType: string;
  context: string;
  outcome: 'success' | 'failure' | 'partial' | 'unexpected';
  playerSatisfaction?: number; // 0 to 100, if measurable
  timeSpent?: number; // seconds
  retryCount?: number;
}

export interface AdaptiveSettings {
  autoAdjustDifficulty: boolean;
  autoAdjustPacing: boolean;
  autoAdjustContent: boolean;
  learningRate: number; // 0 to 100
  adaptationThreshold: number; // 0 to 100
  lastAdaptation: string;
  adaptationHistory: AdaptationEvent[];
}

export interface AdaptationEvent {
  timestamp: string;
  adaptationType: 'difficulty' | 'pacing' | 'content' | 'narrative';
  reason: string;
  changes: string[];
  playerResponse?: string;
}

// Choice Consequence System
export interface ChoiceConsequence {
  id: string;
  originalChoiceTurnId: string;
  originalChoice: string;
  consequenceType: 'immediate' | 'short_term' | 'long_term' | 'permanent';
  manifestationTurnId?: string; // when the consequence appeared
  category: 'relationship' | 'reputation' | 'world_state' | 'character_development' | 'story_progression' | 'resource' | 'opportunity';
  description: string;
  severity: 'trivial' | 'minor' | 'moderate' | 'major' | 'critical';
  isActive: boolean;
  ongoingEffects: string[];
  relatedNPCs?: string[];
  relatedFactions?: string[];
  relatedLocations?: string[];
  playerAwareness: 'unaware' | 'suspected' | 'partially_aware' | 'fully_aware';
  futureImplications: string[];
}

// System Metrics and Performance Tracking
export interface SystemMetrics {
  performanceMetrics: PerformanceMetrics;
  engagementMetrics: EngagementMetrics;
  contentMetrics: ContentMetrics;
  errorTracking: ErrorTracking;
  lastUpdated: string;
}

export interface PerformanceMetrics {
  averageGenerationTime: number;
  successRate: number;
  timeoutRate: number;
  retryRate: number;
  cacheHitRate: number;
  totalTurns: number;
  totalPlayTime: number; // minutes
  lastPerformanceUpdate: string;
}

export interface EngagementMetrics {
  sessionLength: number; // minutes
  actionsPerSession: number;
  preferredActionTypes: { [actionType: string]: number };
  satisfactionIndicators: SatisfactionIndicator[];
  dropOffPoints: string[];
  reEngagementTriggers: string[];
}

export interface SatisfactionIndicator {
  turnId: string;
  timestamp: string;
  indicator: 'quick_action' | 'long_deliberation' | 'retry' | 'undo' | 'restart' | 'continue_session';
  context: string;
  satisfactionScore: number; // -100 to +100
}

export interface ContentMetrics {
  questCompletionRate: number;
  explorationCoverage: number;
  npcInteractionDiversity: number;
  storyProgressionRate: number;
  contentUtilization: { [contentType: string]: number };
  playerCreatedContent: number;
}

export interface ErrorTracking {
  generationErrors: GenerationError[];
  validationErrors: ValidationError[];
  userReportedIssues: UserReportedIssue[];
  systemWarnings: SystemWarning[];
  recoverySuccessRate: number;
}

export interface GenerationError {
  timestamp: string;
  turnId: string;
  errorType: string;
  errorMessage: string;
  context: string;
  resolved: boolean;
  resolutionMethod?: string;
}

export interface ValidationError {
  timestamp: string;
  turnId: string;
  fieldName: string;
  expectedType: string;
  actualValue: any;
  correctionApplied: string;
}

export interface UserReportedIssue {
  timestamp: string;
  turnId: string;
  issueType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'wont_fix';
}

export interface SystemWarning {
  timestamp: string;
  turnId: string;
  warningType: string;
  message: string;
  actionTaken: string;
  preventionSuggestion?: string;
}

export interface StructuredStoryState {
  character: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  quests: Quest[];
  storyArcs: StoryArc[];
  currentStoryArcId?: string | null; // Allow null
  worldFacts: string[];
  trackedNPCs: NPCProfile[];
  storySummary?: string;

  // === NEW ENHANCED TRACKING SYSTEMS ===
  // Relationship and Emotional Systems
  characterEmotionalState: EmotionalState;
  npcRelationships: RelationshipEntry[];
  factionStandings: FactionStanding[];

  // Environmental Context
  environmentalContext: EnvironmentalContext;

  // Long-term Narrative Management
  narrativeThreads: NarrativeThread[];
  longTermStorySummary: LongTermStorySummary;

  // Player Agency and Preferences
  playerPreferences: PlayerPreferences;
  choiceConsequences: ChoiceConsequence[];

  // System Tracking
  systemMetrics: SystemMetrics;
}

export interface CombatEventLogEntry {
  description: string;
  target?: 'player' | string;
  type: 'damage' | 'healing' | 'effect' | 'death' | 'action';
  value?: string | number;
}

export interface CombatHelperInfo {
  playerHealth: number;
  playerMaxHealth: number;
  playerMana?: number;
  playerMaxMana?: number;
  hostileNPCs: Array<{ id: string; name: string; health?: number; maxHealth?: number; description?: string }>;
  turnEvents: CombatEventLogEntry[];
}


export interface DisplayMessage {
  id: string;
  speakerType: 'Player' | 'GM' | 'NPC' | 'SystemHelper' | 'ArcNotification'; // Added ArcNotification
  speakerNameLabel: string;
  speakerDisplayName?: string;
  content?: string;
  avatarSrc?: string;
  avatarHint?: string;
  isPlayer: boolean;
  combatHelperInfo?: CombatHelperInfo;
}

export interface StoryTurn {
  id: string;
  messages: DisplayMessage[];
  storyStateAfterScene: StructuredStoryState;
}

export interface GameSession {
  id:string;
  storyPrompt: string;
  characterName: string;
  storyHistory: StoryTurn[];
  createdAt: string;
  lastPlayedAt: string;
  seriesName: string;
  seriesStyleGuide?: string;
  seriesPlotSummary?: string;
  isPremiumSession?: boolean;
  allDataCorrectionWarnings?: { timestamp: string; warnings: string[] }[];
}

export interface LoreEntry {
  id: string;
  keyword: string;
  content: string;
  category?: string;
  source: 'AI-Generated' | 'System' | 'User-Added' | 'AI-Generated-Scenario-Start' | 'AI-Discovered';
  createdAt: string;
  updatedAt?: string;
}

export interface RawLoreEntry {
  keyword: string;
  content: string;
  category?: string;
}

// Input/Output for the generateScenarioFoundationFlow
export interface GenerateScenarioFoundationInput {
  seriesName: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateScenarioFoundationOutput {
  sceneDescription: string;
  characterProfile: CharacterProfile;
  currentLocation: string;
  inventory: Item[];
  equippedItems: Partial<Record<EquipmentSlot, Item | null>>;
  worldFacts: string[];
  seriesStyleGuide?: string;
  seriesPlotSummary: string;
}

// Input/Output for the generateScenarioNarrativeElementsFlow
export interface GenerateScenarioNarrativeElementsInput {
  seriesName: string;
  seriesPlotSummary: string;
  characterProfile: CharacterProfile;
  sceneDescription: string;
  currentLocation: string;
  characterNameInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateScenarioNarrativeElementsOutput {
  quests: Quest[];
  storyArcs: StoryArc[];
  trackedNPCs: NPCProfile[];
  initialLoreEntries: RawLoreEntry[];
}


export interface ActiveNPCInfo {
  name: string;
  description?: string;
  keyDialogueOrAction?: string;
}

export interface AIMessageSegment {
    speaker: string;
    content: string;
}

export type EventType =
  | 'healthChange'
  | 'manaChange'
  | 'xpChange'
  | 'levelUp'
  | 'currencyChange'
  | 'languageSkillChange'
  | 'itemFound'
  | 'itemLost'
  | 'itemUsed'
  | 'itemEquipped'
  | 'itemUnequipped'
  | 'questAccepted'
  | 'questObjectiveUpdate'
  | 'questCompleted'
  | 'questFailed'
  | 'npcRelationshipChange'
  | 'npcStateChange'
  | 'newNPCIntroduced'
  | 'worldFactAdded'
  | 'worldFactRemoved'
  | 'worldFactUpdated'
  | 'skillLearned';

export interface DescribedEventBase {
  type: EventType;
  reason?: string;
}

export interface HealthChangeEvent extends DescribedEventBase { type: 'healthChange'; characterTarget: 'player' | string; amount: number; }
export interface ManaChangeEvent extends DescribedEventBase { type: 'manaChange'; characterTarget: 'player' | string; amount: number; }
export interface XPChangeEvent extends DescribedEventBase { type: 'xpChange'; amount: number; }
export interface LevelUpEvent extends DescribedEventBase { type: 'levelUp'; newLevel: number; rewardSuggestion?: string; }
export interface CurrencyChangeEvent extends DescribedEventBase { type: 'currencyChange'; amount: number; }
export interface LanguageSkillChangeEvent extends DescribedEventBase { type: 'languageSkillChange'; skillTarget: 'reading' | 'speaking'; amount: number; }


export interface ItemFoundEvent extends DescribedEventBase {
  type: 'itemFound';
  itemName: string;
  itemDescription: string;
  quantity?: number;
  suggestedBasePrice?: number;
  equipSlot?: Item['equipSlot'];
  isConsumable?: boolean;
  effectDescription?: string; // Narrative effect description
  isQuestItem?: boolean;
  relevantQuestId?: string;
  rarity?: ItemRarity;
  activeEffects?: ActiveEffect[]; // Can now include effects with numeric duration
}
export interface ItemLostEvent extends DescribedEventBase { type: 'itemLost'; itemIdOrName: string; quantity?: number; }
export interface ItemUsedEvent extends DescribedEventBase { type: 'itemUsed'; itemIdOrName: string; }
export interface ItemEquippedEvent extends DescribedEventBase { type: 'itemEquipped'; itemIdOrName: string; slot: EquipmentSlot; }
export interface ItemUnequippedEvent extends DescribedEventBase { type: 'itemUnequipped'; itemIdOrName: string; slot: EquipmentSlot; }

export interface QuestAcceptedEvent extends DescribedEventBase {
  type: 'questAccepted';
  questIdSuggestion?: string;
  questTitle?: string;
  questDescription: string;
  questType?: Quest['type'];
  storyArcId?: string;
  orderInStoryArc?: number;
  category?: string;
  objectives?: { description: string }[];
  rewards?: { experiencePoints?: number; currency?: number; items?: Array<Partial<Item> & { activeEffects?: ActiveEffect[] }> };
}
export interface QuestObjectiveUpdateEvent extends DescribedEventBase { type: 'questObjectiveUpdate'; questIdOrDescription: string; objectiveDescription: string; objectiveCompleted: boolean; }
export interface QuestCompletedEvent extends DescribedEventBase { type: 'questCompleted'; questIdOrDescription: string; }
export interface QuestFailedEvent extends DescribedEventBase { type: 'questFailed'; questIdOrDescription: string; }


export interface NPCRelationshipChangeEvent extends DescribedEventBase { type: 'npcRelationshipChange'; npcName: string; changeAmount: number; newStatus?: number; }
export interface NPCStateChangeEvent extends DescribedEventBase { type: 'npcStateChange'; npcName: string; newState: string; }
export interface NewNPCIntroducedEvent extends DescribedEventBase {
  type: 'newNPCIntroduced';
  npcName: string;
  npcDescription: string;
  classOrRole?: string;
  initialRelationship?: number;
  isMerchant?: boolean;
  initialHealth?: number;
  initialMana?: number;
  merchantSellsItemTypes?: string[];
  merchantBuysItemTypes?: string[];
}

export interface WorldFactAddedEvent extends DescribedEventBase { type: 'worldFactAdded'; fact: string; }
export interface WorldFactRemovedEvent extends DescribedEventBase { type: 'worldFactRemoved'; factDescription: string; }
export interface WorldFactUpdatedEvent extends DescribedEventBase { type: 'worldFactUpdated'; oldFactDescription: string; newFact: string; }

export interface SkillLearnedEvent extends DescribedEventBase {
  type: 'skillLearned';
  skillName: string;
  skillDescription: string;
  skillType: string;
}


export type DescribedEvent =
  | HealthChangeEvent | ManaChangeEvent | XPChangeEvent | LevelUpEvent | CurrencyChangeEvent | LanguageSkillChangeEvent
  | ItemFoundEvent | ItemLostEvent | ItemUsedEvent | ItemEquippedEvent | ItemUnequippedEvent
  | QuestAcceptedEvent | QuestObjectiveUpdateEvent | QuestCompletedEvent | QuestFailedEvent
  | NPCRelationshipChangeEvent | NPCStateChangeEvent | NewNPCIntroducedEvent
  | WorldFactAddedEvent | WorldFactRemovedEvent | WorldFactUpdatedEvent
  | SkillLearnedEvent;

export interface NarrativeAndEventsOutput {
  generatedMessages: AIMessageSegment[];
  describedEvents?: DescribedEvent[];
  activeNPCsInScene?: ActiveNPCInfo[];
  newLoreProposals?: RawLoreEntry[];
  sceneSummaryFragment: string;
}

export interface GenerateNextSceneInput {
  currentScene: string;
  userInput: string;
  storyState: StructuredStoryState;
  seriesName: string;
  seriesStyleGuide?: string;
  currentTurnId: string;
  usePremiumAI?: boolean;
}

export interface GenerateNextSceneOutput {
  generatedMessages: AIMessageSegment[];
  updatedStoryState: StructuredStoryState;
  activeNPCsInScene?: ActiveNPCInfo[];
  newLoreEntries?: RawLoreEntry[];
  updatedStorySummary: string;
  dataCorrectionWarnings?: string[];
  describedEvents?: DescribedEvent[];
}

export interface GenerateStoryStartInput {
  prompt: string;
  characterNameInput?: string;
  characterClassInput?: string;
  usePremiumAI?: boolean;
}

export interface GenerateStoryStartOutput {
  sceneDescription: string;
  storyState: StructuredStoryState;
}

export interface FleshOutStoryArcQuestsInput {
  storyArcToFleshOut: StoryArc;
  seriesName: string;
  seriesPlotSummary: string;
  overallStorySummarySoFar: string;
  characterContext: { name: string; class: string; level: number; };
  usePremiumAI?: boolean;
}

export interface FleshOutStoryArcQuestsOutput {
  fleshedOutQuests: Quest[];
}

export interface DiscoverNextStoryArcInput {
  seriesName: string;
  seriesPlotSummary: string;
  completedOrGeneratedArcTitles: string[];
  lastCompletedArcOrder: number;
  lastCompletedArcSummary?: string;
  usePremiumAI?: boolean;
}

export interface DiscoverNextStoryArcOutput {
  nextStoryArcOutline: StoryArc | null;
}

export interface UpdateCharacterDescriptionInput {
    currentProfile: CharacterProfile;
    completedArc: StoryArc;
    overallStorySummarySoFar: string;
    seriesName: string;
    usePremiumAI?: boolean;
}

export interface UpdateCharacterDescriptionOutput {
    updatedCharacterDescription: string;
}

export interface GenerateBridgingQuestInput {
  seriesName: string;
  currentLocation: string;
  characterProfile: { name: string; class: string; level: number; };
  overallStorySummarySoFar: string;
  previousArcCompletionSummary: string;
  usePremiumAI?: boolean;
}

export interface GenerateBridgingQuestOutput {
  bridgingQuest: Quest | null;
  bridgingNarrativeHook?: string;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
}

export interface CharacterReputation {
  factionId: string;
  reputationScore: number;
}

export interface PlayerReputation {
  factionReputations: CharacterReputation[];
}

export interface SkillSpecialization {
  id: string;
  name: string;
  description: string;
  baseSkillId?: string;
  grantsAbilities: Skill[];
}

export interface ResourceItem extends Item {
  resourceType: 'herb' | 'ore' | 'monster_part' | 'wood' | 'gem';
}

export interface CraftingRecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: CraftingRecipeIngredient[];
  outputItemId: string;
  outputQuantity: number;
  requiredSkill?: { skillId: string; level: number };
  discovered?: boolean;
}
