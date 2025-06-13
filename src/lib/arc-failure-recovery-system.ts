/**
 * Arc Failure Recovery System
 * 
 * Comprehensive failure detection and recovery system that provides:
 * - Real-time failure detection and early warning
 * - Multiple recovery paths and options
 * - Adaptive support based on player patterns
 * - Learning system that improves over time
 * - Narrative integration of failure and recovery
 */

import type {
  StoryArc,
  ArcFailureRecoverySystem,
  ArcFailureDetection,
  ArcFailureThreshold,
  ArcRecoveryOption,
  ArcFailureConsequence,
  ArcLearningSystem,
  ArcPlayerPattern,
  ArcAdaptiveSupport,
  StructuredStoryState,
  CharacterProfile,
  BranchCondition,
  QuestConsequence,
  ArcWarningType,
  ArcRecoveryCost,
  ArcSkillGap,
  ArcSupportType
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === FAILURE DETECTION SYSTEM ===

export function detectArcFailures(
  arc: StoryArc,
  character: CharacterProfile,
  storyState: StructuredStoryState,
  turnId: string
): ArcFailureDetectionResult {
  if (!arc.failureRecovery) return { failures: [], warnings: [], recommendations: [] };

  const failureSystem = arc.failureRecovery.failureDetection;
  const metrics = calculateFailureMetrics(arc, character, storyState);
  
  const failures = detectActiveFailures(failureSystem, metrics);
  const warnings = detectWarnings(failureSystem, metrics);
  const recommendations = generateRecommendations(failures, warnings, metrics);

  return {
    failures,
    warnings,
    recommendations,
    metrics,
  };
}

export interface ArcFailureDetectionResult {
  failures: DetectedFailure[];
  warnings: DetectedWarning[];
  recommendations: FailureRecommendation[];
  metrics: FailureMetrics;
}

export interface DetectedFailure {
  threshold: ArcFailureThreshold;
  currentValue: number;
  severity: 'warning' | 'concern' | 'critical' | 'failure';
  description: string;
  suggestedActions: string[];
}

export interface DetectedWarning {
  type: ArcWarningType;
  severity: 'info' | 'warning' | 'urgent';
  message: string;
  suggestedActions: string[];
}

export interface FailureRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  action: string;
  description: string;
  priority: number; // 1-10
  estimatedEffectiveness: number; // 0-100
}

export interface FailureMetrics {
  objectiveFailureRate: number;
  timeEfficiency: number;
  resourceDepletion: number;
  relationshipStress: number;
  playerFrustrationIndicators: number;
  difficultyMismatch: number;
}

function calculateFailureMetrics(
  arc: StoryArc,
  character: CharacterProfile,
  storyState: StructuredStoryState
): FailureMetrics {
  const progression = arc.progression;
  if (!progression) {
    return {
      objectiveFailureRate: 0,
      timeEfficiency: 1,
      resourceDepletion: 0,
      relationshipStress: 0,
      playerFrustrationIndicators: 0,
      difficultyMismatch: 0,
    };
  }

  const metrics = progression.progressionMetrics;
  
  return {
    objectiveFailureRate: metrics.objectivesFailed / Math.max(1, metrics.objectivesCompleted + metrics.objectivesFailed),
    timeEfficiency: Math.min(2, metrics.timeSpent / Math.max(1, metrics.objectivesCompleted)),
    resourceDepletion: calculateResourceDepletion(character, storyState),
    relationshipStress: calculateRelationshipStress(storyState),
    playerFrustrationIndicators: calculateFrustrationIndicators(arc, storyState),
    difficultyMismatch: calculateDifficultyMismatch(arc, character),
  };
}

function calculateResourceDepletion(character: CharacterProfile, storyState: StructuredStoryState): number {
  const healthRatio = character.health / character.maxHealth;
  const manaRatio = character.mana ? character.mana / (character.maxMana || 1) : 1;
  const currencyRatio = Math.min(1, (character.currency || 0) / 100); // Assuming 100 is a reasonable amount
  
  return 1 - (healthRatio + manaRatio + currencyRatio) / 3;
}

