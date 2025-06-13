/**
 * Enhanced Relationship Engine
 * 
 * Implements complex relationship webs supporting love triangles and group dynamics:
 * - Multi-directional character connections
 * - Dynamic relationship states and romantic mechanics
 * - Group dynamic mechanics where individual changes affect social circles
 * - Love triangle, unrequited love, and shifting allegiance support
 */

import type {
  StructuredStoryState,
  RelationshipEntry,
  GroupDynamicsEntry,
  RomanticTension,
  GroupConflict,
  GroupDynamicsImpact,
  CascadeEffect,
  RelationshipHistoryEntry
} from '@/types/story';
import { generateUUID } from '@/lib/utils';

// === RELATIONSHIP WEB MANAGEMENT ===

export function createRelationshipWeb(
  npcIds: string[],
  webType: GroupDynamicsEntry['dynamicsType'],
  storyState: StructuredStoryState
): GroupDynamicsEntry {
  const members = npcIds.map(id => {
    const npc = storyState.trackedNPCs.find(n => n.id === id);
    return npc?.name || id;
  });

  return {
    id: generateUUID(),
    groupId: generateUUID(),
    groupName: generateGroupName(webType, members),
    memberIds: npcIds,
    dynamicsType: webType,
    cohesionLevel: calculateInitialCohesion(webType),
    conflictLevel: 0,
    influenceHierarchy: calculateInfluenceHierarchy(npcIds, storyState),
    activeConflicts: [],
    romanticTensions: [],
  };
}

export function addToRelationshipWeb(
  webId: string,
  newMemberId: string,
  storyState: StructuredStoryState
): StructuredStoryState {
  const webs = storyState.groupDynamics || [];
  const webIndex = webs.findIndex(web => web.id === webId);
  
  if (webIndex >= 0) {
    const updatedWeb = {
      ...webs[webIndex],
      memberIds: [...webs[webIndex].memberIds, newMemberId],
      cohesionLevel: Math.max(0, webs[webIndex].cohesionLevel - 10), // Adding members reduces cohesion initially
    };
    
    const updatedWebs = [...webs];
    updatedWebs[webIndex] = updatedWeb;
    
    // Create initial relationships with existing members
    let updatedState = { ...storyState, groupDynamics: updatedWebs };
    updatedState = createInitialWebRelationships(newMemberId, updatedWeb, updatedState);
    
    return updatedState;
  }
  
  return storyState;
}

// === ROMANTIC TENSION SYSTEM ===

export function createRomanticTension(
  type: RomanticTension['type'],
  involvedNPCIds: string[],
  playerInvolved: boolean,
  storyState: StructuredStoryState
): RomanticTension {
  return {
    id: generateUUID(),
    type,
    involvedNPCIds,
    playerInvolved,
    tensionLevel: calculateInitialTension(type, playerInvolved),
    publicKnowledge: false,
    complications: generateInitialComplications(type, involvedNPCIds, storyState),
    potentialOutcomes: generatePotentialOutcomes(type, playerInvolved),
  };
}

export function updateRomanticTension(
  tensionId: string,
  relationshipChange: number,
  triggerEvent: string,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  const tensions = storyState.activeRomanticTensions || [];
  const tensionIndex = tensions.findIndex(t => t.id === tensionId);
  
  if (tensionIndex >= 0) {
    const tension = tensions[tensionIndex];
    const newTensionLevel = Math.max(0, Math.min(100, tension.tensionLevel + relationshipChange));
    
    const updatedTension = {
      ...tension,
      tensionLevel: newTensionLevel,
      complications: updateComplications(tension, triggerEvent, relationshipChange),
    };
    
    const updatedTensions = [...tensions];
    updatedTensions[tensionIndex] = updatedTension;
    
    // Apply cascade effects to involved NPCs
    let updatedState = { ...storyState, activeRomanticTensions: updatedTensions };
    updatedState = applyRomanticCascadeEffects(updatedTension, triggerEvent, currentTurnId, updatedState);
    
    return updatedState;
  }
  
  return storyState;
}

// === LOVE TRIANGLE MECHANICS ===

export function createLoveTriangle(
  npc1Id: string,
  npc2Id: string,
  targetId: string, // Who they're both interested in (could be player)
  storyState: StructuredStoryState
): RomanticTension {
  const isPlayerTarget = targetId === 'player';
  
  return createRomanticTension(
    'love_triangle',
    [npc1Id, npc2Id, ...(isPlayerTarget ? [] : [targetId])],
    isPlayerTarget,
    storyState
  );
}

