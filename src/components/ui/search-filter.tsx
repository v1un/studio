/**
 * Search and Filter Component
 * 
 * Advanced search and filtering component for progression and inventory systems
 * with support for multiple filter types, sorting, and real-time search.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  SortAsc, 
  SortDesc, 
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'checkbox' | 'select' | 'range';
  options: FilterOption[];
  multiple?: boolean;
}

export interface SortOption {
  id: string;
  label: string;
  field: string;
  direction?: 'asc' | 'desc';
}

export interface SearchFilterProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterGroups?: FilterGroup[];
  activeFilters?: Record<string, string[]>;
  onFiltersChange?: (filters: Record<string, string[]>) => void;
  sortOptions?: SortOption[];
  activeSortOption?: string;
  onSortChange?: (sortId: string) => void;
  className?: string;
  showResultCount?: boolean;
  resultCount?: number;
  onClearAll?: () => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filterGroups = [],
  activeFilters = {},
  onFiltersChange,
  sortOptions = [],
  activeSortOption,
  onSortChange,
  className,
  showResultCount = false,
  resultCount = 0,
  onClearAll
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).reduce((count, filters) => count + filters.length, 0);
  }, [activeFilters]);

  const handleFilterChange = useCallback((groupId: string, optionId: string, checked: boolean) => {
    if (!onFiltersChange) return;

    const currentFilters = activeFilters[groupId] || [];
    const newFilters = checked
      ? [...currentFilters, optionId]
      : currentFilters.filter(id => id !== optionId);

    onFiltersChange({
      ...activeFilters,
      [groupId]: newFilters
    });
  }, [activeFilters, onFiltersChange]);

  const handleSelectFilterChange = useCallback((groupId: string, value: string) => {
    if (!onFiltersChange) return;

    onFiltersChange({
      ...activeFilters,
      [groupId]: value ? [value] : []
    });
  }, [activeFilters, onFiltersChange]);

  const handleClearFilter = useCallback((groupId: string, optionId?: string) => {
    if (!onFiltersChange) return;

    if (optionId) {
      const currentFilters = activeFilters[groupId] || [];
      onFiltersChange({
        ...activeFilters,
        [groupId]: currentFilters.filter(id => id !== optionId)
      });
    } else {
      onFiltersChange({
        ...activeFilters,
        [groupId]: []
      });
    }
  }, [activeFilters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    if (onClearAll) {
      onClearAll();
    } else if (onFiltersChange && onSearchChange) {
      onFiltersChange({});
      onSearchChange('');
    }
  }, [onClearAll, onFiltersChange, onSearchChange]);

  const renderFilterGroup = (group: FilterGroup) => {
    const groupFilters = activeFilters[group.id] || [];

    if (group.type === 'select') {
      return (
        <div key={group.id} className="space-y-2">
          <Label className="text-sm font-medium">{group.label}</Label>
          <Select
            value={groupFilters[0] || ''}
            onValueChange={(value) => handleSelectFilterChange(group.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${group.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All {group.label}</SelectItem>
              {group.options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({option.count})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={group.id} className="space-y-3">
        <Label className="text-sm font-medium">{group.label}</Label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {group.options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${group.id}-${option.id}`}
                checked={groupFilters.includes(option.id)}
                onCheckedChange={(checked) => 
                  handleFilterChange(group.id, option.id, checked as boolean)
                }
              />
              <Label
                htmlFor={`${group.id}-${option.id}`}
                className="text-sm flex-1 cursor-pointer flex items-center justify-between"
              >
                <span>{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-muted-foreground text-xs">
                    ({option.count})
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Controls Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 pr-4"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => onSearchChange?.('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Filter Button */}
        {filterGroups.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="h-auto p-1 text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
                <Separator />
                <div className="space-y-4">
                  {filterGroups.map(renderFilterGroup)}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Sort Dropdown */}
        {sortOptions.length > 0 && (
          <Select value={activeSortOption} onValueChange={onSortChange}>
            <SelectTrigger className="w-auto min-w-32">
              <div className="flex items-center">
                {activeSortOption && sortOptions.find(opt => opt.id === activeSortOption)?.direction === 'desc' ? (
                  <SortDesc className="w-4 h-4 mr-2" />
                ) : (
                  <SortAsc className="w-4 h-4 mr-2" />
                )}
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([groupId, filterIds]) =>
            filterIds.map((filterId) => {
              const group = filterGroups.find(g => g.id === groupId);
              const option = group?.options.find(o => o.id === filterId);
              if (!group || !option) return null;

              return (
                <Badge
                  key={`${groupId}-${filterId}`}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span className="text-xs">{group.label}:</span>
                  <span>{option.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 ml-1"
                    onClick={() => handleClearFilter(groupId, filterId)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              );
            })
          )}
        </div>
      )}

      {/* Result Count */}
      {showResultCount && (
        <div className="text-sm text-muted-foreground">
          {resultCount} result{resultCount !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
};
