/**
 * Canon Compliance Testing Script
 * 
 * Demonstrates and tests the enhanced canon compliance system
 * for Re:Zero scenario generation.
 */

import { validateScenarioCanonCompliance, seriesSupportsCanonCompliance, getCanonComplianceFeatures } from '../lib/canon-compliance-orchestrator';
import { initializeCharacterWithCanonCompliance } from '../lib/character-initialization-engine';
import { validateWorldStateForCanonCompliance } from '../lib/world-state-validation-engine';
import { validateLoreConsistency } from '../lib/lore-consistency-engine';
import { validateNarrativeAuthenticity } from '../lib/narrative-authenticity-engine';

// Test data for Re:Zero scenario
const testReZeroScenario = {
  seriesName: 'Re:Zero',
  characterName: 'Natsuki Subaru',
  characterClass: 'Otherworlder',
  useCanonicalStartingConditions: true,
  sceneDescription: `The bustling market district of the royal capital stretches out before you, filled with the sounds of merchants hawking their wares and the chatter of diverse crowds. The unfamiliar architecture - a blend of medieval European and fantasy elements - towers overhead with its ornate stonework and colorful banners. Strange smells of exotic spices and unknown foods waft through the air, while the sight of demi-humans with animal ears and tails moving through the crowd confirms that this is definitely not Japan anymore. Your tracksuit feels out of place among the period clothing of the locals, and the weight of your flip phone in your pocket serves as a reminder of the world you've left behind. A nearby fruit vendor calls out in a language you somehow understand despite never hearing it before, "Fresh apples! Best in the capital!" What do you do first?`,
  currentLocation: 'Lugunica Royal Capital - Market District',
  worldFacts: [
    'The royal family recently died from a mysterious disease',
    'Five dragon insignias have appeared, indicating potential royal candidates',
    'The kingdom is in a state of political uncertainty',
    'Demi-humans face discrimination in society',
    'Magic exists and is performed through spirit contracts or gates',
    'The capital is a major trading hub with diverse populations'
  ],
  generatedLore: [
    {
      keyword: 'Royal Selection',
      content: 'A process to choose the next ruler of Lugunica from five candidates bearing dragon insignias.',
      category: 'Politics'
    },
    {
      keyword: 'Spirit Magic',
      content: 'Magic performed through contracts with spirits, bypassing the need for a functional gate.',
      category: 'Magic System'
    },
    {
      keyword: 'Lugunica Kingdom',
      content: 'A fantasy kingdom with European-inspired architecture and a diverse population including demi-humans.',
      category: 'World Building'
    }
  ],
  timelinePosition: 'Series beginning'
};

