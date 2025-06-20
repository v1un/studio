/**
 * Dynamic Specialization Generation Flow
 * 
 * AI-powered generation of specialization trees and nodes based on story context,
 * character development, and series-specific themes.
 */

import { generate } from '@genkit-ai/ai';
import { gemini15Flash, gemini15Pro } from '@genkit-ai/googleai';
import type {
  CharacterProfile,
  StructuredStoryState,
  SpecializationTree,
  SpecializationNode,
  SpecializationCategory,
  SpecializationBonus
} from '@/types/story';
import { generateUUID } from '@/lib/utils';
import { getSeriesConfig } from '@/lib/series-adapter';

const STANDARD_MODEL_NAME = 'googleai/gemini-1.5-flash';
const PREMIUM_MODEL_NAME = 'googleai/gemini-1.5-pro';

export interface DynamicSpecializationInput {
  character: CharacterProfile;
  storyState: StructuredStoryState;
  seriesName: string;
  category: SpecializationCategory;
  analysisResult: any;
  generationMode: 'new_tree' | 'hybrid_tree' | 'node_enhancement';
  baseTemplate?: SpecializationTree;
  usePremiumAI?: boolean;
}

export interface DynamicSpecializationOutput {
  specializationTree: SpecializationTree;
  generationMetadata: {
    inspirationSources: string[];
    balanceLevel: string;
    seriesCompliance: number;
    uniquenessScore: number;
  };
  integrationNotes: string[];
}

const SPECIALIZATION_GENERATION_TEMPLATE = `
You are an expert game designer creating dynamic specialization trees for an interactive story game set in the {{seriesName}} universe.

**Character Context:**
- Name: {{character.name}}
- Class: {{character.class}}
- Level: {{character.level}}
- Personality: {{character.personalityTraits}}
- Current Skills: {{character.skillsAndAbilities}}
- Recent Experiences: {{recentExperiences}}

**Story Context:**
- Current Arc: {{currentStoryArc}}
- Recent Events: {{recentEvents}}
- Relationship Dynamics: {{relationshipContext}}
- Power Level: {{powerLevel}}

**Series Context ({{seriesName}}):**
- Power System: {{seriesContext.powerSystem}}
- Thematic Elements: {{seriesContext.thematicElements}}
- Canonical Restrictions: {{seriesContext.canonicalRestrictions}}

**Generation Requirements:**
- Category: {{category}}
- Mode: {{generationMode}}
- Balance Level: {{balanceLevel}}
- Series Compliance: Must fit {{seriesName}} canon and themes

**Task:** Create a {{category}} specialization tree that:
1. Reflects the character's growth and experiences
2. Fits naturally within the {{seriesName}} universe
3. Provides meaningful progression choices
4. Maintains game balance
5. Offers unique abilities that feel earned through story progression

{{#if baseTemplate}}
**Base Template to Enhance:**
{{baseTemplate}}
Enhance this template with new nodes and connections that reflect the character's story journey.
{{else}}
Create a completely new specialization tree with 4-6 nodes across 2-3 tiers.
{{/if}}

**Output Format:**
Return a JSON object with the following structure:
{
  "id": "unique_tree_id",
  "name": "Tree Name",
  "description": "Detailed description explaining how this specialization relates to the character's journey",
  "category": "{{category}}",
  "seriesOrigin": "{{seriesName}}",
  "nodes": [
    {
      "id": "node_id",
      "name": "Node Name",
      "description": "How this ability was developed through story experiences",
      "tier": 1,
      "position": {"x": 2, "y": 1},
      "pointCost": 1,
      "prerequisites": [],
      "bonuses": [
        {
          "type": "stat_multiplier|skill_enhancement|narrative_influence|unique_ability",
          "value": 10,
          "description": "Clear description of the bonus",
          "appliesAtLevel": 1
        }
      ],
      "isUnlocked": true,
      "isPurchased": false,
      "icon": "icon-name",
      "color": "#hexcolor",
      "storyContext": "How this ability connects to character experiences"
    }
  ],
  "connections": [
    {
      "fromNodeId": "prerequisite_node",
      "toNodeId": "dependent_node",
      "type": "prerequisite"
    }
  ],
  "tiers": [
    {
      "tier": 1,
      "name": "Tier Name",
      "description": "Tier description",
      "requiredPoints": 0
    }
  ],
  "unlockRequirements": [
    {
      "type": "level|attribute|story_event",
      "target": "level",
      "value": 5,
      "description": "Requirement description"
    }
  ],
  "maxPoints": 6,
  "pointsSpent": 0,
  "completionBonuses": [],
  "generationMetadata": {
    "inspirationSources": ["story events that inspired this tree"],
    "balanceLevel": "moderate",
    "seriesCompliance": 85,
    "uniquenessScore": 75
  }
}

**Important Guidelines:**
- Abilities should feel earned through character experiences
- Power levels should be appropriate for character level and story progression
- Include story context for each node explaining its development
- Maintain series authenticity and canonical consistency
- Provide meaningful choices and trade-offs
- Ensure balanced progression that doesn't overshadow existing content
`;

