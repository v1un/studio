/**
 * Enhanced Context Formatter
 * 
 * Functions to format the new enhanced tracking data for inclusion in AI prompts
 */

import type {
  StructuredStoryState,
  EmotionalState,
  RelationshipEntry,
  FactionStanding,
  EnvironmentalContext,
  NarrativeThread,
  PlayerPreferences,
  ChoiceConsequence
} from '@/types/story';

// === EMOTIONAL STATE FORMATTING ===

export function formatEmotionalState(emotionalState: EmotionalState): string {
  const moodModifiersText = emotionalState.moodModifiers.length > 0
    ? emotionalState.moodModifiers.map(mod => `${mod.effect} (${mod.modifier > 0 ? '+' : ''}${mod.modifier}, ${mod.duration === -1 ? 'permanent' : `${mod.duration} turns`})`).join(', ')
    : 'None';

  const traumaText = emotionalState.traumaticEvents.length > 0
    ? emotionalState.traumaticEvents.map(trauma => `${trauma.eventType} (${trauma.severity}, ${trauma.recoveryProgress}% recovered)`).join(', ')
    : 'None';

  return `Mood: ${emotionalState.primaryMood}, Stress: ${emotionalState.stressLevel}/100, Fatigue: ${emotionalState.fatigueLevel}/100, Mental Health: ${emotionalState.mentalHealthScore}/100
Mood Modifiers: ${moodModifiersText}
Traumatic Events: ${traumaText}`;
}

// === RELATIONSHIP FORMATTING ===

export function formatNPCRelationships(relationships: RelationshipEntry[]): string {
  if (!relationships || relationships.length === 0) {
    return 'No established relationships';
  }

  return relationships.map(rel => {
    const recentHistory = rel.relationshipHistory.slice(-2).map(h => h.description).join('; ');
    return `${rel.npcName}: Relationship ${rel.relationshipScore}/100, Trust ${rel.trustLevel}/100, Fear ${rel.fearLevel}/100, Respect ${rel.respectLevel}/100, Mood: ${rel.emotionalState.primaryMood}${recentHistory ? `, Recent: ${recentHistory}` : ''}`;
  }).join('\n');
}

export function formatFactionStandings(factions: FactionStanding[]): string {
  if (!factions || factions.length === 0) {
    return 'No faction standings';
  }

  return factions.map(faction => {
    const consequences = faction.currentConsequences.length > 0 ? ` (Effects: ${faction.currentConsequences.join(', ')})` : '';
    const titles = faction.specialTitles.length > 0 ? ` [${faction.specialTitles.join(', ')}]` : '';
    return `${faction.factionName}: ${faction.standingLevel} (${faction.reputationScore}/100)${titles}${consequences}`;
  }).join('\n');
}

// === ENVIRONMENTAL CONTEXT FORMATTING ===

export function formatEnvironmentalContext(envContext: EnvironmentalContext): string {
  const location = envContext.locationDetails;
  const weather = envContext.weatherConditions;
  const time = envContext.timeContext;

  const locationInfo = `${location.locationType} (${location.size}), Safety: ${location.safetyLevel}/100, Wealth: ${location.wealthLevel}/100, Magic: ${location.magicalLevel}/100`;
  
  const weatherInfo = `${weather.condition}, ${weather.temperature}, Visibility: ${weather.visibility}/100`;
  if (weather.weatherEffects.length > 0) {
    weatherInfo + `, Effects: ${weather.weatherEffects.join(', ')}`;
  }

  const timeInfo = `${time.timeOfDay}${time.season ? `, ${time.season}` : ''}`;
  if (time.timeEffects.length > 0) {
    timeInfo + `, Effects: ${time.timeEffects.join(', ')}`;
  }

  const hazards = envContext.environmentalHazards.filter(h => h.isActive).map(h => `${h.name} (${h.severity})`).join(', ');
  const atmosphere = envContext.atmosphericModifiers.map(a => `${a.effect} (mood ${a.moodImpact > 0 ? '+' : ''}${a.moodImpact})`).join(', ');

  let result = `Location: ${locationInfo}\nWeather: ${weatherInfo}\nTime: ${timeInfo}`;
  if (hazards) result += `\nHazards: ${hazards}`;
  if (atmosphere) result += `\nAtmosphere: ${atmosphere}`;
  if (location.notableFeatures.length > 0) result += `\nFeatures: ${location.notableFeatures.join(', ')}`;
  if (location.availableServices.length > 0) result += `\nServices: ${location.availableServices.join(', ')}`;

  return result;
}

// === NARRATIVE THREAD FORMATTING ===

export function formatNarrativeThreads(threads: NarrativeThread[]): string {
  if (!threads || threads.length === 0) {
    return 'No active narrative threads';
  }

  const activeThreads = threads.filter(t => t.status === 'active' || t.status === 'escalating');
  if (activeThreads.length === 0) {
    return 'No currently active narrative threads';
  }

  return activeThreads.map(thread => {
    const urgency = thread.timeSensitive ? ` [URGENT: ${thread.urgencyLevel}/100]` : '';
    const influence = ` (Player influence: ${thread.playerInfluence}/100)`;
    const related = thread.relatedCharacters.length > 0 ? ` Related NPCs: ${thread.relatedCharacters.join(', ')}` : '';
    return `${thread.title} (${thread.category}, ${thread.priority}${urgency}): ${thread.description}${influence}${related}`;
  }).join('\n');
}