async function testCanonComplianceSystem() {
  console.log('=== Canon Compliance System Test ===\n');

  // Test 1: Check series support
  console.log('1. Testing series support...');
  const supportsCompliance = seriesSupportsCanonCompliance('Re:Zero');
  console.log(`Re:Zero supports canon compliance: ${supportsCompliance}`);
  
  if (supportsCompliance) {
    const features = getCanonComplianceFeatures('Re:Zero');
    console.log(`Available features: ${features.join(', ')}`);
  }
  console.log('');

  // Test 2: Character initialization with canon compliance
  console.log('2. Testing character initialization...');
  try {
    const characterResult = await initializeCharacterWithCanonCompliance({
      seriesName: 'Re:Zero',
      characterName: 'Natsuki Subaru',
      characterClass: 'Otherworlder',
      useCanonicalStartingConditions: true,
    });

    console.log(`Character initialized: ${characterResult.characterProfile.name}`);
    console.log(`Canon compliant: ${characterResult.canonCompliance.isCanonical}`);
    console.log(`Applied template: ${characterResult.canonCompliance.appliedTemplate}`);
    console.log(`Language reading: ${characterResult.characterProfile.languageReading}`);
    console.log(`Language speaking: ${characterResult.characterProfile.languageSpeaking}`);
    console.log(`Starting inventory: ${characterResult.startingInventory.length} items`);
    console.log(`Hidden abilities: ${characterResult.specialConditions.hiddenAbilities.join(', ')}`);
  } catch (error) {
    console.error('Character initialization failed:', error);
  }
  console.log('');

  // Test 3: World state validation
  console.log('3. Testing world state validation...');
  try {
    const worldStateResult = await validateWorldStateForCanonCompliance({
      seriesName: 'Re:Zero',
      currentLocation: testReZeroScenario.currentLocation,
      sceneDescription: testReZeroScenario.sceneDescription,
      worldFacts: testReZeroScenario.worldFacts,
      characterKnowledge: ['Gaming knowledge', 'Modern world technology'],
      timelinePosition: 'Series beginning',
    });

    console.log(`World state valid: ${worldStateResult.isValid}`);
    console.log(`Timeline accuracy: ${worldStateResult.canonCompliance.timelineAccuracy}`);
    console.log(`World state consistency: ${worldStateResult.canonCompliance.worldStateConsistency}`);
    console.log(`Violations found: ${worldStateResult.violations.length}`);
    
    if (worldStateResult.violations.length > 0) {
      console.log('Violations:');
      worldStateResult.violations.forEach(v => {
        console.log(`  - ${v.category}: ${v.description}`);
      });
    }
  } catch (error) {
    console.error('World state validation failed:', error);
  }
  console.log('');

  // Test 4: Lore consistency validation
  console.log('4. Testing lore consistency...');
  try {
    const loreResult = await validateLoreConsistency({
      seriesName: 'Re:Zero',
      generatedLore: testReZeroScenario.generatedLore,
      characterProfile: { name: 'Natsuki Subaru', class: 'Otherworlder' },
      worldContext: {
        currentLocation: testReZeroScenario.currentLocation,
        timelinePosition: 'Series beginning',
        establishedFacts: testReZeroScenario.worldFacts,
      },
    });

    console.log(`Lore consistency score: ${loreResult.consistencyReport.overallScore}/100`);
    console.log(`Violations found: ${loreResult.consistencyReport.violations.length}`);
    console.log(`Corrections applied: ${loreResult.consistencyReport.corrections.length}`);
    console.log(`Enhanced lore entries: ${loreResult.enhancedLore.length}`);
    
    if (loreResult.enhancedLore.length > 0) {
      console.log('Enhanced lore entries:');
      loreResult.enhancedLore.forEach(entry => {
        console.log(`  - ${entry.keyword}: ${entry.content.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    console.error('Lore consistency validation failed:', error);
  }
  console.log('');

  // Test 5: Narrative authenticity validation
  console.log('5. Testing narrative authenticity...');
  try {
    const narrativeResult = await validateNarrativeAuthenticity({
      seriesName: 'Re:Zero',
      sceneDescription: testReZeroScenario.sceneDescription,
      characterProfile: { name: 'Natsuki Subaru', description: 'A 17-year-old Japanese hikikomori transported to a fantasy world' },
      informationRevealed: testReZeroScenario.worldFacts,
      characterPerspective: 'Confused but trying to appear confident, using gaming knowledge to understand the situation',
    });

    console.log(`Narrative authenticity score: ${narrativeResult.authenticityScore}/100`);
    console.log('Aspect scores:');
    Object.entries(narrativeResult.aspectScores).forEach(([aspect, score]) => {
      console.log(`  - ${aspect}: ${score}/100`);
    });
    console.log(`Violations found: ${narrativeResult.violations.length}`);
    console.log(`Enhancements suggested: ${narrativeResult.enhancements.length}`);
  } catch (error) {
    console.error('Narrative authenticity validation failed:', error);
  }
  console.log('');

  // Test 6: Comprehensive scenario validation
  console.log('6. Testing comprehensive scenario validation...');
  try {
    const comprehensiveResult = await validateScenarioCanonCompliance(testReZeroScenario);

    console.log(`Overall compliance score: ${comprehensiveResult.overallComplianceScore}/100`);
    console.log(`Is canon compliant: ${comprehensiveResult.isCanonCompliant}`);
    console.log('Compliance breakdown:');
    Object.entries(comprehensiveResult.complianceBreakdown).forEach(([aspect, score]) => {
      console.log(`  - ${aspect}: ${score}/100`);
    });
    
    console.log(`Critical issues: ${comprehensiveResult.criticalIssues.length}`);
    if (comprehensiveResult.criticalIssues.length > 0) {
      console.log('Critical issues:');
      comprehensiveResult.criticalIssues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    console.log(`Recommendations: ${comprehensiveResult.recommendations.length}`);
    if (comprehensiveResult.recommendations.length > 0) {
      console.log('Top recommendations:');
      comprehensiveResult.recommendations.slice(0, 3).forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
  } catch (error) {
    console.error('Comprehensive validation failed:', error);
  }
  console.log('');

  console.log('=== Canon Compliance Test Complete ===');
}

// Test with non-canon compliant scenario for comparison
const testNonCanonScenario = {
  ...testReZeroScenario,
  sceneDescription: `You stand confidently in the royal palace, already knowing about the Royal Selection and your Return by Death ability. Emilia and Rem are by your side as trusted allies, and you're preparing to use your powerful magic to defeat the Witch's Cult. Your modern smartphone works perfectly here, and you've already mastered spirit magic despite having no training.`,
  worldFacts: [
    'The Royal Selection is in full swing',
    'Subaru is already a powerful mage',
    'The Witch\'s Cult has been defeated',
    'Modern technology works in this world',
    'Subaru knows about Return by Death from the start'
  ],
  generatedLore: [
    {
      keyword: 'Subaru\'s Magic',
      content: 'Subaru has unlimited magical power and can cast any spell without restriction.',
      category: 'Magic System'
    },
    {
      keyword: 'Return by Death',
      content: 'A well-known ability that Subaru openly discusses with everyone.',
      category: 'Special Abilities'
    }
  ]
};

async function testNonCanonCompliance() {
  console.log('\n=== Non-Canon Scenario Test ===\n');
  
  try {
    const result = await validateScenarioCanonCompliance(testNonCanonScenario);
    
    console.log(`Non-canon scenario compliance score: ${result.overallComplianceScore}/100`);
    console.log(`Is canon compliant: ${result.isCanonCompliant}`);
    console.log(`Critical issues found: ${result.criticalIssues.length}`);
    
    if (result.criticalIssues.length > 0) {
      console.log('Critical canon violations:');
      result.criticalIssues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
  } catch (error) {
    console.error('Non-canon test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  await testCanonComplianceSystem();
  await testNonCanonCompliance();
}

// Export for use in other scripts
export {
  testCanonComplianceSystem,
  testNonCanonCompliance,
  runAllTests,
  testReZeroScenario,
  testNonCanonScenario
};

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
