
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

  // === ENHANCED PROGRESSION SYSTEM ===
  progressionPoints?: ProgressionPoints;
  attributeProgression?: AttributeProgression;
  purchasedSkillNodes?: string[]; // IDs of purchased skill tree nodes
  availableSkillTrees?: string[]; // IDs of accessible skill trees
  activeSpecializations?: CharacterSpecialization[];
  purchasedTalents?: string[]; // IDs of purchased talent nodes
  completedMilestones?: string[]; // IDs of completed progression milestones
  totalExperienceEarned?: number; // Lifetime XP for milestone tracking

  // Enhanced combat stats (derived from progression)
  attack?: number;
  defense?: number;
  speed?: number;
  accuracy?: number;
  evasion?: number;
  criticalChance?: number;
  criticalMultiplier?: number;

  // Additional derived stats
  carryCapacity?: number;
  movementSpeed?: number;
  initiativeBonus?: number;
  resistances?: { [damageType: string]: number };
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

  // === ENHANCED QUEST SYSTEM ===
  branches?: QuestBranch[];
  currentBranch?: string;
  choiceHistory?: QuestChoice[];
  prerequisites?: QuestPrerequisite[];
  consequences?: QuestConsequence[];
  timeLimit?: QuestTimeLimit;
  failureConditions?: QuestFailureCondition[];
  alternativeSolutions?: QuestSolution[];
  dynamicElements?: QuestDynamicElement[];
  moralAlignment?: 'good' | 'neutral' | 'evil' | 'complex';
  difficultyRating?: number; // 1-10
  estimatedDuration?: number; // minutes
  playerChoiceImpact?: number; // 0-100, how much player choices affect this quest
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

  // === ENHANCED STORY ARC SYSTEM ===
  branchingPaths?: StoryArcBranch[];
  currentPath?: string;
  alternativeEndings?: StoryArcEnding[];
  playerChoiceInfluence?: number; // 0-100
  consequenceWeight?: 'light' | 'moderate' | 'heavy' | 'permanent';
  thematicElements?: string[];
  conflictingFactions?: string[];
  keyDecisionPoints?: StoryArcDecision[];

  // === COMPREHENSIVE ARC PROGRESSION SYSTEM ===
  progression?: ArcProgression;
  difficultySettings?: ArcDifficultySettings;
  playerAgencyMetrics?: ArcPlayerAgencyMetrics;
  stateTracking?: ArcStateTracking;
  integrationPoints?: ArcSystemIntegration;
  failureRecovery?: ArcFailureRecoverySystem;
  narrativeDepth?: ArcNarrativeDepth;
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

  // === ENHANCED RELATIONSHIP SYSTEM ===
  // Complex Relationship Dynamics
  relationshipType: 'platonic' | 'romantic' | 'familial' | 'professional' | 'adversarial' | 'mentor' | 'rival';
  romanticStatus?: 'single' | 'interested' | 'dating' | 'committed' | 'complicated' | 'unrequited';
  romanticCompatibility?: number; // 0 to 100
  jealousyLevel?: number; // 0 to 100 - for love triangle mechanics

  // Multi-directional Connections
  connectedRelationships: string[]; // IDs of other NPCs this relationship affects
  groupDynamicsInfluence: GroupDynamicsEntry[];
  socialCircle?: string; // ID of social group this NPC belongs to

  // Temporal Elements
  memoryRetention: MemoryRetentionEntry[]; // For time loop mechanics
  loopAwareMemories: LoopMemoryEntry[];
  temporalConsistency: number; // 0 to 100 - how consistent across loops
}

export interface RelationshipHistoryEntry {
  turnId: string;
  timestamp: string;
  interactionType: 'conversation' | 'combat' | 'trade' | 'quest' | 'betrayal' | 'help' | 'romance' | 'conflict' | 'jealousy_trigger' | 'group_dynamic' | 'temporal_event';
  relationshipChange: number;
  emotionalImpact: 'positive' | 'negative' | 'neutral' | 'traumatic' | 'bonding' | 'romantic_tension' | 'jealousy' | 'betrayal_shock';
  description: string;
  consequences?: string[];

  // === ENHANCED RELATIONSHIP TRACKING ===
  cascadeEffects?: CascadeEffect[]; // How this interaction affects other relationships
  witnessedBy?: string[]; // NPCs who witnessed this interaction
  groupDynamicsImpact?: GroupDynamicsImpact[];
  temporalContext?: TemporalContext; // For loop mechanics
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

// === GAME BALANCE AND DIFFICULTY SYSTEM ===

export interface GameBalanceSettings {
  difficultyMode: 'easy' | 'normal' | 'hard' | 'custom';
  customSettings?: CustomDifficultySettings;
  dynamicAdjustment: DynamicDifficultySettings;
  resourceScarcity: ResourceScarcitySettings;
  riskRewardBalance: RiskRewardSettings;
  failureRecovery: FailureRecoverySettings;
}

export interface CustomDifficultySettings {
  combatScaling: number; // 0.5 to 2.0 multiplier
  resourceScarcity: number; // 0.5 to 2.0 multiplier
  consequenceSeverity: number; // 0.5 to 2.0 multiplier
  timeConstraints: number; // 0.5 to 2.0 multiplier
  enemyIntelligence: number; // 0.5 to 2.0 multiplier
  lootRarity: number; // 0.5 to 2.0 multiplier
  experienceGain: number; // 0.5 to 2.0 multiplier
}

export interface DynamicDifficultySettings {
  enabled: boolean;
  adjustmentSensitivity: number; // 0 to 100
  performanceWindow: number; // Number of recent actions to consider
  maxAdjustmentPerSession: number; // Maximum difficulty change per session
  adjustmentFactors: DifficultyAdjustmentFactors;
}

export interface DifficultyAdjustmentFactors {
  winLossRatio: number; // Weight for combat win/loss ratio
  resourceEfficiency: number; // Weight for resource management efficiency
  questCompletionRate: number; // Weight for quest success rate
  playerFrustrationIndicators: number; // Weight for frustration signals
  sessionLength: number; // Weight for session engagement
}

export interface ResourceScarcitySettings {
  enabled: boolean;
  scarcityLevel: number; // 0 to 100
  affectedResources: ResourceType[];
  scarcityEvents: ResourceScarcityEvent[];
  recoveryMechanics: ResourceRecoveryMechanic[];
}

export interface ResourceType {
  id: string;
  name: string;
  category: 'consumable' | 'currency' | 'material' | 'equipment';
  baseScarcity: number; // 0 to 100
  criticalThreshold: number; // When to trigger scarcity warnings
  renewalRate?: number; // How quickly resource regenerates
}

export interface ResourceScarcityEvent {
  id: string;
  name: string;
  description: string;
  triggerConditions: ScarcityTriggerCondition[];
  effects: ResourceScarcityEffect[];
  duration: number; // In game turns
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface ScarcityTriggerCondition {
  type: 'resource_below_threshold' | 'time_based' | 'location_based' | 'quest_based';
  resourceId?: string;
  threshold?: number;
  location?: string;
  questId?: string;
}

export interface ResourceScarcityEffect {
  resourceId: string;
  effectType: 'reduce_availability' | 'increase_cost' | 'reduce_quality' | 'add_risk';
  magnitude: number; // Multiplier or flat change
  description: string;
}

export interface ResourceRecoveryMechanic {
  id: string;
  name: string;
  description: string;
  resourceId: string;
  recoveryType: 'time_based' | 'action_based' | 'quest_based' | 'trade_based';
  recoveryRate: number;
  requirements: RecoveryRequirement[];
  cost?: number;
}

export interface RecoveryRequirement {
  type: 'time' | 'action' | 'resource' | 'skill' | 'location';
  value: string | number;
  description: string;
}

export interface RiskRewardSettings {
  enabled: boolean;
  riskTolerance: number; // 0 to 100
  rewardScaling: RewardScalingSettings;
  riskFactors: RiskFactor[];
  tradeoffMechanics: TradeoffMechanic[];
}

export interface RewardScalingSettings {
  baseMultiplier: number;
  riskBonusMultiplier: number;
  difficultyBonusMultiplier: number;
  rarityBonusMultiplier: number;
  timeConstraintBonusMultiplier: number;
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'exploration' | 'social' | 'resource' | 'time';
  riskLevel: number; // 0 to 100
  potentialConsequences: string[];
  mitigationOptions: string[];
}

export interface TradeoffMechanic {
  id: string;
  name: string;
  description: string;
  tradeoffType: 'resource_for_power' | 'time_for_quality' | 'risk_for_reward' | 'safety_for_speed';
  inputCost: TradeoffCost;
  outputBenefit: TradeoffBenefit;
  cooldown?: number;
  limitations?: string[];
}

export interface TradeoffCost {
  type: 'resource' | 'time' | 'health' | 'reputation' | 'opportunity';
  amount: number;
  description: string;
}

export interface TradeoffBenefit {
  type: 'stat_boost' | 'resource_gain' | 'advantage' | 'unlock_option';
  amount: number;
  duration?: number;
  description: string;
}

export interface FailureRecoverySettings {
  enabled: boolean;
  failureConsequenceSeverity: number; // 0 to 100
  recoveryDifficulty: number; // 0 to 100
  allowedFailureTypes: FailureType[];
  recoveryMechanics: FailureRecoveryMechanic[];
}

export interface FailureType {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'quest' | 'social' | 'exploration' | 'resource';
  isGameOver: boolean;
  defaultConsequences: FailureConsequence[];
  recoveryOptions: string[];
}

export interface FailureConsequence {
  type: 'temporary_debuff' | 'resource_loss' | 'reputation_damage' | 'opportunity_loss' | 'time_penalty';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  duration?: number;
  description: string;
  reversible: boolean;
}

export interface FailureRecoveryMechanic {
  id: string;
  name: string;
  description: string;
  applicableFailureTypes: string[];
  recoveryType: 'alternative_path' | 'retry_with_bonus' | 'resource_investment' | 'time_investment' | 'help_seeking';
  requirements: RecoveryRequirement[];
  successChance: number; // 0 to 100
  cost?: TradeoffCost;
  timeLimit?: number;
}

// Performance Tracking for Balance System
export interface PlayerPerformanceMetrics {
  combatMetrics: CombatPerformanceMetrics;
  resourceMetrics: ResourceManagementMetrics;
  questMetrics: QuestPerformanceMetrics;
  overallMetrics: OverallPerformanceMetrics;
  lastUpdated: string;
}

export interface CombatPerformanceMetrics {
  winRate: number; // 0 to 100
  averageCombatDuration: number; // In turns
  damageEfficiency: number; // Damage dealt vs damage taken
  resourceUsageEfficiency: number; // Effective use of consumables/abilities
  tacticalDecisionQuality: number; // 0 to 100
  recentCombats: CombatResult[];
}

export interface CombatResult {
  combatId: string;
  outcome: 'victory' | 'defeat' | 'flee' | 'draw';
  duration: number;
  difficultyLevel: number;
  playerLevel: number;
  timestamp: string;
}

export interface ResourceManagementMetrics {
  efficiency: number; // 0 to 100
  wasteRate: number; // 0 to 100
  scarcityAdaptation: number; // How well player adapts to scarcity
  investmentWisdom: number; // Quality of resource investment decisions
  emergencyPreparedness: number; // How well prepared for resource crises
}

export interface QuestPerformanceMetrics {
  completionRate: number; // 0 to 100
  averageAttemptsPerQuest: number;
  timeManagement: number; // 0 to 100
  solutionCreativity: number; // 0 to 100
  consequenceAwareness: number; // 0 to 100
}

export interface OverallPerformanceMetrics {
  adaptabilityScore: number; // 0 to 100
  learningRate: number; // How quickly player improves
  frustrationLevel: number; // 0 to 100
  engagementLevel: number; // 0 to 100
  preferredDifficultyRange: { min: number; max: number };
}

export interface FailureRecoveryRecord {
  id: string;
  originalFailureId: string;
  failureType: string;
  recoveryMechanicUsed: string;
  recoveryAttemptTimestamp: string;
  recoverySuccess: boolean;
  finalOutcome: string;
  lessonsLearned: string[];
  playerSatisfaction?: number; // 0 to 100
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
  consequenceType: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'permanent' | 'butterfly_effect';
  manifestationTurnId?: string; // when the consequence appeared
  category: 'relationship' | 'reputation' | 'world_state' | 'character_development' | 'story_progression' | 'resource' | 'opportunity' | 'temporal';
  description: string;
  severity: 'trivial' | 'minor' | 'moderate' | 'major' | 'critical' | 'world_changing';
  isActive: boolean;
  ongoingEffects: string[];
  relatedNPCs?: string[];
  relatedFactions?: string[];
  relatedLocations?: string[];
  playerAwareness: 'unaware' | 'suspected' | 'partially_aware' | 'fully_aware';
  futureImplications: string[];

