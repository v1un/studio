/**
 * Series Adaptation System
 * 
 * Provides flexible adaptation for different series and genres while maintaining
 * consistent generation quality and canon compliance.
 */

import type { StructuredStoryState, CharacterProfile } from '@/types/story';

export interface SeriesConfig {
  name: string;
  genre: string;
  subGenre?: string;
  themes: string[];
  characterArchetypes: string[];
  worldRules: string[];
  powerSystems: string[];
  culturalElements: string[];
  toneDescriptors: string[];
  typicalChallenges: string[];
  relationshipDynamics: string[];
  progressionStyle: string;
  difficultyProfile: {
    combat: number; // 1-10 scale
    social: number;
    puzzle: number;
    survival: number;
    political: number;
  };
  exampleApproaches: {
    characterCreation: string;
    questDesign: string;
    worldBuilding: string;
    relationshipDevelopment: string;
    conflictResolution: string;
  };
}

// === SERIES CONFIGURATIONS ===

export const SERIES_CONFIGS: Record<string, SeriesConfig> = {
  "Re:Zero": {
    name: "Re:Zero",
    genre: "Dark Fantasy",
    subGenre: "Isekai",
    themes: [
      "Growth through suffering",
      "The value of life and death",
      "Redemption and second chances",
      "Complex moral choices",
      "Love and sacrifice"
    ],
    characterArchetypes: [
      "Flawed but determined protagonist",
      "Mysterious and powerful mentors",
      "Complex antagonists with understandable motives",
      "Loyal companions with hidden depths",
      "Tragic figures seeking redemption"
    ],
    worldRules: [
      "Return by Death mechanic",
      "Magic through spirit contracts",
      "Political intrigue and royal selection",
      "Hidden histories and conspiracies",
      "Consequences persist across loops"
    ],
    powerSystems: [
      "Spirit magic and contracts",
      "Divine protections",
      "Curses and blessings",
      "Authority powers",
      "Magical artifacts"
    ],
    culturalElements: [
      "Royal selection process",
      "Demi-human discrimination",
      "Noble house politics",
      "Merchant guild influence",
      "Religious and cult activities"
    ],
    toneDescriptors: [
      "Dark but hopeful",
      "Emotionally intense",
      "Psychologically complex",
      "Morally ambiguous",
      "Character-driven"
    ],
    typicalChallenges: [
      "Moral dilemmas with no clear right answer",
      "Emotional and psychological trials",
      "Complex social situations",
      "Political maneuvering",
      "Life-or-death decisions"
    ],
    relationshipDynamics: [
      "Slow-burn romantic development",
      "Deep platonic bonds",
      "Mentor-student relationships",
      "Redemptive friendships",
      "Complex rivalries"
    ],
    progressionStyle: "Character growth through adversity and relationships",
    difficultyProfile: {
      combat: 7,
      social: 9,
      puzzle: 6,
      survival: 8,
      political: 8
    },
    exampleApproaches: {
      characterCreation: "Create flawed characters with clear motivations and room for growth. Start them in challenging situations that test their values.",
      questDesign: "Design quests with multiple solutions and meaningful consequences. Focus on character development over simple objectives.",
      worldBuilding: "Build a world with hidden depths and moral complexity. Every location should have history and ongoing conflicts.",
      relationshipDevelopment: "Develop relationships through shared trials and gradual trust-building. Allow for both positive and negative relationship changes.",
      conflictResolution: "Resolve conflicts through character growth and understanding rather than simple victory. Show consequences of choices."
    }
  },
  
  "Attack on Titan": {
    name: "Attack on Titan",
    genre: "Dark Military Fantasy",
    subGenre: "Post-Apocalyptic",
    themes: [
      "Freedom vs security",
      "Cycle of hatred and revenge",
      "Truth and deception",
      "Sacrifice for the greater good",
      "The cost of survival"
    ],
    characterArchetypes: [
      "Determined soldiers fighting for survival",
      "Mysterious figures with hidden agendas",
      "Tragic antagonists driven by circumstance",
      "Loyal comrades bound by shared trauma",
      "Authority figures with difficult choices"
    ],
    worldRules: [
      "Titan threat and transformations",
      "Memory inheritance mechanics",
      "Wall society structure",
      "Military hierarchy and discipline",
      "Hidden history revelations"
    ],
    powerSystems: [
      "Titan shifting abilities",
      "ODM gear and combat techniques",
      "Hardening and special abilities",
      "Military formations and tactics",
      "Technology and weapons"
    ],
    culturalElements: [
      "Military structure and ranks",
      "Wall society divisions",
      "Eldian and Marleyan cultures",
      "Religious and historical beliefs",
      "Survival-focused communities"
    ],
    toneDescriptors: [
      "Grim and desperate",
      "Military precision",
      "Morally complex",
      "High stakes",
      "Tragic heroism"
    ],
    typicalChallenges: [
      "Life-or-death combat situations",
      "Military strategy and tactics",
      "Moral choices in war",
      "Uncovering hidden truths",
      "Survival against overwhelming odds"
    ],
    relationshipDynamics: [
      "Bonds forged in battle",
      "Military camaraderie",
      "Mentor-subordinate relationships",
      "Tragic losses and grief",
      "Conflicted loyalties"
    ],
    progressionStyle: "Skill development through training and combat experience",
    difficultyProfile: {
      combat: 9,
      social: 6,
      puzzle: 7,
      survival: 10,
      political: 7
    },
    exampleApproaches: {
      characterCreation: "Create characters shaped by survival and military training. Give them clear motivations tied to survival or freedom.",
      questDesign: "Design missions with clear objectives but complex moral implications. Focus on tactical challenges and team coordination.",
      worldBuilding: "Build a world where survival is paramount. Every location should reflect the constant threat and military necessity.",
      relationshipDevelopment: "Develop relationships through shared danger and mutual dependence. Show how trauma affects bonds.",
      conflictResolution: "Resolve conflicts through decisive action and sacrifice. Show the cost of difficult choices."
    }
  },

  "My Hero Academia": {
    name: "My Hero Academia",
    genre: "Superhero School",
    subGenre: "Coming of Age",
    themes: [
      "What makes a true hero",
      "Growth through training and friendship",
      "Overcoming personal limitations",
      "Responsibility and sacrifice",
      "The power of determination"
    ],
    characterArchetypes: [
      "Aspiring heroes with unique quirks",
      "Experienced pro heroes as mentors",
      "Villains with twisted ideologies",
      "Supportive classmates and friends",
      "Authority figures balancing teaching and heroism"
    ],
    worldRules: [
      "Quirk-based superpowers",
      "Hero society structure",
      "Villain organizations",
      "Hero licensing and regulations",
      "School-based training systems"
    ],
    powerSystems: [
      "Individual quirks and abilities",
      "Support equipment and gear",
      "Combination attacks and teamwork",
      "Quirk evolution and awakening",
      "Hero techniques and special moves"
    ],
    culturalElements: [
      "Hero worship and celebrity culture",
      "School traditions and competitions",
      "Professional hero rankings",
      "Villain rehabilitation programs",
      "Quirk discrimination issues"
    ],
    toneDescriptors: [
      "Optimistic and inspiring",
      "Action-packed",
      "Emotionally uplifting",
      "Competitive spirit",
      "Heroic idealism"
    ],
    typicalChallenges: [
      "Training exercises and competitions",
      "Villain encounters and rescues",
      "Personal growth and self-discovery",
      "Teamwork and cooperation",
      "Moral choices about heroism"
    ],
    relationshipDynamics: [
      "Friendly rivalries and competition",
      "Mentor-student guidance",
      "Classroom friendships and bonds",
      "Romantic interests and crushes",
      "Family expectations and support"
    ],
    progressionStyle: "Skill development through structured training and real-world experience",
    difficultyProfile: {
      combat: 6,
      social: 5,
      puzzle: 4,
      survival: 4,
      political: 3
    },
    exampleApproaches: {
      characterCreation: "Create characters with unique quirks and clear heroic aspirations. Focus on their personal growth journey.",
      questDesign: "Design training exercises and hero missions that test both abilities and character. Include teamwork elements.",
      worldBuilding: "Build a world where heroes are integrated into society. Show both the glamour and responsibility of heroism.",
      relationshipDevelopment: "Develop relationships through shared training and mutual support. Show healthy competition and friendship.",
      conflictResolution: "Resolve conflicts through heroic ideals and personal growth. Show the importance of never giving up."
    }
  }
};