export async function generateDynamicSpecializationTree(
  input: DynamicSpecializationInput
): Promise<DynamicSpecializationOutput> {
  console.log(`[DynamicSpecGen] Generating ${input.category} tree for ${input.character.name} in ${input.seriesName}`);

  const seriesConfig = getSeriesConfig(input.seriesName);
  const modelName = input.usePremiumAI ? PREMIUM_MODEL_NAME : STANDARD_MODEL_NAME;

  // Build context-aware prompt
  const contextualPrompt = buildSpecializationPrompt(input, seriesConfig);

  try {
    const result = await generate({
      model: modelName,
      prompt: contextualPrompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 2000,
      },
    });

    const generatedContent = result.text();
    console.log(`[DynamicSpecGen] Raw AI response:`, generatedContent);

    // Parse and validate the generated specialization tree
    const parsedTree = parseSpecializationResponse(generatedContent, input);
    
    // Apply additional validation and balancing
    const balancedTree = applyBalanceValidation(parsedTree, input);
    
    // Create output with metadata
    const output: DynamicSpecializationOutput = {
      specializationTree: balancedTree,
      generationMetadata: parsedTree.generationMetadata || {
        inspirationSources: ['Character development', 'Story progression'],
        balanceLevel: 'moderate',
        seriesCompliance: 80,
        uniquenessScore: 70
      },
      integrationNotes: [
        `Generated for ${input.character.name} based on recent story experiences`,
        `Designed to complement existing ${input.category} specializations`,
        `Maintains ${input.seriesName} series authenticity`
      ]
    };

    console.log(`[DynamicSpecGen] Successfully generated specialization tree: ${balancedTree.name}`);
    return output;

  } catch (error) {
    console.error('[DynamicSpecGen] Generation failed:', error);
    throw new Error(`Failed to generate dynamic specialization: ${error.message}`);
  }
}

function buildSpecializationPrompt(
  input: DynamicSpecializationInput,
  seriesConfig: any
): string {
  const { character, storyState, analysisResult } = input;
  
  return SPECIALIZATION_GENERATION_TEMPLATE
    .replace(/\{\{seriesName\}\}/g, input.seriesName)
    .replace(/\{\{character\.name\}\}/g, character.name)
    .replace(/\{\{character\.class\}\}/g, character.class || 'Adventurer')
    .replace(/\{\{character\.level\}\}/g, character.level.toString())
    .replace(/\{\{character\.personalityTraits\}\}/g, JSON.stringify(character.personalityTraits || []))
    .replace(/\{\{character\.skillsAndAbilities\}\}/g, JSON.stringify(character.skillsAndAbilities || []))
    .replace(/\{\{recentExperiences\}\}/g, JSON.stringify(analysisResult.recentExperiences || []))
    .replace(/\{\{currentStoryArc\}\}/g, storyState.currentStoryArcId || 'Beginning')
    .replace(/\{\{recentEvents\}\}/g, JSON.stringify(analysisResult.recentExperiences || []))
    .replace(/\{\{relationshipContext\}\}/g, JSON.stringify(analysisResult.relationshipInfluences || []))
    .replace(/\{\{powerLevel\}\}/g, analysisResult.powerLevel?.toString() || '50')
    .replace(/\{\{seriesContext\.powerSystem\}\}/g, analysisResult.seriesContext?.powerSystem || 'Generic Magic')
    .replace(/\{\{seriesContext\.thematicElements\}\}/g, JSON.stringify(analysisResult.seriesContext?.thematicElements || []))
    .replace(/\{\{seriesContext\.canonicalRestrictions\}\}/g, JSON.stringify(analysisResult.seriesContext?.canonicalRestrictions || []))
    .replace(/\{\{category\}\}/g, input.category)
    .replace(/\{\{generationMode\}\}/g, input.generationMode)
    .replace(/\{\{balanceLevel\}\}/g, 'moderate')
    .replace(/\{\{baseTemplate\}\}/g, input.baseTemplate ? JSON.stringify(input.baseTemplate) : '');
}