function calculateRelationshipStress(storyState: StructuredStoryState): number {
  if (!storyState.npcRelationships?.length) return 0;
  
  const negativeRelationships = storyState.npcRelationships.filter(rel => rel.relationshipScore < 0).length;
  return negativeRelationships / storyState.npcRelationships.length;
}

function calculateFrustrationIndicators(arc: StoryArc, storyState: StructuredStoryState): number {
  // Analyze player choice patterns for frustration indicators
  const recentChoices = storyState.playerChoices?.slice(-10) || [];
  const repetitiveChoices = recentChoices.filter((choice, index, arr) => 
    arr.slice(0, index).some(prevChoice => 
      prevChoice.choiceText.toLowerCase().includes(choice.choiceText.toLowerCase().substring(0, 10))
    )
  ).length;
  
  return Math.min(1, repetitiveChoices / 5); // Normalize to 0-1
}

function calculateDifficultyMismatch(arc: StoryArc, character: CharacterProfile): number {
  const arcDifficulty = arc.difficultySettings?.currentDifficulty || 5;
  const characterCapability = Math.min(10, character.level + (character.experiencePoints / 1000));
  
  return Math.abs(arcDifficulty - characterCapability) / 10;
}

function detectActiveFailures(detection: ArcFailureDetection, metrics: FailureMetrics): DetectedFailure[] {
  const failures: DetectedFailure[] = [];
  
  for (const threshold of detection.failureThresholds) {
    const currentValue = getMetricValue(threshold.metric, metrics);
    
    if (currentValue >= threshold.threshold) {
      failures.push({
        threshold,
        currentValue,
        severity: threshold.severity,
        description: generateFailureDescription(threshold, currentValue),
        suggestedActions: generateFailureActions(threshold),
      });
    }
  }
  
  return failures;
}

function detectWarnings(detection: ArcFailureDetection, metrics: FailureMetrics): DetectedWarning[] {
  const warnings: DetectedWarning[] = [];
  
  // Check for approaching thresholds
  for (const threshold of detection.failureThresholds) {
    const currentValue = getMetricValue(threshold.metric, metrics);
    const warningThreshold = threshold.threshold * 0.8; // Warn at 80% of failure threshold
    
    if (currentValue >= warningThreshold && currentValue < threshold.threshold) {
      warnings.push({
        type: {
          type: threshold.metric,
          message: `${threshold.metric} approaching critical levels`,
          severity: 'warning',
          suggestedActions: [`Monitor ${threshold.metric}`, 'Consider preventive measures'],
        },
        severity: 'warning',
        message: `${threshold.metric} is at ${Math.round(currentValue * 100)}% of critical threshold`,
        suggestedActions: [`Monitor ${threshold.metric}`, 'Consider preventive measures'],
      });
    }
  }
  
  return warnings;
}

function getMetricValue(metric: string, metrics: FailureMetrics): number {
  switch (metric) {
    case 'objective_failures': return metrics.objectiveFailureRate;
    case 'time_exceeded': return metrics.timeEfficiency;
    case 'resource_depletion': return metrics.resourceDepletion;
    case 'relationship_breakdown': return metrics.relationshipStress;
    case 'player_frustration': return metrics.playerFrustrationIndicators;
    default: return 0;
  }
}

function generateFailureDescription(threshold: ArcFailureThreshold, currentValue: number): string {
  const percentage = Math.round(currentValue * 100);
  
  switch (threshold.metric) {
    case 'objective_failures':
      return `Objective failure rate is ${percentage}%, indicating significant difficulty`;
    case 'time_exceeded':
      return `Time efficiency is ${percentage}%, suggesting pacing issues`;
    case 'resource_depletion':
      return `Resource depletion is at ${percentage}%, indicating resource management problems`;
    case 'relationship_breakdown':
      return `Relationship stress is at ${percentage}%, suggesting social difficulties`;
    case 'player_frustration':
      return `Frustration indicators are at ${percentage}%, suggesting player engagement issues`;
    default:
      return `Metric ${threshold.metric} is at ${percentage}%`;
  }
}

