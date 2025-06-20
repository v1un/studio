/**
 * Flesh Out Story Arc Quests API Route
 * 
 * Server-side API endpoint for fleshing out story arc quests.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fleshOutStoryArcQuests } from '@/ai/flows/flesh-out-chapter-quests';
import type { FleshOutStoryArcQuestsInput } from '@/ai/flows/flesh-out-chapter-quests';

export async function POST(request: NextRequest) {
  try {
    const input: FleshOutStoryArcQuestsInput = await request.json();
    
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

    if (!input.storyArcToFleshOut) {
      return NextResponse.json(
        { error: 'Missing required field: storyArcToFleshOut' },
        { status: 400 }
      );
    }

    if (!input.characterProfile) {
      return NextResponse.json(
        { error: 'Missing required field: characterProfile' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Flesh Out Story Arc Quests API: START for series: ${input.seriesName}, arc: ${input.storyArcToFleshOut.title}`);

    const result = await fleshOutStoryArcQuests(input);
    
    console.log(`[${new Date().toISOString()}] Flesh Out Story Arc Quests API: SUCCESS - Generated ${result.fleshedOutQuests.length} quests`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Flesh Out Story Arc Quests API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Flesh Out Story Arc Quests failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Flesh Out Story Arc Quests API',
    endpoints: {
      POST: 'Generate detailed quests for a story arc'
    }
  });
}