// === ADAPTATION FUNCTIONS ===

export function getSeriesConfig(seriesName: string): SeriesConfig {
  return SERIES_CONFIGS[seriesName] || createGenericConfig(seriesName);
}

export function createGenericConfig(seriesName: string): SeriesConfig {
  return {
    name: seriesName,
    genre: "Fantasy Adventure",
    themes: [
      "Personal growth and development",
      "Friendship and loyalty",
      "Good vs evil",
      "Overcoming challenges",
      "Discovery and exploration"
    ],
    characterArchetypes: [
      "Heroic protagonist",
      "Wise mentor figure",
      "Loyal companion",
      "Mysterious ally",
      "Formidable antagonist"
    ],
    worldRules: [
      "Magic and supernatural elements exist",
      "Clear moral distinctions",
      "Adventure and exploration encouraged",
      "Skills and abilities can be developed",
      "Good ultimately triumphs"
    ],
    powerSystems: [
      "Magic spells and abilities",
      "Skill-based progression",
      "Magical items and artifacts",
      "Special techniques",
      "Elemental powers"
    ],
    culturalElements: [
      "Kingdoms and nobility",
      "Guilds and organizations",
      "Ancient traditions",
      "Magical academies",
      "Trading and commerce"
    ],
    toneDescriptors: [
      "Adventurous and exciting",
      "Optimistic outlook",
      "Clear moral guidance",
      "Engaging and fun",
      "Inspiring heroism"
    ],
    typicalChallenges: [
      "Combat encounters",
      "Puzzle solving",
      "Social interactions",
      "Exploration and discovery",
      "Moral choices"
    ],
    relationshipDynamics: [
      "Friendship through adventure",
      "Mentor guidance",
      "Romantic interests",
      "Team cooperation",
      "Rivalry and competition"
    ],
    progressionStyle: "Balanced growth through experience and training",
    difficultyProfile: {
      combat: 5,
      social: 5,
      puzzle: 5,
      survival: 5,
      political: 4
    },
    exampleApproaches: {
      characterCreation: "Create well-rounded characters with clear goals and motivations. Balance strengths and weaknesses.",
      questDesign: "Design varied quests that test different skills. Include clear objectives with meaningful rewards.",
      worldBuilding: "Build a consistent world with interesting locations and cultures. Balance familiar and unique elements.",
      relationshipDevelopment: "Develop relationships through shared experiences and mutual respect. Show character growth.",
      conflictResolution: "Resolve conflicts through character development and appropriate consequences. Maintain hope and optimism."
    }
  };
}

