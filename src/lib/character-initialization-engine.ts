/**
 * Character Initialization Engine
 * 
 * Implements precise canon compliance for character starting conditions
 * while maintaining generic design patterns for future series adaptations.
 */

import type { CharacterProfile, Skill } from '@/types/story';
import { getSeriesConfig, type CharacterStartingTemplate } from '@/lib/series-adapter';
import { generateUUID } from '@/lib/utils';

export interface CharacterInitializationInput {
  seriesName: string;
  characterName?: string;
  characterClass?: string;
  useCanonicalStartingConditions: boolean;
}

export interface CharacterInitializationResult {
  characterProfile: CharacterProfile;
  canonCompliance: {
    isCanonical: boolean;
    appliedTemplate?: string;
    deviations: string[];
    validationNotes: string[];
  };
  startingInventory: any[];
  specialConditions: {
    hiddenAbilities: string[];
    activeEffects: string[];
    knowledgeLimitations: string[];
  };
}

export class CharacterInitializationEngine {
  private seriesConfig: any;
  
  constructor(seriesName: string) {
    this.seriesConfig = getSeriesConfig(seriesName);
  }

  async initializeCharacter(input: CharacterInitializationInput): Promise<CharacterInitializationResult> {
    console.log(`[CharacterInitializationEngine] Initializing character for ${input.seriesName}`);
    
    // Find matching canonical template if available
    const canonicalTemplate = this.findMatchingTemplate(input.characterName, input.characterClass);
    
    if (canonicalTemplate && input.useCanonicalStartingConditions) {
      return this.initializeFromCanonicalTemplate(canonicalTemplate, input);
    } else {
      return this.initializeGenericCharacter(input);
    }
  }

  private findMatchingTemplate(characterName?: string, characterClass?: string): CharacterStartingTemplate | null {
    if (!this.seriesConfig.canonCompliance?.characterStartingConditions) {
      return null;
    }

    // First try exact name match
    if (characterName) {
      const nameMatch = this.seriesConfig.canonCompliance.characterStartingConditions.find(
        (template: CharacterStartingTemplate) => 
          template.characterName.toLowerCase() === characterName.toLowerCase()
      );
      if (nameMatch) return nameMatch;
    }

    // Then try class-based matching for generic templates
    if (characterClass) {
      const classMatch = this.seriesConfig.canonCompliance.characterStartingConditions.find(
        (template: CharacterStartingTemplate) => 
          template.isExample && 
          template.characterName.toLowerCase().includes(characterClass.toLowerCase())
      );
      if (classMatch) return classMatch;
    }

    return null;
  }

  private async initializeFromCanonicalTemplate(
    template: CharacterStartingTemplate, 
    input: CharacterInitializationInput
  ): Promise<CharacterInitializationResult> {
    console.log(`[CharacterInitializationEngine] Using canonical template: ${template.characterName}`);

    // Build character profile from template
    const characterProfile: CharacterProfile = {
      id: generateUUID(),
      name: input.characterName || template.characterName,
      class: input.characterClass || this.inferClassFromTemplate(template),
      description: this.buildDescriptionFromTemplate(template),
      
      // Physical stats based on template
      health: this.calculateHealthFromTemplate(template),
      maxHealth: this.calculateHealthFromTemplate(template),
      mana: template.abilities.magicalAbilities.length > 0 ? 50 : 0,
      maxMana: template.abilities.magicalAbilities.length > 0 ? 50 : 0,
      
      // Attributes based on template
      strength: this.calculateAttributeFromTemplate(template, 'strength'),
      dexterity: this.calculateAttributeFromTemplate(template, 'dexterity'),
      constitution: this.calculateAttributeFromTemplate(template, 'constitution'),
      intelligence: this.calculateAttributeFromTemplate(template, 'intelligence'),
      wisdom: this.calculateAttributeFromTemplate(template, 'wisdom'),
      charisma: this.calculateAttributeFromTemplate(template, 'charisma'),
      
      // Starting progression
      level: 1,
      experiencePoints: 0,
      experienceToNextLevel: 100,
      
      // Language abilities from template
      languageReading: template.knowledgeState.languageReading,
      languageSpeaking: template.knowledgeState.languageSpeaking,
      
      // Currency (usually none for transported characters)
      currency: 0,
      
      // Skills from template
      skillsAndAbilities: this.buildSkillsFromTemplate(template),
      activeTemporaryEffects: [],
    };

    // Build starting inventory from template possessions
    const startingInventory = this.buildInventoryFromTemplate(template);

    // Extract special conditions
    const specialConditions = {
      hiddenAbilities: template.specialConditions.hiddenAbilities,
      activeEffects: [
        ...template.specialConditions.curses,
        ...template.specialConditions.blessings
      ],
      knowledgeLimitations: template.knowledgeState.unknownConcepts,
    };

    return {
      characterProfile,
      canonCompliance: {
        isCanonical: true,
        appliedTemplate: template.characterName,
        deviations: [],
        validationNotes: [
          `Applied canonical starting conditions for ${template.characterName}`,
          `Physical state: ${template.physicalState.appearance}`,
          `Knowledge limitations: ${template.knowledgeState.unknownConcepts.join(', ')}`,
          `Special conditions: ${template.specialConditions.hiddenAbilities.join(', ')}`
        ]
      },
      startingInventory,
      specialConditions,
    };
  }

