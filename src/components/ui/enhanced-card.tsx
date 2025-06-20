/**
 * Enhanced Card Component
 * 
 * Modern card component with improved visual design, animations, and interactive features
 * for the progression and inventory system overhaul.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EnhancedCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animation?: 'none' | 'appear' | 'slide-left' | 'slide-right' | 'bounce';
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  badge,
  badgeVariant = 'default',
  children,
  className,
  interactive = false,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'md',
  animation = 'appear'
}) => {
  const cardVariants = {
    default: 'enhanced-card',
    elevated: 'enhanced-card shadow-lg',
    glass: 'glass-effect',
    gradient: 'gradient-primary text-primary-foreground'
  };

  const sizeVariants = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const animationVariants = {
    none: '',
    appear: 'animate-card-appear',
    'slide-left': 'animate-slide-in-left',
    'slide-right': 'animate-slide-in-right',
    bounce: 'animate-bounce-gentle'
  };

  const cardClasses = cn(
    cardVariants[variant],
    interactive && !disabled && 'enhanced-card-interactive',
    disabled && 'opacity-50 cursor-not-allowed',
    loading && 'loading-skeleton',
    animationVariants[animation],
    className
  );

  const handleClick = () => {
    if (interactive && !disabled && !loading && onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className={cardClasses}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && !disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {(title || description || Icon || badge) && (
        <CardHeader className={cn('pb-3', sizeVariants[size])}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {Icon && (
                <div className={cn('p-2 rounded-lg bg-primary/10', iconColor)}>
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div>
                {title && (
                  <CardTitle className="text-lg font-semibold leading-tight">
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            {badge && (
              <Badge variant={badgeVariant} className="shrink-0">
                {badge}
              </Badge>
            )}
          </div>
        </CardHeader>
      )}
      
      {children && (
        <CardContent className={cn('pt-0', sizeVariants[size])}>
          {children}
        </CardContent>
      )}
    </Card>
  );
};

interface EnhancedCardGridProps {
  children: React.ReactNode;
  columns?: 'auto' | 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  maximized?: boolean;
}

export const EnhancedCardGrid: React.FC<EnhancedCardGridProps> = ({
  children,
  columns = 'auto',
  gap = 'md',
  className,
  maximized = false
}) => {
  const columnVariants = {
    auto: 'grid-maximized',
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6'
  };

  const gapVariants = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div 
      className={cn(
        'grid',
        maximized ? 'grid-maximized' : columnVariants[columns],
        gapVariants[gap],
        maximized && 'container-full-width',
        className
      )}
    >
      {children}
    </div>
  );
};

interface StatDisplayCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
  className?: string;
}

export const StatDisplayCard: React.FC<StatDisplayCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  trendValue,
  description,
  className
}) => {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground'
  };

  return (
    <EnhancedCard className={cn('text-center', className)} size="sm">
      <div className="space-y-2">
        {Icon && (
          <div className={cn('mx-auto w-8 h-8 flex items-center justify-center', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
        {trend && trendValue && (
          <div className={cn('text-xs', trendColors[trend])}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
          </div>
        )}
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </EnhancedCard>
  );
};
