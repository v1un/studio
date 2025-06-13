/**
 * Generic Prompt Templates for Series-Agnostic Generation
 * 
 * This module provides flexible prompt templates that work across multiple genres and series
 * by using example-based guidance rather than hard-coded requirements.
 */

export interface SeriesContext {
  name: string;
  genre?: string;
  themes?: string[];
  characterArchetypes?: string[];
  worldRules?: string[];
  powerSystems?: string[];
  culturalElements?: string[];
}

export interface PromptContext {
  series: SeriesContext;
  character?: {
    name?: string;
    class?: string;
    level?: number;
    background?: string;
  };
  location?: string;
  emotionalContext?: {
    mood: string;
    stressLevel: number;
    recentEvents?: string[];
  };
  relationshipContext?: {
    knownNPCs: string[];
    factionStandings?: string[];
  };
  environmentalContext?: {
    timeOfDay: string;
    weather: string;
    atmosphere: string;
  };
}

// === CHARACTER CREATION TEMPLATES ===

export const GENERIC_CHARACTER_FOUNDATION_TEMPLATE = `
ENHANCED STATE AWARENESS:
Consider these factors when creating the character and scene:
- Character's emotional starting state ({{emotionalContext.mood}}, stress level: {{emotionalContext.stressLevel}})
- Environmental context ({{environmentalContext.timeOfDay}}, {{environmentalContext.weather}})
- Relationship potential (how this character might interact with others)
- Narrative thread foundations (what story elements could develop)

IMMERSIVE NARRATIVE STARTING POINT GENERATION:
Create a detailed, engaging opening that establishes a high-quality interactive narrative foundation:

1. **GRANULAR SENSORY IMMERSION:**
   - SIGHT: Detailed visual descriptions of architecture, people, clothing, lighting, colors, textures
   - SOUND: Ambient noise, conversations, mechanical sounds, natural sounds, silence, echoes
   - SMELL: Environmental scents, food, people, weather, decay, freshness, cultural aromas
   - TOUCH: Temperature, textures, physical sensations, comfort/discomfort, clothing feel
   - TASTE: If relevant, flavors in the air or recent consumption

2. **MOMENT-BY-MOMENT PROGRESSION:**
   - Start with character's immediate situation and sensations
   - Progress chronologically through initial events with clear transitions
   - Build tension and engagement through pacing and escalation
   - Create natural interaction points for player agency
   - Establish clear cause-and-effect relationships between events

3. **CHARACTER PSYCHOLOGICAL DEPTH:**
   - Internal thoughts and emotional reactions to events
   - Past experiences influencing current behavior and decisions
   - Motivations, fears, and desires driving actions
   - Personality traits revealed through reactions and choices
   - Growth potential and character flaws that create story opportunities

4. **ENVIRONMENTAL ATMOSPHERE:**
   - Mood-setting details that enhance immersion and emotional impact
   - Cultural and social context revealed through environmental cues
   - Weather and time effects on atmosphere and character mood
   - Contrast between different locations to highlight transitions
   - Hidden details that reward careful observation and exploration

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, Subaru's arrival creates immediate sensory overload with detailed descriptions of medieval fantasy architecture contrasting with modern Japan
- The progression moves moment-by-moment from confusion to wonder to danger, building tension naturally
- Character psychology is revealed through internal reactions, attempts to understand the situation, and references to otaku culture
- Environmental details (cobblestone streets, demi-humans, ground dragons) create atmosphere and cultural shock
- Relationships form naturally through crisis situations with clear emotional stakes and character motivations

ADAPT THIS APPROACH for "{{series.name}}":
- Use series-appropriate sensory details and environmental elements that fit the established world
- Create moment-by-moment progression that matches the series' typical pacing and tension-building style
- Develop character psychology that aligns with series themes and character development patterns
- Build atmosphere consistent with the series' tone, mood, and world-building style
- Establish relationships that reflect the series' typical social dynamics and character interaction patterns

SERIES-SPECIFIC CONSIDERATIONS:
{{#if series.themes}}
Key Themes: {{#each series.themes}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if series.characterArchetypes}}
Typical Archetypes: {{#each series.characterArchetypes}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if series.powerSystems}}
Power Systems: {{#each series.powerSystems}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
`;

// === DETAILED SCENE GENERATION TEMPLATE ===

