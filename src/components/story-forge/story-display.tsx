"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StoryDisplayProps {
  sceneDescription: string;
  keyProp: string; // To trigger re-render and animation
}

export default function StoryDisplay({ sceneDescription, keyProp }: StoryDisplayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => {
      setVisible(true);
    }, 50); // Short delay to ensure CSS transition triggers
    return () => clearTimeout(timer);
  }, [keyProp]); // Depend on keyProp to re-trigger animation

  return (
    <Card key={keyProp} className="w-full shadow-lg bg-card/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div
          className={`text-lg leading-relaxed whitespace-pre-line transition-opacity duration-500 ease-in-out ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          dangerouslySetInnerHTML={{ __html: sceneDescription.replace(/\n/g, "<br />") }} // Basic HTML for line breaks
        />
      </CardContent>
    </Card>
  );
}
