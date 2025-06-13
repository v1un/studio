/**
 * Resource Scarcity Manager
 * 
 * Manages resource scarcity mechanics and resource management systems:
 * - Dynamic resource availability based on game state
 * - Scarcity events and their effects
 * - Resource recovery mechanics
 * - Player resource efficiency tracking
 */

import type {
  ResourceScarcitySettings,
  ResourceType,
  ResourceScarcityEvent,
  ResourceScarcityEffect,
  ResourceRecoveryMechanic,
  ScarcityTriggerCondition,
  StructuredStoryState,
  CharacterProfile,
  Item,
  EnhancedItem
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === RESOURCE TYPE DEFINITIONS ===

export const DEFAULT_RESOURCE_TYPES: ResourceType[] = [
  {
    id: 'health_potions',
    name: 'Health Potions',
    category: 'consumable',
    baseScarcity: 20,
    criticalThreshold: 3,
    renewalRate: 0.1, // 10% chance per turn to find one
  },
  {
    id: 'mana_potions',
    name: 'Mana Potions',
    category: 'consumable',
    baseScarcity: 25,
    criticalThreshold: 2,
    renewalRate: 0.08,
  },
  {
    id: 'currency',
    name: 'Currency',
    category: 'currency',
    baseScarcity: 15,
    criticalThreshold: 50,
    renewalRate: 0.05,
  },
  {
    id: 'crafting_materials',
    name: 'Crafting Materials',
    category: 'material',
    baseScarcity: 30,
    criticalThreshold: 5,
    renewalRate: 0.15,
  },
  {
    id: 'equipment_durability',
    name: 'Equipment Condition',
    category: 'equipment',
    baseScarcity: 10,
    criticalThreshold: 20, // 20% durability
    renewalRate: 0, // Must be actively maintained
  },
];

// === SCARCITY EVENT TEMPLATES ===

export const SCARCITY_EVENT_TEMPLATES: Omit<ResourceScarcityEvent, 'id'>[] = [
  {
    name: 'Supply Shortage',
    description: 'A regional shortage has made certain supplies harder to find',
    triggerConditions: [
      {
        type: 'resource_below_threshold',
        resourceId: 'health_potions',
        threshold: 5,
      },
    ],
    effects: [
      {
        resourceId: 'health_potions',
        effectType: 'reduce_availability',
        magnitude: 0.5,
        description: 'Health potions are 50% less likely to be found',
      },
      {
        resourceId: 'health_potions',
        effectType: 'increase_cost',
        magnitude: 1.5,
        description: 'Health potions cost 50% more when available',
      },
    ],
    duration: 10,
    severity: 'moderate',
  },
  {
    name: 'Economic Crisis',
    description: 'Economic instability has affected trade and commerce',
    triggerConditions: [
      {
        type: 'resource_below_threshold',
        resourceId: 'currency',
        threshold: 100,
      },
    ],
    effects: [
      {
        resourceId: 'currency',
        effectType: 'reduce_availability',
        magnitude: 0.7,
        description: 'Currency rewards are reduced by 30%',
      },
    ],
    duration: 15,
    severity: 'major',
  },
  {
    name: 'Equipment Degradation',
    description: 'Harsh conditions are causing equipment to wear down faster',
    triggerConditions: [
      {
        type: 'location_based',
        location: 'harsh_environment',
      },
    ],
    effects: [
      {
        resourceId: 'equipment_durability',
        effectType: 'add_risk',
        magnitude: 2.0,
        description: 'Equipment degrades twice as fast',
      },
    ],
    duration: 8,
    severity: 'moderate',
  },
];

// === RECOVERY MECHANIC TEMPLATES ===

export const RECOVERY_MECHANIC_TEMPLATES: Omit<ResourceRecoveryMechanic, 'id'>[] = [
  {
    name: 'Merchant Trading',
    description: 'Trade with merchants to acquire needed resources',
    resourceId: 'health_potions',
    recoveryType: 'trade_based',
    recoveryRate: 0.8,
    requirements: [
      {
        type: 'resource',
        value: 'currency',
        description: 'Requires currency to purchase',
      },
    ],
    cost: 25,
  },
  {
    name: 'Foraging',
    description: 'Search the environment for natural resources',
    resourceId: 'crafting_materials',
    recoveryType: 'action_based',
    recoveryRate: 0.3,
    requirements: [
      {
        type: 'time',
        value: 1,
        description: 'Takes one turn to forage',
      },
      {
        type: 'location',
        value: 'wilderness',
        description: 'Must be in a wilderness area',
      },
    ],
  },
  {
    name: 'Equipment Maintenance',
    description: 'Maintain equipment to preserve durability',
    resourceId: 'equipment_durability',
    recoveryType: 'action_based',
    recoveryRate: 0.6,
    requirements: [
      {
        type: 'resource',
        value: 'crafting_materials',
        description: 'Requires materials for maintenance',
      },
      {
        type: 'time',
        value: 1,
        description: 'Takes time to perform maintenance',
      },
    ],
  },
];

// === SCARCITY MANAGEMENT ===

export class ResourceScarcityManager {
  private settings: ResourceScarcitySettings;
  private activeEvents: ResourceScarcityEvent[];
  private resourceTypes: ResourceType[];

  constructor(settings: ResourceScarcitySettings) {
    this.settings = settings;
    this.activeEvents = [];
    this.resourceTypes = DEFAULT_RESOURCE_TYPES;
  }

  // === EVENT MANAGEMENT ===

  checkForScarcityEvents(storyState: StructuredStoryState): ResourceScarcityEvent[] {
    if (!this.settings.enabled) return [];

    const newEvents: ResourceScarcityEvent[] = [];

    for (const template of SCARCITY_EVENT_TEMPLATES) {
      if (this.shouldTriggerEvent(template, storyState)) {
        const event: ResourceScarcityEvent = {
          id: generateUUID(),
          ...template,
        };
        newEvents.push(event);
      }
    }

    return newEvents;
  }

  private shouldTriggerEvent(
    template: Omit<ResourceScarcityEvent, 'id'>,
    storyState: StructuredStoryState
  ): boolean {
    // Check if event is already active
    if (this.activeEvents.some(e => e.name === template.name)) {
      return false;
    }

    // Check trigger conditions
    return template.triggerConditions.every(condition => 
      this.evaluateTriggerCondition(condition, storyState)
    );
  }

  private evaluateTriggerCondition(
    condition: ScarcityTriggerCondition,
    storyState: StructuredStoryState
  ): boolean {
    switch (condition.type) {
      case 'resource_below_threshold':
        if (!condition.resourceId || condition.threshold === undefined) return false;
        const resourceCount = this.getResourceCount(condition.resourceId, storyState);
        return resourceCount < condition.threshold;

      case 'location_based':
        if (!condition.location) return false;
        return storyState.currentLocation.toLowerCase().includes(condition.location.toLowerCase());

      case 'quest_based':
        if (!condition.questId) return false;
        return storyState.quests.some(q => q.id === condition.questId && q.status === 'active');

      case 'time_based':
        // Would need to implement time-based triggers based on game time
        return Math.random() < 0.1; // 10% chance for demo

      default:
        return false;
    }
  }

  // === RESOURCE TRACKING ===

  getResourceCount(resourceId: string, storyState: StructuredStoryState): number {
    switch (resourceId) {
      case 'health_potions':
        return storyState.inventory.filter(item => 
          item.name.toLowerCase().includes('health') && 
          item.name.toLowerCase().includes('potion')
        ).reduce((sum, item) => sum + (item.quantity || 1), 0);

      case 'mana_potions':
        return storyState.inventory.filter(item => 
          item.name.toLowerCase().includes('mana') && 
          item.name.toLowerCase().includes('potion')
        ).reduce((sum, item) => sum + (item.quantity || 1), 0);

      case 'currency':
        return storyState.character.currency || 0;

      case 'crafting_materials':
        return storyState.inventory.filter(item => 
          item.itemType === 'material' || item.name.toLowerCase().includes('material')
        ).reduce((sum, item) => sum + (item.quantity || 1), 0);

      case 'equipment_durability':
        const equippedItems = Object.values(storyState.equippedItems).filter(Boolean) as Item[];
        if (equippedItems.length === 0) return 100;
        const avgDurability = equippedItems.reduce((sum, item) => {
          const durability = (item as EnhancedItem).durability?.current || 100;
          const maxDurability = (item as EnhancedItem).durability?.maximum || 100;
          return sum + (durability / maxDurability * 100);
        }, 0) / equippedItems.length;
        return avgDurability;

      default:
        return 0;
    }
  }

  // === SCARCITY EFFECTS ===

  applyScarcityEffects(
    baseAvailability: number,
    resourceId: string,
    effectType: 'availability' | 'cost' | 'quality'
  ): number {
    let modifier = 1.0;

    for (const event of this.activeEvents) {
      for (const effect of event.effects) {
        if (effect.resourceId === resourceId) {
          switch (effect.effectType) {
            case 'reduce_availability':
              if (effectType === 'availability') {
                modifier *= effect.magnitude;
              }
              break;
            case 'increase_cost':
              if (effectType === 'cost') {
                modifier *= effect.magnitude;
              }
              break;
            case 'reduce_quality':
              if (effectType === 'quality') {
                modifier *= effect.magnitude;
              }
              break;
          }
        }
      }
    }

    // Apply base scarcity
    const resourceType = this.resourceTypes.find(r => r.id === resourceId);
    if (resourceType) {
      const scarcityMultiplier = 1 - (resourceType.baseScarcity * this.settings.scarcityLevel / 10000);
      modifier *= scarcityMultiplier;
    }

    return baseAvailability * modifier;
  }

  // === RECOVERY MECHANICS ===

  getAvailableRecoveryMechanics(
    resourceId: string,
    storyState: StructuredStoryState
  ): ResourceRecoveryMechanic[] {
    return RECOVERY_MECHANIC_TEMPLATES
      .filter(template => template.resourceId === resourceId)
      .filter(template => this.canUseRecoveryMechanic(template, storyState))
      .map(template => ({
        id: generateUUID(),
        ...template,
      }));
  }

  private canUseRecoveryMechanic(
    mechanic: Omit<ResourceRecoveryMechanic, 'id'>,
    storyState: StructuredStoryState
  ): boolean {
    return mechanic.requirements.every(req => {
      switch (req.type) {
        case 'resource':
          const resourceCount = this.getResourceCount(req.value as string, storyState);
          return resourceCount > 0;
        case 'location':
          return storyState.currentLocation.toLowerCase().includes((req.value as string).toLowerCase());
        case 'time':
          return true; // Assume player has time for now
        default:
          return true;
      }
    });
  }

  // === STATE MANAGEMENT ===

  updateActiveEvents(turnsPassed: number = 1): void {
    this.activeEvents = this.activeEvents
      .map(event => ({
        ...event,
        duration: event.duration - turnsPassed,
      }))
      .filter(event => event.duration > 0);
  }

  addScarcityEvent(event: ResourceScarcityEvent): void {
    this.activeEvents.push(event);
  }

  getActiveEvents(): ResourceScarcityEvent[] {
    return [...this.activeEvents];
  }

  // === RESOURCE WARNINGS ===

  getResourceWarnings(storyState: StructuredStoryState): string[] {
    const warnings: string[] = [];

    for (const resourceType of this.resourceTypes) {
      const count = this.getResourceCount(resourceType.id, storyState);
      if (count <= resourceType.criticalThreshold) {
        warnings.push(`Warning: ${resourceType.name} is running low (${count} remaining)`);
      }
    }

    return warnings;
  }
}
