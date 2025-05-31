
"use client";

import { useState, useEffect } from "react";
import { getLorebook } from "@/lib/lore-manager";
import type { LoreEntry } from "@/types/story";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LibraryIcon, InfoIcon } from "lucide-react"; // Changed BookMarkedIcon to LibraryIcon

export default function LorebookDisplay() {
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const entries = getLorebook();
    setLoreEntries(entries);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center">
            <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading lore entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (loreEntries.length === 0) {
    return (
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center">
            <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md bg-background/50">
            <InfoIcon className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-lg">Your Lorebook is currently empty.</p>
            <p className="text-sm text-muted-foreground mt-1">Discover lore as you play to fill these pages!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {loreEntries.map((entry) => (
            <AccordionItem value={entry.id} key={entry.id}>
              <AccordionTrigger className="text-lg hover:no-underline">
                <div className="flex items-center justify-between w-full pr-2">
                    <span>{entry.keyword}</span>
                    {entry.category && <Badge variant="secondary" className="ml-2 text-xs">{entry.category}</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed px-2">
                {entry.content}
                <p className="text-xs text-muted-foreground mt-2">
                  Source: {entry.source} (Added: {new Date(entry.createdAt).toLocaleDateString()})
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
