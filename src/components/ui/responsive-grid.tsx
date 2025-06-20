/**
 * Responsive Grid Component
 * 
 * Advanced responsive grid system that maximizes horizontal space utilization
 * with intelligent breakpoints and adaptive layouts.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  minItemWidth?: number;
  maxItemWidth?: number;
  className?: string;
  maximized?: boolean;
  autoFit?: boolean;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  minItemWidth = 280,
  maxItemWidth,
  className,
  maximized = false,
  autoFit = false,
  aspectRatio = 'auto'
}) => {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const aspectRatioClasses = {
    square: '[&>*]:aspect-square',
    video: '[&>*]:aspect-video',
    portrait: '[&>*]:aspect-[3/4]',
    auto: ''
  };

  // Generate responsive column classes
  const getColumnClasses = () => {
    if (autoFit) {
      const minWidth = `${minItemWidth}px`;
      const maxWidth = maxItemWidth ? `${maxItemWidth}px` : '1fr';
      return `grid-cols-[repeat(auto-fit,minmax(${minWidth},${maxWidth}))]`;
    }

    const classes = [];
    
    if (columns.default) {
      classes.push(`grid-cols-${columns.default}`);
    }
    if (columns.sm) {
      classes.push(`sm:grid-cols-${columns.sm}`);
    }
    if (columns.md) {
      classes.push(`md:grid-cols-${columns.md}`);
    }
    if (columns.lg) {
      classes.push(`lg:grid-cols-${columns.lg}`);
    }
    if (columns.xl) {
      classes.push(`xl:grid-cols-${columns.xl}`);
    }
    if (columns['2xl']) {
      classes.push(`2xl:grid-cols-${columns['2xl']}`);
    }

    return classes.join(' ');
  };

  return (
    <div
      className={cn(
        'grid',
        getColumnClasses(),
        gapClasses[gap],
        aspectRatioClasses[aspectRatio],
        maximized && 'container-full-width',
        className
      )}
      style={autoFit ? {
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, ${maxItemWidth ? `${maxItemWidth}px` : '1fr'}))`
      } : undefined}
    >
      {children}
    </div>
  );
};

export interface MasonryGridProps {
  children: React.ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  children,
  columns = { default: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className
}) => {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const getColumnClasses = () => {
    const classes = [];
    
    if (columns.default) {
      classes.push(`columns-${columns.default}`);
    }
    if (columns.sm) {
      classes.push(`sm:columns-${columns.sm}`);
    }
    if (columns.md) {
      classes.push(`md:columns-${columns.md}`);
    }
    if (columns.lg) {
      classes.push(`lg:columns-${columns.lg}`);
    }
    if (columns.xl) {
      classes.push(`xl:columns-${columns.xl}`);
    }
    if (columns['2xl']) {
      classes.push(`2xl:columns-${columns['2xl']}`);
    }

    return classes.join(' ');
  };

  return (
    <div
      className={cn(
        getColumnClasses(),
        gapClasses[gap],
        '[&>*]:break-inside-avoid [&>*]:mb-4',
        className
      )}
    >
      {children}
    </div>
  );
};

export interface FlexGridProps {
  children: React.ReactNode;
  minItemWidth?: number;
  maxItemWidth?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
  wrap?: boolean;
}

export const FlexGrid: React.FC<FlexGridProps> = ({
  children,
  minItemWidth = 280,
  maxItemWidth,
  gap = 'md',
  justify = 'start',
  align = 'stretch',
  className,
  wrap = true
}) => {
  const gapClasses = {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  return (
    <div
      className={cn(
        'flex',
        wrap && 'flex-wrap',
        gapClasses[gap],
        justifyClasses[justify],
        alignClasses[align],
        className
      )}
    >
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="flex-shrink-0"
          style={{
            minWidth: `${minItemWidth}px`,
            maxWidth: maxItemWidth ? `${maxItemWidth}px` : undefined,
            flex: maxItemWidth ? 'none' : '1 1 auto'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export interface GridItemProps {
  children: React.ReactNode;
  colSpan?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  rowSpan?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  className?: string;
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan,
  rowSpan,
  className
}) => {
  const getSpanClasses = (span: GridItemProps['colSpan'], type: 'col' | 'row') => {
    if (!span) return '';
    
    const classes = [];
    const prefix = type === 'col' ? 'col-span' : 'row-span';
    
    if (span.default) {
      classes.push(`${prefix}-${span.default}`);
    }
    if (span.sm) {
      classes.push(`sm:${prefix}-${span.sm}`);
    }
    if (span.md) {
      classes.push(`md:${prefix}-${span.md}`);
    }
    if (span.lg) {
      classes.push(`lg:${prefix}-${span.lg}`);
    }
    if (span.xl) {
      classes.push(`xl:${prefix}-${span.xl}`);
    }
    if (span['2xl']) {
      classes.push(`2xl:${prefix}-${span['2xl']}`);
    }

    return classes.join(' ');
  };

  return (
    <div
      className={cn(
        getSpanClasses(colSpan, 'col'),
        getSpanClasses(rowSpan, 'row'),
        className
      )}
    >
      {children}
    </div>
  );
};

// Utility component for responsive containers
export interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  centerContent?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'none',
  padding = 'md',
  className,
  centerContent = false
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
    none: 'max-w-none'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 py-1',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
    xl: 'px-8 py-4'
  };

  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        centerContent && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};