export function processLoveTriangleJealousy(
  triangleId: string,
  favoredNPCId: string,
  playerAction: string,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  const tensions = storyState.activeRomanticTensions || [];
  const triangle = tensions.find(t => t.id === triangleId && t.type === 'love_triangle');
  
  if (!triangle) return storyState;
  
  const rivalNPCId = triangle.involvedNPCIds.find(id => id !== favoredNPCId);
  if (!rivalNPCId) return storyState;
  
  // Increase jealousy for the rival
  let updatedState = updateNPCJealousy(rivalNPCId, favoredNPCId, 20, currentTurnId, storyState);
  
  // Update romantic tension
  updatedState = updateRomanticTension(
    triangleId,
    15,
    `Player showed favor to ${favoredNPCId} through: ${playerAction}`,
    updatedState,
    currentTurnId
  );
  
  // Create potential conflict
  updatedState = createRomanticConflict(rivalNPCId, favoredNPCId, 'romantic', updatedState);
  
  return updatedState;
}

// === GROUP DYNAMICS IMPACT ===

export function processGroupDynamicsImpact(
  impact: GroupDynamicsImpact,
  storyState: StructuredStoryState,
  currentTurnId: string
): StructuredStoryState {
  const webs = storyState.groupDynamics || [];
  const webIndex = webs.findIndex(web => web.groupId === impact.affectedGroupId);
  
  if (webIndex < 0) return storyState;
  
  const web = webs[webIndex];
  let updatedWeb = { ...web };
  
  switch (impact.impactType) {
    case 'cohesion_change':
      updatedWeb.cohesionLevel = Math.max(0, Math.min(100, web.cohesionLevel + impact.magnitude));
      break;
      
    case 'conflict_escalation':
      updatedWeb.conflictLevel = Math.max(0, Math.min(100, web.conflictLevel + Math.abs(impact.magnitude)));
      break;
      
    case 'romantic_development':
      updatedWeb = processRomanticDevelopment(updatedWeb, impact, storyState);
      break;
      
    case 'hierarchy_shift':
      updatedWeb.influenceHierarchy = recalculateHierarchy(updatedWeb, impact, storyState);
      break;
  }
  
  const updatedWebs = [...webs];
  updatedWebs[webIndex] = updatedWeb;
  
  // Apply cascade effects to all group members
  let updatedState = { ...storyState, groupDynamics: updatedWebs };
  updatedState = applyGroupCascadeEffects(updatedWeb, impact, currentTurnId, updatedState);
  
  return updatedState;
}

// === JEALOUSY AND RIVALRY MECHANICS ===

export function updateNPCJealousy(
  jealousNPCId: string,
  targetNPCId: string,
  jealousyIncrease: number,
  currentTurnId: string,
  storyState: StructuredStoryState
): StructuredStoryState {
  const relationships = [...storyState.npcRelationships];
  const relationshipIndex = relationships.findIndex(rel => rel.npcId === jealousNPCId);
  
  if (relationshipIndex >= 0) {
    const relationship = relationships[relationshipIndex];
    const newJealousyLevel = Math.min(100, (relationship.jealousyLevel || 0) + jealousyIncrease);
    
    relationships[relationshipIndex] = {
      ...relationship,
      jealousyLevel: newJealousyLevel,
      relationshipHistory: [
        ...relationship.relationshipHistory,
        {
          turnId: currentTurnId,
          timestamp: new Date().toISOString(),
          interactionType: 'jealousy_trigger',
          relationshipChange: -Math.floor(jealousyIncrease / 2), // Jealousy hurts relationship
          emotionalImpact: 'jealousy',
          description: `Jealousy triggered by attention given to ${targetNPCId}`,
          consequences: [`Increased tension with ${targetNPCId}`],
        }
      ].slice(-10)
    };
  }
  
  return { ...storyState, npcRelationships: relationships };
}

// === HELPER FUNCTIONS ===

function generateGroupName(type: GroupDynamicsEntry['dynamicsType'], members: string[]): string {
  const memberNames = members.slice(0, 2).join(' and ');
  
  switch (type) {
    case 'friend_group': return `${memberNames}'s Circle`;
    case 'love_triangle': return `${memberNames} Triangle`;
    case 'family': return `${memberNames} Family`;
    case 'work_team': return `${memberNames} Team`;
    case 'rival_group': return `${memberNames} Rivalry`;
    case 'social_circle': return `${memberNames} Social Circle`;
    default: return `${memberNames} Group`;
  }
}

