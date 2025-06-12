import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage, useEventListener } from './use-enhanced-context';
import type { GameSession, StoryTurn } from '@/types/story';

const ACTIVE_SESSION_ID_KEY = "activeStoryForgeSessionId";
const SESSION_KEY_PREFIX = "storyForgeSession_";

interface SessionState {
  currentSession: GameSession | null;
  storyHistory: StoryTurn[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced session management hook with better error handling and performance
 */
export function useSessionManagement() {
  const [sessionState, setSessionState] = useState<SessionState>({
    currentSession: null,
    storyHistory: [],
    isLoading: true,
    error: null,
  });

  const [activeSessionId, setActiveSessionId, removeActiveSessionId] = useLocalStorage<string | null>(
    ACTIVE_SESSION_ID_KEY,
    null
  );

  // Load session data with error handling
  const loadSession = useCallback(async (sessionId: string | null = activeSessionId) => {
    if (!sessionId) {
      setSessionState(prev => ({
        ...prev,
        currentSession: null,
        storyHistory: [],
        isLoading: false,
        error: null,
      }));
      return;
    }

    setSessionState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const sessionData = localStorage.getItem(`${SESSION_KEY_PREFIX}${sessionId}`);
      
      if (!sessionData) {
        // Session ID exists but no data found - clean up
        removeActiveSessionId();
        setSessionState(prev => ({
          ...prev,
          currentSession: null,
          storyHistory: [],
          isLoading: false,
          error: 'Session data not found',
        }));
        return;
      }

      const session: GameSession = JSON.parse(sessionData);
      
      // Validate session structure
      if (!session.storyHistory || !session.storyHistory.every(turn => Array.isArray(turn.messages))) {
        console.warn("CLIENT: Invalid session format detected. Clearing.");
        localStorage.removeItem(`${SESSION_KEY_PREFIX}${sessionId}`);
        removeActiveSessionId();
        setSessionState(prev => ({
          ...prev,
          currentSession: null,
          storyHistory: [],
          isLoading: false,
          error: 'Invalid session format',
        }));
        return;
      }

      setSessionState(prev => ({
        ...prev,
        currentSession: session,
        storyHistory: session.storyHistory,
        isLoading: false,
        error: null,
      }));

    } catch (error) {
      console.error("CLIENT: Failed to parse saved session:", error);
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${sessionId}`);
      removeActiveSessionId();
      setSessionState(prev => ({
        ...prev,
        currentSession: null,
        storyHistory: [],
        isLoading: false,
        error: 'Failed to load session',
      }));
    }
  }, [activeSessionId, removeActiveSessionId]);

  // Save session data with error handling
  const saveSession = useCallback((session: GameSession, history: StoryTurn[]) => {
    try {
      const sessionToSave: GameSession = {
        ...session,
        storyHistory: history,
        lastPlayedAt: new Date().toISOString(),
      };

      const sessionKey = `${SESSION_KEY_PREFIX}${session.id}`;
      localStorage.setItem(sessionKey, JSON.stringify(sessionToSave));
      
      setSessionState(prev => ({
        ...prev,
        currentSession: sessionToSave,
        storyHistory: history,
        error: null,
      }));

    } catch (error) {
      console.error("CLIENT: Failed to save session:", error);
      setSessionState(prev => ({
        ...prev,
        error: 'Failed to save session',
      }));
    }
  }, []);

  // Create new session
  const createSession = useCallback((session: GameSession, initialHistory: StoryTurn[]) => {
    try {
      localStorage.setItem(`${SESSION_KEY_PREFIX}${session.id}`, JSON.stringify(session));
      setActiveSessionId(session.id);
      
      setSessionState(prev => ({
        ...prev,
        currentSession: session,
        storyHistory: initialHistory,
        isLoading: false,
        error: null,
      }));

    } catch (error) {
      console.error("CLIENT: Failed to create session:", error);
      setSessionState(prev => ({
        ...prev,
        error: 'Failed to create session',
      }));
    }
  }, [setActiveSessionId]);

  // Clear current session
  const clearSession = useCallback(() => {
    if (sessionState.currentSession) {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${sessionState.currentSession.id}`);
    }
    removeActiveSessionId();
    
    setSessionState({
      currentSession: null,
      storyHistory: [],
      isLoading: false,
      error: null,
    });
  }, [sessionState.currentSession, removeActiveSessionId]);

  // Update story history
  const updateStoryHistory = useCallback((newHistory: StoryTurn[]) => {
    setSessionState(prev => ({
      ...prev,
      storyHistory: newHistory,
    }));

    // Auto-save if we have a current session
    if (sessionState.currentSession) {
      saveSession(sessionState.currentSession, newHistory);
    }
  }, [sessionState.currentSession, saveSession]);

  // Listen for storage changes from other tabs
  useEventListener('storage', (event) => {
    if (event.key === ACTIVE_SESSION_ID_KEY) {
      const newActiveId = event.newValue;
      if (newActiveId !== activeSessionId) {
        loadSession(newActiveId);
      }
    }
  });

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Auto-save when story history changes (debounced)
  useEffect(() => {
    if (!sessionState.currentSession || sessionState.isLoading) return;

    const timeoutId = setTimeout(() => {
      saveSession(sessionState.currentSession!, sessionState.storyHistory);
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [sessionState.storyHistory, sessionState.currentSession, sessionState.isLoading, saveSession]);

  return {
    ...sessionState,
    loadSession,
    saveSession,
    createSession,
    clearSession,
    updateStoryHistory,
  };
}
