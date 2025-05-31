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
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <Label htmlFor="user-action" className="sr-only">Your Action</Label>
        <Textarea
          id="user-action"
          placeholder="What do you do next?"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          rows={3}
          disabled={isLoading}
          className="text-base shadow-sm"
        />
      </div>
      <Button type="submit" disabled={isLoading || !userInput.trim()} className="w-full text-lg py-6">
        <Send className="mr-2 h-5 w-5" />
        {isLoading ? "Processing..." : "Send Action"}
      </Button>
    </form>
  );
}
