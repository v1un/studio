
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
  // Check if an entry with the same keyword already exists (case-insensitive)
  const existingEntry = lorebook.find(
    entry => entry.keyword.trim().toLowerCase() === entryData.keyword.trim().toLowerCase()
  );
  if (existingEntry) {
    // If creating through UI, usually we'd want to prevent duplicate keywords or update
    // For now, let's throw an error or handle it as an update if an ID was somehow passed.
    // But a simple add from UI should ideally check first or the UI should prevent this.
    // For programmatic add, this just adds.
    console.warn(`Lore entry with keyword "${entryData.keyword}" may already exist. Adding as new entry.`);
  }

  const newEntry: LoreEntry = {
    ...entryData,
    keyword: entryData.keyword.trim(), // Ensure keyword is trimmed
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const updatedLorebook = [...lorebook, newEntry];
  saveLorebook(updatedLorebook);
  return newEntry;
}

export function updateLoreEntry(updatedEntry: LoreEntry): LoreEntry | undefined {
  if (typeof window === 'undefined') return undefined;
  const lorebook = getLorebook();
  const entryIndex = lorebook.findIndex(entry => entry.id === updatedEntry.id);
  if (entryIndex === -1) {
    return undefined; // Entry not found
  }
  const entryToUpdate = {
    ...lorebook[entryIndex],
    ...updatedEntry,
    keyword: updatedEntry.keyword.trim(), // Ensure keyword is trimmed
    updatedAt: new Date().toISOString(), // Add/update an 'updatedAt' timestamp
  };
  lorebook[entryIndex] = entryToUpdate;
  saveLorebook(lorebook);
  return lorebook[entryIndex];
}

export function deleteLoreEntry(entryId: string): void {
  if (typeof window === 'undefined') return;
  let lorebook = getLorebook();
  lorebook = lorebook.filter(entry => entry.id !== entryId);
  saveLorebook(lorebook);
}

export function initializeLorebook(rawEntries: RawLoreEntry[]): void {
  if (typeof window === 'undefined') return;
  const newLorebook: LoreEntry[] = rawEntries.map(rawEntry => ({
    ...rawEntry,
    keyword: rawEntry.keyword.trim(),
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