  // === MULTI-LAYERED CONSEQUENCE CHAINS ===
  cascadeLevel: number; // 0 = original choice, 1+ = consequence of consequence
  parentConsequenceId?: string; // ID of the consequence that triggered this one
  childConsequenceIds: string[]; // Consequences triggered by this consequence
  crossThreadConnections: ConsequenceConnection[]; // How this affects unrelated storylines
  magnitudeScaling: number; // 1.0 = normal, >1.0 = amplified effect
  rippleRadius: 'local' | 'regional' | 'global' | 'universal'; // Scope of impact

  // Temporal Elements
  temporalStability: number; // 0 to 100 - how consistent across time loops
  loopVariations: LoopConsequenceVariation[]; // Different outcomes in different loops
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

  // Combat Integration
  combatIntegration?: CombatIntegrationState;

  // === ENHANCED QUEST AND CHOICE SYSTEM ===
  // Enhanced Faction System
  enhancedFactions?: EnhancedFaction[];

  // World State Management
  worldStates?: WorldState[];

  // Choice Tracking
  playerChoices?: PlayerChoice[];

  // Moral and Reputation System
  moralProfile?: MoralProfile;

  // Quest System Enhancements
  questBranches?: { [questId: string]: QuestBranch[] };
  activeQuestChoices?: { [questId: string]: QuestChoice[] };

  // Dynamic Quest Generation
  questGenerationSettings?: QuestGenerationSettings;

  // Failure State Management
  questFailures?: QuestFailureRecord[];

  // Time-sensitive Elements
  timeBasedEvents?: TimeBasedEvent[];

  // === GAME BALANCE AND DIFFICULTY SYSTEM ===
  gameBalance?: GameBalanceSettings;
  playerPerformance?: PlayerPerformanceMetrics;
  activeResourceScarcity?: ResourceScarcityEvent[];
  activeTradeoffs?: TradeoffMechanic[];
  failureHistory?: FailureRecoveryRecord[];

  // === ENHANCED NARRATIVE SYSTEMS ===
  // Complex Relationship Webs
  groupDynamics?: GroupDynamicsEntry[];
  activeRomanticTensions?: RomanticTension[];
  socialCircles?: { [circleId: string]: string[] }; // Circle ID -> Member IDs

  // Multi-layered Consequence Chains
  consequenceChains?: { [chainId: string]: ChoiceConsequence[] };
  butterflyEffects?: ButterflyEffectChain[];
  crossThreadConnections?: ConsequenceConnection[];

