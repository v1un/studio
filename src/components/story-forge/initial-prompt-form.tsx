
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookPlusIcon } from "lucide-react"; // Changed BookPlayIcon to BookPlusIcon

interface InitialPromptFormProps {
  onSubmitSeries: (seriesName: string) => void; // Changed to accept series name
  isLoading: boolean;
}

export default function InitialPromptForm({ onSubmitSeries, isLoading }: InitialPromptFormProps) {
  const [seriesName, setSeriesName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (seriesName.trim()) {
      onSubmitSeries(seriesName.trim());
    }
  };

  return (
    <Card className="w-full shadow-xl animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline text-3xl flex items-center">
            <BookPlusIcon className="w-7 h-7 mr-2 text-accent"/> {/* Changed Icon */}
            Choose Your Universe
        </CardTitle>
        <CardDescription>
          Enter the name of a well-known series (e.g., Naruto, Harry Potter, Re:Zero) to begin your adventure there.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="series-name" className="text-lg font-semibold">Series Name</Label>
            <Input
              id="series-name"
              placeholder="e.g., Death Note, Star Wars, One Piece..."
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              disabled={isLoading}
              className="text-base"
              required
            />
            <p className="text-xs text-muted-foreground">The AI will generate a starting scenario, character, and lore based on this series.</p>
          </div>
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
