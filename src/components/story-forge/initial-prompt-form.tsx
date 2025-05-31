
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface InitialPromptFormProps {
  onSubmit: (data: { prompt: string; characterName?: string; characterClass?: string }) => void;
  isLoading: boolean;
}

export default function InitialPromptForm({ onSubmit, isLoading }: InitialPromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterClass, setCharacterClass] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit({
        prompt: prompt.trim(),
        characterName: characterName.trim() || undefined,
        characterClass: characterClass.trim() || undefined,
      });
    }
  };

  return (
    <Card className="w-full shadow-xl animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center">
            <Sparkles className="w-7 h-7 mr-2 text-accent"/>
            Start Your Saga
        </CardTitle>
        <CardDescription>
          Describe the beginning of your adventure. Optionally, suggest a name and class for your hero.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initial-prompt" className="text-lg font-semibold">Your Story Idea</Label>
            <Textarea
              id="initial-prompt"
              placeholder="e.g., A lone knight discovers a hidden map in a forgotten ruin..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="text-base"
              required
            />
            <p className="text-xs text-muted-foreground">This will set the scene and tone for your game.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="character-name" className="font-semibold">Character Name (Optional)</Label>
              <Input
                id="character-name"
                placeholder="e.g., Sir Kaelen, Lyra Shadowfoot"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-class" className="font-semibold">Character Class (Optional)</Label>
              <Input
                id="character-class"
                placeholder="e.g., Valiant Paladin, Cunning Rogue"
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full text-lg py-6">
            {isLoading ? "Forging your legend..." : "Begin Adventure"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
