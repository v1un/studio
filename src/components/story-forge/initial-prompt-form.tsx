
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Welcome to Story Forge</CardTitle>
        <CardDescription>
          Begin your adventure by describing a scenario. You can also suggest a name and class for your character!
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initial-prompt" className="text-lg">Your Story Idea</Label>
            <Textarea
              id="initial-prompt"
              placeholder="e.g., A lone knight enters a dark forest..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={isLoading}
              className="text-base"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="character-name">Character Name (Optional)</Label>
              <Input
                id="character-name"
                placeholder="e.g., Sir Gideon"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-class">Character Class (Optional)</Label>
              <Input
                id="character-class"
                placeholder="e.g., Valiant Knight"
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full text-lg py-6">
            {isLoading ? "Forging your story..." : "Begin Adventure"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
