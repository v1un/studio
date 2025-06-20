/**
 * AI-Driven Character Progression Prompt Templates
 * 
 * This module provides specialized prompt templates for generating dynamic,
 * narrative-integrated character progression content that adapts to story context.
 */

import type { 
  AISkillTreeGenerationContext, 
  CharacterProfile, 
  StructuredStoryState,
  PlayerChoice 
} from '@/types/story';

// === DYNAMIC SKILL TREE GENERATION ===

export const DYNAMIC_SKILL_TREE_GENERATION_TEMPLATE = `
CONTEXT-AWARE SKILL TREE GENERATION:
Generate a custom skill tree that adapts to the character's story progression and experiences.

CHARACTER CONTEXT:
- Name: {{character.name}}
- Class: {{character.class}}
- Level: {{character.level}}
- Current Skills: {{character.skillsAndAbilities}}
- Personality Traits: {{character.personalityTraits}}

STORY CONTEXT:
- Recent Events: {{recentStoryEvents}}
- Current Story Arc: {{currentStoryArc}}
- Character Choices: {{characterChoices}}
- Relationship Dynamics: {{relationshipContext}}
- Environmental Factors: {{environmentalContext}}

SERIES ADAPTATION FOR "{{seriesName}}":
Create skills that fit the established world rules and power systems while reflecting the character's unique journey.

SKILL TREE GENERATION REQUIREMENTS:

1. **NARRATIVE INTEGRATION:**
   - Skills must logically follow from character experiences
   - Each skill should have clear story justification
   - Skills should enable future narrative possibilities
   - Consider how skills reflect character growth and choices

2. **ADAPTIVE PROGRESSION:**
   - Create branching paths based on character decisions
   - Include skills that evolve based on usage patterns
   - Design fusion opportunities between related skills
   - Ensure skills scale with story progression

3. **CONTEXTUAL RELEVANCE:**
   - Skills should be relevant to current story challenges
   - Consider environmental and social contexts
   - Factor in relationship dynamics and faction standings
   - Align with character's role in the narrative

4. **SERIES AUTHENTICITY:**
   - Respect established power systems and world rules
   - Use series-appropriate terminology and concepts
   - Maintain consistency with character archetypes
   - Consider cultural and social implications

EXAMPLE APPROACH (using Re:Zero as reference):
- In Re:Zero, Subaru's skills develop based on his experiences with Return by Death
- Skills like "Tactical Analysis" emerge from repeated loop experiences
- Social skills develop through relationship building with various characters
- Combat skills adapt to the specific threats he faces
- Skills often have emotional or psychological components reflecting his growth

ADAPT THIS APPROACH for "{{seriesName}}":
- Create skills that reflect the series' unique power systems
- Ensure skills align with the character's role and experiences
- Consider how skills might interact with series-specific mechanics
- Design progression paths that feel authentic to the world

OUTPUT REQUIREMENTS:
Generate a skill tree with:
- 8-12 interconnected skill nodes
- Clear prerequisites and progression paths
- Narrative justification for each skill
- Evolution triggers based on story events
- Fusion opportunities with existing skills
- Contextual modifiers for different situations

Each skill should include:
- Name and description
- Story-based justification
- Mechanical effects
- Evolution conditions
- Narrative potential
`;

export const SKILL_EVOLUTION_ANALYSIS_TEMPLATE = `
DYNAMIC SKILL EVOLUTION SYSTEM:
Analyze character skill usage and story progression to determine skill evolution opportunities.

SKILL USAGE ANALYSIS:
- Skill: {{skillName}}
- Usage Frequency: {{usageFrequency}}
- Effectiveness in Different Contexts: {{contextualEffectiveness}}
- Story Impact: {{storyImpact}}
- Character Growth Contribution: {{characterGrowthContribution}}

STORY PROGRESSION FACTORS:
- Recent Milestones: {{recentMilestones}}
- Character Development: {{characterDevelopment}}
- Relationship Changes: {{relationshipChanges}}
- Environmental Challenges: {{environmentalChallenges}}

EVOLUTION CRITERIA:
1. **USAGE-BASED EVOLUTION:**
   - High usage frequency with consistent effectiveness
   - Skill has been crucial in multiple story situations
   - Character has shown mastery and innovation in skill application

2. **STORY-DRIVEN EVOLUTION:**
   - Skill aligns with major character development moments
   - Recent story events provide logical evolution catalyst
   - Evolution would enhance future narrative possibilities

3. **CONTEXTUAL ADAPTATION:**
   - Skill needs modification for new challenges
   - Environmental or social factors require skill adaptation
   - Relationship dynamics influence skill development

EVOLUTION TYPES:
- **Enhancement:** Improve existing effects and add new capabilities
- **Specialization:** Branch into focused, specialized versions
- **Fusion:** Combine with other skills for unique abilities
- **Transformation:** Fundamental change based on character growth

OUTPUT REQUIREMENTS:
For each eligible skill evolution:
- Evolution trigger and justification
- New skill name and description
- Enhanced or modified effects
- Narrative significance
- Future development potential
`;

