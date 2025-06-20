/**
 * Discover Next Story Arc API Route
 * 
 * Server-side API endpoint for discovering the next story arc.
 * This keeps the Genkit AI dependencies on the server side only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { discoverNextStoryArc } from '@/ai/flows/discover-next-story-arc-flow';
import type { DiscoverNextStoryArcInput } from '@/ai/flows/discover-next-story-arc-flow';

export async function POST(request: NextRequest) {
  try {
    const input: DiscoverNextStoryArcInput = await request.json();
    
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

    if (!input.completedStoryArcs || !Array.isArray(input.completedStoryArcs)) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: completedStoryArcs (must be array)' },
        { status: 400 }
      );
    }

    if (typeof input.usePremiumAI !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: usePremiumAI' },
        { status: 400 }
      );
    }

    console.log(`[${new Date().toISOString()}] Discover Next Story Arc API: START for series: ${input.seriesName}, completed arcs: ${input.completedStoryArcs.length}`);

    const result = await discoverNextStoryArc(input);
    
    console.log(`[${new Date().toISOString()}] Discover Next Story Arc API: SUCCESS - Discovered arc: ${result.discoveredStoryArc?.title || 'None'}`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Discover Next Story Arc API: FAILED - ${error.message}`);
    
    return NextResponse.json(
      { 
        error: 'Discover Next Story Arc failed', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Discover Next Story Arc API',
    endpoints: {
      POST: 'Discover the next story arc based on completed arcs'
    }
  });
}
