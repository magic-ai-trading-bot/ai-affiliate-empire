import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

    const variants = {
      default: 'bg-accent text-accent-foreground',
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      destructive: 'bg-destructive text-destructive-foreground',
      outline: 'border border-border bg-background text-foreground',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <span ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props} />
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