export const PROGRESSION_RECOMMENDATION_TEMPLATE = `
AI PROGRESSION ADVISOR SYSTEM:
Provide intelligent recommendations for character progression based on story context and character development.

CHARACTER ANALYSIS:
- Current Build: {{characterBuild}}
- Playstyle Preferences: {{playstylePreferences}}
- Story Role: {{storyRole}}
- Recent Challenges: {{recentChallenges}}
- Future Story Directions: {{futureStoryDirections}}

PROGRESSION CONTEXT:
- Available Points: {{availablePoints}}
- Unlocked Options: {{unlockedOptions}}
- Story Requirements: {{storyRequirements}}
- Character Goals: {{characterGoals}}

RECOMMENDATION CRITERIA:

1. **STORY ALIGNMENT:**
   - How well does the progression support current narrative?
   - Does it enable interesting future story possibilities?
   - Is it consistent with character development arc?

2. **CHARACTER COHERENCE:**
   - Does it fit the character's personality and background?
   - Is it consistent with previous choices and development?
   - Does it enhance the character's unique identity?

3. **PRACTICAL UTILITY:**
   - How useful will this be for upcoming challenges?
   - Does it address current character weaknesses?
   - Does it synergize with existing abilities?

4. **NARRATIVE POTENTIAL:**
   - What new story opportunities does this create?
   - How might this affect relationships and interactions?
   - What long-term consequences might this have?

RECOMMENDATION TYPES:
- **Immediate Needs:** Address current story challenges
- **Character Development:** Support personality growth
- **Story Preparation:** Prepare for anticipated events
- **Unique Opportunities:** Rare or special progression options
- **Synergy Building:** Enhance existing ability combinations

OUTPUT REQUIREMENTS:
For each recommendation:
- Progression option and cost
- Priority level (1-10)
- Detailed reasoning
- Expected benefits
- Potential drawbacks
- Alternative options
- Long-term implications
`;

export const BACKSTORY_INTEGRATION_TEMPLATE = `
CHARACTER BACKSTORY INTEGRATION ENGINE:
Generate character backstory elements that naturally integrate with and influence progression systems.

CHARACTER FOUNDATION:
- Current Identity: {{character.name}} - {{character.class}}
- Established Traits: {{establishedTraits}}
- Current Skills: {{currentSkills}}
- Story Position: {{storyPosition}}

BACKSTORY GENERATION REQUIREMENTS:

1. **PROGRESSION INFLUENCE:**
   - Create backstory elements that explain current abilities
   - Establish foundations for future skill development
   - Provide narrative justification for progression paths
   - Create meaningful restrictions and advantages

2. **NARRATIVE INTEGRATION:**
   - Backstory should enhance current story potential
   - Create hooks for future story development
   - Establish relationships and connections
   - Provide motivation and character depth

3. **SERIES AUTHENTICITY:**
   - Respect established world rules and lore
   - Use appropriate cultural and social elements
   - Maintain consistency with series themes
   - Consider power system implications

BACKSTORY ELEMENTS TO GENERATE:
- **Origin Story:** How character gained initial abilities
- **Formative Experiences:** Events that shaped personality and skills
- **Relationships:** Past connections that influence current interactions
- **Achievements/Failures:** Experiences that affect confidence and approach
- **Hidden Knowledge:** Information that might become relevant
- **Unresolved Issues:** Plot hooks for future development

PROGRESSION INTEGRATION:
- **Skill Affinities:** Natural talents based on background
- **Learning Restrictions:** Things character struggles with
- **Special Unlocks:** Unique abilities tied to backstory
- **Trait Development:** How personality evolved from experiences
- **Motivation Drivers:** What pushes character to grow

OUTPUT REQUIREMENTS:
Generate backstory that includes:
- 3-5 major formative experiences
- 2-3 significant relationships
- 1-2 special abilities or knowledge areas
- 1-2 character limitations or challenges
- Clear progression implications for each element
- Narrative hooks for future story development
`;