function calculateInitialCohesion(type: GroupDynamicsEntry['dynamicsType']): number {
  switch (type) {
    case 'family': return 80;
    case 'friend_group': return 70;
    case 'work_team': return 60;
    case 'social_circle': return 50;
    case 'love_triangle': return 30;
    case 'rival_group': return 20;
    default: return 50;
  }
}

function calculateInfluenceHierarchy(npcIds: string[], storyState: StructuredStoryState): string[] {
  // Sort by relationship score with player (higher = more influential)
  return npcIds.sort((a, b) => {
    const relA = storyState.npcRelationships.find(rel => rel.npcId === a);
    const relB = storyState.npcRelationships.find(rel => rel.npcId === b);
    
    const scoreA = relA?.relationshipScore || 0;
    const scoreB = relB?.relationshipScore || 0;
    
    return scoreB - scoreA;
  });
}

function calculateInitialTension(type: RomanticTension['type'], playerInvolved: boolean): number {
  const baseTension = {
    'unrequited_love': 60,
    'love_triangle': 70,
    'forbidden_love': 80,
    'competing_suitors': 65,
    'secret_relationship': 50,
  }[type] || 50;
  
  return playerInvolved ? baseTension + 10 : baseTension;
}

function generateInitialComplications(
  type: RomanticTension['type'],
  involvedNPCIds: string[],
  storyState: StructuredStoryState
): string[] {
  const complications: string[] = [];
  
  switch (type) {
    case 'love_triangle':
      complications.push('Competing for attention', 'Potential jealousy conflicts');
      break;
    case 'unrequited_love':
      complications.push('One-sided feelings', 'Emotional vulnerability');
      break;
    case 'forbidden_love':
      complications.push('Social barriers', 'Secret meetings required');
      break;
    case 'competing_suitors':
      complications.push('Rivalry between suitors', 'Pressure to choose');
      break;
    case 'secret_relationship':
      complications.push('Hidden from others', 'Risk of discovery');
      break;
  }
  
  return complications;
}

function generatePotentialOutcomes(type: RomanticTension['type'], playerInvolved: boolean): string[] {
  const outcomes: string[] = [];
  
  if (playerInvolved) {
    outcomes.push('Player chooses one side', 'Player rejects all advances', 'Player tries to maintain balance');
  }
  
  switch (type) {
    case 'love_triangle':
      outcomes.push('One rival withdraws', 'Open conflict erupts', 'Compromise reached');
      break;
    case 'unrequited_love':
      outcomes.push('Feelings reciprocated', 'Acceptance of rejection', 'Persistent pursuit');
      break;
    case 'forbidden_love':
      outcomes.push('Relationship revealed', 'Secret maintained', 'Barriers overcome');
      break;
  }
  
  return outcomes;
}

function updateComplications(
  tension: RomanticTension,
  triggerEvent: string,
  relationshipChange: number
): string[] {
  const complications = [...tension.complications];
  
  if (relationshipChange > 10) {
    complications.push(`Escalation from: ${triggerEvent}`);
  } else if (relationshipChange < -10) {
    complications.push(`Cooling down after: ${triggerEvent}`);
  }
  
  return complications.slice(-5); // Keep only recent complications
}

function createInitialWebRelationships(
  newMemberId: string,
  web: GroupDynamicsEntry,
  storyState: StructuredStoryState
): StructuredStoryState {
  // Implementation would create basic relationships between new member and existing members
  return storyState;
}

function applyRomanticCascadeEffects(
  tension: RomanticTension,
  triggerEvent: string,
  currentTurnId: string,
  storyState: StructuredStoryState
): StructuredStoryState {
  // Implementation would apply effects to all involved NPCs
  return storyState;
}

function processRomanticDevelopment(
  web: GroupDynamicsEntry,
  impact: GroupDynamicsImpact,
  storyState: StructuredStoryState
): GroupDynamicsEntry {
  // Implementation would update romantic tensions within the group
  return web;
}

function recalculateHierarchy(
  web: GroupDynamicsEntry,
  impact: GroupDynamicsImpact,
  storyState: StructuredStoryState
): string[] {
  // Implementation would recalculate influence hierarchy
  return web.influenceHierarchy;
}

function applyGroupCascadeEffects(
  web: GroupDynamicsEntry,
  impact: GroupDynamicsImpact,
  currentTurnId: string,
  storyState: StructuredStoryState
): StructuredStoryState {
  // Implementation would apply effects to all group members
  return storyState;
}

function createRomanticConflict(
  npc1Id: string,
  npc2Id: string,
  conflictType: GroupConflict['conflictType'],
  storyState: StructuredStoryState
): StructuredStoryState {
  // Implementation would create a new conflict between NPCs
  return storyState;
}
