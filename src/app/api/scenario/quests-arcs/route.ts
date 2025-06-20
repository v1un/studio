/**
 * Quests & Story Arcs Generation API Route
 * 
 * Server-side API endpoint for generating quests and story arcs.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateQuestsAndArcs } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateQuestsAndArcsInput } from '@/ai/flows/generate-scenario-from-series';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.seriesName || !body.seriesPlotSummary || !body.characterProfile || !body.sceneDescription || !body.currentLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: seriesName, seriesPlotSummary, characterProfile, sceneDescription, currentLocation' },
        { status: 400 }
      );
    }

    const input: GenerateQuestsAndArcsInput = {
      seriesName: body.seriesName,
      seriesPlotSummary: body.seriesPlotSummary,
      characterProfile: body.characterProfile,
      sceneDescription: body.sceneDescription,
      currentLocation: body.currentLocation,
      characterNameInput: body.characterNameInput,
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] Quests & Arcs generation API: START for series: ${input.seriesName}`);

    const result = await generateQuestsAndArcs(input);
    
    console.log(`[${new Date().toISOString()}] Quests & Arcs generation API: SUCCESS - Generated ${result.quests.length} quests and ${result.storyArcs.length} arcs`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Quests & Arcs generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Quests & Arcs generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Quests & Story Arcs Generation API',
    endpoints: {
      POST: 'Generate quests and story arcs'
    }
  });
}
