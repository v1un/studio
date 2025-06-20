/**
 * Generate Bridging Quest API Route
 * 
 * Server-side API endpoint for generating bridging quests.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBridgingQuest } from '@/ai/flows/generate-bridging-quest-flow';
import type { GenerateBridgingQuestInput } from '@/ai/flows/generate-bridging-quest-flow';

export async function POST(request: NextRequest) {
  try {
    const input: GenerateBridgingQuestInput = await request.json();
    
    // Validate required fields
    if (!input.seriesName) {
      return NextResponse.json(
        { error: 'Missing required field: seriesName' },
        { status: 400 }
      );
    }

    if (!input.characterProfile) {
      return NextResponse.json(
        { error: 'Missing required field: characterProfile' },
        { status: 400 }
      );
    }

    if (!input.storyState) {
      return NextResponse.json(
        { error: 'Missing required field: storyState' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Generate Bridging Quest API: START for series: ${input.seriesName}, character: ${input.characterProfile.name}`);

    const result = await generateBridgingQuest(input);
    
    console.log(`[${new Date().toISOString()}] Generate Bridging Quest API: SUCCESS - Generated bridging content`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Generate Bridging Quest API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Generate Bridging Quest failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Generate Bridging Quest API',
    endpoints: {
      POST: 'Generate bridging quest content between story arcs'
    }
  });
}