function generateFailureActions(threshold: ArcFailureThreshold): string[] {
  switch (threshold.metric) {
    case 'objective_failures':
      return ['Reduce objective difficulty', 'Provide additional guidance', 'Offer alternative solutions'];
    case 'time_exceeded':
      return ['Streamline objectives', 'Provide time management hints', 'Adjust pacing'];
    case 'resource_depletion':
      return ['Provide resource opportunities', 'Reduce resource costs', 'Offer resource management advice'];
    case 'relationship_breakdown':
      return ['Provide relationship repair opportunities', 'Clarify relationship mechanics', 'Offer social guidance'];
    case 'player_frustration':
      return ['Simplify current objectives', 'Provide clearer direction', 'Offer encouragement'];
    default:
      return ['Monitor situation', 'Consider intervention'];
  }
}

function generateRecommendations(
  failures: DetectedFailure[],
  warnings: DetectedWarning[],
  metrics: FailureMetrics
): FailureRecommendation[] {
  const recommendations: FailureRecommendation[] = [];
  
  // Generate immediate recommendations for failures
  for (const failure of failures) {
    recommendations.push({
      type: 'immediate',
      action: failure.suggestedActions[0] || 'Address failure',
      description: `Immediately address ${failure.threshold.metric} failure`,
      priority: 9,
      estimatedEffectiveness: 80,
    });
  }
  
  // Generate preventive recommendations for warnings
  for (const warning of warnings) {
    recommendations.push({
      type: 'short_term',
      action: warning.suggestedActions[0] || 'Monitor situation',
      description: `Prevent escalation of ${warning.type.type}`,
      priority: 6,
      estimatedEffectiveness: 60,
    });
  }
  
  // Generate long-term improvements
  if (metrics.difficultyMismatch > 0.3) {
    recommendations.push({
      type: 'long_term',
      action: 'Adjust difficulty scaling',
      description: 'Improve difficulty adaptation algorithms',
      priority: 4,
      estimatedEffectiveness: 70,
    });
  }
  
  return recommendations.sort((a, b) => b.priority - a.priority);
}

// === RECOVERY SYSTEM ===

