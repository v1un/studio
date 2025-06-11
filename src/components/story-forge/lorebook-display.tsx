
"use client";

import { useState, useEffect, useCallback } from "react";
import { getLorebook, addLoreEntry, updateLoreEntry, deleteLoreEntry } from "@/lib/lore-manager";
import type { LoreEntry } from "@/types/story";
import LoreEntryForm, { type LoreEntryFormData } from "./lore-entry-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LibraryIcon, InfoIcon, PlusCircleIcon, Edit3Icon, Trash2Icon, Loader2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LorebookDisplay() {
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<LoreEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LoreEntry | null>(null);

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { toast } = useToast();

  const fetchLoreEntries = useCallback(() => {
    setIsLoading(true);
    const entries = getLorebook();
    // Sort entries by category first, then by keyword
    entries.sort((a, b) => {
      // Sort by category first (with "Character" first, then alphabetically)
      const categoryA = a.category || "Uncategorized";
      const categoryB = b.category || "Uncategorized";

      if (categoryA === "Character" && categoryB !== "Character") return -1;
      if (categoryB === "Character" && categoryA !== "Character") return 1;

      const categoryComp = categoryA.localeCompare(categoryB);
      if (categoryComp !== 0) return categoryComp;

      // Then sort by keyword within category
      return a.keyword.toLowerCase().localeCompare(b.keyword.toLowerCase());
    });
    setLoreEntries(entries);
    setIsLoading(false);
  }, []);

  // Filter entries based on search term and category
  const filterEntries = useCallback(() => {
    let filtered = loreEntries;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(entry =>
        (entry.category || "Uncategorized") === selectedCategory
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.keyword.toLowerCase().includes(term) ||
        entry.content.toLowerCase().includes(term)
      );
    }

    setFilteredEntries(filtered);
  }, [loreEntries, selectedCategory, searchTerm]);

  // Get unique categories for filter dropdown
  const availableCategories = useCallback(() => {
    const categories = new Set<string>();
    loreEntries.forEach(entry => {
      categories.add(entry.category || "Uncategorized");
    });
    return Array.from(categories).sort((a, b) => {
      if (a === "Character") return -1;
      if (b === "Character") return 1;
      return a.localeCompare(b);
    });
  }, [loreEntries]);

  useEffect(() => {
    fetchLoreEntries();
  }, [fetchLoreEntries]);

  useEffect(() => {
    filterEntries();
  }, [filterEntries]);

  const handleCreateSubmit = async (data: LoreEntryFormData) => {
    setIsFormLoading(true);
    try {
      addLoreEntry({ ...data, source: "User-Added" });
      toast({ title: "Lore Entry Created", description: `"${data.keyword}" has been added.` });
      fetchLoreEntries();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating lore entry:", error);
      toast({ title: "Error", description: "Could not create lore entry.", variant: "destructive" });
    }
    setIsFormLoading(false);
  };

  const handleEditSubmit = async (data: LoreEntryFormData) => {
    if (!entryToEdit) return;
    setIsFormLoading(true);
    try {
      updateLoreEntry({ ...entryToEdit, ...data });
      toast({ title: "Lore Entry Updated", description: `"${data.keyword}" has been updated.` });
      fetchLoreEntries();
      setIsEditDialogOpen(false);
      setEntryToEdit(null);
    } catch (error) {
      console.error("Error updating lore entry:", error);
      toast({ title: "Error", description: "Could not update lore entry.", variant: "destructive" });
    }
    setIsFormLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    setIsFormLoading(true);
    try {
      deleteLoreEntry(entryToDelete.id);
      toast({ title: "Lore Entry Deleted", description: `"${entryToDelete.keyword}" has been deleted.` });
      fetchLoreEntries();
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting lore entry:", error);
      toast({ title: "Error", description: "Could not delete lore entry.", variant: "destructive" });
    }
    setIsFormLoading(false);
  };

  const openEditDialog = (entry: LoreEntry) => {
    setEntryToEdit(entry);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center justify-between">
            <div className="flex items-center">
              <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading lore entries...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center justify-between">
            <div className="flex items-center">
              <LibraryIcon className="w-6 h-6 mr-2 text-accent" /> Lorebook
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <PlusCircleIcon className="w-4 h-4 mr-2" /> Create New Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Lore Entry</DialogTitle>
                </DialogHeader>
                <LoreEntryForm onSubmit={handleCreateSubmit} isLoading={isFormLoading} submitButtonText="Create Entry" />
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          {loreEntries.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search lore entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-muted-foreground w-4 h-4" />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {loreEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md bg-background/50">
              <InfoIcon className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-lg">Your Lorebook is currently empty.</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first entry or discover lore as you play!</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 border rounded-md bg-background/50">
              <Search className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-lg">No lore entries match your search.</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms or category filter.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredEntries.length} of {loreEntries.length} entries
                  {selectedCategory !== "all" && ` in ${selectedCategory}`}
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {filteredEntries.map((entry) => (
                <AccordionItem value={entry.id} key={entry.id}>
                  <AccordionTrigger className="text-lg hover:no-underline group">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="truncate mr-2">{entry.keyword}</span>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 cursor-pointer")}
                          onClick={(e) => { e.stopPropagation(); openEditDialog(entry); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); openEditDialog(entry); } }}
                          aria-label="Edit"
                        >
                          <Edit3Icon className="w-4 h-4" />
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 cursor-pointer hover:bg-destructive/20 hover:text-destructive focus:outline-none focus:ring-0 focus:ring-offset-0")}
                          onClick={(e) => { e.stopPropagation(); setEntryToDelete(entry); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setEntryToDelete(entry); } }}
                          aria-label="Delete"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </div>
                        {entry.category && <Badge variant="secondary" className="ml-2 text-xs hidden sm:inline-flex">{entry.category}</Badge>}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed px-2">
                    {entry.category && <Badge variant="outline" className="sm:hidden mb-1">{entry.category}</Badge>}
                    <div className="mb-1 sm:hidden"></div> {/* Spacer for mobile badge */}
                    {entry.content}
                    <p className="text-xs text-muted-foreground mt-2">
                      Source: {entry.source} | Added: {new Date(entry.createdAt).toLocaleDateString()}
                      {entry.updatedAt && ` | Updated: ${new Date(entry.updatedAt).toLocaleDateString()}`}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
              </Accordion>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEntryToEdit(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lore Entry</DialogTitle>
          </DialogHeader>
          {entryToEdit && (
            <LoreEntryForm
              onSubmit={handleEditSubmit}
              defaultValues={entryToEdit}
              isLoading={isFormLoading}
              submitButtonText="Update Entry"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => { if (!open) setEntryToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lore entry for
              <strong className="mx-1">"{entryToDelete?.keyword}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)} disabled={isFormLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isFormLoading} className="bg-destructive hover:bg-destructive/90">
              {isFormLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