  private async initializeGenericCharacter(input: CharacterInitializationInput): Promise<CharacterInitializationResult> {
    console.log(`[CharacterInitializationEngine] Using generic initialization for ${input.seriesName}`);

    // Create generic character based on series archetypes
    const characterProfile: CharacterProfile = {
      id: generateUUID(),
      name: input.characterName || "Unnamed Character",
      class: input.characterClass || "Adventurer",
      description: `A ${input.characterClass || 'character'} in the world of ${input.seriesName}`,
      
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      
      level: 1,
      experiencePoints: 0,
      experienceToNextLevel: 100,
      
      languageReading: 100,
      languageSpeaking: 100,
      currency: 100,
      
      skillsAndAbilities: [],
      activeTemporaryEffects: [],
    };

    return {
      characterProfile,
      canonCompliance: {
        isCanonical: false,
        deviations: ["No canonical template available", "Using generic initialization"],
        validationNotes: ["Generic character created based on series archetypes"]
      },
      startingInventory: [],
      specialConditions: {
        hiddenAbilities: [],
        activeEffects: [],
        knowledgeLimitations: [],
      },
    };
  }

  private inferClassFromTemplate(template: CharacterStartingTemplate): string {
    // Infer class from abilities and background
    if (template.abilities.magicalAbilities.length > 0) return "Mage";
    if (template.abilities.physicalSkills.some(skill => skill.includes("combat"))) return "Warrior";
    if (template.knowledgeState.specialKnowledge.includes("Modern world technology")) return "Otherworlder";
    return "Adventurer";
  }

  private buildDescriptionFromTemplate(template: CharacterStartingTemplate): string {
    const parts = [
      template.physicalState.appearance,
      `Currently wearing: ${template.physicalState.clothing.join(', ')}`,
      `Personality: ${template.psychologicalState.personality.join(', ')}`,
      `Background: ${template.knowledgeState.specialKnowledge.join(', ')}`
    ];
    return parts.join('. ');
  }

  private calculateHealthFromTemplate(template: CharacterStartingTemplate): number {
    // Base health calculation from physical condition
    let baseHealth = 80;
    
    if (template.psychologicalState.mentalConditions.includes("Hikikomori background")) {
      baseHealth -= 20; // Poor physical condition
    }
    
    return Math.max(50, baseHealth);
  }

  private calculateAttributeFromTemplate(template: CharacterStartingTemplate, attribute: string): number {
    let baseValue = 8; // Below average starting point
    
    switch (attribute) {
      case 'strength':
        if (template.abilities.physicalSkills.length === 0) baseValue = 6; // Very weak
        break;
      case 'dexterity':
        if (template.knowledgeState.specialKnowledge.includes("Gaming")) baseValue = 10;
        break;
      case 'constitution':
        if (template.psychologicalState.mentalConditions.includes("Hikikomori")) baseValue = 6;
        break;
      case 'intelligence':
        if (template.knowledgeState.specialKnowledge.length > 2) baseValue = 12;
        break;
      case 'wisdom':
        if (template.psychologicalState.personality.includes("Social awkwardness")) baseValue = 6;
        break;
      case 'charisma':
        if (template.psychologicalState.personality.includes("Inferiority complex")) baseValue = 7;
        break;
    }
    
    return Math.max(5, Math.min(15, baseValue));
  }

  private buildSkillsFromTemplate(template: CharacterStartingTemplate): Skill[] {
    const skills: Skill[] = [];
    
    // Add skills from special knowledge
    template.knowledgeState.specialKnowledge.forEach((knowledge, index) => {
      skills.push({
        id: `skill_${index}`,
        name: knowledge,
        description: `Knowledge and experience with ${knowledge.toLowerCase()}`,
        type: 'knowledge',
      });
    });

    // Add hidden abilities as locked skills
    template.specialConditions.hiddenAbilities.forEach((ability, index) => {
      skills.push({
        id: `hidden_${index}`,
        name: ability,
        description: `A mysterious ability that has not yet manifested`,
        type: 'special',
      });
    });

    return skills;
  }

  private buildInventoryFromTemplate(template: CharacterStartingTemplate): any[] {
    return template.physicalState.possessions.map((possession, index) => ({
      id: `item_${index}`,
      name: possession,
      description: `A ${possession.toLowerCase()} from the character's original world`,
      basePrice: 0, // Usually worthless in new world
      rarity: possession.includes("phone") ? "unique" : "common",
    }));
  }
}

// Export convenience function
export async function initializeCharacterWithCanonCompliance(
  input: CharacterInitializationInput
): Promise<CharacterInitializationResult> {
  const engine = new CharacterInitializationEngine(input.seriesName);
  return await engine.initializeCharacter(input);
}