function parseSpecializationResponse(response: string, input: DynamicSpecializationInput): SpecializationTree {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields and apply defaults
    const tree: SpecializationTree = {
      id: parsed.id || generateUUID(),
      name: parsed.name || `Dynamic ${input.category} Specialization`,
      description: parsed.description || 'A dynamically generated specialization tree',
      category: input.category,
      seriesOrigin: input.seriesName,
      nodes: parsed.nodes || [],
      connections: parsed.connections || [],
      tiers: parsed.tiers || [{ tier: 1, name: 'Foundation', description: 'Basic abilities', requiredPoints: 0 }],
      unlockRequirements: parsed.unlockRequirements || [],
      maxPoints: parsed.maxPoints || 6,
      pointsSpent: 0,
      completionBonuses: parsed.completionBonuses || []
    };

    // Validate and fix node structure
    tree.nodes = tree.nodes.map((node: any) => ({
      id: node.id || generateUUID(),
      name: node.name || 'Unnamed Ability',
      description: node.description || 'A powerful ability',
      tier: node.tier || 1,
      position: node.position || { x: 1, y: 1 },
      pointCost: Math.max(1, Math.min(3, node.pointCost || 1)),
      prerequisites: node.prerequisites || [],
      bonuses: node.bonuses || [],
      isUnlocked: node.isUnlocked !== false,
      isPurchased: false,
      icon: node.icon || 'star',
      color: node.color || '#8B5CF6',
      storyContext: node.storyContext || 'Developed through experience'
    }));

    return tree;

  } catch (error) {
    console.error('[DynamicSpecGen] Parse error:', error);
    // Return fallback tree
    return createFallbackTree(input);
  }
}

function createFallbackTree(input: DynamicSpecializationInput): SpecializationTree {
  return {
    id: generateUUID(),
    name: `${input.character.name}'s ${input.category} Path`,
    description: `A specialized path developed through ${input.character.name}'s unique experiences`,
    category: input.category,
    seriesOrigin: input.seriesName,
    nodes: [
      {
        id: generateUUID(),
        name: 'Foundation',
        description: 'Basic mastery of core principles',
        tier: 1,
        position: { x: 2, y: 1 },
        pointCost: 1,
        prerequisites: [],
        bonuses: [
          {
            type: 'stat_multiplier',
            value: 5,
            description: '+5% effectiveness in related actions',
            appliesAtLevel: 1
          }
        ],
        isUnlocked: true,
        isPurchased: false,
        icon: 'star',
        color: '#8B5CF6'
      }
    ],
    connections: [],
    tiers: [{ tier: 1, name: 'Foundation', description: 'Basic abilities', requiredPoints: 0 }],
    unlockRequirements: [],
    maxPoints: 3,
    pointsSpent: 0,
    completionBonuses: []
  };
}

function applyBalanceValidation(tree: SpecializationTree, input: DynamicSpecializationInput): SpecializationTree {
  // Ensure point costs are reasonable
  tree.nodes = tree.nodes.map(node => ({
    ...node,
    pointCost: Math.max(1, Math.min(3, node.pointCost))
  }));

  // Ensure bonus values are balanced
  tree.nodes = tree.nodes.map(node => ({
    ...node,
    bonuses: node.bonuses.map(bonus => ({
      ...bonus,
      value: Math.max(1, Math.min(50, bonus.value)) // Cap bonus values
    }))
  }));

  // Ensure reasonable max points
  tree.maxPoints = Math.max(3, Math.min(10, tree.maxPoints));

  return tree;
}
