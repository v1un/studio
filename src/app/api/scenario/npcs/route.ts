/**
 * NPCs Generation API Route
 * 
 * Server-side API endpoint for generating NPCs.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateNPCs } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateNPCsInput } from '@/ai/flows/generate-scenario-from-series';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.seriesName || !body.seriesPlotSummary || !body.characterProfile || !body.sceneDescription || !body.currentLocation || !body.loreEntries) {
      return NextResponse.json(
        { error: 'Missing required fields: seriesName, seriesPlotSummary, characterProfile, sceneDescription, currentLocation, loreEntries' },
        { status: 400 }
      );
    }

    const input: GenerateNPCsInput = {
      seriesName: body.seriesName,
      seriesPlotSummary: body.seriesPlotSummary,
      characterProfile: body.characterProfile,
      sceneDescription: body.sceneDescription,
      currentLocation: body.currentLocation,
      loreEntries: body.loreEntries,
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] NPCs generation API: START for series: ${input.seriesName}`);

    const result = await generateNPCs(input);
    
    console.log(`[${new Date().toISOString()}] NPCs generation API: SUCCESS - Generated ${result.trackedNPCs.length} NPCs`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] NPCs generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'NPCs generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'NPCs Generation API',
    endpoints: {
      POST: 'Generate NPCs'
    }
  });
}