export function generateRecoveryOptions(
  arc: StoryArc,
  failures: DetectedFailure[],
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcRecoveryOption[] {
  const recoveryOptions: ArcRecoveryOption[] = [];
  
  for (const failure of failures) {
    const options = createRecoveryOptionsForFailure(failure, arc, character, storyState);
    recoveryOptions.push(...options);
  }
  
  return recoveryOptions;
}

function createRecoveryOptionsForFailure(
  failure: DetectedFailure,
  arc: StoryArc,
  character: CharacterProfile,
  storyState: StructuredStoryState
): ArcRecoveryOption[] {
  const options: ArcRecoveryOption[] = [];
  
  switch (failure.threshold.metric) {
    case 'objective_failures':
      options.push({
        id: generateUUID(),
        name: 'Guidance System',
        description: 'Receive detailed guidance on current objectives',
        triggerConditions: [],
        recoveryType: 'guidance',
        cost: { type: 'none', amount: 0, description: 'Free guidance' },
        effectiveness: 70,
        narrativeIntegration: 'A helpful ally provides strategic advice',
        playerChoiceRequired: true,
      });
      
      options.push({
        id: generateUUID(),
        name: 'Difficulty Reduction',
        description: 'Temporarily reduce the difficulty of current challenges',
        triggerConditions: [],
        recoveryType: 'difficulty_reduction',
        cost: { type: 'narrative_consequence', amount: 1, description: 'Reduced sense of achievement' },
        effectiveness: 85,
        narrativeIntegration: 'Circumstances shift to make challenges more manageable',
        playerChoiceRequired: true,
      });
      break;
      
    case 'resource_depletion':
      options.push({
        id: generateUUID(),
        name: 'Resource Cache',
        description: 'Discover a hidden cache of useful resources',
        triggerConditions: [],
        recoveryType: 'resource_boost',
        cost: { type: 'none', amount: 0, description: 'Lucky discovery' },
        effectiveness: 60,
        narrativeIntegration: 'You stumble upon supplies left by previous travelers',
        playerChoiceRequired: false,
      });
      break;
      
    case 'relationship_breakdown':
      options.push({
        id: generateUUID(),
        name: 'Mediation Opportunity',
        description: 'A chance to repair damaged relationships',
        triggerConditions: [],
        recoveryType: 'narrative_intervention',
        cost: { type: 'time', amount: 2, description: '2 turns of focused relationship work' },
        effectiveness: 75,
        narrativeIntegration: 'A mutual friend offers to help mediate the conflict',
        playerChoiceRequired: true,
      });
      break;
  }
  
  return options;
}

// === ADAPTIVE SUPPORT SYSTEM ===

export function updateAdaptiveSupport(
  arc: StoryArc,
  playerResponse: string,
  effectiveness: number,
  turnId: string
): StoryArc {
  if (!arc.failureRecovery?.adaptiveSupport) return arc;
  
  const support = arc.failureRecovery.adaptiveSupport;
  
  // Update effectiveness tracking
  const updatedTracking = support.effectivenessTracking.map(tracking => {
    if (tracking.supportType === playerResponse) {
      return {
        ...tracking,
        timesOffered: tracking.timesOffered + 1,
        timesAccepted: tracking.timesAccepted + (effectiveness > 0 ? 1 : 0),
        successRate: (tracking.successRate + effectiveness) / 2,
      };
    }
    return tracking;
  });
  
  // Adjust support level based on effectiveness
  let newSupportLevel = support.supportLevel;
  const averageEffectiveness = updatedTracking.reduce((sum, t) => sum + t.successRate, 0) / updatedTracking.length;
  
  if (averageEffectiveness < 0.3 && support.supportLevel !== 'maximum') {
    newSupportLevel = support.supportLevel === 'minimal' ? 'moderate' : 
                     support.supportLevel === 'moderate' ? 'high' : 'maximum';
  } else if (averageEffectiveness > 0.8 && support.supportLevel !== 'minimal') {
    newSupportLevel = support.supportLevel === 'maximum' ? 'high' : 
                     support.supportLevel === 'high' ? 'moderate' : 'minimal';
  }
  
  return {
    ...arc,
    failureRecovery: {
      ...arc.failureRecovery,
      adaptiveSupport: {
        ...support,
        supportLevel: newSupportLevel,
        effectivenessTracking: updatedTracking,
      },
    },
  };
}

// === LEARNING SYSTEM ===

export function updateLearningSystem(
  arc: StoryArc,
  playerBehavior: string,
  outcome: string,
  turnId: string
): StoryArc {
  if (!arc.failureRecovery?.learningSystem) return arc;
  
  const learning = arc.failureRecovery.learningSystem;
  
  // Update player pattern tracking
  const updatedPatterns = updatePlayerPatterns(learning.playerPatternTracking, playerBehavior, outcome);
  
  // Generate new adaptive hints based on patterns
  const newHints = generateAdaptiveHints(updatedPatterns, outcome);
  
  // Identify skill gaps
  const skillGaps = identifySkillGaps(updatedPatterns, outcome);
  
  return {
    ...arc,
    failureRecovery: {
      ...arc.failureRecovery,
      learningSystem: {
        ...learning,
        playerPatternTracking: updatedPatterns,
        adaptiveHints: [...learning.adaptiveHints, ...newHints],
        skillGapIdentification: skillGaps,
      },
    },
  };
}

function updatePlayerPatterns(patterns: ArcPlayerPattern[], behavior: string, outcome: string): ArcPlayerPattern[] {
  // This would analyze player behavior and update patterns
  // Simplified implementation
  return patterns;
}

function generateAdaptiveHints(patterns: ArcPlayerPattern[], outcome: string): any[] {
  // Generate hints based on observed patterns
  return [];
}

function identifySkillGaps(patterns: ArcPlayerPattern[], outcome: string): ArcSkillGap[] {
  // Identify areas where player needs improvement
  return [];
}

export { };