  // Temporal Elements
  temporalState?: TemporalGameState;
  loopHistory?: TemporalSaveState[];
  retainedMemories?: MemoryRetentionEntry[];
  psychologicalEffects?: PsychologicalEffect[];
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

// Enhanced Combat Integration
export interface CombatIntegrationState {
  isInCombat: boolean;
  combatId?: string;
  combatPhase?: 'initiative' | 'player_turn' | 'enemy_turn' | 'resolution' | 'ended';
  lastCombatResult?: 'victory' | 'defeat' | 'flee' | 'ongoing';
  combatContext?: {
    location: string;
    environment: string;
    participants: string[];
    startedAt: string;
  };
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

// === ENHANCED CHARACTER PROGRESSION SYSTEM ===

export type ProgressionPointType = 'attribute' | 'skill' | 'specialization' | 'talent';

export interface ProgressionPoints {
  attribute: number;
  skill: number;
  specialization: number;
  talent: number;
}

export interface AttributeProgression {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  // Derived attributes that scale with core attributes
  maxHealthBonus: number;
  maxManaBonus: number;
  carryCapacityBonus: number;
}

export interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  cost: number;
  prerequisites: string[];
  effects: SkillNodeEffect[];
  position: { x: number; y: number };
  isUnlocked: boolean;
  isPurchased: boolean;
  category: SkillTreeCategory;
}

export type SkillTreeCategory = 'combat' | 'magic' | 'social' | 'utility' | 'crafting' | 'exploration';

export interface SkillNodeEffect {
  type: 'stat_bonus' | 'ability_unlock' | 'passive_effect' | 'combat_skill' | 'special_action';
  value: number | string;
  description: string;
  target?: string; // For stat bonuses, which stat to affect
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  category: SkillTreeCategory;
  nodes: SkillTreeNode[];
  layout: SkillTreeLayout;
  requiredClass?: string; // Optional class restriction
  requiredLevel?: number; // Minimum level to access
}

export interface SkillTreeLayout {
  width: number;
  height: number;
  connections: SkillTreeConnection[];
}

export interface SkillTreeConnection {
  fromNodeId: string;
  toNodeId: string;
  type: 'prerequisite' | 'synergy' | 'exclusive';
}

export interface CharacterSpecialization {
  id: string;
  name: string;
  description: string;
  category: SkillTreeCategory;
  unlockedAtLevel: number;
  bonuses: SpecializationBonus[];
  exclusiveWith?: string[]; // IDs of mutually exclusive specializations
  isActive: boolean;
  progressionLevel: number; // 0-5, how far into this specialization
}

export interface SpecializationBonus {
  type: 'stat_multiplier' | 'skill_cost_reduction' | 'unique_ability' | 'resource_bonus';
  value: number | string;
  description: string;
  appliesAtLevel: number; // Which progression level this bonus applies
}

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  prerequisites: string[];
  effects: TalentEffect[];
  isUnlocked: boolean;
  isPurchased: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface TalentEffect {
  type: 'passive_bonus' | 'active_ability' | 'conditional_effect' | 'resource_generation';
  value: number | string;
  description: string;
  condition?: string; // For conditional effects
}

export interface ProgressionMilestone {
  id: string;
  name: string;
  description: string;
  type: 'level' | 'skill_mastery' | 'quest_completion' | 'combat_achievement' | 'exploration';
  requirement: MilestoneRequirement;
  rewards: ProgressionReward[];
  isCompleted: boolean;
  completedAt?: string; // ISO timestamp
}

export interface MilestoneRequirement {
  type: 'reach_level' | 'purchase_skills' | 'complete_quest' | 'defeat_enemies' | 'discover_locations';
  value: number | string;
  details?: any; // Additional requirement details
}

export interface ProgressionReward {
  type: 'progression_points' | 'attribute_boost' | 'skill_unlock' | 'item_reward' | 'title';
  amount?: number;
  pointType?: ProgressionPointType;
  itemId?: string;
  skillId?: string;
  attributeName?: keyof AttributeProgression;
  title?: string;
  description: string;
}

// === ENHANCED ITEM SYSTEM ===

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'tool' | 'quest' | 'enhancement' | 'gem' | 'rune';
export type MaterialType = 'herb' | 'ore' | 'monster_part' | 'wood' | 'gem' | 'essence' | 'crystal' | 'fabric' | 'metal' | 'bone';
export type EnhancementType = 'upgrade_stone' | 'enchantment_scroll' | 'modification_kit' | 'repair_kit' | 'reforge_crystal';

export interface ItemEnhancement {
  level: number; // 0-10 enhancement level
  maxLevel: number;
  bonusStats: StatModifier[];
  enhancementCost: { itemId: string; quantity: number; currency?: number }[];
  failureChance: number; // 0-100, chance of failure
  destructionChance: number; // 0-100, chance of item destruction on failure
}

export interface ItemModificationSlot {
  id: string;
  type: 'gem' | 'rune' | 'attachment' | 'enchantment';
  slottedItemId?: string;
  restrictions?: string[]; // Allowed item types or specific item IDs
}

export interface ItemDurability {
  current: number;
  maximum: number;
  degradationRate: number; // How much durability lost per use
  repairCost: { itemId: string; quantity: number; currency?: number }[];
  brokenPenalty?: StatModifier[]; // Penalties when broken
}

export interface ItemSetBonus {
  setId: string;
  setName: string;
  requiredPieces: number;
  bonusEffects: ActiveEffect[];
  description: string;
}

export interface EnhancedItem extends Item {
  itemType: ItemType;
  enhancement?: ItemEnhancement;
  modificationSlots?: ItemModificationSlot[];
  durability?: ItemDurability;
  setId?: string; // For equipment sets
  setBonus?: ItemSetBonus;
  craftedBy?: string; // Player ID who crafted this item
  craftingQuality?: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork';
  uniqueProperties?: string[]; // Special properties that make this item unique
  tradeRestrictions?: 'bound' | 'account_bound' | 'tradeable';
}

export interface ResourceItem extends Item {
  resourceType: MaterialType;
  purity?: number; // 1-100, affects crafting outcomes
  harvestLocation?: string;
  renewalTime?: number; // Time in hours for resource to respawn
}

export interface CraftingRecipeIngredient {
  itemId: string;
  quantity: number;
  qualityRequired?: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork';
  alternatives?: string[]; // Alternative item IDs that can be used
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  category: 'alchemy' | 'smithing' | 'enchanting' | 'cooking' | 'tailoring' | 'woodworking' | 'jewelcrafting';
  ingredients: CraftingRecipeIngredient[];
  outputItemId: string;
  outputQuantity: number;
  requiredSkill?: { skillId: string; level: number };
  requiredStation?: string; // Crafting station ID
  craftingTime: number; // Time in seconds
  baseSuccessRate: number; // 0-100
  experienceGained: number;
  discovered?: boolean;
  teacherNPC?: string; // NPC who can teach this recipe
  unlockConditions?: string[]; // Quest completion, item discovery, etc.
}

// === CRAFTING STATIONS ===

export interface CraftingStation {
  id: string;
  name: string;
  description: string;
  type: 'alchemy_lab' | 'smithy' | 'enchanting_table' | 'cooking_fire' | 'tailoring_loom' | 'woodworking_bench' | 'jewelcrafting_table';
  level: number; // Station upgrade level
  availableRecipes: string[]; // Recipe IDs that can be crafted here
  bonuses: CraftingStationBonus[];
  requirements?: { skillId: string; level: number }[]; // Skills needed to use
  location?: string; // Where this station is located
  owned?: boolean; // Whether player owns this station
  upgradeCost?: { itemId: string; quantity: number; currency?: number }[];
}

export interface CraftingStationBonus {
  type: 'success_rate' | 'quality_chance' | 'speed' | 'material_efficiency' | 'experience';
  value: number;
  description: string;
  conditions?: string[]; // When this bonus applies
}

// === ITEM ENHANCEMENT SYSTEM ===

export interface EnhancementAttempt {
  itemId: string;
  enhancementMaterials: { itemId: string; quantity: number }[];
  successChance: number;
  failureConsequence: 'nothing' | 'level_loss' | 'destruction';
  bonusChance?: number; // Chance for extra enhancement level
}

export interface ItemSynergy {
  id: string;
  name: string;
  description: string;
  requiredItems: string[]; // Item IDs that must be equipped together
  synergyEffects: ActiveEffect[];
  conditionalBonuses?: ConditionalBonus[];
}

export interface ConditionalBonus {
  condition: 'low_health' | 'high_mana' | 'in_combat' | 'specific_enemy_type' | 'time_of_day' | 'location_type';
  threshold?: number; // For numeric conditions
  value?: string; // For string conditions
  effects: ActiveEffect[];
  description: string;
}

// === ITEM DISCOVERY AND EXPERIMENTATION ===

export interface ExperimentalCrafting {
  id: string;
  baseRecipeId?: string; // Optional base recipe to modify
  ingredients: CraftingRecipeIngredient[];
  discoveredRecipeId?: string; // Recipe discovered from this experiment
  successRate: number;
  possibleOutcomes: ExperimentOutcome[];
  experienceGained: number;
  costMultiplier: number; // Cost multiplier for experimental crafting
}

export interface ExperimentOutcome {
  itemId: string;
  quantity: number;
  chance: number; // 0-100
  quality?: 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork';
  discoversRecipe?: string; // Recipe ID that gets discovered
}

// === ITEM MAINTENANCE SYSTEM ===

export interface MaintenanceRequirement {
  frequency: number; // Hours between maintenance
  materials: { itemId: string; quantity: number }[];
  skillRequired?: { skillId: string; level: number };
  cost?: number; // Currency cost
  failurePenalty: StatModifier[]; // What happens if maintenance is skipped
}

export interface ItemCondition {
  current: 'pristine' | 'good' | 'worn' | 'damaged' | 'broken';
  effects: StatModifier[]; // Current condition effects
  maintenanceOverdue: boolean;
  lastMaintained?: number; // Timestamp
}

// === ENHANCED QUEST AND CHOICE SYSTEM ===

// Quest Branching System
export interface QuestBranch {
  id: string;
  name: string;
  description: string;
  condition: BranchCondition;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  consequences: QuestConsequence[];
  nextBranches: string[];
  exclusiveBranches?: string[]; // Branches that become unavailable if this is chosen
  timeLimit?: number; // Hours before branch becomes unavailable
  difficultyModifier?: number; // -5 to +5 difficulty adjustment
}

export interface BranchCondition {
  type: 'choice' | 'stat_check' | 'item_possession' | 'relationship_level' | 'faction_standing' | 'time_limit' | 'location' | 'previous_choice';
  value?: string | number;
  comparison?: 'equals' | 'greater_than' | 'less_than' | 'contains';
  targetId?: string; // NPC ID, faction ID, item ID, etc.
  description: string;
}

export interface QuestChoice {
  id: string;
  questId: string;
  branchId: string;
  choiceText: string;
  choiceDescription?: string;
  timestamp: string;
  turnId: string;
  consequences: QuestConsequence[];
  moralWeight?: 'good' | 'neutral' | 'evil' | 'complex';
  difficultyLevel?: number; // 1-10
  skillRequirements?: { skillId: string; level: number }[];
  alternativeOptions?: string[]; // Other choices that were available
}

export interface QuestConsequence {
  id: string;
  type: 'immediate' | 'delayed' | 'conditional' | 'permanent';
  category: 'relationship' | 'reputation' | 'world_state' | 'character_development' | 'story_progression' | 'resource' | 'opportunity' | 'moral';
  description: string;
  severity: 'trivial' | 'minor' | 'moderate' | 'major' | 'critical';
  manifestationDelay?: number; // Hours before consequence appears
  manifestationCondition?: BranchCondition;
  effects: ConsequenceEffect[];
  reversible: boolean;
  visibilityToPlayer: 'hidden' | 'hinted' | 'obvious';
}

export interface ConsequenceEffect {
  type: 'stat_change' | 'relationship_change' | 'faction_change' | 'world_fact_change' | 'quest_unlock' | 'quest_lock' | 'item_gain' | 'item_loss' | 'location_change' | 'npc_state_change';
  targetId?: string;
  value?: number | string;
  description: string;
  permanent: boolean;
}

export interface QuestPrerequisite {
  type: 'quest_completion' | 'level_requirement' | 'skill_requirement' | 'item_possession' | 'relationship_level' | 'faction_standing' | 'location_visit' | 'choice_made';
  targetId?: string;
  value?: number | string;
  description: string;
  optional?: boolean; // If true, quest can start without this but may be harder
}

export interface QuestTimeLimit {
  type: 'real_time' | 'game_time' | 'turn_based' | 'event_triggered';
  duration: number; // Hours, turns, or event count
  warningThreshold?: number; // When to warn player (percentage of time remaining)
  failureConsequences: QuestConsequence[];
  extensionConditions?: BranchCondition[];
}

export interface QuestFailureCondition {
  type: 'time_limit' | 'character_death' | 'item_loss' | 'relationship_threshold' | 'faction_hostility' | 'location_destruction' | 'npc_death';
  targetId?: string;
  threshold?: number;
  description: string;
  consequences: QuestConsequence[];
  recoverable: boolean; // Can the quest be restarted or continued?
}

export interface QuestSolution {
  id: string;
  name: string;
  description: string;
  approach: 'combat' | 'diplomacy' | 'stealth' | 'magic' | 'crafting' | 'exploration' | 'puzzle' | 'social' | 'economic';
  requirements: QuestPrerequisite[];
  difficulty: number; // 1-10
  consequences: QuestConsequence[];
  rewards: QuestRewards;
  exclusiveWith?: string[]; // Other solution IDs that become unavailable
}

export interface QuestDynamicElement {
  type: 'adaptive_difficulty' | 'procedural_objective' | 'emergent_consequence' | 'player_driven_outcome';
  description: string;
  triggers: BranchCondition[];
  effects: ConsequenceEffect[];
  adaptationRules?: AdaptationRule[];
}

export interface AdaptationRule {
  condition: BranchCondition;
  adaptation: 'increase_difficulty' | 'decrease_difficulty' | 'add_objective' | 'remove_objective' | 'change_reward' | 'add_consequence' | 'modify_time_limit';
  value?: number | string;
  description: string;
}

// Story Arc Branching System
export interface StoryArcBranch {
  id: string;
  name: string;
  description: string;
  unlockConditions: BranchCondition[];
  questSequence: string[]; // Quest IDs in order
  consequences: QuestConsequence[];
  exclusiveWith?: string[]; // Other branch IDs that become unavailable
  playerChoiceWeight: number; // 0-100, how much player choice influences this branch
  narrativeThemes: string[];
}

export interface StoryArcEnding {
  id: string;
  name: string;
  description: string;
  conditions: BranchCondition[];
  consequences: QuestConsequence[];
  epilogueText?: string;
  unlocksBranches?: string[]; // Future story arc branches this ending unlocks
  moralAlignment?: 'good' | 'neutral' | 'evil' | 'complex';
  satisfactionRating?: number; // 1-10, how satisfying this ending is
}

export interface StoryArcDecision {
  id: string;
  name: string;
  description: string;
  questId?: string; // Quest where this decision occurs
  turnId?: string; // Specific turn where decision was made
  choices: DecisionChoice[];
  consequences: QuestConsequence[];
  impactScope: 'local' | 'regional' | 'arc_wide' | 'global';
  reversible: boolean;
}

// === COMPREHENSIVE ARC PROGRESSION SYSTEM ===

export interface ArcProgression {
  currentPhase: ArcPhase;
  phaseProgress: number; // 0-100 percentage within current phase
  totalProgress: number; // 0-100 overall arc completion
  milestones: ArcMilestone[];
  criticalPath: ArcCriticalPath;
  playerChoiceHistory: ArcPlayerChoice[];
  progressionMetrics: ArcProgressionMetrics;
  adaptiveElements: ArcAdaptiveElement[];
}

export interface ArcPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  objectives: ArcObjective[];
  unlockConditions: BranchCondition[];
  completionCriteria: ArcCompletionCriteria[];
  estimatedDuration: number; // in turns/scenes
  difficultyModifier: number; // -3 to +3
  narrativeWeight: 'setup' | 'rising_action' | 'climax' | 'falling_action' | 'resolution';
  allowedBranches: string[]; // Which arc branches can be accessed from this phase
}

export interface ArcMilestone {
  id: string;
  name: string;
  description: string;
  phaseId: string;
  achievedAt?: string; // timestamp
  turnId?: string;
  significance: 'minor' | 'major' | 'critical' | 'legendary';
  rewards: ArcMilestoneReward[];
  unlocks: ArcUnlock[];
  consequences: QuestConsequence[];
  playerAgencyScore: number; // How much player choice contributed to achieving this
}

export interface ArcObjective {
  id: string;
  description: string;
  type: 'primary' | 'secondary' | 'optional' | 'hidden';
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'abandoned';
  progress: number; // 0-100
  requirements: ArcObjectiveRequirement[];
  rewards: ArcObjectiveReward[];
  timeLimit?: number; // in turns
  failureConsequences?: QuestConsequence[];
  alternativeSolutions: ArcAlternativeSolution[];
}

export interface ArcCriticalPath {
  requiredObjectives: string[]; // Objective IDs that must be completed
  optionalObjectives: string[]; // Objectives that enhance the experience but aren't required
  branchingPoints: ArcBranchingPoint[];
  failurePoints: ArcFailurePoint[];
  recoveryPaths: ArcRecoveryPath[];
}

export interface ArcPlayerChoice {
  id: string;
  turnId: string;
  timestamp: string;
  phaseId: string;
  choiceText: string;
  choiceDescription: string;
  alternatives: string[];
  consequences: QuestConsequence[];
  impactScope: 'phase' | 'arc' | 'global';
  moralAlignment: 'good' | 'neutral' | 'evil' | 'complex';
  difficultyInfluence: number; // How this choice affects arc difficulty
  agencyScore: number; // How much agency this choice provided (1-10)
  narrativeWeight: number; // How important this choice is to the story (1-10)
}

export interface ArcProgressionMetrics {
  totalChoicesMade: number;
  significantChoices: number;
  playerAgencyAverage: number; // Average agency score across all choices
  difficultyAdjustments: number; // How many times difficulty was adjusted
  objectivesCompleted: number;
  objectivesFailed: number;
  milestonesAchieved: number;
  branchesExplored: string[];
  timeSpent: number; // in turns
  efficiencyScore: number; // How efficiently player progressed (1-10)
}

export interface ArcAdaptiveElement {
  id: string;
  type: 'difficulty' | 'narrative' | 'objective' | 'reward' | 'consequence';
  trigger: BranchCondition;
  adaptation: ArcAdaptation;
  isActive: boolean;
  activatedAt?: string;
  description: string;
}

export interface ArcAdaptation {
  type: 'increase_difficulty' | 'decrease_difficulty' | 'add_objective' | 'remove_objective' |
        'modify_reward' | 'add_consequence' | 'change_narrative' | 'unlock_branch' | 'lock_branch';
  value?: number | string;
  targetId?: string; // ID of objective, branch, etc. being modified
  description: string;
  duration?: number; // How long this adaptation lasts (in turns)
}

// === ARC DIFFICULTY SYSTEM ===

export interface ArcDifficultySettings {
  baseDifficulty: number; // 1-10 scale
  currentDifficulty: number; // Dynamically adjusted
  adaptiveScaling: boolean;
  playerPerformanceWeight: number; // How much player performance affects difficulty (0-1)
  difficultyFactors: ArcDifficultyFactor[];
  scalingRules: ArcDifficultyScalingRule[];
  difficultyHistory: ArcDifficultyAdjustment[];
}

export interface ArcDifficultyFactor {
  factor: 'player_level' | 'success_rate' | 'time_taken' | 'choices_made' | 'resources_available' | 'relationship_scores';
  weight: number; // How much this factor influences difficulty (0-1)
  currentValue: number;
  targetRange: { min: number; max: number };
}

export interface ArcDifficultyScalingRule {
  condition: BranchCondition;
  adjustment: number; // -3 to +3 difficulty adjustment
  reason: string;
  priority: number; // Higher priority rules override lower ones
}

export interface ArcDifficultyAdjustment {
  timestamp: string;
  turnId: string;
  oldDifficulty: number;
  newDifficulty: number;
  reason: string;
  triggeredBy: string; // What caused this adjustment
}

// === ARC PLAYER AGENCY SYSTEM ===

export interface ArcPlayerAgencyMetrics {
  overallAgencyScore: number; // 0-100
  choiceQuality: ArcChoiceQuality;
  impactfulDecisions: number;
  meaningfulAlternatives: number;
  playerInitiatedActions: number;
  agencyTrends: ArcAgencyTrend[];
  constraintFactors: ArcConstraintFactor[];
}

export interface ArcChoiceQuality {
  averageAlternatives: number; // Average number of meaningful alternatives per choice
  consequenceClarity: number; // How clear consequences were (1-10)
  choiceRelevance: number; // How relevant choices were to player goals (1-10)
  moralComplexity: number; // Average moral complexity of choices (1-10)
  strategicDepth: number; // How much strategic thinking choices required (1-10)
}

export interface ArcAgencyTrend {
  phaseId: string;
  agencyScore: number;
  choiceCount: number;
  significantChoices: number;
  playerSatisfaction: number; // Estimated based on choice patterns
}

export interface ArcConstraintFactor {
  type: 'resource' | 'time' | 'relationship' | 'knowledge' | 'ability' | 'external';
  severity: number; // 1-10, how much this constrains player choices
  description: string;
  isActive: boolean;
  mitigationOptions: string[];
}

// === ARC STATE TRACKING SYSTEM ===

export interface ArcStateTracking {
  currentState: ArcState;
  stateHistory: ArcStateSnapshot[];
  persistentEffects: ArcPersistentEffect[];
  environmentalChanges: ArcEnvironmentalChange[];
  relationshipEvolution: ArcRelationshipEvolution[];
  worldStateModifications: ArcWorldStateModification[];
  narrativeThreads: ArcNarrativeThread[];
}

export interface ArcState {
  phaseId: string;
  activeObjectives: string[];
  availableBranches: string[];
  lockedContent: string[];
  unlockedContent: string[];
  temporaryModifiers: ArcTemporaryModifier[];
  flags: Record<string, boolean>;
  variables: Record<string, number | string>;
}

export interface ArcStateSnapshot {
  timestamp: string;
  turnId: string;
  state: ArcState;
  triggerEvent: string;
  description: string;
}

export interface ArcPersistentEffect {
  id: string;
  name: string;
  description: string;
  type: 'character' | 'world' | 'relationship' | 'faction' | 'location' | 'item';
  targetId: string;
  effect: ConsequenceEffect;
  startedAt: string;
  duration: 'permanent' | 'arc_duration' | 'phase_duration' | number; // number = turns
  magnitude: number; // 1-10
  isActive: boolean;
}

export interface ArcEnvironmentalChange {
  locationId: string;
  changeType: 'physical' | 'atmospheric' | 'population' | 'resources' | 'accessibility';
  description: string;
  magnitude: number; // 1-10
  permanence: 'temporary' | 'arc_duration' | 'permanent';
  visualDescription?: string;
  mechanicalEffects: ConsequenceEffect[];
}

export interface ArcRelationshipEvolution {
  npcId: string;
  relationshipType: 'romantic' | 'friendship' | 'rivalry' | 'mentorship' | 'family' | 'professional';
  evolutionPath: ArcRelationshipMilestone[];
  currentStage: string;
  projectedOutcome: string;
  influencingFactors: string[];
}

export interface ArcRelationshipMilestone {
  stage: string;
  description: string;
  achievedAt?: string;
  requirements: BranchCondition[];
  effects: ConsequenceEffect[];
  unlocks: string[]; // What this milestone unlocks
}

export interface ArcWorldStateModification {
  aspect: 'politics' | 'economy' | 'culture' | 'technology' | 'magic' | 'geography' | 'history';
  description: string;
  scope: 'local' | 'regional' | 'national' | 'global';
  magnitude: number; // 1-10
  permanence: 'temporary' | 'arc_duration' | 'permanent';
  rippleEffects: string[];
}

export interface ArcNarrativeThread {
  id: string;
  name: string;
  description: string;
  category: 'main_plot' | 'character_development' | 'world_building' | 'relationship' | 'mystery' | 'conflict';
  status: 'dormant' | 'active' | 'escalating' | 'resolving' | 'resolved' | 'abandoned';
  priority: number; // 1-10
  connectedThreads: string[];
  keyEvents: ArcNarrativeEvent[];
  projectedResolution: string;
  playerInfluence: number; // 0-100, how much player can influence this thread
}

export interface ArcNarrativeEvent {
  turnId: string;
  description: string;
  impact: 'minor' | 'moderate' | 'major' | 'critical';
  consequences: string[];
  playerInvolvement: 'observer' | 'participant' | 'catalyst' | 'director';
}

export interface ArcTemporaryModifier {
  id: string;
  name: string;
  description: string;
  type: 'buff' | 'debuff' | 'neutral';
  target: 'character' | 'environment' | 'npcs' | 'quests';
  effect: ConsequenceEffect;
  duration: number; // in turns
  remainingDuration: number;
  source: string;
}

// === ARC SYSTEM INTEGRATION ===

export interface ArcSystemIntegration {
  combatIntegration: ArcCombatIntegration;
  progressionIntegration: ArcProgressionIntegration;
  questIntegration: ArcQuestIntegration;
  inventoryIntegration: ArcInventoryIntegration;
  relationshipIntegration: ArcRelationshipIntegration;
}

export interface ArcCombatIntegration {
  combatScaling: ArcCombatScaling;
  narrativeCombat: ArcNarrativeCombat[];
  combatConsequences: ArcCombatConsequence[];
  tacticalElements: ArcTacticalElement[];
}

export interface ArcCombatScaling {
  baseEnemyLevel: number;
  scalingFactor: number; // How much enemy level scales with arc difficulty
  specialEncounters: ArcSpecialEncounter[];
  environmentalHazards: ArcEnvironmentalHazard[];
}

export interface ArcSpecialEncounter {
  id: string;
  name: string;
  description: string;
  triggerConditions: BranchCondition[];
  enemyConfiguration: any; // Would reference combat system types
  narrativeContext: string;
  victoryConsequences: QuestConsequence[];
  defeatConsequences: QuestConsequence[];
  alternativeResolutions: ArcAlternativeResolution[];
}

export interface ArcNarrativeCombat {
  combatId: string;
  narrativeContext: string;
  storyImportance: 'minor' | 'moderate' | 'major' | 'climactic';
  preConditions: string[];
  postConditions: string[];
  characterDevelopmentOpportunities: string[];
}

export interface ArcCombatConsequence {
  combatOutcome: 'victory' | 'defeat' | 'retreat' | 'negotiation';
  arcImpact: ArcImpact;
  narrativeChanges: string[];
  relationshipEffects: ConsequenceEffect[];
  worldStateChanges: ConsequenceEffect[];
}

export interface ArcProgressionIntegration {
  experienceScaling: ArcExperienceScaling;
  skillUnlocks: ArcSkillUnlock[];
  attributeRequirements: ArcAttributeRequirement[];
  specializationOpportunities: ArcSpecializationOpportunity[];
  progressionGates: ArcProgressionGate[];
}

export interface ArcExperienceScaling {
  baseExperienceMultiplier: number;
  difficultyBonus: number;
  choiceQualityBonus: number;
  milestoneExperience: Record<string, number>; // milestone ID -> experience
  phaseCompletionBonus: number;
}

export interface ArcSkillUnlock {
  skillId: string;
  unlockConditions: BranchCondition[];
  narrativeJustification: string;
  teacherNpcId?: string;
  unlockMethod: 'automatic' | 'choice' | 'discovery' | 'training';
}

export interface ArcAttributeRequirement {
  objectiveId: string;
  requiredAttributes: Record<string, number>;
  alternativeRequirements?: Record<string, number>[];
  failureConsequences: QuestConsequence[];
  successBonuses: ArcObjectiveReward[];
}

export interface ArcSpecializationOpportunity {
  specializationId: string;
  unlockConditions: BranchCondition[];
  narrativeContext: string;
  mentorNpcId?: string;
  requirements: ArcSpecializationRequirement[];
}

export interface ArcProgressionGate {
  id: string;
  description: string;
  requiredLevel: number;
  requiredSkills: string[];
  requiredAttributes: Record<string, number>;
  alternativeUnlocks: BranchCondition[];
  blockedContent: string[];
  unlockRewards: ArcObjectiveReward[];
}

export interface ArcQuestIntegration {
  questGeneration: ArcQuestGeneration;
  questModification: ArcQuestModification[];
  questChaining: ArcQuestChaining;
  dynamicObjectives: ArcDynamicObjective[];
}

export interface ArcQuestGeneration {
  generationTriggers: ArcQuestGenerationTrigger[];
  questTemplates: ArcQuestTemplate[];
  adaptiveGeneration: boolean;
  playerPreferenceWeight: number; // 0-1
}

export interface ArcQuestGenerationTrigger {
  condition: BranchCondition;
  questType: 'main' | 'side' | 'personal' | 'faction' | 'exploration' | 'combat';
  priority: number;
  cooldown: number; // turns before this trigger can fire again
}

export interface ArcQuestTemplate {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'personal' | 'faction' | 'exploration' | 'combat';
  adaptableElements: ArcAdaptableQuestElement[];
  requirements: BranchCondition[];
  rewards: ArcObjectiveReward[];
}

export interface ArcAdaptableQuestElement {
  element: 'objective' | 'location' | 'npc' | 'item' | 'enemy' | 'reward';
  adaptationRules: ArcAdaptationRule[];
  fallbackOptions: string[];
}

export interface ArcAdaptationRule {
  condition: BranchCondition;
  modification: string;
  priority: number;
}

export interface ArcQuestModification {
  questId: string;
  modificationType: 'difficulty' | 'objective' | 'reward' | 'time_limit' | 'requirements';
  trigger: BranchCondition;
  modification: any; // Specific to modification type
  reversible: boolean;
}

export interface ArcQuestChaining {
  chainId: string;
  questSequence: string[];
  branchingPoints: ArcQuestBranchingPoint[];
  convergencePoints: ArcQuestConvergencePoint[];
  alternativePaths: ArcQuestAlternativePath[];
}

export interface ArcDynamicObjective {
  id: string;
  baseObjective: string;
  adaptationTriggers: BranchCondition[];
  possibleAdaptations: ArcObjectiveAdaptation[];
  playerChoiceInfluence: number; // 0-100
}

// === ARC FAILURE RECOVERY SYSTEM ===

export interface ArcFailureRecoverySystem {
  failureDetection: ArcFailureDetection;
  recoveryOptions: ArcRecoveryOption[];
  failureConsequences: ArcFailureConsequence[];
  learningSystem: ArcLearningSystem;
  adaptiveSupport: ArcAdaptiveSupport;
}

export interface ArcFailureDetection {
  failureThresholds: ArcFailureThreshold[];
  warningSystem: ArcWarningSystem;
  monitoredMetrics: ArcMonitoredMetric[];
  escalationRules: ArcEscalationRule[];
}

export interface ArcFailureThreshold {
  metric: 'objective_failures' | 'time_exceeded' | 'resource_depletion' | 'relationship_breakdown' | 'player_frustration';
  threshold: number;
  severity: 'warning' | 'concern' | 'critical' | 'failure';
  action: 'monitor' | 'warn_player' | 'offer_help' | 'trigger_recovery';
}

export interface ArcWarningSystem {
  warningTypes: ArcWarningType[];
  deliveryMethods: ArcWarningDelivery[];
  playerResponseTracking: boolean;
}

export interface ArcWarningType {
  type: 'difficulty_spike' | 'resource_shortage' | 'time_pressure' | 'relationship_risk' | 'objective_risk';
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  suggestedActions: string[];
}

export interface ArcRecoveryOption {
  id: string;
  name: string;
  description: string;
  triggerConditions: BranchCondition[];
  recoveryType: 'guidance' | 'resource_boost' | 'difficulty_reduction' | 'alternative_path' | 'narrative_intervention';
  cost: ArcRecoveryCost;
  effectiveness: number; // 0-100
  narrativeIntegration: string;
  playerChoiceRequired: boolean;
}

export interface ArcRecoveryCost {
  type: 'none' | 'experience' | 'currency' | 'reputation' | 'time' | 'narrative_consequence';
  amount: number;
  description: string;
}

export interface ArcFailureConsequence {
  failureType: string;
  immediateEffects: ConsequenceEffect[];
  longTermEffects: ConsequenceEffect[];
  narrativeImpact: string;
  recoveryDifficulty: number; // 1-10
  permanentChanges: ArcPermanentChange[];
}

export interface ArcLearningSystem {
  playerPatternTracking: ArcPlayerPattern[];
  adaptiveHints: ArcAdaptiveHint[];
  skillGapIdentification: ArcSkillGap[];
  improvementSuggestions: ArcImprovementSuggestion[];
}

export interface ArcPlayerPattern {
  pattern: 'rushes_objectives' | 'overthinks_choices' | 'avoids_combat' | 'ignores_relationships' | 'resource_hoarder';
  frequency: number;
  impact: 'positive' | 'neutral' | 'negative';
  suggestedAdjustments: string[];
}

export interface ArcAdaptiveHint {
  situation: string;
  hint: string;
  timing: 'immediate' | 'delayed' | 'contextual';
  effectiveness: number; // How helpful this hint typically is
}

export interface ArcSkillGap {
  skill: 'tactical_thinking' | 'resource_management' | 'relationship_building' | 'strategic_planning' | 'risk_assessment';
  currentLevel: number; // 1-10
  requiredLevel: number;
  improvementMethods: string[];
}

export interface ArcAdaptiveSupport {
  supportLevel: 'minimal' | 'moderate' | 'high' | 'maximum';
  supportTypes: ArcSupportType[];
  playerPreferences: ArcPlayerSupportPreference[];
  effectivenessTracking: ArcSupportEffectiveness[];
}

export interface ArcSupportType {
  type: 'tutorial_reminders' | 'strategic_advice' | 'resource_highlights' | 'consequence_previews' | 'alternative_suggestions';
  isActive: boolean;
  frequency: 'always' | 'when_struggling' | 'on_request' | 'contextual';
}

export interface ArcPlayerSupportPreference {
  supportType: string;
  preference: 'always' | 'sometimes' | 'rarely' | 'never';
  lastUpdated: string;
}

export interface ArcSupportEffectiveness {
  supportType: string;
  timesOffered: number;
  timesAccepted: number;
  successRate: number; // How often it helped
  playerSatisfaction: number; // 1-10
}

// === ARC NARRATIVE DEPTH SYSTEM ===

export interface ArcNarrativeDepth {
  layeredStorytelling: ArcLayeredStorytelling;
  characterDevelopment: ArcCharacterDevelopment;
  worldBuilding: ArcWorldBuilding;
  thematicElements: ArcThematicElements;
  emotionalJourney: ArcEmotionalJourney;
}

export interface ArcLayeredStorytelling {
  surfaceNarrative: string;
  subtext: string[];
  hiddenMeanings: string[];
  symbolism: ArcSymbolism[];
  foreshadowing: ArcForeshadowing[];
  callbacks: ArcCallback[];
}

export interface ArcSymbolism {
  symbol: string;
  meaning: string;
  appearances: ArcSymbolAppearance[];
  playerDiscovery: boolean;
}

export interface ArcSymbolAppearance {
  turnId: string;
  context: string;
  prominence: 'subtle' | 'noticeable' | 'obvious';
  playerReaction?: string;
}

export interface ArcForeshadowing {
  event: string;
  foreshadowingElements: ArcForeshadowingElement[];
  payoffTurnId?: string;
  playerPrediction?: string;
}

export interface ArcForeshadowingElement {
  turnId: string;
  element: string;
  subtlety: 'very_subtle' | 'subtle' | 'moderate' | 'obvious';
  playerNoticed: boolean;
}

export interface ArcCallback {
  originalEvent: string;
  originalTurnId: string;
  callbackEvent: string;
  callbackTurnId: string;
  connectionStrength: 'weak' | 'moderate' | 'strong';
  playerRecognition: boolean;
}

export interface ArcCharacterDevelopment {
  developmentArcs: ArcCharacterDevelopmentArc[];
  relationshipEvolution: ArcRelationshipEvolution[];
  personalGrowth: ArcPersonalGrowth[];
  internalConflicts: ArcInternalConflict[];
}

export interface ArcCharacterDevelopmentArc {
  characterId: string;
  developmentType: 'growth' | 'decline' | 'transformation' | 'revelation' | 'redemption' | 'corruption';
  startingState: string;
  currentState: string;
  targetState: string;
  keyMoments: ArcCharacterMoment[];
  playerInfluence: number; // 0-100
}

export interface ArcCharacterMoment {
  turnId: string;
  momentType: 'realization' | 'decision' | 'confrontation' | 'growth' | 'setback' | 'breakthrough';
  description: string;
  impact: 'minor' | 'moderate' | 'major' | 'transformative';
  playerRole: 'observer' | 'catalyst' | 'supporter' | 'challenger';
}

export interface ArcPersonalGrowth {
  aspect: 'confidence' | 'wisdom' | 'empathy' | 'courage' | 'leadership' | 'humility' | 'resilience';
  startingLevel: number; // 1-10
  currentLevel: number;
  growthEvents: ArcGrowthEvent[];
  growthChallenges: ArcGrowthChallenge[];
}

export interface ArcGrowthEvent {
  turnId: string;
  description: string;
  growthAmount: number;
  triggerType: 'choice' | 'experience' | 'reflection' | 'challenge' | 'relationship';
}

export interface ArcGrowthChallenge {
  challenge: string;
  requiredLevel: number;
  rewards: ArcObjectiveReward[];
  failureConsequences: QuestConsequence[];
}

export interface ArcInternalConflict {
  conflictType: 'moral_dilemma' | 'identity_crisis' | 'loyalty_conflict' | 'fear_vs_duty' | 'desire_vs_responsibility';
  description: string;
  intensity: number; // 1-10
  resolutionPath: ArcConflictResolution[];
  playerChoicesInfluence: number; // 0-100
}

export interface ArcConflictResolution {
  approach: 'acceptance' | 'compromise' | 'transformation' | 'suppression' | 'integration';
  requirements: BranchCondition[];
  consequences: QuestConsequence[];
  narrativeOutcome: string;
}

// === ADDITIONAL ARC HELPER INTERFACES ===

export interface ArcCompletionCriteria {
  type: 'all_objectives' | 'primary_objectives' | 'milestone_reached' | 'choice_made' | 'time_elapsed' | 'custom';
  requirements: BranchCondition[];
  description: string;
  priority: number;
}

export interface ArcMilestoneReward {
  type: 'experience' | 'currency' | 'item' | 'skill' | 'relationship' | 'unlock' | 'narrative';
  value: number | string;
  description: string;
}

export interface ArcUnlock {
  type: 'quest' | 'location' | 'npc' | 'skill' | 'item' | 'branch' | 'ending';
  targetId: string;
  description: string;
}

export interface ArcObjectiveRequirement {
  type: 'item' | 'location' | 'npc_interaction' | 'combat_victory' | 'choice' | 'skill_check' | 'time_limit';
  targetId?: string;
  value?: number | string;
  description: string;
}

export interface ArcObjectiveReward {
  type: 'experience' | 'currency' | 'item' | 'skill_point' | 'relationship' | 'unlock';
  value: number | string;
  description: string;
}

export interface ArcAlternativeSolution {
  id: string;
  description: string;
  requirements: BranchCondition[];
  difficulty: number; // 1-10
  rewards: ArcObjectiveReward[];
  narrativeDescription: string;
}

export interface ArcBranchingPoint {
  id: string;
  name: string;
  description: string;
  phaseId: string;
  choices: ArcBranchChoice[];
  consequences: QuestConsequence[];
  reversible: boolean;
}

export interface ArcBranchChoice {
  id: string;
  text: string;
  description: string;
  requirements: BranchCondition[];
  leads_to_branch: string;
  difficulty_modifier: number;
  narrative_weight: number;
}

export interface ArcFailurePoint {
  id: string;
  description: string;
  trigger: BranchCondition;
  severity: 'minor' | 'major' | 'critical' | 'arc_ending';
  recovery_options: string[];
  consequences: QuestConsequence[];
}

export interface ArcRecoveryPath {
  id: string;
  name: string;
  description: string;
  from_failure_point: string;
  requirements: BranchCondition[];
  difficulty: number;
  narrative_cost: string;
  success_rate: number;
}

export interface ArcImpact {
  scope: 'local' | 'regional' | 'arc_wide' | 'global';
  magnitude: number; // 1-10
  duration: 'temporary' | 'arc_duration' | 'permanent';
  description: string;
}

export interface ArcAlternativeResolution {
  id: string;
  name: string;
  description: string;
  requirements: BranchCondition[];
  consequences: QuestConsequence[];
  narrative_outcome: string;
}

export interface ArcEnvironmentalHazard {
  id: string;
  name: string;
  description: string;
  type: 'physical' | 'magical' | 'psychological' | 'social' | 'temporal';
  severity: number; // 1-10
  effects: ConsequenceEffect[];
  mitigation_options: string[];
}

export interface ArcTacticalElement {
  id: string;
  name: string;
  description: string;
  type: 'terrain' | 'objective' | 'time_pressure' | 'resource' | 'information';
  impact: ConsequenceEffect[];
  player_options: string[];
}

export interface ArcSpecializationRequirement {
  type: 'attribute' | 'skill' | 'quest_completion' | 'relationship' | 'choice_history';
  targetId?: string;
  value: number | string;
  description: string;
}

export interface ArcQuestBranchingPoint {
  questId: string;
  branchCondition: BranchCondition;
  alternativeQuests: string[];
  convergenceQuestId?: string;
}

export interface ArcQuestConvergencePoint {
  questId: string;
  convergingQuests: string[];
  requirements: BranchCondition[];
  narrative_resolution: string;
}

export interface ArcQuestAlternativePath {
  pathId: string;
  questSequence: string[];
  requirements: BranchCondition[];
  difficulty_modifier: number;
  unique_rewards: ArcObjectiveReward[];
}

export interface ArcObjectiveAdaptation {
  adaptationType: 'difficulty' | 'requirements' | 'rewards' | 'narrative' | 'time_limit';
  modification: any;
  trigger: BranchCondition;
  description: string;
}

export interface ArcInventoryIntegration {
  keyItems: ArcKeyItem[];
  resourceRequirements: ArcResourceRequirement[];
  craftingOpportunities: ArcCraftingOpportunity[];
  equipmentProgression: ArcEquipmentProgression[];
}

export interface ArcKeyItem {
  itemId: string;
  narrativeImportance: 'minor' | 'moderate' | 'major' | 'critical';
  unlockConditions: BranchCondition[];
  usageContexts: ArcItemUsageContext[];
  consequences: QuestConsequence[];
}

export interface ArcResourceRequirement {
  phaseId: string;
  resourceType: 'currency' | 'materials' | 'consumables' | 'equipment';
  amount: number;
  purpose: string;
  alternatives: ArcResourceAlternative[];
}

export interface ArcResourceAlternative {
  description: string;
  requirements: BranchCondition[];
  efficiency: number; // 0-100, how well this alternative works
}

export interface ArcCraftingOpportunity {
  itemId: string;
  unlockConditions: BranchCondition[];
  narrativeContext: string;
  teacherNpcId?: string;
  requirements: ArcCraftingRequirement[];
}

export interface ArcCraftingRequirement {
  type: 'skill' | 'materials' | 'location' | 'time' | 'guidance';
  value: number | string;
  description: string;
}

export interface ArcEquipmentProgression {
  equipmentType: 'weapon' | 'armor' | 'accessory' | 'tool';
  progressionPath: ArcEquipmentTier[];
  unlockMethods: ArcEquipmentUnlock[];
}

export interface ArcEquipmentTier {
  tier: number;
  itemIds: string[];
  unlockConditions: BranchCondition[];
  narrativeJustification: string;
}

export interface ArcEquipmentUnlock {
  method: 'quest_reward' | 'purchase' | 'crafting' | 'discovery' | 'gift';
  requirements: BranchCondition[];
  narrativeContext: string;
}

export interface ArcItemUsageContext {
  context: string;
  effects: ConsequenceEffect[];
  narrative_description: string;
  consumption: boolean;
}

export interface ArcRelationshipIntegration {
  keyRelationships: ArcKeyRelationship[];
  relationshipGates: ArcRelationshipGate[];
  socialDynamics: ArcSocialDynamic[];
  emotionalBeats: ArcEmotionalBeat[];
}

export interface ArcKeyRelationship {
  npcId: string;
  importance: 'minor' | 'moderate' | 'major' | 'critical';
  developmentPath: ArcRelationshipDevelopmentPath;
  conflictPotential: ArcRelationshipConflict[];
  resolutionOpportunities: ArcRelationshipResolution[];
}

export interface ArcRelationshipDevelopmentPath {
  stages: ArcRelationshipStage[];
  currentStage: string;
  influencingFactors: ArcRelationshipFactor[];
  milestones: ArcRelationshipMilestone[];
}

export interface ArcRelationshipStage {
  id: string;
  name: string;
  description: string;
  requirements: BranchCondition[];
  duration: number; // estimated turns
  interactions: ArcRelationshipInteraction[];
}

export interface ArcRelationshipFactor {
  factor: 'player_choices' | 'quest_outcomes' | 'combat_performance' | 'gift_giving' | 'time_spent' | 'shared_experiences';
  weight: number; // 0-1
  current_value: number;
  target_range: { min: number; max: number };
}

export interface ArcRelationshipInteraction {
  type: 'dialogue' | 'quest' | 'combat_support' | 'gift' | 'conflict' | 'bonding';
  frequency: 'rare' | 'occasional' | 'regular' | 'frequent';
  impact: number; // -10 to +10
  requirements: BranchCondition[];
}

export interface ArcRelationshipConflict {
  conflictType: 'ideological' | 'personal' | 'professional' | 'romantic' | 'family' | 'loyalty';
  severity: number; // 1-10
  triggers: BranchCondition[];
  resolution_paths: ArcConflictResolution[];
}

export interface ArcRelationshipResolution {
  resolution_type: 'reconciliation' | 'compromise' | 'separation' | 'transformation' | 'acceptance';
  requirements: BranchCondition[];
  consequences: QuestConsequence[];
  narrative_outcome: string;
}

export interface ArcRelationshipGate {
  gateId: string;
  description: string;
  requiredRelationships: Record<string, number>; // npcId -> relationship score
  blockedContent: string[];
  unlockRewards: ArcObjectiveReward[];
}

export interface ArcSocialDynamic {
  dynamicType: 'group_harmony' | 'leadership_emergence' | 'faction_formation' | 'social_hierarchy' | 'cultural_exchange';
  participants: string[]; // NPC IDs
  currentState: string;
  influencingFactors: string[];
  player_influence: number; // 0-100
}

export interface ArcEmotionalBeat {
  beatType: 'joy' | 'sorrow' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'anticipation' | 'trust';
  intensity: number; // 1-10
  trigger: BranchCondition;
  duration: number; // in turns
  narrative_description: string;
  player_response_options: string[];
}

export interface ArcWorldBuilding {
  worldStateChanges: ArcWorldStateChange[];
  culturalEvolution: ArcCulturalEvolution[];
  politicalShifts: ArcPoliticalShift[];
  economicImpacts: ArcEconomicImpact[];
  technologicalProgress: ArcTechnologicalProgress[];
}

export interface ArcWorldStateChange {
  aspect: 'geography' | 'climate' | 'population' | 'infrastructure' | 'resources' | 'magic' | 'technology';
  change_description: string;
  scope: 'local' | 'regional' | 'national' | 'continental' | 'global';
  permanence: 'temporary' | 'arc_duration' | 'permanent';
  player_contribution: number; // 0-100
}

export interface ArcCulturalEvolution {
  culture_aspect: 'traditions' | 'beliefs' | 'values' | 'practices' | 'language' | 'arts' | 'social_norms';
  evolution_type: 'gradual_change' | 'sudden_shift' | 'revival' | 'synthesis' | 'conflict';
  affected_groups: string[];
  player_influence: number; // 0-100
}

export interface ArcPoliticalShift {
  shift_type: 'leadership_change' | 'policy_reform' | 'alliance_formation' | 'conflict_emergence' | 'power_redistribution';
  affected_factions: string[];
  magnitude: number; // 1-10
  player_involvement: 'observer' | 'influencer' | 'catalyst' | 'leader';
}

export interface ArcEconomicImpact {
  impact_type: 'trade_route_change' | 'resource_discovery' | 'market_disruption' | 'currency_change' | 'economic_boom_bust';
  affected_regions: string[];
  magnitude: number; // 1-10
  duration: 'short_term' | 'medium_term' | 'long_term' | 'permanent';
}

export interface ArcTechnologicalProgress {
  technology_type: 'magical' | 'mechanical' | 'alchemical' | 'architectural' | 'agricultural' | 'military' | 'communication';
  advancement_level: number; // 1-10
  adoption_rate: 'slow' | 'moderate' | 'rapid' | 'revolutionary';
  social_impact: string;
}

export interface ArcThematicElements {
  primaryThemes: ArcTheme[];
  thematicProgression: ArcThematicProgression[];
  symbolism: ArcSymbolism[];
  motifs: ArcMotif[];
}

export interface ArcTheme {
  theme: 'redemption' | 'sacrifice' | 'growth' | 'identity' | 'power' | 'love' | 'justice' | 'freedom' | 'responsibility' | 'forgiveness';
  prominence: 'subtle' | 'moderate' | 'prominent' | 'central';
  exploration_methods: string[];
  player_engagement: number; // 0-100
}

export interface ArcThematicProgression {
  theme: string;
  progression_stages: ArcThemeStage[];
  current_stage: string;
  player_understanding: number; // 0-100
}

export interface ArcThemeStage {
  stage: 'introduction' | 'exploration' | 'challenge' | 'climax' | 'resolution';
  description: string;
  narrative_elements: string[];
  player_choices_impact: number; // 0-100
}

export interface ArcMotif {
  motif: string;
  appearances: ArcMotifAppearance[];
  significance: string;
  player_recognition: boolean;
}

export interface ArcMotifAppearance {
  turnId: string;
  context: string;
  prominence: 'background' | 'noticeable' | 'prominent';
  variation: string;
}

export interface ArcEmotionalJourney {
  emotionalArc: ArcEmotionalArc;
  emotionalBeats: ArcEmotionalBeat[];
  catharticMoments: ArcCatharticMoment[];
  emotionalResonance: ArcEmotionalResonance[];
}

export interface ArcEmotionalArc {
  startingEmotion: string;
  targetEmotion: string;
  currentEmotion: string;
  progression_path: ArcEmotionalProgression[];
  intensity_curve: ArcIntensityCurve[];
}

export interface ArcEmotionalProgression {
  phase: string;
  emotion: string;
  intensity: number; // 1-10
  triggers: string[];
  duration: number; // in turns
}

export interface ArcIntensityCurve {
  phaseId: string;
  intensity_points: ArcIntensityPoint[];
  peak_moments: string[];
  valley_moments: string[];
}

export interface ArcIntensityPoint {
  turnId: string;
  intensity: number; // 1-10
  emotion: string;
  trigger: string;
}

export interface ArcCatharticMoment {
  momentId: string;
  description: string;
  emotional_release: string;
  buildup_events: string[];
  player_role: 'observer' | 'participant' | 'catalyst';
  impact: number; // 1-10
}

export interface ArcEmotionalResonance {
  emotion: string;
  resonance_strength: number; // 1-10
  player_connection: number; // 0-100
  lasting_impact: 'none' | 'minor' | 'moderate' | 'major' | 'transformative';
}

export interface ArcPermanentChange {
  changeType: 'character_trait' | 'world_state' | 'relationship' | 'ability' | 'knowledge' | 'reputation';
  description: string;
  magnitude: number; // 1-10
  visibility: 'hidden' | 'subtle' | 'noticeable' | 'obvious';
}

// === ARC SYSTEM INTEGRATION ===

export interface ArcSystemIntegration {
  combatIntegration: ArcCombatIntegration;
  progressionIntegration: ArcProgressionIntegration;
  questIntegration: ArcQuestIntegration;
  inventoryIntegration: ArcInventoryIntegration;
  relationshipIntegration: ArcRelationshipIntegration;
}

export interface ArcCombatIntegration {
  combatScaling: ArcCombatScaling;
  narrativeCombat: ArcNarrativeCombat[];
  combatConsequences: ArcCombatConsequence[];
  tacticalElements: ArcTacticalElement[];
}

export interface ArcCombatScaling {
  baseEnemyLevel: number;
  scalingFactor: number; // How much enemy level scales with arc difficulty
  specialEncounters: ArcSpecialEncounter[];
  environmentalHazards: ArcEnvironmentalHazard[];
}

export interface ArcSpecialEncounter {
  id: string;
  name: string;
  description: string;
  triggerConditions: BranchCondition[];
  enemyConfiguration: any; // Would reference combat system types
  narrativeContext: string;
  victoryConsequences: QuestConsequence[];
  defeatConsequences: QuestConsequence[];
  alternativeResolutions: ArcAlternativeResolution[];
}

export interface ArcNarrativeCombat {
  combatId: string;
  narrativeContext: string;
  storyImportance: 'minor' | 'moderate' | 'major' | 'climactic';
  preConditions: string[];
  postConditions: string[];
  characterDevelopmentOpportunities: string[];
}

export interface ArcCombatConsequence {
  combatOutcome: 'victory' | 'defeat' | 'retreat' | 'negotiation';
  arcImpact: ArcImpact;
  narrativeChanges: string[];
  relationshipEffects: ConsequenceEffect[];
  worldStateChanges: ConsequenceEffect[];
}

export interface ArcProgressionIntegration {
  experienceScaling: ArcExperienceScaling;
  skillUnlocks: ArcSkillUnlock[];
  attributeRequirements: ArcAttributeRequirement[];
  specializationOpportunities: ArcSpecializationOpportunity[];
  progressionGates: ArcProgressionGate[];
}

export interface ArcExperienceScaling {
  baseExperienceMultiplier: number;
  difficultyBonus: number;
  choiceQualityBonus: number;
  milestoneExperience: Record<string, number>; // milestone ID -> experience
  phaseCompletionBonus: number;
}

export interface ArcSkillUnlock {
  skillId: string;
  unlockConditions: BranchCondition[];
  narrativeJustification: string;
  teacherNpcId?: string;
  unlockMethod: 'automatic' | 'choice' | 'discovery' | 'training';
}

export interface ArcAttributeRequirement {
  objectiveId: string;
  requiredAttributes: Record<string, number>;
  alternativeRequirements?: Record<string, number>[];
  failureConsequences: QuestConsequence[];
  successBonuses: ArcObjectiveReward[];
}

export interface ArcSpecializationOpportunity {
  specializationId: string;
  unlockConditions: BranchCondition[];
  narrativeContext: string;
  mentorNpcId?: string;
  requirements: ArcSpecializationRequirement[];
}

export interface ArcProgressionGate {
  id: string;
  description: string;
  requiredLevel: number;
  requiredSkills: string[];
  requiredAttributes: Record<string, number>;
  alternativeUnlocks: BranchCondition[];
  blockedContent: string[];
  unlockRewards: ArcObjectiveReward[];
}

export interface ArcQuestIntegration {
  questGeneration: ArcQuestGeneration;
  questModification: ArcQuestModification[];
  questChaining: ArcQuestChaining;
  dynamicObjectives: ArcDynamicObjective[];
}

export interface ArcQuestGeneration {
  generationTriggers: ArcQuestGenerationTrigger[];
  questTemplates: ArcQuestTemplate[];
  adaptiveGeneration: boolean;
  playerPreferenceWeight: number; // 0-1
}

export interface ArcQuestGenerationTrigger {
  condition: BranchCondition;
  questType: 'main' | 'side' | 'personal' | 'faction' | 'exploration' | 'combat';
  priority: number;
  cooldown: number; // turns before this trigger can fire again
}

export interface ArcQuestTemplate {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'personal' | 'faction' | 'exploration' | 'combat';
  adaptableElements: ArcAdaptableQuestElement[];
  requirements: BranchCondition[];
  rewards: ArcObjectiveReward[];
}

export interface ArcAdaptableQuestElement {
  element: 'objective' | 'location' | 'npc' | 'item' | 'enemy' | 'reward';
  adaptationRules: ArcAdaptationRule[];
  fallbackOptions: string[];
}

export interface ArcAdaptationRule {
  condition: BranchCondition;
  modification: string;
  priority: number;
}

export interface ArcQuestModification {
  questId: string;
  modificationType: 'difficulty' | 'objective' | 'reward' | 'time_limit' | 'requirements';
  trigger: BranchCondition;
  modification: any; // Specific to modification type
  reversible: boolean;
}

export interface ArcQuestChaining {
  chainId: string;
  questSequence: string[];
  branchingPoints: ArcQuestBranchingPoint[];
  convergencePoints: ArcQuestConvergencePoint[];
  alternativePaths: ArcQuestAlternativePath[];
}

export interface ArcDynamicObjective {
  id: string;
  baseObjective: string;
  adaptationTriggers: BranchCondition[];
  possibleAdaptations: ArcObjectiveAdaptation[];
  playerChoiceInfluence: number; // 0-100
}

export interface DecisionChoice {
  id: string;
  text: string;
  description: string;
  requirements?: QuestPrerequisite[];
  consequences: QuestConsequence[];
  moralWeight?: 'good' | 'neutral' | 'evil' | 'complex';
  difficultyModifier?: number;
  popularityRating?: number; // How often players choose this option
}

// Enhanced Faction System
export interface EnhancedFaction {
  id: string;
  name: string;
  description: string;
  type: 'political' | 'religious' | 'military' | 'economic' | 'criminal' | 'academic' | 'magical' | 'cultural';
  powerLevel: number; // 1-100
  influence: FactionInfluence;
  relationships: FactionRelationship[];
  goals: FactionGoal[];
  resources: FactionResource[];
  territory?: string[];
  leadership: FactionLeadership;
  membershipRequirements?: QuestPrerequisite[];
  benefits: FactionBenefit[];
  consequences: FactionConsequence[];
}

export interface FactionInfluence {
  political: number; // 0-100
  economic: number; // 0-100
  military: number; // 0-100
  social: number; // 0-100
  magical: number; // 0-100
  informational: number; // 0-100
}

export interface FactionRelationship {
  factionId: string;
  factionName: string;
  relationshipType: 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war';
  relationshipScore: number; // -100 to +100
  history: FactionRelationshipEvent[];
  treaties?: FactionTreaty[];
  conflicts?: FactionConflict[];
}

export interface FactionRelationshipEvent {
  turnId: string;
  timestamp: string;
  eventType: 'alliance_formed' | 'treaty_signed' | 'conflict_started' | 'trade_agreement' | 'betrayal' | 'assistance_provided';
  description: string;
  relationshipChange: number;
  consequences: string[];
}

export interface FactionTreaty {
  id: string;
  name: string;
  type: 'trade' | 'military' | 'non_aggression' | 'mutual_defense' | 'research' | 'cultural_exchange';
  terms: string[];
  duration?: number; // Hours, -1 for permanent
  benefits: string[];
  penalties: string[];
  renewalConditions?: BranchCondition[];
}

export interface FactionConflict {
  id: string;
  name: string;
  type: 'trade_war' | 'territorial_dispute' | 'ideological_conflict' | 'resource_competition' | 'succession_crisis';
  intensity: 'minor' | 'moderate' | 'major' | 'critical';
  startedAt: string;
  causes: string[];
  currentStatus: string;
  resolutionConditions?: BranchCondition[];
  playerInvolvement: 'none' | 'observer' | 'mediator' | 'participant' | 'instigator';
}

export interface FactionGoal {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'expansion' | 'defense' | 'economic' | 'political' | 'ideological' | 'survival';
  progress: number; // 0-100
  timeframe: 'immediate' | 'short_term' | 'long_term' | 'indefinite';
  obstacles: string[];
  playerCanInfluence: boolean;
}

export interface FactionResource {
  type: 'military' | 'economic' | 'political' | 'magical' | 'informational' | 'cultural';
  amount: number; // 0-100
  quality: number; // 0-100
  accessibility: 'public' | 'members_only' | 'leadership_only' | 'secret';
  description: string;
}

export interface FactionLeadership {
  structure: 'autocratic' | 'oligarchic' | 'democratic' | 'council' | 'hierarchical' | 'anarchic';
  leaders: FactionLeader[];
  successionRules?: string[];
  decisionMaking: 'unanimous' | 'majority' | 'leader_decides' | 'council_votes';
}

export interface FactionLeader {
  npcId?: string; // Reference to NPC if they exist
  name: string;
  title: string;
  role: 'supreme_leader' | 'council_member' | 'military_commander' | 'economic_advisor' | 'spiritual_guide' | 'diplomat';
  influence: number; // 0-100
  loyalty: number; // 0-100
  competence: number; // 0-100
  personalGoals?: string[];
  relationships?: { npcId: string; relationship: string }[];
}

export interface FactionBenefit {
  type: 'economic' | 'military' | 'social' | 'magical' | 'informational' | 'political';
  name: string;
  description: string;
  requirements: QuestPrerequisite[];
  effects: ConsequenceEffect[];
  cost?: number; // Currency or reputation cost
  duration?: number; // Hours, -1 for permanent
}

export interface FactionConsequence {
  triggerCondition: BranchCondition;
  type: 'reward' | 'punishment' | 'opportunity' | 'restriction';
  description: string;
  effects: ConsequenceEffect[];
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  duration?: number; // Hours, -1 for permanent
}

// Enhanced World State Management
export interface WorldState {
  id: string;
  name: string;
  description: string;
  category: 'political' | 'economic' | 'social' | 'environmental' | 'magical' | 'technological' | 'cultural';
  currentValue: string | number | boolean;
  previousValues: WorldStateHistory[];
  influencingFactors: string[];
  consequences: WorldStateConsequence[];
  playerInfluence: number; // 0-100, how much player actions have influenced this
  volatility: number; // 0-100, how likely this is to change
  visibility: 'public' | 'known_to_factions' | 'rumors' | 'hidden' | 'player_discovered';
}

export interface WorldStateHistory {
  turnId: string;
  timestamp: string;
  previousValue: string | number | boolean;
  newValue: string | number | boolean;
  cause: string;
  playerInvolvement: 'direct' | 'indirect' | 'none';
  consequences: string[];
}

export interface WorldStateConsequence {
  condition: BranchCondition;
  effects: ConsequenceEffect[];
  description: string;
  scope: 'local' | 'regional' | 'global';
  duration: 'temporary' | 'lasting' | 'permanent';
}

// Enhanced Choice Tracking System
export interface PlayerChoice {
  id: string;
  turnId: string;
  timestamp: string;
  questId?: string;
  choiceText: string;
  choiceDescription?: string;
  context: ChoiceContext;
  alternatives: ChoiceAlternative[];
  reasoning?: string; // Player's stated reasoning if provided
  consequences: ChoiceConsequenceTracking[];
  moralAlignment?: 'good' | 'neutral' | 'evil' | 'complex';
  difficultyLevel: number; // 1-10
  timeToDecide?: number; // Seconds player took to decide
  confidence?: number; // 1-10, how confident player seemed
  regretLevel?: number; // 0-100, based on later player actions/statements
}

export interface ChoiceContext {
  location: string;
  npcsPresent: string[];
  timeOfDay?: string;
  stressLevel: number; // 0-100
  availableResources: string[];
  knownInformation: string[];
  unknownFactors: string[];
  pressureLevel: number; // 0-100, how much pressure player was under
}

export interface ChoiceAlternative {
  id: string;
  text: string;
  description?: string;
  requirements?: QuestPrerequisite[];
  predictedConsequences?: string[];
  difficultyLevel: number; // 1-10
  moralWeight?: 'good' | 'neutral' | 'evil' | 'complex';
  wasAvailable: boolean;
  reasonUnavailable?: string;
}

export interface ChoiceConsequenceTracking {
  consequenceId: string;
  type: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'permanent';
  manifestedAt?: string; // turnId when consequence appeared
  description: string;
  severity: 'trivial' | 'minor' | 'moderate' | 'major' | 'critical';
  category: 'relationship' | 'reputation' | 'world_state' | 'character_development' | 'story_progression' | 'resource' | 'opportunity' | 'moral';
  playerAwareness: 'unaware' | 'suspected' | 'partially_aware' | 'fully_aware';
  playerReaction?: 'positive' | 'negative' | 'neutral' | 'surprised' | 'regretful' | 'satisfied';
  ongoingEffects: string[];
  futureImplications: string[];
  reversible: boolean;
  hasBeenReversed?: boolean;
}

// Moral Alignment and Reputation System
export interface MoralProfile {
  overallAlignment: 'lawful_good' | 'neutral_good' | 'chaotic_good' | 'lawful_neutral' | 'true_neutral' | 'chaotic_neutral' | 'lawful_evil' | 'neutral_evil' | 'chaotic_evil' | 'complex';
  alignmentHistory: MoralAlignmentEvent[];
  moralTraits: MoralTrait[];
  ethicalDilemmasEncountered: EthicalDilemma[];
  reputationByGroup: { [groupId: string]: GroupReputation };
  moralInfluenceFactors: string[];
  consistencyScore: number; // 0-100, how consistent player's moral choices are
}

export interface MoralAlignmentEvent {
  turnId: string;
  timestamp: string;
  choiceId: string;
  previousAlignment: string;
  newAlignment: string;
  alignmentShift: number; // -10 to +10
  triggeringAction: string;
  moralWeight: 'trivial' | 'minor' | 'moderate' | 'major' | 'defining';
}

export interface MoralTrait {
  trait: 'compassionate' | 'ruthless' | 'honest' | 'deceptive' | 'loyal' | 'opportunistic' | 'just' | 'pragmatic' | 'merciful' | 'vengeful';
  strength: number; // 0-100
  consistency: number; // 0-100
  developmentHistory: TraitDevelopmentEvent[];
}

export interface TraitDevelopmentEvent {
  turnId: string;
  timestamp: string;
  choiceId: string;
  previousStrength: number;
  newStrength: number;
  reinforcingAction: string;
}

export interface EthicalDilemma {
  id: string;
  name: string;
  description: string;
  turnId: string;
  questId?: string;
  dilemmaType: 'trolley_problem' | 'greater_good' | 'loyalty_conflict' | 'truth_vs_kindness' | 'justice_vs_mercy' | 'individual_vs_collective';
  choiceMade: string;
  alternatives: string[];
  moralComplexity: number; // 1-10
  playerStruggledWith: boolean;
  resolution: string;
  longTermImpact: string[];
}

export interface GroupReputation {
  groupId: string;
  groupName: string;
  groupType: 'faction' | 'settlement' | 'organization' | 'species' | 'class' | 'profession';
  reputationScore: number; // -100 to +100
  reputationLevel: 'despised' | 'hated' | 'disliked' | 'neutral' | 'liked' | 'respected' | 'revered' | 'legendary';
  publicOpinion: string;
  privateOpinion?: string; // What they really think vs public stance
  influentialMembers: { npcId: string; influence: number }[];
  reputationHistory: GroupReputationEvent[];
  benefits: string[];
  restrictions: string[];
}

export interface GroupReputationEvent {
  turnId: string;
  timestamp: string;
  action: string;
  reputationChange: number;
  newLevel: string;
  witnesses: string[];
  publicityLevel: 'secret' | 'private' | 'local' | 'regional' | 'widespread';
  consequences: string[];
}

// Quest Generation and Management
export interface QuestGenerationSettings {
  dynamicQuestFrequency: 'low' | 'medium' | 'high';
  preferredQuestTypes: ('main' | 'side' | 'dynamic' | 'arc_goal')[];
  difficultyPreference: 'easy' | 'moderate' | 'hard' | 'adaptive';
  branchingComplexity: 'simple' | 'moderate' | 'complex';
  consequenceSeverity: 'light' | 'moderate' | 'heavy';
  moralComplexityLevel: number; // 0-100
  timeConstraintPreference: 'relaxed' | 'moderate' | 'urgent';
  failureToleranceLevel: number; // 0-100
  adaptiveGeneration: boolean;
  playerChoiceWeight: number; // 0-100, how much player choices influence generation
}

export interface QuestFailureRecord {
  questId: string;
  questTitle: string;
  failureType: 'time_limit' | 'character_death' | 'impossible_conditions' | 'player_choice' | 'external_factors';
  failureReason: string;
  turnId: string;
  timestamp: string;
  consequences: QuestConsequence[];
  recoveryOptions?: QuestRecoveryOption[];
  playerReaction?: 'accepted' | 'frustrated' | 'surprised' | 'indifferent';
  lessonsLearned?: string[];
}

export interface QuestRecoveryOption {
  id: string;
  name: string;
  description: string;
  requirements: QuestPrerequisite[];
  cost?: number; // Currency, reputation, or other cost
  timeLimit?: number; // Hours to use this recovery option
  consequences: QuestConsequence[];
  successChance: number; // 0-100
}

export interface TimeBasedEvent {
  id: string;
  name: string;
  description: string;
  type: 'quest_deadline' | 'faction_action' | 'world_event' | 'npc_action' | 'consequence_manifestation' | 'temporal_loop' | 'memory_trigger';
  scheduledTime: string; // ISO timestamp
  relatedQuestId?: string;
  relatedFactionId?: string;
  relatedNPCId?: string;
  effects: ConsequenceEffect[];
  canBeDelayed: boolean;
  canBeCancelled: boolean;
  playerCanInfluence: boolean;
  warningGiven: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Temporal Elements
  loopId?: string; // Which loop this event belongs to
  temporalConsistency: number; // How consistent this event is across loops
}

// === ENHANCED NARRATIVE SYSTEMS ===

// Complex Relationship Web Support
export interface GroupDynamicsEntry {
  groupId: string;
  groupName: string;
  memberIds: string[];
  dynamicsType: 'friend_group' | 'love_triangle' | 'family' | 'work_team' | 'rival_group' | 'social_circle';
  cohesionLevel: number; // 0 to 100
  conflictLevel: number; // 0 to 100
  influenceHierarchy: string[]; // Ordered by influence within group
  activeConflicts: GroupConflict[];
  romanticTensions: RomanticTension[];
}

export interface GroupConflict {
  id: string;
  conflictType: 'jealousy' | 'betrayal' | 'competition' | 'ideological' | 'resource' | 'romantic';
  involvedMemberIds: string[];
  intensity: number; // 0 to 100
  description: string;
  resolutionPaths: string[];
  consequences: string[];
}

export interface RomanticTension {
  id: string;
  type: 'unrequited_love' | 'love_triangle' | 'forbidden_love' | 'competing_suitors' | 'secret_relationship';
  involvedNPCIds: string[];
  playerInvolved: boolean;
  tensionLevel: number; // 0 to 100
  publicKnowledge: boolean;
  complications: string[];
  potentialOutcomes: string[];
}

export interface GroupDynamicsImpact {
  affectedGroupId: string;
  impactType: 'cohesion_change' | 'conflict_escalation' | 'romantic_development' | 'hierarchy_shift' | 'member_addition' | 'member_removal';
  magnitude: number; // -100 to +100
  description: string;
  cascadeEffects: string[];
}

// Cascade Effect System
export interface CascadeEffect {
  targetType: 'npc' | 'faction' | 'location' | 'quest' | 'world_state';
  targetId: string;
  effectType: 'relationship_change' | 'reputation_change' | 'story_branch' | 'resource_change' | 'availability_change';
  magnitude: number;
  delay: number; // Turns before effect manifests
  description: string;
  probability: number; // 0 to 100 - chance this cascade occurs
}

export interface ConsequenceConnection {
  connectedThreadId: string;
  connectionType: 'butterfly_effect' | 'shared_character' | 'shared_location' | 'shared_resource' | 'thematic_link';
  influenceStrength: number; // 0 to 100
  description: string;
  manifestationConditions: string[];
}

// === TEMPORAL ELEMENTS FOR TIME LOOP MECHANICS ===

export interface TemporalContext {
  loopId: string;
  loopIteration: number;
  timelineVariant: string;
  temporalStability: number; // 0 to 100
  memoryRetentionLevel: 'none' | 'fragments' | 'partial' | 'complete';
}

export interface MemoryRetentionEntry {
  memoryType: 'relationship' | 'event' | 'knowledge' | 'skill' | 'trauma';
  content: string;
  retentionStrength: number; // 0 to 100
  loopOrigin: string; // Which loop this memory comes from
  degradationRate: number; // How much it fades per loop
  triggerConditions: string[]; // What can trigger this memory
}

export interface LoopMemoryEntry {
  loopId: string;
  iteration: number;
  memoryFragment: string;
  clarity: number; // 0 to 100
  emotionalWeight: number; // 0 to 100
  triggerEvents: string[];
  associatedNPCs: string[];
  memoryType: 'prophetic' | 'traumatic' | 'romantic' | 'strategic' | 'warning';
}

export interface LoopConsequenceVariation {
  loopId: string;
  iteration: number;
  variationType: 'different_outcome' | 'delayed_effect' | 'amplified_effect' | 'prevented_effect' | 'new_consequence';
  description: string;
  triggerConditions: string[];
  probability: number; // 0 to 100
}

export interface TemporalSaveState {
  id: string;
  loopId: string;
  iteration: number;
  savePointType: 'loop_start' | 'major_event' | 'death_trigger' | 'manual_save' | 'auto_checkpoint';
  timestamp: string;
  storyState: StructuredStoryState;
  preservedMemories: MemoryRetentionEntry[];
  psychologicalEffects: PsychologicalEffect[];
  loopKnowledge: LoopKnowledgeEntry[];
}

export interface PsychologicalEffect {
  id: string;
  effectType: 'trauma_accumulation' | 'emotional_numbness' | 'hypervigilance' | 'despair' | 'determination' | 'madness';
  intensity: number; // 0 to 100
  description: string;
  manifestations: string[];
  cumulativeLoops: number; // How many loops contributed to this effect
  recoveryConditions: string[];
}

export interface LoopKnowledgeEntry {
  knowledgeType: 'future_event' | 'character_secret' | 'hidden_path' | 'danger_warning' | 'optimal_choice';
  content: string;
  reliability: number; // 0 to 100 - how accurate this knowledge is
  sourceLoop: string;
  applicableConditions: string[];
  usageCount: number; // How many times player has acted on this knowledge
}

// Additional interfaces for enhanced systems
export interface ButterflyEffectChain {
  id: string;
  originChoiceId: string;
  originDescription: string;
  chainLevel: number; // How many steps removed from original choice
  consequences: ChoiceConsequence[];
  affectedThreads: string[];
  magnitude: number; // How significant the overall chain is
  isActive: boolean;
}

export interface TemporalGameState {
  currentLoopId: string;
  currentIteration: number;
  loopStartTime: string;
  loopTriggerEvent: string;
  totalLoops: number;
  maxRetainedMemories: number;
  temporalStabilityLevel: number; // 0 to 100
  protagonistAwareness: 'unaware' | 'suspicious' | 'partially_aware' | 'fully_aware';
  loopMechanicsActive: boolean;
}

// Dynamic Quest Generation
export interface DynamicQuestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'rescue' | 'delivery' | 'investigation' | 'combat' | 'diplomacy' | 'exploration' | 'crafting' | 'social';
  baseObjectives: QuestObjectiveTemplate[];
  variableElements: QuestVariableElement[];
  adaptationRules: AdaptationRule[];
  difficultyScaling: DifficultyScalingRule[];
  contextRequirements: ContextRequirement[];
  rewardScaling: RewardScalingRule[];
}

export interface QuestObjectiveTemplate {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'deliver' | 'talk_to' | 'reach_location' | 'survive' | 'protect' | 'discover' | 'craft' | 'solve';
  variableTargets: string[]; // Placeholders for dynamic content
  optional: boolean;
  weight: number; // Importance relative to other objectives
}

export interface QuestVariableElement {
  placeholder: string; // e.g., "{target_npc}", "{item_name}", "{location}"
  type: 'npc' | 'item' | 'location' | 'faction' | 'number' | 'text';
  selectionCriteria: VariableSelectionCriteria;
  constraints?: VariableConstraint[];
}

export interface VariableSelectionCriteria {
  method: 'random' | 'weighted' | 'player_preference' | 'story_relevance' | 'difficulty_appropriate';
  filters?: { [key: string]: any };
  weights?: { [value: string]: number };
  excludeRecent?: boolean; // Don't use recently used values
}

export interface VariableConstraint {
  type: 'level_range' | 'location_accessibility' | 'faction_relationship' | 'item_availability' | 'story_consistency';
  value: any;
  description: string;
}

export interface DifficultyScalingRule {
  playerLevel: number;
  difficultyMultiplier: number;
  additionalObjectives?: number;
  timeConstraintMultiplier?: number;
  rewardMultiplier?: number;
  consequenceSeverityMultiplier?: number;
}

export interface ContextRequirement {
  type: 'location' | 'time_of_day' | 'faction_standing' | 'npc_relationship' | 'world_state' | 'previous_quest';
  value: any;
  required: boolean;
  description: string;
}

export interface RewardScalingRule {
  baseDifficulty: number;
  experienceMultiplier: number;
  currencyMultiplier: number;
  itemRarityBonus: number;
  additionalRewardChance: number; // 0-100
}

// Quest Analytics and Optimization
export interface QuestAnalytics {
  questId: string;
  questType: string;
  completionRate: number; // 0-100
  averageCompletionTime: number; // Hours
  playerSatisfactionScore: number; // 0-100
  difficultyRating: number; // 1-10, player-perceived
  choiceUtilization: { [choiceId: string]: number }; // How often each choice is selected
  failurePoints: QuestFailurePoint[];
  playerFeedback: QuestPlayerFeedback[];
  optimizationSuggestions: string[];
}

export interface QuestFailurePoint {
  objectiveId: string;
  failureRate: number; // 0-100
  commonFailureReasons: string[];
  suggestedImprovements: string[];
}

export interface QuestPlayerFeedback {
  turnId: string;
  timestamp: string;
  feedbackType: 'explicit' | 'behavioral' | 'inferred';
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  specificComments?: string;
  behavioralIndicators: string[];
  satisfactionScore?: number; // 0-100
}