export function adaptPromptForSeries(basePrompt: string, seriesName: string): string {
  const config = getSeriesConfig(seriesName);
  
  // Replace generic placeholders with series-specific guidance
  let adaptedPrompt = basePrompt;
  
  // Add series-specific context
  adaptedPrompt += `\n\nSERIES-SPECIFIC ADAPTATION FOR "${config.name}":
Genre: ${config.genre}${config.subGenre ? ` (${config.subGenre})` : ''}
Tone: ${config.toneDescriptors.join(', ')}

Key Themes to Consider:
${config.themes.map(theme => `- ${theme}`).join('\n')}

Typical Character Types:
${config.characterArchetypes.map(archetype => `- ${archetype}`).join('\n')}

World Rules to Respect:
${config.worldRules.map(rule => `- ${rule}`).join('\n')}

Power Systems:
${config.powerSystems.map(system => `- ${system}`).join('\n')}

Cultural Context:
${config.culturalElements.map(element => `- ${element}`).join('\n')}

Approach Guidance:
${Object.entries(config.exampleApproaches).map(([key, approach]) => 
  `${key.charAt(0).toUpperCase() + key.slice(1)}: ${approach}`
).join('\n')}`;

  return adaptedPrompt;
}

export function getSeriesDifficultyProfile(seriesName: string): SeriesConfig['difficultyProfile'] {
  const config = getSeriesConfig(seriesName);
  return config.difficultyProfile;
}

export function getSeriesProgressionStyle(seriesName: string): string {
  const config = getSeriesConfig(seriesName);
  return config.progressionStyle;
}

export function validateSeriesCompatibility(storyState: StructuredStoryState, seriesName: string): string[] {
  const config = getSeriesConfig(seriesName);
  const warnings: string[] = [];
  
  // Check if character fits series archetypes
  const characterClass = storyState.character.class?.toLowerCase() || '';
  const hasMatchingArchetype = config.characterArchetypes.some(archetype => 
    archetype.toLowerCase().includes(characterClass) || 
    characterClass.includes(archetype.toLowerCase().split(' ')[0])
  );
  
  if (!hasMatchingArchetype) {
    warnings.push(`Character class "${storyState.character.class}" may not fit typical ${seriesName} archetypes`);
  }
  
  // Check difficulty alignment
  const playerPrefs = storyState.playerPreferences;
  if (playerPrefs) {
    const seriesDifficulty = config.difficultyProfile;
    
    if (playerPrefs.difficultyPreferences.combatDifficulty < 30 && seriesDifficulty.combat > 7) {
      warnings.push(`${seriesName} typically has high combat difficulty, but player prefers easier combat`);
    }
    
    if (playerPrefs.difficultyPreferences.socialDifficulty < 30 && seriesDifficulty.social > 7) {
      warnings.push(`${seriesName} typically has complex social situations, but player prefers simpler social interactions`);
    }
  }
  
  return warnings;
}
