
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookPlusIcon, UserIcon, ShieldQuestionIcon, SparklesIcon } from "lucide-react";

interface InitialPromptFormProps {
  onSubmitSeries: (data: { seriesName: string; characterName?: string; characterClass?: string; usePremiumAI: boolean }) => void;
  isLoading: boolean;
}

export default function InitialPromptForm({ onSubmitSeries, isLoading }: InitialPromptFormProps) {
  const [seriesName, setSeriesName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [usePremiumAI, setUsePremiumAI] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (seriesName.trim()) {
      onSubmitSeries({
        seriesName: seriesName.trim(),
        characterName: characterName.trim() || undefined,
        characterClass: characterClass.trim() || undefined,
        usePremiumAI: usePremiumAI,
      });
    }
  };

  return (
    <Card className="w-full shadow-xl animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center">
            <BookPlusIcon className="w-7 h-7 mr-2 text-accent"/>
            Choose Your Universe
        </CardTitle>
        <CardDescription>
          Enter the name of a well-known series to begin. You can also suggest a character name and class/role.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="series-name" className="text-lg font-semibold">Series Name <span className="text-red-500">*</span></Label>
            <Input
              id="series-name"
              placeholder="e.g., Death Note, Star Wars, One Piece..."
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              disabled={isLoading}
              className="text-base"
              required
            />
            <p className="text-xs text-muted-foreground">The AI will generate a scenario based on this series.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="character-name" className="text-md font-medium flex items-center">
                    <UserIcon className="w-4 h-4 mr-1.5 text-primary/80"/> Character Name (Optional)
                </Label>
                <Input
                id="character-name"
                placeholder="e.g., Harry Potter, Original Character Name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                disabled={isLoading}
                className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Suggest an existing character or a new one.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="character-class" className="text-md font-medium flex items-center">
                    <ShieldQuestionIcon className="w-4 h-4 mr-1.5 text-primary/80"/> Character Class/Role (Optional)
                </Label>
                <Input
                id="character-class"
                placeholder="e.g., Jedi Knight, Alchemist, Detective"
                value={characterClass}
                onChange={(e) => setCharacterClass(e.target.value)}
                disabled={isLoading}
                className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Suggest a role or class for your character.</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2 border-t border-border/50">
            <Switch
                id="premium-ai-toggle"
                checked={usePremiumAI}
                onCheckedChange={setUsePremiumAI}
                disabled={isLoading}
                aria-label="Toggle Premium AI"
            />
            <Label htmlFor="premium-ai-toggle" className="flex items-center text-sm font-medium">
                <SparklesIcon className="w-4 h-4 mr-1.5 text-yellow-500"/>
                Use Premium AI & Prompts
            </Label>
          </div>
           <p className="text-xs text-muted-foreground -mt-4 ml-12">Utilizes a more advanced AI model (may be slower or have different rate limits). Enhanced prompts are a work in progress.</p>


        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !seriesName.trim()} className="w-full text-lg py-6">
            {isLoading ? "Generating scenario..." : "Enter Universe"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
