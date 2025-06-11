
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoreEntry } from "@/types/story";

const loreEntryFormSchema = z.object({
  keyword: z.string().min(1, "Keyword is required.").max(100, "Keyword too long."),
  content: z.string().min(1, "Content is required.").max(2000, "Content too long."),
  category: z.string().max(50, "Category too long.").optional(),
});

export type LoreEntryFormData = z.infer<typeof loreEntryFormSchema>;

// Predefined category options based on the scenario generation system
const PREDEFINED_CATEGORIES = [
  "Character",
  "Location",
  "Faction/Organization",
  "Magic/Power",
  "History/Events",
  "Culture/Society",
  "Item/Concept",
  "Technology",
  "Event/History",
  "Uncategorized"
];

interface LoreEntryFormProps {
  onSubmit: (data: LoreEntryFormData) => void;
  defaultValues?: Partial<LoreEntry>;
  isLoading?: boolean;
  submitButtonText?: string;
}

export default function LoreEntryForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitButtonText = "Save Entry",
}: LoreEntryFormProps) {
  const form = useForm<LoreEntryFormData>({
    resolver: zodResolver(loreEntryFormSchema),
    defaultValues: {
      keyword: defaultValues?.keyword || "",
      content: defaultValues?.content || "",
      category: defaultValues?.category || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="keyword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keyword</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dragon's Peak" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the lore entry..."
                  rows={5}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PREDEFINED_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Saving..." : submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
