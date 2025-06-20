
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookPlusIcon, UserIcon, ShieldQuestionIcon, SparklesIcon, Settings, ArrowRight } from "lucide-react";

interface InitialPromptFormProps {
  onSubmitSeries: (data: { seriesName: string; characterName?: string; characterClass?: string; usePremiumAI: boolean }) => void;
  isLoading: boolean;
}

export default function InitialPromptForm({ onSubmitSeries, isLoading }: InitialPromptFormProps) {
  const router = useRouter();
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

  const handleAdvancedGeneration = () => {
    const params = new URLSearchParams();
    if (seriesName.trim()) params.set('series', seriesName.trim());
    if (characterName.trim()) params.set('character', characterName.trim());
    if (characterClass.trim()) params.set('class', characterClass.trim());
    if (usePremiumAI) params.set('premium', 'true');

    router.push(`/scenario-generation?${params.toString()}`);
  };

  return (
    <Card variant="elevated" className="w-full max-w-2xl shadow-2xl animate-fade-in hover-lift glass-effect">
      <CardHeader className="text-center pb-6">
        <CardTitle gradient className="font-headline text-4xl flex items-center justify-center mb-4">
            <div className="relative mr-3">
              <BookPlusIcon className="w-8 h-8 text-accent animate-float"/>
              <div className="absolute inset-0 w-8 h-8 text-accent animate-ping opacity-20">
                <BookPlusIcon className="w-8 h-8" />
              </div>
            </div>
            Choose Your Universe
        </CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Enter the name of a well-known series to begin your adventure. You can also suggest a character name and class/role to customize your experience.
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
        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" disabled={isLoading || !seriesName.trim()} className="w-full text-lg py-6">
            {isLoading ? "Generating scenario..." : "Quick Start (Legacy)"}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAdvancedGeneration}
            disabled={isLoading || !seriesName.trim()}
            className="w-full text-lg py-6 border-primary/20 hover:border-primary/40"
          >
            <Settings className="w-5 h-5 mr-2" />
            Advanced Generation (Recommended)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Advanced generation uses a new multi-phase system that&apos;s more reliable and gives you control over each step.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
