"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface InitialPromptFormProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export default function InitialPromptForm({ onSubmit, isLoading }: InitialPromptFormProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Welcome to Story Forge</CardTitle>
        <CardDescription>
          Begin your adventure by describing a scenario or character. What mysteries await?
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="initial-prompt" className="text-lg">Your Story Idea</Label>
            <Textarea
              id="initial-prompt"
              placeholder="e.g., A lone knight enters a dark forest..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={isLoading}
              className="text-base"
            />
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
