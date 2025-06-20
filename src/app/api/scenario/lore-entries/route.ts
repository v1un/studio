/**
 * Lore Entries Generation API Route
 * 
 * Server-side API endpoint for generating lore entries.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateLoreEntries } from '@/ai/flows/generate-scenario-from-series';
import type { GenerateLoreEntriesInput } from '@/ai/flows/generate-scenario-from-series';

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

    const input: GenerateLoreEntriesInput = {
      seriesName: body.seriesName,
      seriesPlotSummary: body.seriesPlotSummary,
      characterProfile: body.characterProfile,
      sceneDescription: body.sceneDescription,
      currentLocation: body.currentLocation,
      worldFacts: body.worldFacts || [],
      usePremiumAI: body.usePremiumAI || false,
    };

    console.log(`[${new Date().toISOString()}] Lore Entries generation API: START for series: ${input.seriesName}`);

    const result = await generateLoreEntries(input);
    
    console.log(`[${new Date().toISOString()}] Lore Entries generation API: SUCCESS - Generated ${result.loreEntries.length} lore entries`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Lore Entries generation API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Lore Entries generation failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Lore Entries Generation API',
    endpoints: {
      POST: 'Generate lore entries'
    }
  });
}