export function formatUnresolvedMysteries(longTermSummary: any): string {
  if (!longTermSummary?.unresolvedMysteries || longTermSummary.unresolvedMysteries.length === 0) {
    return 'No unresolved mysteries';
  }
  return longTermSummary.unresolvedMysteries.join('; ');
}

export function formatSignificantChoices(longTermSummary: any): string {
  if (!longTermSummary?.significantChoices || longTermSummary.significantChoices.length === 0) {
    return 'No significant choices recorded';
  }

  const recentChoices = longTermSummary.significantChoices.slice(-3);
  return recentChoices.map((choice: any) => 
    `${choice.choiceDescription} → ${choice.immediateConsequences.join(', ')}`
  ).join('; ');
}

// === PLAYER PREFERENCE FORMATTING ===

export function formatPlayerPreferences(preferences: PlayerPreferences): string {
  const playstyle = preferences.playstyle;
  const content = preferences.contentPreferences;
  
  const styleIndicators = [];
  if (Math.abs(playstyle.combatVsDiplomacy) > 30) {
    styleIndicators.push(playstyle.combatVsDiplomacy > 30 ? 'Combat-focused' : 'Diplomacy-focused');
  }
  if (Math.abs(playstyle.explorationVsStory) > 30) {
    styleIndicators.push(playstyle.explorationVsStory > 30 ? 'Exploration-focused' : 'Story-focused');
  }
  if (Math.abs(playstyle.cautionVsRisk) > 30) {
    styleIndicators.push(playstyle.cautionVsRisk > 30 ? 'Risk-taking' : 'Cautious');
  }
  if (Math.abs(playstyle.moralAlignment) > 30) {
    styleIndicators.push(playstyle.moralAlignment > 30 ? 'Good-aligned' : 'Evil-aligned');
  }

  const contentPrefs = [];
  if (content.preferredQuestTypes.length > 0) {
    contentPrefs.push(`Prefers: ${content.preferredQuestTypes.slice(0, 3).join(', ')}`);
  }
  if (content.humorLevel > 70) contentPrefs.push('Enjoys humor');
  if (content.romanceInterest > 70) contentPrefs.push('Interested in romance');
  if (content.politicalInvolvement > 70) contentPrefs.push('Politically engaged');

  let result = '';
  if (styleIndicators.length > 0) result += `Playstyle: ${styleIndicators.join(', ')}`;
  if (contentPrefs.length > 0) result += `${result ? '\n' : ''}Content: ${contentPrefs.join(', ')}`;
  if (!result) result = 'No strong preferences detected yet';

  return result;
}

// === CHOICE CONSEQUENCE FORMATTING ===

export function formatActiveChoiceConsequences(consequences: ChoiceConsequence[]): string {
  if (!consequences || consequences.length === 0) {
    return 'No active choice consequences';
  }

  const activeConsequences = consequences.filter(c => c.isActive);
  if (activeConsequences.length === 0) {
    return 'No currently active choice consequences';
  }

  return activeConsequences.map(consequence => {
    const awareness = consequence.playerAwareness !== 'fully_aware' ? ` [Player ${consequence.playerAwareness}]` : '';
    return `${consequence.description} (${consequence.category}, ${consequence.severity})${awareness}`;
  }).slice(0, 5).join('\n'); // Limit to 5 most relevant
}

// === COMPREHENSIVE CONTEXT FORMATTER ===

export function formatEnhancedContextForAI(state: StructuredStoryState): {
  emotionalContext: string;
  relationshipContext: string;
  environmentalContext: string;
  narrativeContext: string;
  playerContext: string;
  consequenceContext: string;
} {
  return {
    emotionalContext: formatEmotionalState(state.characterEmotionalState),
    relationshipContext: `NPC Relationships:\n${formatNPCRelationships(state.npcRelationships)}\n\nFaction Standings:\n${formatFactionStandings(state.factionStandings)}`,
    environmentalContext: formatEnvironmentalContext(state.environmentalContext),
    narrativeContext: `Active Threads:\n${formatNarrativeThreads(state.narrativeThreads)}\n\nUnresolved Mysteries: ${formatUnresolvedMysteries(state.longTermStorySummary)}\n\nRecent Significant Choices: ${formatSignificantChoices(state.longTermStorySummary)}`,
    playerContext: formatPlayerPreferences(state.playerPreferences),
    consequenceContext: formatActiveChoiceConsequences(state.choiceConsequences),
  };
}

// === LEGACY COMPATIBILITY ===

export function formatEnhancedContextLegacy(state: StructuredStoryState): string {
  const enhanced = formatEnhancedContextForAI(state);
  
  return `
=== ENHANCED CONTEXT ===
Character Emotional State: ${enhanced.emotionalContext}

${enhanced.relationshipContext}

Environmental Context:
${enhanced.environmentalContext}

Narrative Context:
${enhanced.narrativeContext}

Player Preferences: ${enhanced.playerContext}

Active Consequences:
${enhanced.consequenceContext}
=== END ENHANCED CONTEXT ===`;
}
