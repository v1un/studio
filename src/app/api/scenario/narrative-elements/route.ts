/**
 * Scenario Narrative Elements Generation API Route
 * 
 * Server-side API endpoint for generating scenario narrative elements.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateScenarioNarrativeElements } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateScenarioNarrativeElementsInput } from '@/ai/flows/generate-scenario-from-series';

export async function POST(request: NextRequest) {
  try {
    const input: GenerateScenarioNarrativeElementsInput = await request.json();
    
    // Validate required fields
    if (!input.seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    if (!input.seriesPlotSummary) {
      return NextResponse.json(
        { error: 'Missing required field: seriesPlotSummary' },
        { status: 400 }
      );
    }

    if (!input.characterProfile) {
      return NextResponse.json(
        { error: 'Missing required field: characterProfile' },
        { status: 400 }
      );
    }

    if (!input.sceneDescription) {
      return NextResponse.json(
        { error: 'Missing required field: sceneDescription' },
        { status: 400 }
      );
    }

    if (!input.currentLocation) {
      return NextResponse.json(
        { error: 'Missing required field: currentLocation' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Scenario Narrative Elements generation API: START for series: ${input.seriesName}`);

    const result = await generateScenarioNarrativeElements(input);
    
    console.log(`[${new Date().toISOString()}] Scenario Narrative Elements generation API: SUCCESS - Generated ${result.quests.length} quests, ${result.storyArcs.length} arcs, ${result.trackedNPCs.length} NPCs`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Scenario Narrative Elements generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Scenario Narrative Elements generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Scenario Narrative Elements Generation API',
    endpoints: {
      POST: 'Generate scenario narrative elements (quests, arcs, NPCs, lore)'
    }
  });
}
