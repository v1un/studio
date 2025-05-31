
import type { LoreEntry, RawLoreEntry } from '@/types/story';

const LOREBOOK_KEY = "storyForgeLorebook";

export function getLorebook(): LoreEntry[] {
  if (typeof window === 'undefined') return [];
  const storedLorebook = localStorage.getItem(LOREBOOK_KEY);
  return storedLorebook ? JSON.parse(storedLorebook) : [];
}

export function saveLorebook(lorebook: LoreEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOREBOOK_KEY, JSON.stringify(lorebook));
}

export function findLoreEntry(keyword: string): LoreEntry | undefined {
  const lorebook = getLorebook();
  const normalizedKeyword = keyword.trim().toLowerCase();
  return lorebook.find(entry => entry.keyword.toLowerCase() === normalizedKeyword);
}

export function addLoreEntry(entryData: {
  keyword: string;
  content: string;
  category?: string;
  source: LoreEntry['source'];
}): LoreEntry {
  const lorebook = getLorebook();
  const newEntry: LoreEntry = {
    ...entryData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const updatedLorebook = [...lorebook, newEntry];
  saveLorebook(updatedLorebook);
  return newEntry;
}

export function initializeLorebook(rawEntries: RawLoreEntry[]): void {
  if (typeof window === 'undefined') return;
  const newLorebook: LoreEntry[] = rawEntries.map(rawEntry => ({
    ...rawEntry,
    id: crypto.randomUUID(),
    source: 'AI-Generated-Scenario-Start',
    createdAt: new Date().toISOString(),
  }));
  saveLorebook(newLorebook);
}

export function clearLorebook(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOREBOOK_KEY);
}
