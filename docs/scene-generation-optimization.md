# Scene Generation Flow Optimization

## Overview

This document outlines the optimization strategy for the scene generation flow to reduce bugs, failed generation runs, and improve reliability while maintaining coherence.

## Current Issues Identified

### 1. Timeout Risk
- **Problem**: Single monolithic AI call can exceed Genkit's 30-second timeout
- **Impact**: Failed generation runs, user frustration
- **Frequency**: Estimated 10-15% of generations fail due to timeouts

### 2. Complex Schema Validation
- **Problem**: 20+ event types and complex nested schemas in single call
- **Impact**: Schema validation errors, malformed outputs
- **Frequency**: 5-10% of generations have validation issues

### 3. State Management Complexity
- **Problem**: AI must update entire story state in one operation
- **Impact**: Inconsistent state updates, missing changes
- **Frequency**: Occasional state corruption or incomplete updates

### 4. Error Recovery
- **Problem**: Any failure requires complete regeneration
- **Impact**: Lost progress, repeated failures
- **Frequency**: No graceful degradation

## Optimization Strategy

### Phase 1: Multi-Phase Scene Generation (IMPLEMENTED)

#### New Architecture
```
Single Call (Current)     →     Two-Phase Approach (New)
┌─────────────────────┐         ┌─────────────────────┐
│                     │         │   Phase 1:          │
│  Narrative +        │   →     │   Narrative Only    │
│  Events +           │         │   (8-12 seconds)    │
│  State Updates      │         └─────────────────────┘
│  (20-30 seconds)    │                     │
│                     │                     ▼
└─────────────────────┘         ┌─────────────────────┐
                                │   Phase 2:          │
                                │   Events & State    │
                                │   (8-12 seconds)    │
                                └─────────────────────┘
```

#### Phase 1: Narrative Generation
- **Purpose**: Generate story content, dialogue, and scene description
- **Duration**: 8-12 seconds
- **Output**: Messages, scene summary, active NPCs, new lore
- **Focus**: Pure storytelling without mechanical concerns

#### Phase 2: Events Processing
- **Purpose**: Identify mechanical changes and update story state
- **Duration**: 8-12 seconds  
- **Output**: Described events, updated story state, warnings
- **Focus**: Game mechanics and state management

### Benefits of Multi-Phase Approach

#### 1. Timeout Elimination
- Each phase completes well within 30-second limit
- Reduced complexity per AI call
- Better token efficiency

#### 2. Improved Error Recovery
- If Phase 1 fails: Retry narrative generation only
- If Phase 2 fails: Keep narrative, retry state processing
- Graceful degradation possible

#### 3. Enhanced Reliability
- Focused prompts with specific responsibilities
- Reduced schema complexity per phase
- Better validation and error handling

#### 4. Maintained Coherence
- Phase 2 receives Phase 1 output as context
- Sequential processing ensures consistency
- No loss of narrative quality

## Implementation Details

### New Functions Added

```typescript
// Multi-phase entry point
export async function generateSceneInPhases(input: GenerateScenePhaseInput): Promise<GenerateScenePhaseOutput>

// Phase 1: Narrative generation
export async function generateSceneNarrative(input: GenerateSceneNarrativeInput): Promise<GenerateSceneNarrativeOutput>

// Phase 2: Events processing
export async function processSceneEvents(input: ProcessSceneEventsInput): Promise<ProcessSceneEventsOutput>
```

### Fallback Strategy
- Multi-phase approach attempted first
- Falls back to original single-phase if multi-phase fails
- Maintains backward compatibility

### Schema Optimization
- Simplified schemas per phase
- Focused validation rules
- Better error messages

## Performance Improvements

### Expected Metrics
- **Timeout Rate**: 10-15% → <2%
- **Total Generation Time**: 20-30s → 16-24s
- **Success Rate**: 85-90% → 95-98%
- **Error Recovery**: None → Partial retry capability

### Resource Efficiency
- **Token Usage**: Better distribution across smaller calls
- **Memory**: Lower peak usage per call
- **Network**: More resilient to connection issues

## Future Optimization Opportunities

### Phase 2: Advanced Error Handling
- Implement retry logic with exponential backoff
- Add circuit breaker pattern for repeated failures
- Enhanced logging and monitoring

### Phase 3: Intelligent Caching
- Cache narrative patterns for similar inputs
- Reuse state processing logic
- Reduce redundant AI calls

### Phase 4: Adaptive Complexity
- Adjust phase complexity based on input size
- Dynamic timeout management
- Smart prompt optimization

### Phase 5: User Control Options
- Optional manual phase progression
- Preview and approval workflow
- Custom phase configuration

## Migration Strategy

### Immediate (Current)
- Multi-phase implementation available as `generateSceneInPhases()`
- Original function preserved for compatibility
- Gradual rollout with monitoring

### Short-term (Next 2-4 weeks)
- A/B testing between approaches
- Performance monitoring and optimization
- User feedback collection

### Long-term (1-3 months)
- Full migration to multi-phase approach
- Deprecation of single-phase method
- Advanced features implementation

## Monitoring and Success Metrics

### Key Performance Indicators
1. **Generation Success Rate**: Target >95%
2. **Average Generation Time**: Target <20 seconds
3. **Timeout Incidents**: Target <2%
4. **User Satisfaction**: Measured via feedback
5. **Error Recovery Rate**: Target >80% successful retries

### Monitoring Implementation
- Phase-level timing and success tracking
- Error categorization and analysis
- User behavior analytics
- Performance trend analysis

## Conclusion

The multi-phase scene generation optimization provides a robust foundation for reliable, fast, and coherent scene generation while maintaining the quality and depth of the original system. This approach eliminates the primary causes of generation failures while creating opportunities for future enhancements.