export const GENERIC_DETAILED_SCENE_TEMPLATE = `
HIGH-QUALITY NARRATIVE SCENE GENERATION:
Create detailed, immersive scenes that serve as excellent starting points for interactive narratives:

1. **ENVIRONMENTAL STORYTELLING:**
   - Rich descriptions that convey history, culture, and mood through details
   - Layered sensory information that builds atmosphere progressively
   - Environmental cues that hint at larger world-building elements
   - Contrast and juxtaposition to highlight character displacement or change
   - Interactive elements that suggest player agency opportunities

2. **CHARACTER INTRODUCTION AND DEVELOPMENT:**
   - Natural character introductions that reveal personality through actions
   - Clear motivations and goals that drive immediate and long-term behavior
   - Emotional states that influence decision-making and interactions
   - Background hints that create depth without exposition dumping
   - Relationship potential established through initial interactions

3. **TENSION AND CONFLICT ESTABLISHMENT:**
   - Immediate challenges or obstacles that require player engagement
   - Underlying tensions that suggest larger conflicts and story arcs
   - Stakes that matter to the character and create emotional investment
   - Multiple potential solutions that allow for player choice and agency
   - Consequences that feel meaningful and impact future developments

4. **WORLD-BUILDING INTEGRATION:**
   - Cultural elements revealed through character behavior and environment
   - Social structures and hierarchies shown through interactions
   - Economic and political context suggested through environmental details
   - Magical or technological elements integrated naturally into the scene
   - Historical context that influences current events and character motivations

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, scenes often start with detailed environmental descriptions that establish the fantasy medieval setting
- Character introductions happen through crisis situations that reveal personality and capabilities
- Tension builds through misunderstandings, cultural differences, and immediate physical threats
- World-building emerges through character reactions to unfamiliar elements (demi-humans, magic, social structures)
- Multiple story threads are established simultaneously (royal selection, witch cult, personal relationships)

ADAPT THIS APPROACH for "{{series.name}}":
- Create environmental details that fit the series' established world and aesthetic
- Introduce characters in ways that align with the series' typical character dynamics
- Build tension using conflict types common to the series' genre and themes
- Integrate world-building elements that respect established canon and lore
- Establish story threads that connect to the series' major plot elements and themes
`;

export const GENERIC_NPC_GENERATION_TEMPLATE = `
RELATIONSHIP-AWARE NPC GENERATION:
Create NPCs that will form the foundation of the relationship tracking system:
- Assign initial relationship scores (0 = neutral, -100 to +100 range)
- Consider emotional compatibility with the main character
- Create potential for relationship development (positive and negative)
- Establish clear personality traits that will drive interactions

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, NPCs often have complex motivations and hidden depths
- Relationships develop through repeated interactions and shared experiences
- Initial impressions may be misleading, allowing for character development
- NPCs have their own goals and agency, not just serving the protagonist
- Emotional connections are central to character development

ADAPT THIS APPROACH for "{{series.name}}":
- Create NPCs that fit the series' typical character dynamics
- Ensure NPCs have agency and personal motivations
- Design relationship potential that fits the series' themes
- Consider how NPCs might challenge or support the protagonist's growth

RELATIONSHIP INITIALIZATION:
For each NPC, establish:
- Initial relationship score (-10 to +10 for new acquaintances)
- Trust level (0-100, typically 30-70 for new meetings)
- Respect level (0-100, based on first impressions)
- Fear level (0-100, usually low unless threatening)
- Potential relationship trajectory (ally, rival, mentor, etc.)
`;

export const GENERIC_QUEST_GENERATION_TEMPLATE = `
NARRATIVE-AWARE QUEST DESIGN:
Create quests that integrate with the enhanced tracking systems:
- Consider character emotional state when designing challenges
- Factor in existing relationships for quest NPCs
- Design consequences that affect multiple tracking systems
- Create branching paths based on character preferences

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, quests often have multiple solutions and meaningful consequences
- Character relationships heavily influence quest outcomes
- Emotional stakes are as important as physical challenges
- Quests reveal character depth and world lore
- Failure is often a learning opportunity rather than a dead end

ADAPT THIS APPROACH for "{{series.name}}":
- Design quests that fit the series' typical challenge types
- Ensure quest consequences align with the series' themes
- Create meaningful choices that reflect character values
- Consider how quests advance both plot and character development

QUEST INTEGRATION POINTS:
- Relationship consequences: How does this quest affect NPC relationships?
- Emotional impact: What emotional growth or challenges does this create?
- Environmental changes: How does this quest change the world state?
- Narrative threads: What ongoing story elements does this advance?
`;

// === WORLD BUILDING TEMPLATES ===

