"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PaperPlaneIcon } from "@radix-ui/react-icons"; // Using Radix icon as placeholder, can change
import { Send } from "lucide-react";


interface UserInputFormProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export default function UserInputForm({ onSubmit, isLoading }: UserInputFormProps) {
  const [userInput, setUserInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      onSubmit(userInput.trim());
      setUserInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 animate-slide-up">
      <div className="relative">
        <Label htmlFor="user-action" className="sr-only">Your Action</Label>
        <Textarea
          id="user-action"
          placeholder="What do you do next? Describe your action in detail..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          rows={2}
          disabled={isLoading}
          className="text-sm sm:text-base shadow-lg border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200 focus:shadow-xl focus:bg-card hover:border-border-hover resize-none"
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {userInput.length}/500
        </div>
      </div>
      <Button
        type="submit"
        disabled={isLoading || !userInput.trim()}
        className="w-full text-sm sm:text-base py-3 sm:py-4 font-semibold hover-glow"
        variant="gradient"
        loading={isLoading}
        loadingText="Processing your action..."
      >
        <Send className="mr-2 h-4 w-4" />
        {isLoading ? "Processing..." : "Send Action"}
      </Button>
    </form>
  );
}