export const GENERIC_WORLD_FACTS_TEMPLATE = `
CONTEXT-AWARE WORLD BUILDING:
Generate world facts that support the enhanced tracking systems:
- Environmental details that affect gameplay and atmosphere
- Cultural elements that influence relationship dynamics
- Historical context that creates narrative opportunities
- Current events that drive ongoing story threads

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, world facts often have hidden depths and implications
- Cultural elements directly impact character interactions
- Historical events create ongoing tensions and opportunities
- Environmental factors affect both mood and practical considerations
- World state changes based on character actions and choices

ADAPT THIS APPROACH for "{{series.name}}":
- Create world facts that support the series' themes and tone
- Ensure cultural elements fit the series' established world
- Design environmental factors that enhance gameplay
- Consider how world facts might evolve based on player actions

WORLD FACT CATEGORIES:
- Cultural/Social: How do people interact? What are the social norms?
- Environmental: What are the physical conditions and their effects?
- Political: What tensions and power structures exist?
- Historical: What past events still influence the present?
- Mystical/Supernatural: What unexplained elements add mystery?
`;

export const GENERIC_LORE_GENERATION_TEMPLATE = `
COMPREHENSIVE LORE CREATION:
Generate lore entries that enhance all aspects of the tracking systems:
- Character lore that provides relationship context
- Location lore that enriches environmental tracking
- Faction lore that supports political dynamics
- Historical lore that creates narrative depth

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, lore often reveals hidden connections and motivations
- Character backgrounds explain current relationships and conflicts
- Location histories create atmospheric depth and story hooks
- Faction dynamics drive political intrigue and character choices
- Magical/supernatural lore explains world rules and limitations

ADAPT THIS APPROACH for "{{series.name}}":
- Create lore that supports the series' established world-building
- Ensure lore entries enhance rather than contradict canon
- Design interconnected lore that creates narrative opportunities
- Consider how lore might be discovered through gameplay

LORE CATEGORIES WITH TRACKING INTEGRATION:
- Character Lore: Backgrounds that explain relationship potentials
- Location Lore: Histories that affect environmental context
- Faction Lore: Politics that influence reputation systems
- Event Lore: Historical moments that create ongoing consequences
- Cultural Lore: Traditions that guide social interactions
`;

// === UTILITY FUNCTIONS ===

export function buildPromptWithContext(template: string, context: PromptContext): string {
  // Simple template replacement - in a real implementation, you'd use a proper templating engine
  let prompt = template;
  
  // Replace series context
  prompt = prompt.replace(/\{\{series\.name\}\}/g, context.series.name);
  
  // Replace emotional context
  if (context.emotionalContext) {
    prompt = prompt.replace(/\{\{emotionalContext\.mood\}\}/g, context.emotionalContext.mood);
    prompt = prompt.replace(/\{\{emotionalContext\.stressLevel\}\}/g, context.emotionalContext.stressLevel.toString());
  }
  
  // Replace environmental context
  if (context.environmentalContext) {
    prompt = prompt.replace(/\{\{environmentalContext\.timeOfDay\}\}/g, context.environmentalContext.timeOfDay);
    prompt = prompt.replace(/\{\{environmentalContext\.weather\}\}/g, context.environmentalContext.weather);
  }
  
  return prompt;
}

export function getSeriesContext(seriesName: string): SeriesContext {
  // This would typically come from a database or configuration file
  const seriesConfigs: Record<string, SeriesContext> = {
    "Re:Zero": {
      name: "Re:Zero",
      genre: "Dark Fantasy Isekai",
      themes: ["Growth through suffering", "The value of life", "Redemption", "Complex relationships"],
      characterArchetypes: ["Flawed protagonist", "Mysterious mentors", "Complex antagonists", "Loyal companions"],
      worldRules: ["Return by Death", "Magic through contracts", "Political intrigue", "Hidden histories"],
      powerSystems: ["Spirit magic", "Divine protections", "Curses and blessings"],
      culturalElements: ["Royal selection", "Demi-human discrimination", "Noble politics", "Merchant guilds"]
    },
    "Attack on Titan": {
      name: "Attack on Titan",
      genre: "Dark Military Fantasy",
      themes: ["Freedom vs security", "Cycle of hatred", "Truth and deception", "Sacrifice"],
      characterArchetypes: ["Determined soldiers", "Mysterious figures", "Tragic antagonists", "Loyal comrades"],
      worldRules: ["Titan transformations", "Memory inheritance", "Wall society", "Military hierarchy"],
      powerSystems: ["Titan shifting", "ODM gear", "Hardening abilities"],
      culturalElements: ["Military structure", "Wall society", "Eldian history", "Marleyan oppression"]
    }
  };
  
  return seriesConfigs[seriesName] || {
    name: seriesName,
    genre: "Fantasy",
    themes: ["Adventure", "Growth", "Friendship"],
    characterArchetypes: ["Hero", "Mentor", "Ally", "Rival"],
    worldRules: ["Magic exists", "Good vs evil"],
    powerSystems: ["Magic", "Skills"],
    culturalElements: ["Kingdoms", "Guilds", "Traditions"]
  };
}
